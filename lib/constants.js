'use strict';

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

module.exports = {
  INC_SYMBOL,
  LOGIC_SYMBOLS,
  JUDGE_SYMBOL,
  JUDGE_SYMBOLS,
};
