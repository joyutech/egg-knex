'use strict';

const path = require('path');
const _ = require('lodash');
const { INC_SYMBOL } = require('./constants');
const { getWhereFunc } = require('./assembler/whereAssembler');

const knex = require('knex');
knexExtend(knex);

/** 基础sql查询操作类 */
class BaseDao {
  //=============子类需要覆盖的属性方法
  name = '';
  // 表名
  table = '';
  // 表结构
  tableStruct = {
    // 字段
    column: {},
    // 索引
    index: {},
    // 表选项（数据库引擎、自增键值、默认字符编码等）
    option: '',
  };

  constructor(app, knexClient) {
    this.app = app;
    this.knexClient = knexClient;
  }

  async autoCreateTable() {
    const { app, tableStruct } = this;

    // 没有定义表结构或者表结构定义不完整，不自动创建
    if(_.isEmpty(tableStruct) || _.isEmpty(tableStruct.column)) return;

    let items = [];
    let hasPrimary = false;// 是否有主键
    // 字段
    Object.keys(tableStruct.column).forEach((name) => {
      // 列名
      const colName = this.knexClient.ref(name);
      // 列的定义
      const colDefinition = tableStruct.column[name];
      items.push(`${colName} ${colDefinition}`);
    });
    // 索引
    Object.keys(tableStruct.index).forEach((name) => {
      let { type, key, using } = tableStruct.index[name];
      if(!_.isArray(key)) key = [key];
      key = key.map(val => this.knexClient.ref(val)).join(',');

      let indexSql;
      if(type === 'primary') {
        hasPrimary = true;
        indexSql = `PRIMARY KEY (${key})`;
      } else if(type==='unique') {
        indexSql = `UNIQUE KEY ${name} (${key})`;
      } else if(type==='normal') {
        indexSql = `KEY ${name} (${key})`;
      }

      if(!indexSql) return;
      if(using) indexSql += ` using ${using}`;
      items.push(indexSql);
    });
    const tableName = this.knexClient.ref(this.table);
    const createSql = `CREATE TABLE ${tableName} (${items.join(',')}) ${tableStruct.option};`;
    if(!hasPrimary) {
      // 没有主键的话，报个警告
      app.knexLogger.warn(`[egg-knex] auto create ${tableName} table are no primary key config`);
    }
    try {
      await this.knexClient.raw(createSql);
      app.knexLogger.warn(`[egg-knex] auto create ${tableName} table success: ${createSql}`);
    } catch(err) {
      if(err.code === 'ER_TABLE_EXISTS_ERROR')
        app.knexLogger.warn(`[egg-knex] auto create ${tableName} table failed: table is exists`);
      else
        app.knexLogger.error(`[egg-knex] auto create ${tableName} table failed: ${err}`);
    }
  }

}

function knexExtend(knex) {

  /**
   * @param {*} trx 可选，事务实例对象
   * @param {*} where
   * @param {*} fields
   * @param {Object} options 暂时只支持 limit、offset、order 字段
   * @returns {Array}
   */
  knex.QueryBuilder.extend('toSelect', function (trx, where, fields, options) {
    let queryBuilder;
    if(trx && trx.isTransaction === true) {
      // 如果没有传入 trx 事务实例对象，则按普通查询构造器调用处理
      // (默认包含 isTransaction=true 标记的对象为事务对象)
      queryBuilder = trx(this._single.table);
    } else {
      queryBuilder = this;
      where = arguments[0];
      fields = arguments[1];
      options = arguments[2];
    }

    if(_.isEmpty(fields)) fields = '*';
    else if(!_.isArray(fields)) fields = [ fields ];

    queryBuilder = this.byOptions(queryBuilder, options);
    const whereFunc = getWhereFunc(where);
    return queryBuilder.select(fields).where(whereFunc);
  });

  knex.QueryBuilder.extend('toInsert', function (trx, examples) {
    let queryBuilder;
    if(trx && trx.isTransaction === true) {
      // 如果没有传入 trx 事务实例对象，则按普通查询构造器调用处理
      // (默认包含 isTransaction=true 标记的对象为事务对象)
      queryBuilder = trx(this._single.table);
    } else {
      queryBuilder = this;
      examples = arguments[0];
    }

    return queryBuilder.insert(examples);
  });

  knex.QueryBuilder.extend('toDelete', function (trx, where) {
    let queryBuilder;
    if(trx && trx.isTransaction === true) {
      // 如果没有传入 trx 事务实例对象，则按普通查询构造器调用处理
      // (默认包含 isTransaction=true 标记的对象为事务对象)
      queryBuilder = trx(this._single.table);
    } else {
      queryBuilder = this;
      where = arguments[0];
    }

    const whereFunc = getWhereFunc(where);
    return queryBuilder.del().where(whereFunc);
  });

  knex.QueryBuilder.extend('toUpdate', function (trx, example, where) {
    let queryBuilder;
    if(trx && trx.isTransaction === true) {
      // 如果没有传入 trx 事务实例对象，则按普通查询构造器调用处理
      // (默认包含 isTransaction=true 标记的对象为事务对象)
      queryBuilder = trx(this._single.table);
    } else {
      queryBuilder = this;
      example = arguments[0];
      where = arguments[1];
    }

    let updateExample = {};
    let incExample = {};
    for(let key in example) {
      let item = example[key];
      if(_.isPlainObject(item) && item[INC_SYMBOL]) {
        // 普通对象且携带 $inc 运算符
        let value = item[INC_SYMBOL];
        // 自增自减值必须是数字，否则直接抛错
        if(!isNaN(value)) {
          incExample[key] = value;
        } else {
          throw new Error(`toUpdate ${this.table} table failed: inc example got NaN value from ${JSON.stringify(example)}`);
        }
      } else {
        updateExample[key] = item;
        continue;
      }
    }

    const whereFunc = getWhereFunc(where);
    return queryBuilder.update(updateExample).increment(incExample).where(whereFunc);
  });

  knex.QueryBuilder.extend('toUpdateAndFind', async function (trx, example, where) {
    let results;

    if(!trx || trx.isTransaction !== true) {
      trx = await this.knexClient.transaction();
      example = arguments[0];
      where = arguments[1];

      try {
        await this.toUpdate(trx, example, where);
        results = await this.toSelect(trx, where);
        await trx.commit();
      } catch(err) {
        await trx.rollback();
        throw err;
      }
    } else {
      await this.toUpdate(trx, example, where);
      results = await this.toSelect(trx, where);
    }

    return results;
  });

  knex.QueryBuilder.extend('toCount', async function (trx, where) {
    let queryBuilder;
    if(trx && trx.isTransaction === true) {
      // 如果没有传入 trx 事务实例对象，则按普通查询构造器调用处理
      // (默认包含 isTransaction=true 标记的对象为事务对象)
      queryBuilder = trx(this._single.table);
    } else {
      queryBuilder = this;
      where = arguments[0];
    }

    const whereFunc = getWhereFunc(where);
    const results = await queryBuilder.count().where(whereFunc);
    if(!results || !results[0]) throw new Error('toCount no results return');

    const count = results[0]['count(*)'];
    return count;
  });

  knex.QueryBuilder.extend('toUpsert', function (trx, examples, duplicateKeys, updateKeys) {
    let queryBuilder;
    if(trx && trx.isTransaction === true) {
      // 如果没有传入 trx 事务实例对象，则按普通查询构造器调用处理
      // (默认包含 isTransaction=true 标记的对象为事务对象)
      queryBuilder = trx(this._single.table);
    } else {
      queryBuilder = this;
      examples = arguments[0];
      duplicateKeys = arguments[1];
      updateKeys = arguments[2];
    }

    if(!updateKeys) updateKeys = undefined;
    else if(!_.isArray(updateKeys)) updateKeys = [ updateKeys ];
    return queryBuilder.insert(examples).onConflict(duplicateKeys).merge(updateKeys);
  });

  knex.QueryBuilder.extend('byOptions', function (queryBuilder, options) {
    if(!options) options = {};
    let { group, order, limit, offset } = options;
    if(limit || limit === 0) queryBuilder.limit(limit);
    if(offset || offset === 0) queryBuilder.offset(offset);
    if(group) queryBuilder.groupBy(group);
    if(order) {
      if(!_.isPlainObject(order)) {
        queryBuilder.orderBy(order);
      } else {
        for(let column in order) {
          let direc = order[column] === 1 ? 'asc' : 'desc';
          queryBuilder.orderBy(column, direc);
        }
      }
    }

    return queryBuilder;
  });

  knex.QueryBuilder.extend('getWhereFunc', function (whereData) {
    return getWhereFunc(whereData);
  });

  knex.QueryBuilder.extend('getTrx', async function() {
    return await this.knexClient.transaction();
  });

  knex.QueryBuilder.extend('getTable', function() {
    return this._single.table;
  });

}

async function loadDao(app, knexClient, config) {
  if (!config.directory) return;

  const dirPath = path.join(app.baseDir, config.directory);
  app.loader.loadToApp(dirPath, config.delegate, {
    caseStyle: 'lower',
    initializer(model, opt) {
      const Dao = model(BaseDao);
      return new Dao(app, knexClient);
    }
  });

  const dao = app[config.delegate];
  if(!dao) return;

  if(config.autoCreate) {
    for(let key in dao) {
      await dao[key].autoCreateTable();
    }
  }

  app[config.delegate] = new Proxy(dao, {
    get: function(target, propertyKey, receiver) {
      if(!Reflect.has(target, propertyKey)) {
        return undefined;
      }

      const targetDao = Reflect.get(target, propertyKey);
      const knexDao = knexClient(targetDao.table);
      knexDao.app = targetDao.app;
      knexDao.knexClient = targetDao.knexClient;
      return knexDao;
    }
  });
}

module.exports = {
  loadDao,
};
