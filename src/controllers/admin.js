const { User, SyncLog } = require('../models');
const { generateToken } = require('../middleware/auth');
const oiocClient = require('../clients/oioc');

async function login(ctx) {
  const { username, password } = ctx.request.body;
  
  if (!username || !password) {
    ctx.status = 400;
    ctx.body = { code: 400, message: '用户名和密码不能为空' };
    return;
  }
  
  try {
    const originalUsername = oiocClient.getUsername ? oiocClient.getUsername() : null;
    
    const loginResult = await oiocClient.loginWithCredentials(username, password);
    
    if (!loginResult || !loginResult.token) {
      ctx.status = 401;
      ctx.body = { code: 401, message: '用户名或密码错误' };
      return;
    }
    
    let user = await User.findByUsername(username);
    
    if (!user) {
      user = await User.create({
        username: username,
        password: 'oioc_user',
        role: 'user'
      });
    }
    
    await User.update(user.id, { lastLoginAt: new Date().toISOString() });
    
    const token = generateToken(user);
    
    ctx.body = {
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      }
    };
  } catch (error) {
    console.error('登录失败:', error.message);
    ctx.status = 401;
    ctx.body = { code: 401, message: '用户名或密码错误' };
  }
}

async function getUsers(ctx) {
  const users = await User.findAll();
  ctx.body = {
    code: 0,
    data: users
  };
}

async function createUser(ctx) {
  const { username, password, role } = ctx.request.body;
  
  if (!username || !password) {
    ctx.status = 400;
    ctx.body = { code: 400, message: '用户名和密码不能为空' };
    return;
  }
  
  const existing = await User.findByUsername(username);
  if (existing) {
    ctx.status = 400;
    ctx.body = { code: 400, message: '用户名已存在' };
    return;
  }
  
  const user = await User.create({
    username,
    password,
    role: role || 'user'
  });
  
  ctx.body = {
    code: 0,
    message: '创建成功',
    data: user
  };
}

async function updateUser(ctx) {
  const { id } = ctx.params;
  const { role } = ctx.request.body;
  
  const user = await User.findById(parseInt(id));
  if (!user) {
    ctx.status = 404;
    ctx.body = { code: 404, message: '用户不存在' };
    return;
  }
  
  await User.update(parseInt(id), { role });
  
  ctx.body = {
    code: 0,
    message: '更新成功'
  };
}

async function resetPassword(ctx) {
  ctx.status = 400;
  ctx.body = { 
    code: 400, 
    message: '使用一物一码系统账号登录，无法重置密码，请在第三方系统中修改' 
  };
}

async function deleteUser(ctx) {
  const { id } = ctx.params;
  
  if (parseInt(id) === 1) {
    ctx.status = 400;
    ctx.body = { code: 400, message: '不能删除默认管理员' };
    return;
  }
  
  const user = await User.findById(parseInt(id));
  if (!user) {
    ctx.status = 404;
    ctx.body = { code: 404, message: '用户不存在' };
    return;
  }
  
  await User.remove(parseInt(id));
  
  ctx.body = {
    code: 0,
    message: '删除成功'
  };
}

async function getLogs(ctx) {
  const { page = 1, pageSize = 20, type, status, startDate, endDate } = ctx.query;
  
  const result = await SyncLog.findAll({
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    type,
    status,
    startDate,
    endDate
  });
  
  ctx.body = {
    code: 0,
    data: {
      list: result.list,
      total: result.total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }
  };
}

async function getStats(ctx) {
  const stats = await SyncLog.getStats();
  
  ctx.body = {
    code: 0,
    data: stats
  };
}

async function queryCode(ctx) {
  const { code } = ctx.params;
  
  const mockResult = {
    valid: true,
    code: code,
    productName: '测试产品',
    standard: '100ml',
    productionDate: '2026-03-01',
    inboundTime: '2026-03-05 10:30:00',
    warehouse: '华东仓',
    outboundTime: '2026-03-10 14:20:00',
    channel: '有赞商城',
    orderId: 'YZ20260310001',
    logisticsNo: 'SF1234567890',
    trace: [
      { time: '2026-03-01 08:00:00', action: '生产入库', detail: '产品生产完成，入库至华东仓' },
      { time: '2026-03-05 10:30:00', action: '库存录入', detail: '防伪码绑定，数量: 1' },
      { time: '2026-03-10 14:20:00', action: '销售出库', detail: '订单 YZ20260310001 发货' },
      { time: '2026-03-11 09:00:00', action: '物流配送', detail: '顺丰快递 SF1234567890' }
    ]
  };
  
  ctx.body = {
    code: 0,
    data: mockResult
  };
}

module.exports = {
  login,
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  getLogs,
  getStats,
  queryCode
};
