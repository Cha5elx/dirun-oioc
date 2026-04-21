const sequelize = require('./database');
const UserModel = require('./user.model');
const SyncLogModel = require('./syncLog.model');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    await sequelize.query('PRAGMA journal_mode=WAL');
    await sequelize.query('PRAGMA busy_timeout=5000');
    await sequelize.query('PRAGMA foreign_keys=ON');
    console.log('数据库 WAL 模式已启用');
    
    await sequelize.sync({ alter: true });
    console.log('数据库表同步成功');
    
    const adminCount = await UserModel.count();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      await UserModel.create({
        username: 'cangku001',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        lastLoginAt: null
      });
      console.log('默认管理员账号创建成功: cangku001 / 123456');
    }
    
    return true;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return false;
  }
}

module.exports = {
  initDatabase,
  User: require('./user'),
  SyncLog: require('./syncLog')
};
