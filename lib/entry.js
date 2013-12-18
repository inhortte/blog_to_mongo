'use strict';

var async = require('async');
var us = require('underscore-node');
var db = require('mongojs')('mongodb://localhost:27017/martenblog', ['entry', 'topic']);

function Entry() {
  var that = this;

  // private
  // if id is null, then a new one will be generated.
  var next_id = function(coll, id, cb) {
    if(id) {
      cb(id);
    } else {
      db.collection(coll).find({}, {_id: 1}).sort({_id: -1}).limit(1, function(err, e_arr) {
        cb(e_arr[0]._id + 1);
      });
    }
  };

 var created_at = function() {
    if('date' in that) {
      var re = that.date.length === 12 ? /^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/ : /^(\d\d\d\d)(\d\d)(\d\d)$/;
      var m = re.exec(that.date);
      if(m) {
        if(m[4] === undefined) {
          return(new Date(m[1], m[2] - 1, m[3]));
        } else {
          return(new Date(m[1], m[2] - 1, m[3], m[4], m[5]));
        }
      } else {
        return(new Date());
      }
    } else {
      return(new Date());
    }
  };

  var grab_extant_topics = function(cb) {
    if('_id' in that) {
      db.entry.findOne({_id: that._id}, function(err, e) {
        if(err) { throw err; }
        cb((e && e.topic_ids) || []);
      });
    } else {
      cb([]);
    }
  };

  var arrange_topics = function(entry_id, cb) {
    var entry_ids;
    grab_extant_topics(function(topic_ids) {
      async.eachSeries(that.topic, function(t, t_cb) {
        db.topic.findOne({topic: t}, function(err, t_obj) {
          if(err) { throw(err); }
          next_id('topic', t_obj ? t_obj._id : undefined, function(id) {
            topic_ids.push(id);
            entry_ids = t_obj ? t_obj.entry_ids : [];
            entry_ids.push(entry_id);
            db.topic.save({_id: id, topic: t, entry_ids: us.uniq(entry_ids)}, function() {
              t_cb(null);
            });
          });
        });
      }, function(err) {
        if(err) { throw(err); }
        that.add('topic', us.uniq(topic_ids));
        cb(that);  // I suppose I'll still be in this context.
      });
    });
  };

  // privileged
  this.regurgitate = function(cb) {
    next_id('entry', this._id, function(id) {
      arrange_topics(id, function(that) {
        var doc = {_id: id, created_at: created_at().getTime(), entry: that.entry, subject: that.subject, topic_ids: that.topic, user_id: 1};
        db.entry.update({_id: id}, doc, {upsert: true}, function() {
          cb(doc);
        });
      });
    });
  };
}
Entry.prototype.add = function(key, value) {
  this[key] = key === '_id' ? parseInt(value, 10) : value;
};
Entry.prototype.delete = function(key) {
  delete this[key];
};

// THIS IS NOT THE WAY TO DO IT! CHANGE IT!
// ENTRY IS STAYING THE SAME EVERY TIME! DAMNIT!
module.exports = Entry;
