const SyncLogModel = require('./syncLog.model');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { getBeijingTime } = require('../utils/datetime');

async function create(logData) {
  const defaultTimestamp = getBeijingTime();
  
  const logDataToCreate = {
    type: logData.type,
    status: logData.status,
    data: logData.data || null,
    error: logData.error || null,
    timestamp: logData.timestamp || defaultTimestamp
  };
  
  if (logData.idempotencyKey) {
    logDataToCreate.idempotencyKey = logData.idempotencyKey;
  }
  
  try {
    const log = await SyncLogModel.create(logDataToCreate);
    return log.toJSON();
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError' || 
        (err.errors && err.errors.some(e => e.type === 'unique violation'))) {
      const existingLog = await SyncLogModel.findOne({
        where: { idempotencyKey: logData.idempotencyKey }
      });
      if (existingLog) {
        return existingLog.toJSON();
      }
    }
    throw err;
  }
}

async function findAll(options = {}) {
  const where = {};
  
  if (options.type) {
    where.type = options.type;
  }
  
  if (options.status) {
    where.status = options.status;
  }
  
  if (options.startDate && options.endDate) {
    where.timestamp = {
      [Op.between]: [options.startDate, options.endDate]
    };
  }
  
  const total = await SyncLogModel.count({ where });
  
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  const list = await SyncLogModel.findAll({
    where,
    order: [['timestamp', 'DESC']],
    limit: pageSize,
    offset
  });
  
  return { 
    list: list.map(l => l.toJSON()), 
    total 
  };
}

async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  
  const todayLogs = await SyncLogModel.findAll({
    where: {
      timestamp: {
        [Op.like]: `${todayStr}%`
      }
    }
  });
  
  const stats = {
    todayOrders: 0,
    todayInbound: 0,
    todayOutbound: 0,
    todayReturn: 0
  };
  
  todayLogs.forEach(log => {
    switch (log.type) {
      case 'order_created':
        stats.todayOrders++;
        break;
      case 'inbound':
        stats.todayInbound++;
        break;
      case 'outbound':
        stats.todayOutbound++;
        break;
      case 'return_complete':
        stats.todayReturn++;
        break;
    }
  });
  
  return stats;
}

async function addIdempotencyCheck(idempotencyKey) {
  const record = await SyncLogModel.findOne({
    where: { idempotencyKey }
  });
  
  if (!record) {
    return { exists: false, status: null, record: null };
  }
  
  return { exists: true, status: record.status, record: record.toJSON() };
}

async function findByIdempotencyKey(idempotencyKey) {
  const record = await SyncLogModel.findOne({
    where: { idempotencyKey }
  });
  
  return record ? record.toJSON() : null;
}

async function getLogCount() {
  return await SyncLogModel.count();
}

async function getDbStats() {
  const total = await SyncLogModel.count();
  
  let earliestRecord = null;
  let latestRecord = null;
  
  if (total > 0) {
    const earliest = await SyncLogModel.findOne({
      order: [['timestamp', 'ASC']]
    });
    const latest = await SyncLogModel.findOne({
      order: [['timestamp', 'DESC']]
    });
    
    earliestRecord = earliest ? earliest.timestamp : null;
    latestRecord = latest ? latest.timestamp : null;
  }
  
  return {
    total,
    earliestRecord,
    latestRecord
  };
}

function getDbFileSize() {
  const dbPath = path.join(__dirname, '../../database/dirun.db');
  
  try {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      return stats.size;
    }
    return 0;
  } catch (err) {
    return 0;
  }
}

async function cleanOldLogs(daysToKeep = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const cutoffStr = cutoffDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '').slice(0, 19);
  
  const deleted = await SyncLogModel.destroy({
    where: {
      timestamp: {
        [Op.lt]: cutoffStr
      }
    }
  });
  
  return deleted;
}

async function cleanExcessLogs(maxCount = 10000) {
  const total = await SyncLogModel.count();
  
  if (total <= maxCount) {
    return 0;
  }
  
  const toDelete = total - maxCount;
  
  const oldestLogs = await SyncLogModel.findAll({
    order: [['timestamp', 'ASC']],
    limit: toDelete,
    attributes: ['id']
  });
  
  const idsToDelete = oldestLogs.map(log => log.id);
  
  const deleted = await SyncLogModel.destroy({
    where: {
      id: {
        [Op.in]: idsToDelete
      }
    }
  });
  
  return deleted;
}

module.exports = {
  create,
  findAll,
  getStats,
  addIdempotencyCheck,
  findByIdempotencyKey,
  getLogCount,
  getDbStats,
  getDbFileSize,
  cleanOldLogs,
  cleanExcessLogs
};
