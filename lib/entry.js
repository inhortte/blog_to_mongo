'use strict';

var async = require('async');
var us = require('underscore-node');
var db = require('mongojs')('mongodb://localhost:27017/martenblog', ['entry', 'topic']);

var entriesModule =
    (function() {
      var entries = [];

      var next_id = function(coll, id, cb) {
        if(id) {
          cb(id);
        } else {
          db.collection(coll).find({}, {_id: 1}).sort({_id: -1}).limit(1, function(err, e_arr) {
            cb(e_arr[0]._id + 1);
          });
        }
      };
      var created_at = function(entry) {
        if('date' in entry) {
          var re = entry.date.length === 12 ? /^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/ : /^(\d\d\d\d)(\d\d)(\d\d)$/;
          var m = re.exec(entry.date);
          if(m) {
            return(m[4] === undefined ? new Date(m[1], m[2] - 1, m[3]) : new Date(m[1], m[2] - 1, m[3], m[4], m[5]));
          }
        }
        return(new Date());
      };
      var grab_extant_topics = function(entry, cb) {
        db.entry.findOne({_id: entry._id}, function(err, e) {
          if(err) {
            console.log("grab_extant_topics error!\n" + JSON.stringify(err) + "\ncallback([]);");
            cb([]);
          }
          cb((e && e.topic_ids) || []);
        });
      };
      var arrange_topics = function(entry, cb) {
        var entry_ids;
        grab_extant_topics(entry, function(topic_ids) {
          async.eachSeries(entry.topic, function(t, t_cb) {
            db.topic.findOne({topic: t}, function(err, t_obj) {
              if(err) { throw(err); }
              next_id('topic', t_obj ? t_obj._id : undefined, function(id) {
                topic_ids.push(id);
                entry_ids = t_obj ? t_obj.entry_ids : [];
                entry_ids.push(entry._id);
                db.topic.save({_id: id, topic: t, entry_ids: us.uniq(entry_ids)}, function() {
                  t_cb(null);
                });
//                console.log(JSON.stringify({_id: id, topic: t, entry_ids: us.uniq(entry_ids)}));
//                t_cb(null);
              });
            });
          }, function(err) {
               if(err) { throw(err); }
               entry.add('topic', us.uniq(topic_ids));
               cb(entry);
             });
        });
      };
      var regurgitate = function(entry, cb) {
        next_id('entry', entry._id, function(id) {
          entry.add('_id', id);
          arrange_topics(entry, function(entry) {
            var doc = {_id: id, created_at: created_at(entry).getTime(), entry: entry.entry, subject: entry.subject, topic_ids: entry.topic, user_id: 1};
            db.entry.update({_id: id}, doc, {upsert: true}, function() {
              doc['path'] = entry.path;
              doc['topics'] = entry.topics;
                cb(doc);
            });
          });
        });
      };

      function Entry() {
      }
      Entry.prototype.add = function(key, value) {
        if(key === 'topic') {
          this.addTopics(value);
        } else {
          this[key] = key === '_id' ? parseInt(value, 10) : value;
        }
      };
      Entry.prototype.addTopics = function(topics) {
        if(typeof topics === 'string') {
          this['topics'] = topics;
          this['topic'] = topics.split(',').map(function(i) {
                            return(i.trim().toLowerCase());
                          });
        } else {
          this['topic'] = topics;
        }
      };
      Entry.prototype.delete = function(key) {
        delete this[key];
      };

      return {
        newEntry: function() {
          var entry = new Entry();
          entries.push(entry);
          return entry;
        },
        processAll: function(cb) {
          async.reduce(entries, [], function(docs, entry, cb) {
            regurgitate(entry, function(doc) {
              docs.push(doc);
              cb(null, docs);
            });
          }, function(err, docs) {
               if(err) { throw err; }
               cb(docs);
             });
        }
      };
    }());

module.exports = entriesModule;
