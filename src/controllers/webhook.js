const syncService = require('../services/sync');
const { isProduction, logError } = require('../utils/response');

class WebhookController {
  async handleYouzanWebhook(ctx) {
    try {
      const { type, data } = ctx.request.body;
      
      console.log('收到有赞Webhook:', type);
      
      let result;
      
      switch (type) {
        case 'trade_TradeCreated':
          result = await syncService.handleOrderCreated(data);
          break;
          
        case 'trade_TradePaid':
          result = await syncService.handleOrderCreated(data);
          break;
          
        case 'trade_TradeRefundCreated':
          result = await syncService.handleRefund(data);
          break;
          
        default:
          result = { success: true, message: '未处理的消息类型' };
      }
      
      ctx.body = {
        success: true,
        message: 'success',
        data: result,
      };
    } catch (error) {
      logError(error, '有赞Webhook');
      
      ctx.status = 500;
      
      if (isProduction()) {
        ctx.body = {
          success: false,
          message: '处理请求失败',
          code: 'WEBHOOK_ERROR',
        };
      } else {
        ctx.body = {
          success: false,
          message: error.message || '处理请求失败',
          code: 'WEBHOOK_ERROR',
          detail: error.stack,
        };
      }
    }
  }

  async handleOiocWebhook(ctx) {
    try {
      const { type, data } = ctx.request.body;
      
      console.log('收到OIOC Webhook:', type);
      
      let result;
      
      switch (type) {
        case 'inbound':
          result = await syncService.handleInbound(data);
          break;
          
        case 'outbound':
          result = await syncService.handleOutbound(data);
          break;
          
        case 'return_complete':
          result = await syncService.handleReturnComplete(data);
          break;
          
        default:
          result = { success: true, message: '未处理的消息类型' };
      }
      
      ctx.body = {
        success: true,
        message: 'success',
        data: result,
      };
    } catch (error) {
      logError(error, 'OIOC Webhook');
      
      ctx.status = 500;
      
      if (isProduction()) {
        ctx.body = {
          success: false,
          message: '处理请求失败',
          code: 'WEBHOOK_ERROR',
        };
      } else {
        ctx.body = {
          success: false,
          message: error.message || '处理请求失败',
          code: 'WEBHOOK_ERROR',
          detail: error.stack,
        };
      }
    }
  }

  async healthCheck(ctx) {
    ctx.body = {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new WebhookController();
