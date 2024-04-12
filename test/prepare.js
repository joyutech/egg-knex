'use strict';

const execSync = require('child_process').execSync;

execSync('mysql -h 127.0.0.1 -uknextest -pknextest -e "create database IF NOT EXISTS knextest;"');
execSync('mysql -h 127.0.0.1 -uknextest -pknextest knextest < test/npm_auth.sql');
console.log('create table success');
