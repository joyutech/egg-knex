const path = require('path');
module.exports = (config, app) =>{

  // 加载dao目录
  const daoPath = config.daoPath || 'app/dao';
  const autoCreate = config.autoCreate;
  const directory = path.join(app.config.baseDir, daoPath);
  const baseDao = require('./baseSqlDao');
  app.loader.loadToApp(directory, 'dao', {
    caseStyle: 'lower',
    initializer: (model, opt) => {
      // 第一个参数为 export 的对象
      // 第二个参数为一个对象，只包含当前文件的路径
      // 传入baseSqlDao基类在函数中继承
      let daoFun = model(baseDao);
      let daoBean = new daoFun(app);
      if(app.config.knex.clients) {
        // 多连接的情况
        if(!daoBean.db) {
          // 多连接情况下，必须指定db，不然返回null，不加载这个dao
          app.logger.warn(`dao: ${daoBean.name} is no db in multiple database instance.`);
          return null;
        }
        daoBean.setKnex(app.knex.get(daoBean.db));
      }else{
        // 单连接的情况
        daoBean.setKnex(app.knex);
      }
      // 返回dao的实例
      return daoBean;
    },
  });

  if(autoCreate) {
    const daoKey = Object.keys(app.dao);
    daoKey.forEach(element => {
      app.dao[element].createTableIfNotExist();
    });
  }

};