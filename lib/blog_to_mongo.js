#!/usr/bin/env node

/*
 * blog_to_mongo
 * https://github.com/inhortte/blog_to_mongo
 *
 * Copyright (c) 2013 Bob Shelton
 * Licensed under the MIT license.
 */

'use strict';

var client = require('mongodb').MongoClient;
var fs = require('fs');
var async = require('async');
var path = require('path');

function parse_entry(entry_text, cb) {
  var parts = entry_text.split("\n\n");
  var header = parts.shift().split("\n");
  var entry = parts.join("\n\n");
  header.reduce(function(hash, item) {
    var m = /^(\s+):\s+(.+)$/.exec(item);
    if(m) {
      // merge!
    }
  }, {});
  console.log(JSON.stringify(header));
  cb(null);
}

function blog_me(cb) {
  var blog_dir = '/home/polaris/infinite_bliss/elaborations/martenblog';
  console.log('entered blog_me');
  fs.readdir(blog_dir, function(err, files) {
    if(err) { throw(err); }
    async.forEach(files, function(file, cb) {
      fs.readFile(path.join(blog_dir, file), 'utf8', function(err, data) {
        parse_entry(data, function(err) {
          if(err) { throw(err); }
          cb(null);
        });
      });
    }, function(err) {
      if(err) { throw(err); }
      cb(files);
    });
  });
}

client.connect("mongodb://localhost:27017/martenblog", function(err, db) {
  if(err) { return console.dir(err); }
  var coll = db.collection('entry');
  coll.findOne({}, function(err, entry) {
    console.log(entry.entry);
    blog_me(function(arr) {
      console.log(JSON.stringify(arr));
      process.exit(0);
    });
  });
});
