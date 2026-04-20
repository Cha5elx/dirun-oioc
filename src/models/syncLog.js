const SyncLogModel = require('./syncLog.model');
const { Op } = require('sequelize');

async function create(logData) {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const defaultTimestamp = beijingTime.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  
  const log = await SyncLogModel.create({
    type: logData.type,
    status: logData.status,
    data: logData.data || null,
    error: logData.error || null,
    timestamp: logData.timestamp || defaultTimestamp
  });
  
  return log.toJSON();
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

module.exports = {
  create,
  findAll,
  getStats
};
