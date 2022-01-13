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

Knex Plugin 为 egg 提供 [Knex](http://knexjs.org/) 的功能，Knex 支持 Postgres, MSSQL, MySQL, MariaDB, SQLite3, 和 Oracle.

> `Knex` 对比 `ali-rds`
>
> 1. 支持的数据库更多
> 2. 接口返回为 `Promise` , 利于使用 `async/await`.
> 3. 支持的方法多，社区驱动，插件多
> 4. 链式调用，支持 `stream`

## 安装

```bash
$ npm i --save @joyu/egg-knex
```

## 配置

### 安装扩展依赖

- 使用 `mysql` 默认支持，无需再安装额外依赖
- 使用 `mysql2` 安装依赖 `npm i --save mysql2`
- 使用 `mariadb` 安装依赖 `npm i --save mariasql`
- 使用 `postgres` 安装依赖 `npm i --save pg`
- 使用 `mssql` 安装依赖 `npm i --save mssql`
- 使用 `oracledb` 安装依赖 `npm i --save oracledb`
- 使用 `sqlite` 安装依赖 `npm i --save sqlite3`

### 启用插件

修改 `config/plugin.js` 启动创建:

```js
exports.knex = {
  enable: true,
  package: "egg-knex",
};
```

### 添加配置

编辑 `${app_root}/config/config.${env}.js`:

#### 单数据源配置 mysql

```js
exports.knex = {
  // 数据库信息配置
  client: {
    // 使用的数据库类型
    dialect: "mysql",
    // 链接配置
    connection: {
      // host
      host: "mysql.com",
      // 端口号
      port: 3306,
      // 用户名
      user: "mobile_pub",
      // 密码
      password: "mobile_pub",
      // 数据库名
      database: "mobile_pub",
    },
    // 连接池
    pool: { min: 0, max: 5 },
    // 获取链接超时时间，单位：毫秒
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
  // 是否加载到 app 上，默认开启
  app: true,
  // 是否加载到 agent 上，默认关闭
  agent: false,
};
```

##### 使用方式

```js
const [users] = await app.knex.raw("select * from users where name like ?", [
  "hello%",
]);
```

#### 多数据源 mysql + postgres + orcaledb

```js
exports.mysql = {
  clients: {
    // clientId, 获取client实例，需要通过 app.knex.get('clientId') 获取
    db1: {
      dialect: 'mysql',
      connection: {
        // host
        host: 'mysqlhost',
        // 端口号
        port: '3306',
        // 用户名
        user: 'db',
        // 密码
        password: '123456',
        // 数据库名
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
  // 所有数据库配置的默认值
  default: {
    // 是否启用加密密码
    encryptPassword: true,
  },

  // 是否加载到 app 上，默认开启
  app: true,
  // 是否加载到 agent 上，默认关闭
  agent: false,
};
```

##### 使用方式

```js
const mysql = app.knex.get('mysql');
mysql.raw(sql, values).then(...);
const postgres = app.knex.get('postgres');
postgres.raw(sql, values).then(...);
const oracle = app.knex.get('oracle');
postgres.raw(sql, values).then(...);
```

### 创建DAO
```js
module.exports = Dao => {
  class exampleDao extends Dao {
    name = 'example';
    table = 't_example';
    tableStruct = {
      // 字段
      column: {
        id: 'int(10) unsigned NOT NULL AUTO_INCREMENT',
        code: 'varchar(50) NOT NULL',
      },
      // 索引
      index: {
        id: { type: 'primary', key: 'id', using: 'BTREE' },
        i_code_type: { type: 'unique', key: [ 'code', 'type' ], using: 'BTREE' },
      },
      // 表选项
      option: 'ENGINE=InnoDB AUTO_INCREMENT=0 DEFAULT CHARSET=utf8 ROW_FORMAT=DYNAMIC'
    };
  };
  
  return exampleDao;
};
```

## CRUD

### Create

[文档](http://knexjs.org/#Builder-insert)

#### 单个

```js
const result = await app.knex
  .insert({ name: "张三" })
  .into("users");
  const insertSuccess = result === 1;
```

#### 批量

```js
const result = await app.knex
  .insert([{ name: "张三" }, { name: "李四" }], "id")
  .into("users");
const insertSuccess = result === 1;
```

> mysql, sqlite, oracle 批量插入的时候仅返回插入的数量, 若具体业务需要返回 id , 
> 可以使用 `knex` 提供的 [`batchInsert`](http://knexjs.org/#Utility-BatchInsert) 方法, 
> 会在一个事务中逐条插入。

### Read

```js
// 获得一个
const post = await app.knex.first().where("id", 12);
// 查询
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
// "mysql", "sqlite", "orace" 的话返回受影响的行数"; "postgresql" 返回数组，如果没有执行 returning 方法，返回空数组 []
const affectedRowsCount = await app.knex("posts").update({ row }).where(id, 1);

// affectedRowsCount equals 1
```

### Delete

```js
const affectedRows = await app.knex("table").where({ name: "fengmk2" }).del();
```

## 事务

knex 支持自动和手动提交

### 手动提交

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

### 自动提交

```js
const result = await app.knex.transaction(async function transacting(trx) {
  await trx(table).insert(row1);
  await trx(table).update(row2).where(condition);
  return { success: true };
});
```

## 进阶

### 多数据库实例: mysql + postgres + oracledb

安装依赖:

```bash
$ npm i --save pg orcaledb
```

添加配置:

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

使用:

```js
const mysql = app.knex.get("mysql");
mysql.raw(sql);

const pg = app.knex.get("postgres");
pg.raw(sql);

const oracle = app.knex.get("oracle");
oracle.raw(sql);
```

### 自定义 SQL 拼接

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

### 原始SQL调用

如果你想在 mysql 中调用语句或函数，你可以使用 `raw`。

#### 内置表达式

- CURRENT_TIMESTAMP(): 数据库当前系统时间戳，通过`app.knex.fn.now()`获取。

```js
await app.knex
  .insert({
    create_time: app.knex.fn.now(),
  })
  .into(table);

// INSERT INTO `$table`(`create_time`) VALUES(CURRENT_TIMESTAMP())
```

#### 自定义表达式

下例展示了如何调用 mysql 内置的`CONCAT(s1, ...sn)`函数，做字符串拼接。

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

### SQL 调优

创建数据库索引或者进行 sql 调优，通常第一步是获取 sql 的 `query plan`，而后再去执行 `explain ${sql}`。
市面上的数据库链接库都没有考虑到这一点，让开发者可以在开发的时候马上获取到每一次 `sql` 的 `query plan`，为了提升开发体验，我们让 `egg-knex` 在 `debug` 模式下可以输出 `query plan` 到日志文件 `egg-knex.log` 以及控制台。

首先，修改配置

> 只建议修改 config.local.js

```js
exports.knex = {
  client: {
    debug: true, // 开启 debug
	...
  }
}
```

query plan 例子：

```bash
2017-08-23 00:33:49,256 INFO 50839 [egg-knex] explain select * from `npm_auth`
=====> result is: {"id":1,"select_type":"SIMPLE","table":"npm_auth","type":"ALL","possible_keys":null,"key":null,"key_len":null,"ref":null,"rows":380,"Extra":null}

```

## License

[MIT](LICENSE)
