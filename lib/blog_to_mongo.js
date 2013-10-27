#!/usr/bin/env node

/*
 * blog_to_mongo
 * https://github.com/inhortte/blog_to_mongo
 *
 * Copyright (c) 2013 Bob Shelton
 * Licensed under the MIT license.
 */

'use strict';

var mongojs = require('mongojs');
var us = require('underscore-node')._;
var fs = require('fs');
var async = require('async');
var path = require('path');
var db = mongojs('mongodb://localhost:27017/martenblog',
  ['topic', 'entry', 'last_cron_access', 'user']);
var blog_dir = '/home/polaris/infinite_bliss/elaborations/martenblog';

function Entry() {}
Entry.prototype.created_at = function() {
  if(this.date !== undefined) {
    var re = this.date.length == 10 ? /^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/ : /^(\d\d\d\d)(\d\d)(\d\d)$/;
    var m = re.exec(this.date);
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
}
Entry.prototype.regurgitate = function() {
  var doc = {created_at: this.created_at(), entry: this.entry, subject: this.subject};
  if(this._id !== undefined) doc._id = this._id;
  return doc;
}

// d is in the form yymmdd[hhmm]
function make_date(d) {
  var re = d.length == 10 ? /^(\d\d\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/ : /^(\d\d\d\d)(\d\d)(\d\d)$/;
  var m = re.exec(d);
  if(m) {
    if(m[4] === undefined) {
      return(new Date(m[1], m[2], m[3]));
    } else {
      return(new Date(m[1], m[2], m[3], m[4], m[5]));
    }
  } else {
    return(new Date());
  }
}

function parse_entry(entry_text, cb) {
  var entry = new Entry();
  var parts = entry_text.split("\n\n");
  var header = parts.shift().split("\n");
  entry.entry = parts.join("\n\n");
  for(var h in header) {
    var m = /^(\w+):\s+(.+)$/.exec(header[h]);
    if(m) {
      eval("entry." + m[1].toLowerCase() + "=\"" + m[2].trim() + "\"")
    }
  }
  var topics = entry.topic.split(',').map(function(i) { return(i.trim()); });
  delete entry.topic;
  console.log(JSON.stringify(entry.regurgitate()));
//  db.entry.save(doc);
  cb(null);
}

function process_entry(c_path, cb) {
  console.log(c_path + ' will have its marrow sucked out');
  fs.readFile(c_path, 'utf8', function(err, data) {
    if(err) { throw(err); }
    parse_entry(data, function(err) {
      if(err) { throw(err); }
      cb(null);
    });
  });
}

function blog_me(last_access, cb) {
  fs.readdir(blog_dir, function(err, files) {
    if(err) { throw(err); }
    async.eachSeries(files, function(file, cb) {
      var c_path = path.join(blog_dir, file);
      fs.stat(c_path, function(err, stats) {
        if(err) { throw(err); }
        if(stats.mtime > last_access) {
          process_entry(c_path, function(err) {
            if(err) { throw(err); }
            cb(null);
          });
        } else {
          cb(null);
        }
      });
    }, function(err) {
      if(err) { throw(err); }
      cb(null);
    });
  });
}

db.last_cron_access.find().sort({date: -1}).limit(1, function(err, lca) {
  var last_access = lca[0].date;
  lca[0].date = new Date();
  db.last_cron_access.save(lca[0]);
  console.log('comienca...');
  blog_me(last_access, function(err) {
    if(err) { throw(err); }
    console.log('termina...');
    process.exit(0);
  });
});
