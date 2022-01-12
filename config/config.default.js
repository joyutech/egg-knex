'use strict';
const path = require('path');
module.exports = app => {
  const exports = {};

  exports.knex = {
    default: {
      dialect: 'mysql',
      connection: {
        database: null,
      },
      pool: { min: 0, max: 5 },
      acquireConnectionTimeout: 30000,
      loader: {
        // dao加载目录
        directory: 'app/dao',
        // 挂载名
        delegate: 'dao',
        // 是否自动创建表（需要配置tableStruct）
        autoCreate: false,
      },
    },
    app: true,
    agent: false,
    // single database instance
    // client: {
    //   dialect: 'mysql',
    //   connection: {
    //     host: 'host',
    //     port: 'port',
    //     user: 'user',
    //     password: 'password',
    //     database: 'database',
    //   },
    //   loader: {
    //     directory: 'app/dao',
    //     delegate: 'dao',
    //     autoCreate: false,
    //   },
    // },
    // multiple datebase instances
    // clients: {
    //   db1: {
    //     dialect: 'pg',
    //     connection: {
    //       host: 'host',
    //       port: 'port',
    //       user: 'user',
    //       password: 'password',
    //       database: 'database',
    //     },
    //     loader: {
    //       daoPath: 'app/dao/db1',
    //       delegate: 'dao1',
    //       autoCreate: false,
    //     },
    //   },
    //   db2: {
    //     dialect: 'oracle',
    //     connection: {
    //       host: 'host',
    //       port: 'port',
    //       user: 'user',
    //       password: 'password',
    //       database: 'database',
    //     },
    //     loader: {
    //       daoPath: 'app/dao/db2',
    //       delegate: 'dao2',
    //       autoCreate: false,
    //     },
    //   },
    // },
  };

  exports.customLogger = {
    knex: {
      file: path.join(app.root, 'logs/egg-knex.log'),
    },
  };

  return exports;
};
