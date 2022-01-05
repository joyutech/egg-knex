module.exports = (config, app) =>{

  // 加载dao目录
  const daoPath = config.daoPath || 'app/dao';
  const autoCreate = config.autoCreate;
  const directory = path.join(app.config.baseDir, daoPath);
  app.loader.loadToApp(directory, 'dao', {
    caseStyle: 'lower',
    initializer: (model, opt) => {
      // 第一个参数为 export 的对象
      // 第二个参数为一个对象，只包含当前文件的路径
      // 调用dao导出的函数，传入baseSqlDao基类在函数中继承
      let daoFun = model(require('./lib/baseSqlDao'));
      // 返回dao的实例
      return new daoFun(app);
    },
  });

  if(autoCreate) {
    const daoKey = Object.keys(app.dao);
    daoKey.forEach(element => {
      app.dao[element].createTableIfNotExist();
    });
  }

};