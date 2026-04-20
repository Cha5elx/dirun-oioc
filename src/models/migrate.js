const fs = require('fs');
const path = require('path');
const sequelize = require('./database');
const UserModel = require('./user.model');
const SyncLogModel = require('./syncLog.model');

async function migrateData() {
  const dbJsonPath = path.join(__dirname, '../../database/db.json');
  
  if (!fs.existsSync(dbJsonPath)) {
    console.log('db.json 文件不存在，跳过迁移');
    return false;
  }
  
  const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
  
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    await sequelize.sync({ force: true });
    console.log('数据库表创建成功');
    
    if (dbData.users && dbData.users.length > 0) {
      for (const user of dbData.users) {
        await UserModel.create({
          id: user.id,
          username: user.username,
          password: user.password,
          role: user.role,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }, { hooks: false });
      }
      console.log(`迁移用户数据: ${dbData.users.length} 条`);
    }
    
    if (dbData.syncLogs && dbData.syncLogs.length > 0) {
      for (const log of dbData.syncLogs) {
        await SyncLogModel.create({
          id: log.id,
          type: log.type,
          status: log.status,
          data: log.data,
          error: log.error,
          timestamp: log.timestamp
        });
      }
      console.log(`迁移同步日志数据: ${dbData.syncLogs.length} 条`);
    }
    
    const backupPath = path.join(__dirname, '../../database/db.json.backup');
    fs.renameSync(dbJsonPath, backupPath);
    console.log(`原 db.json 已备份为: ${backupPath}`);
    
    return true;
  } catch (error) {
    console.error('数据迁移失败:', error);
    throw error;
  }
}

migrateData()
  .then(() => {
    console.log('数据迁移完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('迁移出错:', err);
    process.exit(1);
  });
