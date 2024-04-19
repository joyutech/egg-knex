'use strict';

const _ = require('lodash');
const { LOGIC_SYMBOLS, JUDGE_SYMBOL, JUDGE_SYMBOLS } = require('../constants');

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
 * @param {*} isSub true表示子节点的WhereFunc组装，false表示根节点的WhereFunc组装
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

function getWhereFunc(whereData) {
  if(!whereData) whereData = {};

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

module.exports = {
  getWhereFunc,
};
