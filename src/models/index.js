const { ensureDb } = require('./jsonDb');
const User = require('./user');
const SyncLog = require('./syncLog');

async function initDatabase() {
  try {
    await ensureDb();
    console.log('数据库初始化成功');
    console.log('默认管理员账号: admin / admin123');
    return true;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return false;
  }
}

module.exports = {
  initDatabase,
  User,
  SyncLog
};
