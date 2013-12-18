#!/bin/zsh

pushd ~/rummaging_round/node.js/martenblog_rest_and_client/tmp
mongodump -h localhost -d martenblog -c entry
mongodump -h localhost -d martenblog -c topic
mongodump -h localhost -d martenblog -c user
mongodump -h localhost -d martenblog -c last_cron_access
mongo ds053718.mongolab.com:53718/martenblog -u inhortte -pv0lecek --eval 'db.entry.remove()'
mongo ds053718.mongolab.com:53718/martenblog -u inhortte -pv0lecek --eval 'db.topic.remove()'
mongo ds053718.mongolab.com:53718/martenblog -u inhortte -pv0lecek --eval 'db.user.remove()'
mongo ds053718.mongolab.com:53718/martenblog -u inhortte -pv0lecek --eval 'db.last_cron_access.remove()'
mongorestore -h ds053718.mongolab.com:53718 -d martenblog -u inhortte -pv0lecek dump/martenblog
rm -rf dump
popd
