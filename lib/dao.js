'use strict';

const path = require('path');
const _ = require('lodash');
const { INC_SYMBOL } = require('./constants');
const { getWhereFunc } = require('./assembler/whereAssembler');

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

  constructor(app, client) {
    this.app = app;
    this.knex = client;
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
      const colName = this.knex.ref(name);
      // 列的定义
      const colDefinition = tableStruct.column[name];
      items.push(`${colName} ${colDefinition}`);
    });
    // 索引
    Object.keys(tableStruct.index).forEach((name) => {
      let { type, key, using } = tableStruct.index[name];
      if(!_.isArray(key)) key = [key];
      key = key.map(val => this.knex.ref(val)).join(',');

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
    const tableName = this.knex.ref(this.table);
    const createSql = `CREATE TABLE ${tableName} (${items.join(',')}) ${tableStruct.option};`;
    if(!hasPrimary) {
      // 没有主键的话，报个警告
      app.knexLogger.warn(`[egg-knex] auto create ${tableName} table are no primary key config`);
    }
    try {
      await this.knex.raw(createSql);
      app.knexLogger.warn(`[egg-knex] auto create ${tableName} table success: ${createSql}`);
    } catch(err) {
      if(err.code === 'ER_TABLE_EXISTS_ERROR')
        app.knexLogger.warn(`[egg-knex] auto create ${tableName} table failed: table is exists`);
      else
        app.knexLogger.error(`[egg-knex] auto create ${tableName} table failed: ${err}`);
    }
  }

  async baseInsert(builder, examples) {
    let query = builder(this.table);
    return await query.insert(examples);
  }

  async baseDel(builder, where) {
    let query = builder(this.table);

    let whereFunc = getWhereFunc(where);
    return await query.del().where(whereFunc);
  }

  async baseUpdate(builder, example, where) {
    let query = builder(this.table);

    let whereFunc = getWhereFunc(where);

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
          throw new Error(`baseUpdate ${this.table} table failed: inc example got NaN value from ${JSON.stringify(example)}`);
        }
      } else {
        updateExample[key] = item;
        continue;
      }
    }
    return await query.update(updateExample).increment(incExample).where(whereFunc);
  }

  // 更新并查找
  async baseUpdateAndFind(builder, example, where) {
    let query = builder(this.table);

    let whereFunc = getWhereFunc(where);

    let updateExample = {};
    let incExample = {};
    for(let key in example) {
      let item = example[key];
      if(!_.isObject(item)) {
        updateExample[key] = item;
        continue;
      }

      let value = item[INC_SYMBOL];
      if(!isNaN(value)) {
        incExample[key] = value;
      }
    }

    await query.update(updateExample).increment(incExample).where(whereFunc);
    let find_query = builder(this.table);
    return await find_query.select().where(whereFunc);
  }

  /**
   * @param {*} builder
   * @param {*} where
   * @param {*} fields
   * @param {Object} options 暂时只支持 limit、offset、order 字段
   * @returns {Array}
   */
  async baseSelect(builder, where, fields, options) {
    let whereFunc = getWhereFunc(where);
    if(_.isEmpty(fields)) fields = '*';
    else if(!_.isArray(fields)) fields = [ fields ];

    let query = this.getSelectQuery(builder, options);
    return await query.select(fields).where(whereFunc);
  }

  async baseCount(builder, where) {
    let query = builder(this.table);

    let whereFunc = getWhereFunc(where);
    let results = await query.count().where(whereFunc);
    if(!results || !results[0]) throw new Error('knex.count() no results return');

    const count = results[0]['count(*)'];
    return count;
  }

  async baseUpsert(builder, examples, duplicateKeys, updateKeys) {
    let query = builder(this.table);

    if(!updateKeys) updateKeys = undefined;
    else if(!_.isArray(updateKeys)) updateKeys = [ updateKeys ];
    return await query.insert(examples).onConflict(duplicateKeys).merge(updateKeys);
  }

  async insert(trx, examples) {
    let builder = trx;
    if(!trx || !trx.isCompleted || !trx.commit || !trx.rollback) {
      // 如果没有传入 trx 事务实例对象，则按普通查询构造器调用处理
      // (默认同时包含 isCompleted、commit 和 rollback 三个方法的对象为事务对象)
      builder = this.knex;
      examples = arguments[0];
    }

    return await this.baseInsert(builder, examples);
  }

  async del(trx, where) {
    let builder = trx;
    if(!trx || !trx.isCompleted || !trx.commit || !trx.rollback) {
      builder = this.knex;
      where = arguments[0];
    }

    return await this.baseDel(builder, where);
  }

  async update(trx, example, where) {
    let builder = trx;
    if(!trx || !trx.isCompleted || !trx.commit || !trx.rollback) {
      builder = this.knex;
      example = arguments[0];
      where = arguments[1];
    }

    return await this.baseUpdate(builder, example, where);
  }

  async updateAndFind(trx, example, where) {
    let builder = trx;
    if(!trx || !trx.isCompleted || !trx.commit || !trx.rollback) {
      builder = this.knex;
      example = arguments[0];
      where = arguments[1];
    }

    await this.baseUpdate(builder, example, where);
    return await this.baseSelect(builder, where);
  }

  async select(trx, where, fields, options) {
    let builder = trx;
    if(!trx || !trx.isCompleted || !trx.commit || !trx.rollback) {
      builder = this.knex;
      where = arguments[0];
      fields = arguments[1];
      options = arguments[2];
    }

    return await this.baseSelect(builder, where, fields, options);
  }

  async count(trx, where) {
    let builder = trx;
    if(!trx || !trx.isCompleted || !trx.commit || !trx.rollback) {
      builder = this.knex;
      where = arguments[0];
    }

    return await this.baseCount(builder, where);
  }

  async upsert(trx, examples, duplicateKeys, updateKeys) {
    let builder = trx;
    if(!trx || !trx.isCompleted || !trx.commit || !trx.rollback) {
      builder = this.knex;
      examples = arguments[0];
      duplicateKeys = arguments[1];
      updateKeys = arguments[2];
    }

    return await this.baseUpsert(builder, examples, duplicateKeys, updateKeys);
  }

  getSelectQuery(builder, options) {
    let query = builder(this.table);

    if(!options) options = {};
    let { limit, offset, order } = options;
    if(limit || limit === 0) query = query.limit(limit);
    if(offset || offset === 0) query = query.offset(offset);
    if(order) query = query.orderBy(order);

    return query;
  }

  getQuery() {
    return this.knex(this.table);
  }

  async getTrx() {
    return await this.knex.transaction();
  }

  async queryRaw(sqlRaw) {
    return await this.knex.raw(sqlRaw);
  }

}

async function loadDao(app, client, config) {
  if (!config.directory) return;

  const dirPath = path.join(app.baseDir, config.directory);
  app.loader.loadToApp(dirPath, config.delegate, {
    caseStyle: 'lower',
    initializer(model, opt) {
      const Dao = model(BaseDao);
      return new Dao(app, client);
    }
  });

  const dao = app[config.delegate];
  if(!config.autoCreate || !dao) return;
  for(let key in dao) {
    await dao[key].autoCreateTable()
  }
}

module.exports = {
  loadDao,
};
