'use strict';

exports.keys = 'i7oBLQc43aiDCC9zxYrYNw==';

exports.knex = {
  client: {
    debug: true,
    dialect: 'mysql2',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      user: 'knextest',
      password: 'knextest',
      database: 'knextest',
    },
  },
  agent: true,
};