const { User, SyncLog, ProductMapping } = require('../models');
const { generateToken, isAdmin, hasRole, ROLE_HIERARCHY } = require('../middleware/auth');
const oiocClient = require('../clients/oioc');
const youzanClient = require('../clients/youzan');
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

async function getYouzanOrders(ctx) {
  const { page = 1, pageSize = 20, status, startCreated, endCreated, startUpdate, endUpdate } = ctx.query;

  try {
    const result = await youzanClient.getOrders({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      status,
      startCreated,
      endCreated,
      startUpdate,
      endUpdate,
    });

    // 检查API错误
    if (result.gw_err_resp && result.gw_err_resp.err_code !== 0) {
      console.error('有赞API返回错误:', result.gw_err_resp);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: result.gw_err_resp.err_msg || '有赞API调用失败',
        code: 'YOUZAN_API_ERROR',
        detail: result.gw_err_resp,
      };
      return;
    }

    // 解析响应数据 - 有赞API 4.0.2 返回结构: result.data.full_order_info_list
    let trades = [];
    let total = 0;

    if (result.data) {
      const data = result.data;

      // 4.0.2 版本返回 full_order_info_list
      if (data.full_order_info_list && Array.isArray(data.full_order_info_list)) {
        // 调试：打印原始数据结构
        if (data.full_order_info_list.length > 0) {
          const firstItem = data.full_order_info_list[0];
          console.log('原始full_order_info键:', Object.keys(firstItem.full_order_info || firstItem));
          const rawOrderInfo = (firstItem.full_order_info || firstItem).order_info || {};
          console.log('原始order_info键:', Object.keys(rawOrderInfo));
          console.log('原始orders:', rawOrderInfo.orders);
        }

        // 提取并转换 full_order_info 为前端期望的格式
        trades = data.full_order_info_list.map(item => {
          const info = item.full_order_info || item;
          const orderInfo = info.order_info || {};
          const addressInfo = info.address_info || {};
          const payInfo = info.pay_info || {};
          const remarkInfo = info.remark_info || {};

          // orders 在 full_order_info 级别，不是在 order_info 下
          const ordersList = info.orders || [];

          // 处理时间：有赞返回的是字符串格式 "2026-04-23 10:30:00"，需要转换成时间戳
          let createdTime = 0;
          if (orderInfo.created) {
            // 字符串格式转时间戳
            const dateStr = orderInfo.created.replace(/-/g, '/');
            createdTime = Math.floor(new Date(dateStr).getTime() / 1000);
          } else if (orderInfo.created_time) {
            createdTime = orderInfo.created_time;
          }

          // 处理收货人信息：检查是否加密（加密信息通常以$开头或很长）
          let receiverName = addressInfo.receiver_name || addressInfo.delivery_name || '';
          let receiverMobile = addressInfo.receiver_tel || addressInfo.delivery_tel || '';

          // 如果是加密信息，隐藏显示
          if (receiverName && (receiverName.startsWith('$') || receiverName.length > 50)) {
            receiverName = '***';
          }
          if (receiverMobile && (receiverMobile.startsWith('$') || receiverMobile.length > 50)) {
            receiverMobile = '***';
          }

          return {
            tid: orderInfo.tid || '',
            created: createdTime,
            status: orderInfo.status || '',
            status_str: orderInfo.status_str || '',
            pay_type: payInfo.pay_type || '',
            total_fee: parseFloat(payInfo.total_fee || 0) * 100,
            pay_fee: parseFloat(payInfo.payment || payInfo.total_fee || 0) * 100,
            receiver_name: receiverName,
            receiver_mobile: receiverMobile,
            receiver_address: `${addressInfo.delivery_province || ''}${addressInfo.delivery_city || ''}${addressInfo.delivery_district || ''}${addressInfo.delivery_address || ''}`,
            buyer_message: remarkInfo.buyer_message || '',
            orders: ordersList,
            // 保留原始数据供详情查看
            _raw: info
          };
        });
        total = data.total_results || data.totalResults || trades.length;
      }
      // 兼容其他可能的结构
      else if (data.trades && Array.isArray(data.trades)) {
        trades = data.trades;
        total = data.total_results || data.totalResults || trades.length;
      } else if (data.items && Array.isArray(data.items)) {
        trades = data.items;
        total = data.total || trades.length;
      }
    }

    console.log('有赞订单查询结果:', { total, tradesCount: trades.length });

    // 调试：打印第一个订单的详细信息
    if (trades.length > 0) {
      console.log('第一个订单的键:', Object.keys(trades[0]));
      console.log('orders字段:', trades[0].orders);
      console.log('orders长度:', trades[0].orders ? trades[0].orders.length : 0);
      if (trades[0].orders && trades[0].orders.length > 0) {
        console.log('商品信息示例:', JSON.stringify(trades[0].orders[0]).substring(0, 500));
      } else {
        console.log('orders为空或不存在');
      }
    }

    ctx.body = {
      success: true,
      data: {
        list: trades,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    };
  } catch (error) {
    logError(error, '获取有赞订单列表');

    ctx.status = 500;

    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '获取有赞订单列表失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '获取有赞订单列表失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function getYouzanOrderDetail(ctx) {
  const { orderId } = ctx.params;

  if (!orderId) {
    paramError(ctx, '订单号不能为空');
    return;
  }

  try {
    const result = await youzanClient.getOrder(orderId);

    ctx.body = {
      success: true,
      data: result.data || {},
    };
  } catch (error) {
    logError(error, '获取有赞订单详情');

    ctx.status = 500;

    if (isProduction()) {
      ctx.body = {
        success: false,
        message: '获取有赞订单详情失败',
        code: 'INTERNAL_ERROR',
      };
    } else {
      ctx.body = {
        success: false,
        message: error.message || '获取有赞订单详情失败',
        code: 'INTERNAL_ERROR',
        detail: error.stack,
      };
    }
  }
}

async function getRetryQueueStats(ctx) {
  try {
    const retryQueue = require('../services/retryQueue');
    const stats = retryQueue.getStats();

    ctx.body = {
      success: true,
      data: stats,
    };
  } catch (error) {
    logError(error, '获取重试队列统计');

    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取重试队列统计失败',
      code: 'INTERNAL_ERROR',
    };
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
  triggerCleanup,
  getYouzanOrders,
  getYouzanOrderDetail,
  getRetryQueueStats
};
