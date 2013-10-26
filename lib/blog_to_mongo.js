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

function blog_me(cb) {
  var blog_dir = '/home/polaris/infinite_bliss/elaborations/martenblog';
  console.log('entered blog_me');
  fs.readdir(blog_dir, function(err, files) {
    if(err) { cb(err); }
    async.forEach(files, function(file, cb) {
      console.log(file);
      cb(null);
    }, function(err) {
      if(err) {
        cb(err);
      } else {
        cb(files);
      }
    });
  });
}

client.connect("mongodb://localhost:27017/martenblog", function(err, db) {
  if(err) { return console.dir(err); }
  var coll = db.collection('entry');
  coll.findOne({}, function(err, entry) {
    console.log(entry.entry);
    blog_me(function(arr) {
      JSON.stringify(arr);
      process.exit(0);
    });
  });
});
