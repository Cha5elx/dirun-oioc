const syncService = require('../services/sync');

class WebhookController {
  async handleYouzanWebhook(ctx) {
    // 处理有赞推送的消息
    try {
      const { type, data } = ctx.request.body;
      
      console.log('收到有赞Webhook:', type);
      
      let result;
      
      switch (type) {
        case 'trade_TradeCreated':
          // 订单创建
          result = await syncService.handleOrderCreated(data);
          break;
          
        case 'trade_TradePaid':
          // 订单支付
          result = await syncService.handleOrderCreated(data);
          break;
          
        case 'trade_TradeRefundCreated':
          // 退款申请
          result = await syncService.handleRefund(data);
          break;
          
        default:
          result = { success: true, message: '未处理的消息类型' };
      }
      
      ctx.body = {
        code: 0,
        msg: 'success',
        data: result,
      };
    } catch (error) {
      console.error('处理有赞Webhook失败:', error);
      ctx.body = {
        code: -1,
        msg: error.message,
      };
    }
  }

  async handleOiocWebhook(ctx) {
    // 处理第三方一物一码推送的消息
    try {
      const { type, data } = ctx.request.body;
      
      console.log('收到OIOC Webhook:', type);
      
      let result;
      
      switch (type) {
        case 'inbound':
          // 入库通知
          result = await syncService.handleInbound(data);
          break;
          
        case 'outbound':
          // 出库/发货通知
          result = await syncService.handleOutbound(data);
          break;
          
        case 'return_complete':
          // 退货完成通知
          result = await syncService.handleReturnComplete(data);
          break;
          
        default:
          result = { success: true, message: '未处理的消息类型' };
      }
      
      ctx.body = {
        code: 0,
        msg: 'success',
        data: result,
      };
    } catch (error) {
      console.error('处理OIOC Webhook失败:', error);
      ctx.body = {
        code: -1,
        msg: error.message,
      };
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
