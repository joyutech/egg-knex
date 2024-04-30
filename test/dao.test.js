'use strict';

const should = require('should');
const mm = require('egg-mock');
const utility = require('utility');

describe('test/dao.test.js', () => {
  let app;
  const now = new Date();
  const uid = utility.randomString();
  const username1 = `egg-${uid}-1`;
  const username2 = `egg-${uid}-2`;
  const username3 = `egg-${uid}-3`;
  const password = '12345';

  before(async () => {
    app = mm.app({
      baseDir: 'apps/mysqlapp-dao',
      plugin: true,
    });
    await app.ready();

    should.exist(app.knex);
    should.exist(app.dao);
    should.exist(app.dao.user);
  });

  beforeEach(async () => {
    // 先初始化测试数据，避免为空
    const userDao = app.dao.user;
    await userDao.insert([
      {
        username: username1,
        password,
        create_time: now,
      },
      {
        username: username2,
        password,
        create_time: now,
      },
      {
        username: username3,
        password,
        create_time: now,
      },
    ]);
  });

  afterEach(async () => {
    // 清空测试数据
    const userDao = app.dao.user;
    await userDao.del().where('username', 'like', `egg-${uid}%`);
  });

  afterEach(() => {
    mm.restore();
  });

  after(async () => {
    await app.knex.destroy();
  });

  describe('dao.toSelect', () => {
    it('should select single success', async () => {
      const where = {
        username: username1,
      };
      const fields = [ 'username' ];
      const userDao = app.dao.user;
      const results = await userDao.toSelect(where, fields);
      results.should.be.an.Array().and.containDeep([
        { username: username1 },
      ]);
    });

    it('should select many success', async () => {
      const where = {
        $or: [
          { username: username1 },
          { username: username2 },
          { username: username3 },
        ],
      };
      const fields = [ 'username' ];
      const userDao = app.dao.user;
      const results = await userDao.toSelect(where, fields);
      results.should.be.an.Array().and.containDeep([
        { username: username1 },
        { username: username2 },
        { username: username3 },
      ]);
    });
  });

  describe('dao.toInsert', () => {
    const username4 = `egg-${uid}-4`;
    const username5 = `egg-${uid}-5`;
    const username6 = `egg-${uid}-6`;

    it('should insert single success', async () => {
      const where = {
        username: username4,
      };
      const fields = [ 'username' ];
      let userDao = app.dao.user;
      let results = await userDao.toSelect(where, fields);
      results.should.be.an.Array().and.be.empty();

      const examples = [
        {
          username: username4,
          password,
          create_time: now,
        },
      ];
      userDao = app.dao.user;
      await userDao.toInsert(examples);

      userDao = app.dao.user;
      results = await userDao.toSelect(where, fields);
      results.should.be.an.Array().and.containDeep([
        { username: username4 },
      ]);
    });

    it('should insert many success', async () => {
      const where = {
        $or: [
          { username: username4 },
          { username: username5 },
          { username: username6 },
        ],
      };
      const fields = [ 'username' ];
      let userDao = app.dao.user;
      let results = await userDao.toSelect(where, fields);
      results.should.be.an.Array().and.be.empty();

      const examples = [
        {
          username: username4,
          password,
          create_time: now,
        },
        {
          username: username5,
          password,
          create_time: now,
        },
        {
          username: username6,
          password,
          create_time: now,
        },
      ];
      userDao = app.dao.user;
      await userDao.toInsert(examples);

      userDao = app.dao.user;
      results = await userDao.toSelect(where, fields);
      results.should.be.an.Array().and.containDeep([
        { username: username4 },
        { username: username5 },
        { username: username6 },
      ]);
    });
  });

  describe('dao.toDelete', () => {
    it('should delete single success', async () => {
      const where = {
        username: username1,
      };
      const fields = [ 'username' ];
      let userDao = app.dao.user;
      let results = await userDao.toSelect(where, fields);
      results.should.be.an.Array().and.containDeep([
        { username: username1 },
      ]);

      userDao = app.dao.user;
      await userDao.toDelete(where);

      userDao = app.dao.user;
      results = await userDao.toSelect(where, fields);
      results.should.be.an.Array().and.be.empty();
    });

    it('should delete many success', async () => {
      const where = {
        $or: [
          { username: username1 },
          { username: username2 },
          { username: username3 },
        ],
      };
      const fields = [ 'username' ];
      let userDao = app.dao.user;
      let results = await userDao.toSelect(where, fields);
      results.should.be.an.Array().and.containDeep([
        { username: username1 },
        { username: username2 },
        { username: username3 },
      ]);

      userDao = app.dao.user;
      await userDao.toDelete(where);

      userDao = app.dao.user;
      results = await userDao.toSelect(where, fields);
      results.should.be.an.Array().and.be.empty();
    });
  });

  describe('dao.toUpdate', () => {
    it('should update single success', async () => {
      const where = {
        username: username1,
      };
      let userDao = app.dao.user;
      let results = await userDao.toSelect(where);
      results.should.be.an.Array().and.containDeep([
        { username: username1, password },
      ]);

      const newPassword = '54321';
      const example = {
        password: newPassword,
      };
      userDao = app.dao.user;
      await userDao.toUpdate(example, where);

      userDao = app.dao.user;
      results = await userDao.toSelect(where);
      results.should.be.an.Array().and.containDeep([
        { username: username1, password: newPassword },
      ]);
    });

    it('should update many success', async () => {
      const where = {
        $or: [
          { username: username1 },
          { username: username2 },
          { username: username3 },
        ],
      };
      let userDao = app.dao.user;
      let results = await userDao.toSelect(where);
      results.should.be.an.Array().and.containDeep([
        { username: username1, password },
        { username: username2, password },
        { username: username3, password },
      ]);

      const newPassword = '54321';
      const example = {
        password: newPassword,
      };
      userDao = app.dao.user;
      await userDao.toUpdate(example, where);

      userDao = app.dao.user;
      results = await userDao.toSelect(where);
      results.should.be.an.Array().and.containDeep([
        { username: username1, password: newPassword },
        { username: username2, password: newPassword },
        { username: username3, password: newPassword },
      ]);
    });
  });

  describe('dao.toUpdateAndFind', () => {
    it('should update and find single success', async () => {
      const where = {
        username: username1,
      };
      let userDao = app.dao.user;
      let results = await userDao.toSelect(where);
      results.should.be.an.Array().and.containDeep([
        { username: username1, password },
      ]);

      const newPassword = '54321';
      const example = {
        password: newPassword,
      };
      userDao = app.dao.user;
      results = await userDao.toUpdateAndFind(example, where);
      results.should.be.an.Array().and.containDeep([
        { username: username1, password: newPassword },
      ]);
    });

    it('should update and find many success', async () => {
      const where = {
        $or: [
          { username: username1 },
          { username: username2 },
          { username: username3 },
        ],
      };
      let userDao = app.dao.user;
      let results = await userDao.toSelect(where);
      results.should.be.an.Array().and.containDeep([
        { username: username1, password },
        { username: username2, password },
        { username: username3, password },
      ]);

      const newPassword = '54321';
      const example = {
        password: newPassword,
      };
      userDao = app.dao.user;
      results = await userDao.toUpdateAndFind(example, where);
      results.should.be.an.Array().and.containDeep([
        { username: username1, password: newPassword },
        { username: username2, password: newPassword },
        { username: username3, password: newPassword },
      ]);
    });
  });

  describe('dao.toCount', () => {
    it('should count 1 success', async () => {
      const where = {
        username: username1,
      };
      const userDao = app.dao.user;
      const results = await userDao.toCount(where);
      results.should.be.equal(1);
    });

    it('should count 3 success', async () => {
      const where = {
        $or: [
          { username: username1 },
          { username: username2 },
          { username: username3 },
        ],
      };
      const userDao = app.dao.user;
      const results = await userDao.toCount(where);
      results.should.be.equal(3);
    });
  });

  describe('dao.toUpsert', () => {
    const username7 = `egg-${uid}-7`;
    const username8 = `egg-${uid}-8`;
    const username9 = `egg-${uid}-9`;

    it('should upsert single success', async () => {
      const where = {
        username: username7,
      };
      let userDao = app.dao.user;
      let results = await userDao.toSelect(where);
      results.should.be.an.Array().and.be.empty();

      const examples = [
        {
          username: username7,
          password,
          create_time: now,
        },
      ];
      userDao = app.dao.user;
      const duplicateKeys = [ 'username' ];
      const updateKeys = [ 'password' ];
      await userDao.toUpsert(examples, duplicateKeys, updateKeys);

      userDao = app.dao.user;
      results = await userDao.toSelect(where);
      results.should.be.an.Array().and.containDeep([
        { username: username7, password },
      ]);

      const newPassword = '54321';
      for(let example of examples) {
        example[ 'password' ] = newPassword;
      }
      userDao = app.dao.user;
      await userDao.toUpsert(examples, duplicateKeys, updateKeys);

      userDao = app.dao.user;
      results = await userDao.toSelect(where);
      results.should.be.an.Array().and.containDeep([
        { username: username7, password: newPassword },
      ]);
    });

    it('should upsert many success', async () => {
      const where = {
        $or: [
          { username: username7 },
          { username: username8 },
          { username: username9 },
        ],
      };
      let userDao = app.dao.user;
      let results = await userDao.toSelect(where);
      results.should.be.an.Array().and.be.empty();

      const examples = [
        {
          username: username7,
          password,
          create_time: now,
        },
        {
          username: username8,
          password,
          create_time: now,
        },
        {
          username: username9,
          password,
          create_time: now,
        },
      ];
      userDao = app.dao.user;
      const duplicateKeys = [ 'username' ];
      const updateKeys = [ 'password' ];
      await userDao.toUpsert(examples, duplicateKeys, updateKeys);

      userDao = app.dao.user;
      results = await userDao.toSelect(where);
      results.should.be.an.Array().and.containDeep([
        { username: username7, password },
        { username: username8, password },
        { username: username9, password },
      ]);

      const newPassword = '54321';
      for(let example of examples) {
        example[ 'password' ] = newPassword;
      }
      userDao = app.dao.user;
      await userDao.toUpsert(examples, duplicateKeys, updateKeys);

      userDao = app.dao.user;
      results = await userDao.toSelect(where);
      results.should.be.an.Array().and.containDeep([
        { username: username7, password: newPassword },
        { username: username8, password: newPassword },
        { username: username9, password: newPassword },
      ]);
    });
  });

  describe('dao.byOptions', () => {
    const optionsArray = [
      {
        raw: '',
        data: {},
      },
      {
        raw: 'group by `a` order by `b` asc limit 2 offset 3',
        data: {
          group: 'a',
          order: 'b',
          limit: 2,
          offset: 3,
        },
      },
      {
        raw: 'group by `a`, `b`, `c`',
        data: {
          group: [ 'a', 'b', 'c' ],
        }
      },
      {
        raw: 'order by `a` asc, `b` asc, `c` asc',
        data: {
          order: [ 'a', 'b', 'c' ],
        }
      },
      {
        raw: 'order by `a` asc, `b` desc, `c` desc',
        data: {
          order: {
            'a': 1,
            'b': -1,
            'c': -1,
          },
        }
      },
    ];
    for(let i=0; i<optionsArray.length; i++) {
      const optionsItem = optionsArray[i];
      const optionsRaw = optionsItem.raw;
      const optionsData = optionsItem.data;

      it(`example${i}:should be ${optionsRaw ? optionsRaw : 'no order by, group by, limit, offset'}`, () => {
        const userDao = app.dao.user;
        const sqlRaw = userDao.byOptions(userDao, optionsData).toString();
        if(optionsRaw) {
          sqlRaw.should.containEql(optionsRaw);
        } else {
          sqlRaw.should.not.containEql('order by');
          sqlRaw.should.not.containEql('group by');
          sqlRaw.should.not.containEql('limit');
          sqlRaw.should.not.containEql('offset');
        }
      });
    }
  });

  describe('dao.getWhereFunc', () => {
    const whereArray = [
      {
        raw: '',
        data: {},
      },
      {
        raw: 'where (`a` = 1 and `b` = 2)',
        data: {
          a: 1,
          b: 2,
        },
      },
      {
        raw: 'where (`a` = 1 or `b` = 2)',
        data: {
          $or: {
            a: 1,
            b: 2,
          }
        }
      },
      {
        raw: 'where (`a` in (1, 2, 3))',
        data: {
          a: [ 1, 2, 3 ]
        },
      },
      {
        raw: 'where (`a` = 1 and `b` != 2 and `c` < 3 and `d` > 4 and `e` <= 5 and `f` >= 6 and `g` like \'%hello\' and `h` in (7, 8) and `i` not in (9, 10))',
        data: {
          a: { $eq: 1 },
          b: { $neq: 2 },
          c: { $lt: 3 },
          d: { $gt: 4 },
          e: { $lte: 5 },
          f: { $gte: 6 },
          g: { $like: '%hello' },
          h: { $in: [ 7, 8 ] },
          i: { $nin: [ 9, 10 ]}
        },
      },
      {
        raw: 'where ((`a` = 1 or `a` = 2 or `a` = 3) and (`a` in (1, 2, 3) and `a` = 4 and `a` = 5 and `a` in (6, 7)))',
        data: {
          a: {
            $or: [
              1, 2, 3
            ],
            $and: [
              [ 1, 2, 3 ],
              4, 5,
              [ 6, 7 ]
            ]
          }
        },
      },
      {
        raw: 'where (`a` < 3 or `a` > 6)',
        data: {
          a: {
            $or: [
              { $lt: 3 },
              { $gt: 6 }
            ]
          }
        },
      },
      {
        raw: 'where (`a` < 3 or `a` > 6 or (`a` > 3 and `a` < 6))',
        data: {
          a: {
            $or: {
              $lt: 3,
              $gt: 6,
              $and: { $gt: 3, $lt: 6 }
            }
          }
        },
      },
      {
        raw: 'where (`a` > 3 and `a` < 6)',
        data: {
          a: {
            $or: {
              $and: {
                $and: { $gt: 3, $lt: 6 }
              }
            }
          }
        },
      },
      {
        raw: 'where ((`a` = 1 and `b` = 2) or (`a` > 3 or `b` < 4))',
        data: {
          $or: [
            { a: 1, b: 2 },
            {
              $or: {
                a: { $gt:3 },
                b: { $lt: 4 }
              }
            }
          ]
        },
      },
      {
        raw: 'where ((`a` <= 1 or `a` >= 2) or `b` = 2)',
        data: {
          $or: {
            a: {
              $or: { $lte: 1, $gte: 2 }
            },
            b: 2
          }
        },
      },
      {
        raw: 'where (((`a` = 1 and `b` = 2) or (`a` = 2 and `b` = 1) or (`a` > 3 and `b` < 5) or ((`a` > 100 or `a` < -100) and (`b` > -100 and `b` < 100))) and `foo` = 1)',
        data: {
          $and: {
            $or: [
              { a: 1, b: 2 },
              { a: 2, b: 1 },
              { a: { $gt: 3 }, b: { $lt: 5 } },
              { a: { $or: { $gt: 100, $lt: -100 } }, b: { $gt: -100, $lt: 100 } }
            ],
            foo: 1
          }
        },
      },
      {
        raw: 'where ((`a` = 1 and `b` = 2) and (`a` > 3 and `b` < 6) and (`a` = 4 or `b` = 5))',
        data: [
          {},
          { a: 1, b: 2},
          { a: { $gt: 3 }, b: { $lt: 6 }},
          {},
          {},
          { $or: { a: 4, b: 5 }}
        ],
      },
    ];
    for(let i=0; i<whereArray.length; i++) {
      const whereItem = whereArray[i];
      const whereRaw = whereItem.raw;
      const whereData = whereItem.data;

      it(`example${i}:should be ${whereRaw ? whereRaw : 'no where'}`, () => {
        const userDao = app.dao.user;
        const whereFunc = userDao.getWhereFunc(whereData);
        const sqlRaw = userDao.where(whereFunc).toString();
        if(whereRaw) sqlRaw.should.containEql(whereRaw);
        else sqlRaw.should.not.containEql('where');
      });
    }
  });

  describe('dao.getTrx', () => {
    const username10 = `egg-${uid}-10`;

    it('should using transaction commit success', async () => {
      const where1 = {
        username: username1,
      };
      const where10 = {
        username: username10,
      };
      const fields = [ 'username' ];
      const examples10 = [
        {
          username: username10,
          password,
          create_time: now,
        },
      ];

      let userDao = app.dao.user;
      const trx = await userDao.getTrx();
      await userDao.toDelete(trx, where1);
      await userDao.toInsert(trx, examples10);

      userDao = app.dao.user;
      let results = await userDao.toSelect(where1, fields);
      results.should.be.an.Array().and.containDeep([
        { username: username1 },
      ]);

      userDao = app.dao.user;
      results = await userDao.toSelect(where10, fields);
      results.should.be.an.Array().and.be.empty();

      await trx.commit();

      userDao = app.dao.user;
      results = await userDao.toSelect(where1, fields);
      results.should.be.an.Array().and.be.empty();

      userDao = app.dao.user;
      results = await userDao.toSelect(where10, fields);
      results.should.be.an.Array().and.containDeep([
        { username: username10 },
      ]);
    });

    it('should using transaction rollback success', async () => {
      const where1 = {
        username: username1,
      };
      const where10 = {
        username: username10,
      };
      const fields = [ 'username' ];
      const examples10 = [
        {
          username: username10,
          password,
          create_time: now,
        },
      ];

      let userDao = app.dao.user;
      const trx = await userDao.getTrx();
      await userDao.toDelete(trx, where1);
      await userDao.toInsert(trx, examples10);

      let results = await userDao.toSelect(trx, where1, fields);
      results.should.be.an.Array().and.be.empty();

      results = await userDao.toSelect(trx, where10, fields);
      results.should.be.an.Array().and.containDeep([
        { username: username10 },
      ]);

      await trx.rollback();

      userDao = app.dao.user;
      results = await userDao.toSelect(where1, fields);
      results.should.be.an.Array().and.containDeep([
        { username: username1 },
      ]);

      userDao = app.dao.user;
      results = await userDao.toSelect(where10, fields);
      results.should.be.an.Array().and.be.empty();
    });
  });

  describe('dao.getTable', () => {
    it('should return right tableName', async () => {
      const userDao = app.dao.user;
      const tableName = userDao.getTable();
      tableName.should.be.equal('t_user');
    });
  });
});
