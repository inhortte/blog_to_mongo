#!/usr/bin/env node

/*
 * blog_to_mongo
 * https://github.com/inhortte/blog_to_mongo
 *
 * Copyright (c) 2013 Bob Shelton
 * Licensed under the MIT license.
 */

'use strict';

var mongojs      = require('mongojs');
var fs           = require('fs');
var async        = require('async');
var path         = require('path');
var strftime     = require('strftime');
var entry_module = require('./entry');
var db           = mongojs('mongodb://localhost:27017/martenblog', ['last_cron_access']);
var blog_dir     = '/home/polaris/infinite_bliss/elaborations/martenblog';

function gatherEntry(c_path, cb) {
  console.log('sucking the marrow from ' + c_path);
  fs.readFile(c_path, 'utf8', function(err, data) {
    if(err) { throw err; }
    var entry = entry_module.newEntry();
    entry.add('path', c_path);
    var parts = data.split("\n\n");
    var header = parts.shift().split("\n");
    entry.add('entry', parts.join("\n\n"));
    for(var h in header) {
      var m = /^(\w+):\s+(.+)$/.exec(header[h]);
      if(m) {
        entry.add(m[1].toLowerCase(), m[2].trim());
      }
    }
    cb();
  });
}

function blogMe(last_access, cb) {
  fs.readdir(blog_dir, function(err, files) {
    if(err) { throw(err); }
    async.each(files, function(file, cb) {
      var c_path = path.join(blog_dir, file);
      fs.stat(c_path, function(err, stats) {
        if(err) { throw(err); }
        if(stats.mtime > last_access) {
          gatherEntry(c_path, function(err) {
            if(err) { throw(err); }
            console.log(c_path + ' is empty.')
            cb(null);
          });
        } else {
          cb(null);
        }
      });
    }, function(err) {
         if(err) { throw err; }
         console.log('All files are now bereft of marrow.');
         entry_module.processAll(function(docs) {
           console.log('distributing the processed marrow.');
           async.each(docs, function(doc, cb) {
             var data = "_id: " + doc._id.toString() +
               "\nDate: " + strftime('%Y%m%d%H%M', new Date(doc.created_at)) +
               "\nSubject: " + doc.subject +
               "\nTopic: " + doc.topics +
               "\n\n" + doc.entry;
             fs.writeFile(doc.path, data, function(err) {
               if(err) { throw(err); }
               console.log(doc.path + ' distributed.');
               cb(null);
             });
           }, function(err) {
                if(err) { throw(err); }
                cb(null);
              });
         });
       });
  });
}

db.last_cron_access.find().sort({date: -1}).limit(1, function(err, lca) {
  var last_access = lca[0].date;
  lca[0].date = new Date();
  db.last_cron_access.save(lca[0]);
  console.log('comienca...');
  blogMe(last_access, function(err) {
    if(err) { throw(err); }
    console.log('termina...');
    process.exit(0);
  });
});
