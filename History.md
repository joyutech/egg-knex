4.0.0 / 2022-06-17
==================
* chore: update dependencies
* ts: update index.d.ts, fix Application.knex defination
* use mysql2 as default dialect


2.0.11 / 2018-05-15
==================
  * fix: support mysql connection string

2.0.10 / 2018-04-12
==================
  * fix: make rollback working for pg

2.0.9 / 2018-03-05
==================
  * fix: make oracledb run

2.0.8 / 2017-12-22
==================
  * fix: mariadb/mysql 5.5.x version is not support explain sql plan

2.0.7 / 2017-12-15
==================
  * fix: explain sql plan only work on mysql now

2.0.5 / 2017-12-14
==================
  * fix: response of `raw`  will be whatever the underlying sql library

2.0.4 / 2017-12-13
==================
  * fix: dialects have own sql to show table list

2.0.3 / 2017-12-03
==================
  * feat: promisifid transaction support nested transaction
  * fix: rollback catch Promise.TimeoutError is undefined

2.0.2 / 2017-09-17
==================

  * adjust: using custom logger, log file path: logs/egg-knex.log
  * fix: shouldn't co.wrap normal function callback by knex.transaction
  * fix: shouldn't throw error when invoke rollback mannually

2.0.1 / 2017-08-23
==================
  * adjust: using app.coreLogger replace console
  * feat: debug mode will log query plan

2.0.0 / 2017-08-04
==================

  * feat: enhancement config  (#1)
