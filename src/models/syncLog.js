const { readDb, writeDb } = require('./jsonDb');

async function create(logData) {
  const db = readDb();
  const maxId = db.syncLogs.reduce((max, l) => Math.max(max, l.id || 0), 0);
  
  const log = {
    id: maxId + 1,
    type: logData.type,
    status: logData.status,
    data: logData.data || null,
    error: logData.error || null,
    timestamp: logData.timestamp || new Date().toISOString()
  };
  
  db.syncLogs.push(log);
  writeDb(db);
  
  return log;
}

async function findAll(options = {}) {
  const db = readDb();
  let logs = [...db.syncLogs];
  
  if (options.type) {
    logs = logs.filter(l => l.type === options.type);
  }
  
  if (options.status) {
    logs = logs.filter(l => l.status === options.status);
  }
  
  if (options.startDate && options.endDate) {
    const start = new Date(options.startDate);
    const end = new Date(options.endDate);
    logs = logs.filter(l => {
      const t = new Date(l.timestamp);
      return t >= start && t <= end;
    });
  }
  
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const total = logs.length;
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  const list = logs.slice(offset, offset + pageSize);
  
  return { list, total };
}

async function getStats() {
  const db = readDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayLogs = db.syncLogs.filter(l => new Date(l.timestamp) >= today);
  
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
