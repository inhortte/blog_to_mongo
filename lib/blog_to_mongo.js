#!/usr/bin/env node

/*
 * blog_to_mongo
 * https://github.com/inhortte/blog_to_mongo
 *
 * Copyright (c) 2013 Bob Shelton
 * Licensed under the MIT license.
 */

'use strict';

var mongojs  = require('mongojs');
var fs       = require('fs');
var async    = require('async');
var path     = require('path');
var strftime = require('strftime');
var entry    = require('./entry');
var db       = mongojs('mongodb://localhost:27017/martenblog', ['last_cron_access']);
var blog_dir = '/home/polaris/infinite_bliss/elaborations/martenblog';

function parse_entry(entry_text, cb) {
  var e = new entry();
  var parts = entry_text.split("\n\n");
  var header = parts.shift().split("\n");
  e.add('entry', parts.join("\n\n"));
  for(var h in header) {
    var m = /^(\w+):\s+(.+)$/.exec(header[h]);
    if(m) {
      e.add(m[1].toLowerCase(), m[2].trim());
    }
  }
  var topics = e.topic ? e.topic.split(',').map(function(i) { return(i.trim().toLowerCase()); }) : [];
  e.add('topic', topics);
  e.regurgitate(function(doc) {
    doc.date = strftime('%Y%m%d%H%M', new Date(doc.created_at));
    delete doc.created_at;
    doc.topic = topics.join(',');
    delete doc.topic_ids;
    delete doc.user_id;
    cb(doc);
  });
}

function process_entry(c_path, cb) {
  console.log(c_path + ' will have its marrow sucked out');
  fs.readFile(c_path, 'utf8', function(err, data) {
    if(err) { throw(err); }
    parse_entry(data, function(doc) {
      var data = "_id: " + doc._id.toString() +
            "\nDate: " + doc.date +
            "\nSubject: " + doc.subject +
            "\nTopic: " + doc.topic +
            "\n\n" + doc.entry;
      fs.writeFile(c_path, data, function(err) {
        if(err) { throw(err); }
        cb(null);
      });
    });
  });
}

function blog_me(last_access, cb) {
  fs.readdir(blog_dir, function(err, files) {
    if(err) { throw(err); }
    async.each(files, function(file, cb) {
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
