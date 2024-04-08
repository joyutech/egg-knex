'use strict';

const path = require('path');
const _ = require('lodash');

/** 自增运算符 */
const INC_SYMBOL = '$inc';
/** 逻辑运算符 */
const LOGIC_SYMBOLS = [
  '$and', // 对应调用where方法
  '$or'   // 对应调用orWhere方法
];
/** 关系运算符 */
const JUDGE_SYMBOL = {
  '$eq': '=',
  '$neq': '!=',
  '$lt': '<',
  '$gt': '>',
  '$lte': '<=',
  '$gte': '>=',
  '$like': 'LIKE',  // $like对应的判断值应为单个值且需要把%带上
  '$in': 'IN',      // $in对应的判断值应为数组，单个值不报错但没有意义，$in可以省略写成 {a: [1,2,3]}
  '$nin': 'NOT IN'  // $nin对应的判断值应为数组，单个值不报错但没有意义
};
const JUDGE_SYMBOLS = Object.keys(JUDGE_SYMBOL);

/**
 * where复杂条件组装规则说明：
 * 1. 特殊字符指令列表参考上面的 LOGIC_SYMBOLS 和 JUDGE_SYMBOL 定义。
 * 2. 组装规则参考自mongo、toshihikojs，用法比较主流。
 * 3. 组装出来的whereData必须为普通对象(plain object)或普通对象数组。
 * 4. key为字段名(column name)时:
 *    可跟单个值，使用'='运算符。(for example1)
 *    可跟数组，使用'in'运算符。(for example3)
 *    可跟普通对象, 对象的key必须为逻辑运算符(logic symbol)或条件运算符(judge symbol)。(for example4、example5、example6)
 * 5. key为逻辑运算符(logic symbol)时:
 *      父节点已指明字段名(column name):
 *          可跟单个值数组，对数组内的值使用'='运算符组装，元素的组装逻辑由key决定，注意此时不是用'in'了。(for example5)
 *          可跟二维数组，对数组内的数组的值使用'in'运算符，元素的组装逻辑由key决定。(for example5)
 *          可跟普通对象数组，但数组内的普通对象不能出现字段名(column name)为key的情况。(for example6)
 *          可跟普通对象，但普通对象内不能出现字段名(column name)为key的情况。(for example7、example8)
 *      父节点未指明字段名(column name):
 *          可跟普通对象数组，但数组内的普通对象不能出现条件运算符(judge symbol)为key的情况。(for example9)
 *          可跟普通对象，但普通对象内不能再出现条件运算符(judge symbol)为key的情况。(for example10、example11)
 * 6. key为条件运算符(judge symbol)时，父节点必须已指明字段名(column name)，可跟单个值或数组(只针对$in和$nin的情况)。
 * 
 * 注意: 以上规则，未说明可用的即为不可用，请勿以身试法，出bug自负
 * 
 * example1: (`a` = 1 AND `b` = 2)
 * {
 *   a: 1,
 *   b: 2
 * }
 * 
 * example2: (`a` = 1 OR `b` = 2)
 * {
 *   $or: {
 *     a: 1,
 *     b: 2
 *   }
 * }
 * 
 * example3: (`a` IN (1, 2, 3))
 * {
 *   a: [ 1, 2, 3 ]
 * }
 * 
 * example4: (`a` = 1 AND `b` != 2 AND `c` < 3 AND `d` > 4 AND `e` <= 5 AND `f` >= 6 AND `g` LIKE '%hello' AND `h` IN (7, 8) AND `i` NOT IN (9, 10))
 * {
 *   a: { $eq: 1 },
 *   b: { $neq: 2 },
 *   c: { $lt: 3 },
 *   d: { $gt: 4 },
 *   e: { $lte: 5 },
 *   f: { $gte: 6 },
 *   g: { $like: '%hello' },
 *   h: { $in: [ 7, 8 ] },
 *   i: { $nin: [ 9, 10 ]}
 * }
 * 
 * example5: ((`a` = 1 OR `a` = 2 OR `a` = 3) AND (`a` IN (1, 2, 3) AND `a` = 4 AND `a` = 5 AND `a` IN (6, 7)))
 * {
 *   a: {
 *     $or: [
 *       1, 2, 3
 *     ],
 *     $and: [
 *       [ 1, 2, 3 ],
 *       4, 5,
 *       [ 6, 7 ]
 *     ]
 *   }
 * }
 * 
 * example6: (`a` < 3 OR `a` > 6)
 * {
 *   a: {
 *     $or: [
 *       { $lt: 3 },
 *       { $gt: 6 }
 *     ]
 *   }
 * }
 * 
 * example7: (`a` < 3 OR `a` > 6 OR (`a` > 3 AND `a` < 6))
 * {
 *   a: {
 *     $or: {
 *       $lt: 3,
 *       $gt: 6,
 *       $and: { $gt: 3, $lt: 6 }
 *     }
 *   }
 * }
 * 
 * example8: (`a` > 3 AND `a` < 6)
 * {
 *   a: {
 *     $or: {
 *       $and: {
 *         $and: { $gt: 3, $lt: 6 }
 *       }
 *     }
 *   }
 * }
 * 
 * example9: ((`a` = 1 AND `b` = 2) OR (`a` > 3 OR `b` < 4))
 * {
 *   $or: [
 *     { a: 1, b: 2 },
 *     {
 *       $or: {
 *         a: { $gt:3 },
 *         b: { $lt: 4 }
 *       }
 *     }
 *   ]
 * }
 * 
 * example10: ((`a` <= 1 or `a` >= 2) or `b` = 2)
 * {
 *   $or: {
 *       a: {
 *         $or: { $lte: 1, $gte: 2 }
 *       },
 *       b: 2
 *   }
 * }
 * 
 * example11: (((`a` = 1 AND `b` = 2) OR (`a` = 2 AND `b` = 1) OR (`a` > 3 AND `b` < 5) OR ((`a` > 100 OR `a` < -100) AND (`b` > -100 AND `b` < 100))) AND `foo` = 1)
 * {
 *     $and: {
 *         $or: [
 *             { a: 1, b: 2 },
 *             { a: 2, b: 1 },
 *             { a: { $gt: 3 }, b: { $lt: 5 } },
 *             { a: { $or: { $gt: 100, $lt: -100 } }, b: { $gt: -100, $lt: 100 } }
 *         ],
 *         foo: 1
 *     }
 * }
 * 
 * example12: ((`a` = 1 AND `b` = 2) AND (`a` > 3 AND `b` < 6) AND (`a` = 4 OR `b` = 5))
 * [
 *   { a: 1, b: 2},
 *   { a: { $gt: 3 }, b: { $lt: 6 }},
 *   { $or: { a: 4, b: 5 }}
 * ]
 */

/**
 * 把WhereItems的元素组装成WhereFunc
 * @param {*} whereItems 
 * @param {*} logic 
 * @param {*} isSub true表示子节点的WhereFunc组装，false表示根节目的WhereFunc组装
 * @returns 返回WhereFunc，若isSub=true，且whereItems.length==1，则不组装，直接返回whereItems[0]
 */
function makeWhereFunc(whereItems, logic, isSub) {
  if(whereItems.length === 1) {
    let whereItem = whereItems[0];
    if(_.isFunction(whereItem) || isSub === true) {
      // 此时如果执行组装，会导致生成的SQL增加一对多余的小括号，所以应该直接抛给上一层去处理
      return whereItem;
    }
  }

  return (builder) => {
    for(let whereItem of whereItems) {
      if(_.isFunction(whereItem)) {
        if(logic === '$or') {
          builder.orWhere(whereItem);
        } else {
          builder.where(whereItem);
        }
      } else {
        let { key, value, symbol } = whereItem;
        if(logic === '$or') {
          builder.orWhere(key, symbol, value);
        } else {
          builder.where(key, symbol, value);
        }
      }
    }
  };
}

function parseWhereObject(whereObject, logic, isSub) {
  if(!_.isPlainObject(whereObject)) {
    throw new Error('The argument of whereObject is not a plain object');
  }

  logic = logic === '$or' ? '$or' : '$and';

  let whereItems = [];
  let whereKeys = Object.keys(whereObject);
  for(let key of whereKeys) {
    let value = whereObject[key];

    if(JUDGE_SYMBOLS.includes(key)) {
      throw new Error('The argument of whereObject has wrong data format: ' + JSON.stringify(whereObject));
    } else if(LOGIC_SYMBOLS.includes(key)) {
      let whereFunc = _.isArray(value) ? parseWhereArray(value, key, true) : parseWhereObject(value, key, true);
      whereItems.push(whereFunc);
    } else if(_.isPlainObject(value)) {
      let whereFunc = parseWhereValue(key, value, logic);
      whereItems.push(whereFunc);
    } else {
      let symbol = JUDGE_SYMBOL['$eq'];
      if(_.isArray(value)) {
        symbol = JUDGE_SYMBOL['$in'];
      }
      let whereItem = {
        key, value, symbol
      }
      whereItems.push(whereItem);
    }
  }

  return makeWhereFunc(whereItems, logic, isSub);
}

function parseWhereArray(whereArray, logic, isSub) {
  if(!_.isArray(whereArray)) {
    throw new Error('The argument of whereArray is not a array');
  }

  logic = logic === '$or' ? '$or' : '$and';

  let whereItems = [];
  for(let item of whereArray) {
    let whereFunc = parseWhereObject(item, '', true);
    whereItems.push(whereFunc);
  }

  return makeWhereFunc(whereItems, logic, isSub);
}

function parseWhereValue(key, whereValue, logic) {
  logic = logic === '$or' ? '$or' : '$and';

  let whereItems = [];
  if(_.isArray(whereValue)) {
    for(let value of whereValue) {
      if(_.isPlainObject(value)) {
        let whereFunc = parseWhereValue(key, value, logic);
        whereItems.push(whereFunc);
      } else {
        let symbol = JUDGE_SYMBOL['$eq'];
        if(_.isArray(value)) {
          symbol = JUDGE_SYMBOL['$in'];
        }
        let whereItem = {
          key, value, symbol
        }
        whereItems.push(whereItem);
      }
    }
  } else {
    let valueKeys = Object.keys(whereValue);
    for(let symbolKey of valueKeys) {
      let value = whereValue[symbolKey];

      if(LOGIC_SYMBOLS.includes(symbolKey)) {
        let whereFunc = parseWhereValue(key, value, symbolKey);
        whereItems.push(whereFunc);
      } else if(JUDGE_SYMBOLS.includes(symbolKey)) {
        let symbol = JUDGE_SYMBOL[symbolKey];
        let whereItem = {
          key, value, symbol
        }
        whereItems.push(whereItem);
      } else {
        throw new Error('The argument of whereValue has wrong data format: ' + JSON.stringify(whereValue));
      }
    }
  }

  return makeWhereFunc(whereItems, logic, true);
}

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

  getWhereFunc(whereData) {
    if(_.isFunction(whereData)) {
      return whereData;
    } else if(_.isString(whereData)) {
      return (builder) => {
        builder.whereRaw(whereData);
      }
    } else if(_.isArray(whereData)) {
      return parseWhereArray(whereData);
    } else {
      return parseWhereObject(whereData);
    }
  }

  async baseInsert(builder, examples) {
    let query = builder(this.table);
    return await query.insert(examples);
  }

  async baseDel(builder, where) {
    let query = builder(this.table);

    let whereFunc = this.getWhereFunc(where);
    return await query.del().where(whereFunc);
  }

  async baseUpdate(builder, example, where) {
    let query = builder(this.table);

    let whereFunc = this.getWhereFunc(where);

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

    let whereFunc = this.getWhereFunc(where);

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
    let whereFunc = this.getWhereFunc(where);
    if(_.isEmpty(fields)) fields = '*';
    else if(!_.isArray(fields)) fields = [ fields ];

    let query = this.getSelectQuery(builder, options);
    return await query.select(fields).where(whereFunc);
  }

  async baseCount(builder, where) {
    let query = builder(this.table);

    let whereFunc = this.getWhereFunc(where);
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
