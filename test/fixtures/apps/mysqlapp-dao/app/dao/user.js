'use strict';

module.exports = Dao => {
  class UserDao extends Dao {
    name = '用户表';
    table = 't_user';
    tableStruct = {
      // 字段
      column: {
        id: `int unsigned NOT NULL AUTO_INCREMENT`,
        // 用户名字
        username: `varchar(50) NOT NULL DEFAULT ''`,
        // 用户密码
        password: `varchar(255) NOT NULL DEFAULT ''`,
        // 创建时间
        create_time: `datetime DEFAULT NULL`,
      },
      // 索引
      index: {
        id: { type: 'primary', key: 'id', },
        AK_username: { type: 'unique', key: 'username', },
      },
      // 表选项
      option: 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ROW_FORMAT=Dynamic',
    };
  };

  return UserDao;
};
