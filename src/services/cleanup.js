const fs = require('fs');
const path = require('path');
const SyncLog = require('../models/syncLog');
const sequelize = require('../models/database');
const logger = require('../utils/logger');

let cleanupInterval = null;
let isRunning = false;

const defaultConfig = {
  scheduleHour: 3,
  daysToKeep: 30,
  maxLogCount: 10000,
  enableVacuum: true
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function backupDatabase() {
  const dbPath = path.join(__dirname, '../../database/dirun.db');
  const backupDir = path.join(__dirname, '../../database/backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(backupDir, `dirun.db.backup.${timestamp}`);
  
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);
    logger.info('数据库备份完成', { backupPath });
    return backupPath;
  }
  
  return null;
}

async function runCleanup(config = {}) {
  if (isRunning) {
    logger.warn('清理任务正在运行中，跳过本次执行');
    return null;
  }
  
  isRunning = true;
  
  const cfg = { ...defaultConfig, ...config };
  
  try {
    logger.info('开始执行日志清理任务', {
      daysToKeep: cfg.daysToKeep,
      maxLogCount: cfg.maxLogCount
    });
    
    const sizeBefore = SyncLog.getDbFileSize();
    const statsBefore = await SyncLog.getDbStats();
    
    logger.info('清理前状态', {
      totalLogs: statsBefore.total,
      dbSize: formatBytes(sizeBefore),
      earliestRecord: statsBefore.earliestRecord,
      latestRecord: statsBefore.latestRecord
    });
    
    backupDatabase();
    
    let deletedByAge = 0;
    let deletedByCount = 0;
    
    deletedByAge = await SyncLog.cleanOldLogs(cfg.daysToKeep);
    logger.info(`按时间清理完成，删除 ${deletedByAge} 条记录`);
    
    deletedByCount = await SyncLog.cleanExcessLogs(cfg.maxLogCount);
    if (deletedByCount > 0) {
      logger.info(`按数量清理完成，删除 ${deletedByCount} 条记录`);
    }
    
    const totalDeleted = deletedByAge + deletedByCount;
    
    if (totalDeleted > 0 && cfg.enableVacuum) {
      logger.info('执行 VACUUM 压缩数据库...');
      await sequelize.query('VACUUM');
      logger.info('VACUUM 完成');
    }
    
    const sizeAfter = SyncLog.getDbFileSize();
    const statsAfter = await SyncLog.getDbStats();
    
    const result = {
      deletedByAge,
      deletedByCount,
      totalDeleted,
      sizeBefore,
      sizeAfter,
      sizeSaved: sizeBefore - sizeAfter,
      logsBefore: statsBefore.total,
      logsAfter: statsAfter.total
    };
    
    logger.info('清理任务完成', {
      deletedByAge,
      deletedByCount,
      totalDeleted,
      sizeBefore: formatBytes(sizeBefore),
      sizeAfter: formatBytes(sizeAfter),
      sizeSaved: formatBytes(Math.max(0, result.sizeSaved)),
      logsBefore: statsBefore.total,
      logsAfter: statsAfter.total
    });
    
    return result;
  } catch (error) {
    logger.error('清理任务失败', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    isRunning = false;
  }
}

function getNextCleanupDelay(scheduleHour) {
  const now = new Date();
  const next = new Date();
  
  next.setHours(scheduleHour, 0, 0, 0);
  
  if (now >= next) {
    next.setDate(next.getDate() + 1);
  }
  
  return next.getTime() - now.getTime();
}

function startCleanupTask(config = {}) {
  const cfg = { ...defaultConfig, ...config };
  
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  
  const initialDelay = getNextCleanupDelay(cfg.scheduleHour);
  
  logger.info('日志清理任务已配置', {
    scheduleHour: cfg.scheduleHour,
    daysToKeep: cfg.daysToKeep,
    maxLogCount: cfg.maxLogCount,
    firstRunIn: Math.round(initialDelay / 1000 / 60) + ' 分钟'
  });
  
  setTimeout(() => {
    runCleanup(cfg).catch(err => {
      logger.error('定时清理任务执行失败', { error: err.message });
    });
    
    cleanupInterval = setInterval(() => {
      runCleanup(cfg).catch(err => {
        logger.error('定时清理任务执行失败', { error: err.message });
      });
    }, 24 * 60 * 60 * 1000);
  }, initialDelay);
  
  return {
    runCleanup,
    stop: () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        logger.info('日志清理任务已停止');
      }
    }
  };
}

async function getCleanupStats() {
  const stats = await SyncLog.getDbStats();
  const size = SyncLog.getDbFileSize();
  
  return {
    totalLogs: stats.total,
    earliestRecord: stats.earliestRecord,
    latestRecord: stats.latestRecord,
    dbSize: size,
    dbSizeFormatted: formatBytes(size)
  };
}

module.exports = {
  startCleanupTask,
  runCleanup,
  getCleanupStats,
  formatBytes
};
