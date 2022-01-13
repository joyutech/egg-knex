# @joyu/egg-knex

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-knex.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-knex
[snyk-image]: https://snyk.io/test/npm/egg-knex/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/egg-knex
[download-image]: https://img.shields.io/npm/dm/egg-knex.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-knex

Knex for egg framework by joyu team.

[Knex](http://knexjs.org/) is a "batteries included" SQL query builder for Postgres, MSSQL, MySQL, MariaDB, SQLite3, and Oracle. `Knex` compare to `ali-rds`:

1. support multiple type database system
2. API is all `Promise`, easy to using `async/await`
3. Community-Driven
4. Support `stream`

## Installation

```bash
$ npm i --save @joyu/egg-knex
```

## Configuration

### Install External Dependencies

- using `mysql` default support, there is no need to install any external things
- using `mysql2` install dependency `npm i --save mysql2`
- using `mariadb` install dependency `npm i --save mariasql`
- using `postgres` install dependency `npm i --save pg`
- using `mssql` install dependency `npm i --save mssql`
- using `oracledb` install dependency `npm i --save oracledb`
- using `sqlite` install dependency `npm i --save sqlite3`

### Enable Plugin

Edit `${app_root}/config/plugin.js`:

```js
exports.knex = {
  enable: true,
  package: "egg-knex",
};
```

### Add Configurations

Edit `${app_root}/config/config.${env}.js`:

#### Single data source configuration mysql

```js
exports.knex = {
  client: {
    // database type
    dialect: "mysql",
    // link option
    connection: {
      // host
      host: "mysql.com",
      // port
      port: 3306,
      // username
      user: "mobile_pub",
      // password
      password: "mobile_pub",
      // database
      database: "mobile_pub",
    },
    // connection pool
    pool: { min: 0, max: 5 },
    // acquire connection timeout, millisecond
    acquireConnectionTimeout: 30000,
    loader: {
      // dao load directory
      directory: 'app/dao',
      // mount name
      delegate: 'dao',
      // auto create table(need tableStruct in dao)
      autoCreate: false,
    },
  },
  // load into app, default is open
  app: true,
  // load into agent, default is close
  agent: false,
};
```

##### Usage

```js
const [users] = await app.knex.raw("select * from users where name like ?", [
  "hello%",
]);
```

#### Multiple data sources mysql + postgres + orcaledb

```js
exports.mysql = {
  clients: {
    // clientId, get client instance，to get like app.knex.get('clientId')
    db1: {
      dialect: 'mysql',
      connection: {
        // host
        host: 'mysqlhost',
        // port
        port: '3306',
        // username
        user: 'db',
        // password
        password: '123456',
        // database
        database: 'test',
      },
    },
    db2: {
      dialect: 'postgres',
      connection: {
        ...
      }
    },
    db3: {
      dialect: 'orcaledb',
      connection: {
        ...
      }
    }

    // ...
  },
  // default configuration by all databases
  default: {
    // enable encrypted password
    encryptPassword: true,
  },

  // load into app, default is open
  app: true,
  // load into agent, default is close
  agent: false,
};
```

##### Usage

```js
const mysql = app.knex.get('mysql');
mysql.raw(sql, values).then(...);
const postgres = app.knex.get('postgres');
postgres.raw(sql, values).then(...);
const oracle = app.knex.get('oracle');
postgres.raw(sql, values).then(...);
```

### Create Dao
```js
module.exports = dao => {
  class exampleDao extends dao {
    name = 'example';
    table = 't_example';
    tableStruct = {
      // field
      column: {
        id: 'int(10) unsigned NOT NULL AUTO_INCREMENT',
        code: 'varchar(50) NOT NULL',
      },
      // index
      index: {
        id: { type: 'primary', key: 'id', using: 'BTREE' },
        i_code_type: { type: 'unique', key: [ 'code', 'type' ], using: 'BTREE' },
      },
      // table option
      option: 'ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC'
    };
  };
  
  return exampleDao;
};
```

## CRUD

### Create

[document](http://knexjs.org/#Builder-insert)

#### Single

```js
const result = await app.knex
  .insert({ title: "LiLei" })
  .into("posts");
const insertSuccess = result === 1;
```

#### Batch

```js
const result = await app.knex
  .insert([{ name: "LiLei" }, { name: "Jams" }], "id")
  .into("users");
const insertSuccess = result === 1;
```

> if you want mysql, sqlite, oracle return ids after insert multiple rows,
> you can choose [`batchInsert`](http://knexjs.org/#Utility-BatchInsert),
> it will insert raws one by one in a transaction.

### Read

```js
// get one
const post = await app.knex.first("*").where("id", 12).from("posts");
// query
const results = await app
  .knex("posts")
  .select()
  .where({ status: "draft" })
  .orderBy("created_at", "desc")
  .orderBy("id", "desc")
  .orderByRaw("description DESC NULLS LAST")
  .offset(0)
  .limit(10);

// join
const results = await app
  .knex("posts")
  .innerJoin("groups", "groups.id", "posts.group_id")
  .select("posts.*", "groups.name");
```

### Update

```js
const row = {
  name: "fengmk2",
  otherField: "other field value",
  modifiedAt: app.knex.raw("CURRENT_TIMESTAMP"),
};
// Returns int in "mysql", "sqlite", "oracle"; [] in "postgresql" unless the 'returning' parameter is set.
// following is mysql example
const affectedRowsCount = await app.knex("posts").update({ row }).where(id, 1);

// affectedRowsCount equals 1
```

### Delete

```js
const affectedRows = await app.knex("table").where({ name: "fengmk2" }).del();
```

## Transaction

`egg-knex` support manual/auto commit.

### Manual commit

```js
const trx = await app.knex.transaction();
try {
  await trx.insert(row1).into("table");
  await trx("table").update(row2);
  await trx.commit();
} catch (e) {
  await trx.rollback();
  throw e;
}
```

### Auto commit

```js
const result = await app.knex.transaction(async function transacting(trx) {
  await trx(table).insert(row1);
  await trx(table).update(row2).where(condition);
  return { success: true };
});
```

## Advanced Usage

### Multiple database instance: mysql + postgres + oracledb

Install dependencies:

```bash
$ npm i --save pg orcaledb
```

Add configurations:

```js
exports.knex = {
  clients: {
    // clientId, access the client instance by app.knex.get('mysql')
    mysql: {
      dialect: 'mysql',
      connection: {
        // host
        host: 'mysql.com',
        // port
        port: '3306',
        // username
        user: 'mobile_pub',
        // password
        password: 'password',
        // database
        database: 'mobile_pub',
      },
      postgres: {
        dialect: 'postgres',
        connection: {
          ...
        }
      },
      oracle: {
        dialect: 'oracledb',
        connection: {
          ...
        }
      }
    },
    // ...
  },
  // default configuration for all databases
  default: {
  },
  // load into app, default is open
  app: true,
  // load into agent, default is close
  agent: false,
};
```

Usage:

```js
const mysql = app.knex.get("mysql");
mysql.raw(sql);

const pg = app.knex.get("postgres");
pg.raw(sql);

const oracle = app.knex.get("oracle");
oracle.raw(sql);
```

### Custom SQL splicing

- mysql

```js
const [
  results,
] = await app.knex.raw("update posts set hits = (hits + ?) where id = ?", [
  1,
  postId,
]);
```

- pg

```js
const {
  rows: result,
} = await app.knex.raw("update posts set hits = (hits + ?) where id = ?", [
  1,
  postId,
]);
```

- mssql

```js
const result = await app.knex.raw(
  "update posts set hits = (hits + ?) where id = ?",
  [1, postId]
);
```

>

### Raw

If you want to call literals or functions in mysql , you can use `raw`.

#### Inner Literal

- CURRENT_TIMESTAMP(): The database system current timestamp, you can obtain by `app.knex.fn.now()`.

```js
await app.knex
  .insert({
    create_time: app.knex.fn.now(),
  })
  .into(table);

// INSERT INTO `$table`(`create_time`) VALUES(CURRENT_TIMESTAMP())
```

#### Custom literal

The following demo showed how to call `CONCAT(s1, ...sn)` funtion in mysql to do string splicing.

```js
const first = "James";
const last = "Bond";
await app.knex
  .insert({
    id: 123,
    fullname: app.knex.raw(`CONCAT("${first}", "${last}"`),
  })
  .into(table);

// INSERT INTO `$table`(`id`, `fullname`) VALUES(123, CONCAT("James", "Bond"))
```

## License

[MIT](LICENSE)
