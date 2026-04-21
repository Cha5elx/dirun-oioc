const { User, SyncLog, ProductMapping } = require('../models');
const { generateToken, isAdmin, hasRole, ROLE_HIERARCHY } = require('../middleware/auth');
const oiocClient = require('../clients/oioc');
const { isProduction, logError, paramError, authError, notFoundError } = require('../utils/response');
const { runCleanup, getCleanupStats, formatBytes } = require('../services/cleanup');

async function login(ctx) {
  const { username, password } = ctx.request.body;
  
  if (!username || !password) {
    paramError(ctx, '用户名和密码不能为空');
    return;
  }
  
  try {
    const loginResult = await oiocClient.loginWithCredentials(username, password);
    
    if (!loginResult || !loginResult.token) {
      authError(ctx, '用户名或密码错误');
      return;
    }
    
    let user = await User.findByUsername(username);
    
    if (!user) {
      user = await User.create({
        username: username,
        password: 'oioc_user',
        role: 'operator'
      });
    }
    
    await User.update(user.id, { lastLoginAt: new Date().toISOString() });
    
    const token = generateToken(user);
    
    ctx.body = {
      success: true,
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
    logError(error, '登录');
    authError(ctx, '用户名或密码错误');
  }
}

async function getUsers(ctx) {
  try {
    const users = await User.findAll();
    ctx.body = {
      success: true,
      data: users
    };
  } catch (error) {
    logError(error, '获取用户列表');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '获取用户列表失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '获取用户列表失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function createUser(ctx) {
  const { username, password, role } = ctx.request.body;
  
  if (!username || !password) {
    paramError(ctx, '用户名和密码不能为空');
    return;
  }
  
  const validRoles = ['admin', 'operator', 'viewer'];
  const userRole = role || 'operator';
  
  if (!validRoles.includes(userRole)) {
    paramError(ctx, '无效的角色类型，有效值为: admin, operator, viewer');
    return;
  }
  
  try {
    const existing = await User.findByUsername(username);
    if (existing) {
      paramError(ctx, '用户名已存在');
      return;
    }
    
    const user = await User.create({
      username,
      password,
      role: userRole
    });
    
    ctx.body = {
      success: true,
      message: '创建成功',
      data: user
    };
  } catch (error) {
    logError(error, '创建用户');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '创建用户失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '创建用户失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function updateUser(ctx) {
  const { id } = ctx.params;
  const { role } = ctx.request.body;
  
  const validRoles = ['admin', 'operator', 'viewer'];
  
  if (!role) {
    paramError(ctx, '角色不能为空');
    return;
  }
  
  if (!validRoles.includes(role)) {
    paramError(ctx, '无效的角色类型，有效值为: admin, operator, viewer');
    return;
  }
  
  try {
    const user = await User.findById(parseInt(id));
    if (!user) {
      notFoundError(ctx, '用户不存在');
      return;
    }
    
    if (parseInt(id) === 1 && role !== 'admin') {
      paramError(ctx, '不能修改默认管理员的角色');
      return;
    }
    
    await User.update(parseInt(id), { role });
    
    ctx.body = {
      success: true,
      message: '更新成功'
    };
  } catch (error) {
    logError(error, '更新用户');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '更新用户失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '更新用户失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function resetPassword(ctx) {
  paramError(ctx, '使用一物一码系统账号登录，无法重置密码，请在第三方系统中修改');
}

async function deleteUser(ctx) {
  const { id } = ctx.params;
  
  if (parseInt(id) === 1) {
    paramError(ctx, '不能删除默认管理员');
    return;
  }
  
  try {
    const user = await User.findById(parseInt(id));
    if (!user) {
      notFoundError(ctx, '用户不存在');
      return;
    }
    
    await User.remove(parseInt(id));
    
    ctx.body = {
      success: true,
      message: '删除成功'
    };
  } catch (error) {
    logError(error, '删除用户');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '删除用户失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '删除用户失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function getLogs(ctx) {
  const { page = 1, pageSize = 20, type, status, startDate, endDate } = ctx.query;
  
  try {
    const result = await SyncLog.findAll({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      type,
      status,
      startDate,
      endDate
    });
    
    ctx.body = {
      success: true,
      data: {
        list: result.list,
        total: result.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    };
  } catch (error) {
    logError(error, '获取日志列表');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '获取日志列表失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '获取日志列表失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function getStats(ctx) {
  try {
    const stats = await SyncLog.getStats();
    
    ctx.body = {
      success: true,
      data: stats
    };
  } catch (error) {
    logError(error, '获取统计数据');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '获取统计数据失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '获取统计数据失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
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
    success: true,
    data: mockResult
  };
}

async function getProductMappings(ctx) {
  const { page = 1, pageSize = 20, search } = ctx.query;
  
  try {
    const result = await ProductMapping.findAll({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      search
    });
    
    ctx.body = {
      success: true,
      data: {
        list: result.list,
        total: result.total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    };
  } catch (error) {
    logError(error, '获取产品映射列表');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '获取产品映射列表失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '获取产品映射列表失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function createProductMapping(ctx) {
  const { youzanItemId, youzanSkuId, youzanItemName, oiocProductCode, oiocProductName } = ctx.request.body;
  
  if (!youzanItemId || !youzanSkuId || !oiocProductCode) {
    paramError(ctx, '有赞商品ID、SKU ID 和第三方产品编码不能为空');
    return;
  }
  
  try {
    const existing = await ProductMapping.findByYouzanSku(youzanSkuId);
    if (existing) {
      paramError(ctx, '该有赞 SKU ID 已存在映射关系');
      return;
    }
    
    const mapping = await ProductMapping.create({
      youzanItemId,
      youzanSkuId,
      youzanItemName,
      oiocProductCode,
      oiocProductName
    });
    
    ctx.body = {
      success: true,
      message: '创建成功',
      data: mapping
    };
  } catch (error) {
    logError(error, '创建产品映射');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '创建产品映射失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '创建产品映射失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function updateProductMapping(ctx) {
  const { id } = ctx.params;
  const { youzanItemId, youzanSkuId, youzanItemName, oiocProductCode, oiocProductName } = ctx.request.body;
  
  try {
    const mapping = await ProductMapping.findById(parseInt(id));
    if (!mapping) {
      notFoundError(ctx, '映射关系不存在');
      return;
    }
    
    const updated = await ProductMapping.update(parseInt(id), {
      youzanItemId,
      youzanSkuId,
      youzanItemName,
      oiocProductCode,
      oiocProductName
    });
    
    ctx.body = {
      success: true,
      message: '更新成功',
      data: updated
    };
  } catch (error) {
    logError(error, '更新产品映射');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '更新产品映射失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '更新产品映射失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function deleteProductMapping(ctx) {
  const { id } = ctx.params;
  
  try {
    const mapping = await ProductMapping.findById(parseInt(id));
    if (!mapping) {
      notFoundError(ctx, '映射关系不存在');
      return;
    }
    
    await ProductMapping.remove(parseInt(id));
    
    ctx.body = {
      success: true,
      message: '删除成功'
    };
  } catch (error) {
    logError(error, '删除产品映射');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '删除产品映射失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '删除产品映射失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function searchProductMapping(ctx) {
  const { skuId, code } = ctx.query;
  
  if (!skuId && !code) {
    paramError(ctx, '请提供 skuId 或 code 参数');
    return;
  }
  
  try {
    let mapping = null;
    
    if (skuId) {
      mapping = await ProductMapping.findByYouzanSku(skuId);
    } else if (code) {
      mapping = await ProductMapping.findByOiocCode(code);
    }
    
    if (!mapping) {
      notFoundError(ctx, '未找到映射关系');
      return;
    }
    
    ctx.body = {
      success: true,
      data: mapping
    };
  } catch (error) {
    logError(error, '搜索产品映射');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '搜索产品映射失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '搜索产品映射失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function getLogStats(ctx) {
  try {
    const stats = await getCleanupStats();
    
    ctx.body = {
      success: true,
      data: stats
    };
  } catch (error) {
    logError(error, '获取日志统计');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '获取日志统计失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '获取日志统计失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function triggerCleanup(ctx) {
  const { daysToKeep, maxLogCount } = ctx.request.body || {};
  
  try {
    const result = await runCleanup({
      daysToKeep: daysToKeep || 30,
      maxLogCount: maxLogCount || 10000,
      enableVacuum: true
    });
    
    if (!result) {
      ctx.body = {
        success: true,
        message: '清理任务正在运行中，请稍后再试'
      };
      return;
    }
    
    ctx.body = {
      success: true,
      message: '清理完成',
      data: {
        deletedByAge: result.deletedByAge,
        deletedByCount: result.deletedByCount,
        totalDeleted: result.totalDeleted,
        sizeBefore: formatBytes(result.sizeBefore),
        sizeAfter: formatBytes(result.sizeAfter),
        sizeSaved: formatBytes(Math.max(0, result.sizeSaved)),
        logsBefore: result.logsBefore,
        logsAfter: result.logsAfter
      }
    };
  } catch (error) {
    logError(error, '手动清理日志');
    
    ctx.status = 500;
    
    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '清理失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '清理失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
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
  queryCode,
  getProductMappings,
  createProductMapping,
  updateProductMapping,
  deleteProductMapping,
  searchProductMapping,
  getLogStats,
  triggerCleanup
};
