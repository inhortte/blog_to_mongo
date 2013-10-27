'use strict';

var async = require('async');
var db = require('mongojs')('mongodb://localhost:27017/martenblog', ['entry', 'topic']);

function Entry() {
  var that = this;

  // private
  // if id is null, then a new one will be generated.
  var next_id = function(id, cb) {
    if(id) {
      cb(id);
    } else {
      db.entry.find({}, {_id: 1}).sort({_id: -1}).limit(1, function(err, e_arr) {
        console.log("last id: " + e_arr[0]._id);
        cb(e_arr[0]._id + 1);
      });
    }
  };

  var created_at = function() {
    if('date' in that) {
      var re = that.date.length === 10 ? /^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/ : /^(\d\d\d\d)(\d\d)(\d\d)$/;
      var m = re.exec(that.date);
      if(m) {
        if(m[4] === undefined) {
          return(new Date(m[1], m[2], m[3]));
        } else {
          return(new Date(m[1], m[2], m[3], m[4], m[5]));
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
        cb(e.topic_ids || {});
      });
    } else {
      cb([]);
    }
  };

  var arrange_topics = function(cb) {
    grab_extant_topics(function(topic_ids) {
      async.eachSeries(that.topic, function(t, t_cb) {
        db.topic.findOne({topic: t}, function(err, t_obj) {
          if(err) { throw(err); }
          if(t_obj) {
            topic_ids.push(t_obj._id);
          }
          t_cb(null);
        });
      }, function(err) {
        if(err) { throw(err); }
        that.add('topic', topic_ids);
        cb(that);  // I suppose I'll still be in this context.
      });
    });
  };

  // privileged
  this.regurgitate = function(cb) {
    arrange_topics(function(that) {
      var doc = {created_at: created_at(), entry: that.entry, subject: that.subject, topic_ids: that.topic, user_id: 1};
      next_id(that._id, function(id) {
        doc._id = id;
        cb(doc);
      });
    });
  };
}
Entry.prototype.add = function(key, value) {
  this[key] = value;
};
Entry.prototype.delete = function(key) {
  delete this[key];
};

module.exports = new Entry();
