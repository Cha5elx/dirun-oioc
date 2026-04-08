const syncService = require('./services/sync');

exports.handler = async (event, context) => {
  // 阿里云函数计算 或 腾讯云云函数 入口
  try {
    const { path, httpMethod, body, queryParameters } = event;
    
    console.log('云函数触发:', { path, httpMethod });
    
    let result;
    
    // 根据路径路由到不同的处理函数
    if (path.includes('/webhook/youzan')) {
      const data = typeof body === 'string' ? JSON.parse(body) : body;
      result = await handleYouzanEvent(data);
    } else if (path.includes('/webhook/oioc')) {
      const data = typeof body === 'string' ? JSON.parse(body) : body;
      result = await handleOiocEvent(data);
    } else if (path.includes('/health')) {
      result = { status: 'ok', timestamp: new Date().toISOString() };
    } else {
      result = { error: 'Unknown path' };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 0,
        msg: 'success',
        data: result,
      }),
    };
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: -1,
        msg: error.message,
      }),
    };
  }
};

async function handleYouzanEvent(data) {
  const { type, data: eventData } = data;
  
  switch (type) {
    case 'trade_TradeCreated':
    case 'trade_TradePaid':
      return await syncService.handleOrderCreated(eventData);
      
    case 'trade_TradeRefundCreated':
      return await syncService.handleRefund(eventData);
      
    default:
      return { success: true, message: '未处理的消息类型' };
  }
}

async function handleOiocEvent(data) {
  const { type, data: eventData } = data;
  
  switch (type) {
    case 'inbound':
      return await syncService.handleInbound(eventData);
      
    case 'outbound':
      return await syncService.handleOutbound(eventData);
      
    case 'return_complete':
      return await syncService.handleReturnComplete(eventData);
      
    default:
      return { success: true, message: '未处理的消息类型' };
  }
}
