const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database/dirun.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('无法连接数据库:', err);
    process.exit(1);
  }
  console.log('已连接数据库');
});

db.serialize(() => {
  console.log('开始迁移 sync_logs 表...');
  
  db.run('BEGIN TRANSACTION', (err) => {
    if (err) {
      console.error('开始事务失败:', err);
      return;
    }
    
    db.run(`
      CREATE TABLE IF NOT EXISTS sync_logs_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        data TEXT,
        error TEXT,
        timestamp VARCHAR(50) NOT NULL,
        idempotencyKey VARCHAR(100) UNIQUE
      )
    `, (err) => {
      if (err) {
        console.error('创建新表失败:', err);
        db.run('ROLLBACK');
        return;
      }
      console.log('创建新表成功');
      
      db.run(`
        INSERT INTO sync_logs_new (id, type, status, data, error, timestamp, idempotencyKey)
        SELECT id, type, status, data, error, timestamp, NULL FROM sync_logs
      `, (err) => {
        if (err) {
          console.error('复制数据失败:', err);
          db.run('ROLLBACK');
          return;
        }
        console.log('数据复制成功');
        
        db.run('DROP TABLE sync_logs', (err) => {
          if (err) {
            console.error('删除旧表失败:', err);
            db.run('ROLLBACK');
            return;
          }
          console.log('删除旧表成功');
          
          db.run('ALTER TABLE sync_logs_new RENAME TO sync_logs', (err) => {
            if (err) {
              console.error('重命名表失败:', err);
              db.run('ROLLBACK');
              return;
            }
            console.log('重命名表成功');
            
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('提交事务失败:', err);
                return;
              }
              console.log('迁移完成！');
              db.close();
            });
          });
        });
      });
    });
  });
});
