'use strict';

exports.keys = 'i7oBLQc43aiDCC9zxYrYNw==';

exports.knex = {
  clients: [
    {
      clientId: 'db1',
      connection: {
        host: '127.0.0.1',
        port: 3306,
        user: 'knextest',
        password: '23234',
        database: 'knextest',
      },
    },
    {
      clientId: 'db2',
      connection: {
        host: '127.0.0.1',
        port: 3306,
        user: 'knextest',
        password: '345345',
        database: 'knextest',
      },
    },
    {
      clientId: 'db3',
      connection: {
        host: '127.0.0.1',
        port: 3306,
        user: 'knextest',
        password: 'admin',
        database: 'knextest',
      },
    },
  ],
  default: {
    dialect: 'mysql2',
  },
  agent: true,
};
