/**
 * 有赞API客户端
 * 封装所有有赞开放平台的API调用
 */
const youzanyun = require('youzanyun-sdk');
const config = require('../config');
const logger = require('../utils/logger');

class YouzanClient {
  constructor() {
    this.clientId = config.youzan.clientId;
    this.clientSecret = config.youzan.clientSecret;
    this.grantId = config.youzan.grantId;
    this.dryRun = config.youzan.dryRun;
    this.token = null;
  }

  isDryRun() {
    return this.dryRun;
  }

  setDryRun(value) {
    this.dryRun = value;
  }

  /**
   * 获取有赞access_token
   */
  async getToken() {
    if (this.dryRun) {
      logger.debug('[DRY RUN] 跳过获取有赞Token');
      return 'mock_token_for_dry_run';
    }
    
    try {
      const resp = await youzanyun.token.get({
        authorize_type: 'silent',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_id: this.grantId,
        refresh: true,
      });
      
      if (resp.data && resp.data.data && resp.data.data.access_token) {
        this.token = resp.data.data.access_token;
        return this.token;
      } else {
        throw new Error('响应数据格式错误: ' + JSON.stringify(resp.data));
      }
    } catch (error) {
      logger.error('获取有赞Token失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 调用有赞API通用方法
   */
  async callApi(api, version, params) {
    if (this.dryRun) {
      logger.debug(`[DRY RUN] 跳过调用有赞API: ${api}`, { params });
      return {
        gw_err_resp: { err_code: 0, err_msg: 'dry run mode' },
        data: { success: true, message: 'DRY RUN - 未真实执行' },
      };
    }
    
    try {
      if (!this.token) {
        await this.getToken();
      }
      
      const resp = await youzanyun.client.call({
        api,
        version,
        token: this.token,
        params,
      });
      
      return resp.data;
    } catch (error) {
      logger.error(`调用有赞API失败 [${api}]`, { error: error.message, params });
      throw error;
    }
  }

  /**
   * 更新商品库存
   */
  async updateStock(itemId, skuId, quantity, type = '0') {
    try {
      const params = {
        quantity: String(quantity),
        item_id: String(itemId),
        sku_id: skuId ? String(skuId) : '',
        type: type,
      };
      
      const result = await this.callApi('youzan.item.quantity.update', '3.0.0', params);
      
      return result;
    } catch (error) {
      logger.error('更新库存失败', { error: error.message, itemId, skuId, quantity, type });
      throw error;
    }
  }

  /**
   * 增加商品库存
   */
  async addStock(itemId, skuId, quantity) {
    return await this.updateStock(itemId, skuId, quantity, '1');
  }

  /**
   * 减少商品库存
   */
  async subtractStock(itemId, skuId, quantity) {
    return await this.updateStock(itemId, skuId, -quantity, '1');
  }

  /**
   * 订单发货
   */
  async shipOrder(orderId, logisticsData) {
    try {
      const params = {
        tid: orderId,
        out_stype: logisticsData.out_stype || '1',
        out_sid: logisticsData.out_sid || '',
        is_no_express: logisticsData.is_no_express || '0',
        oids: logisticsData.oids || '',
        outer_tid: logisticsData.outer_tid || '',
      };
      
      const result = await this.callApi('youzan.logistics.online.confirm', '3.0.0', params);
      
      return result;
    } catch (error) {
      logger.error('订单发货失败', { error: error.message, orderId });
      throw error;
    }
  }

  /**
   * 更新订单备注
   */
  async updateOrderRemark(orderId, remark, flag = '2') {
    try {
      const params = {
        tid: orderId,
        memo: remark,
        flag: flag,
      };
      
      const result = await this.callApi('youzan.trade.memo.update', '3.0.0', params);
      
      return result;
    } catch (error) {
      logger.error('更新订单备注失败', { error: error.message, orderId });
      throw error;
    }
  }

  /**
   * 获取订单详情
   */
  async getOrder(orderId) {
    try {
      const params = {
        tid: orderId,
      };
      
      const result = await this.callApi('youzan.trade.get', '4.0.0', params);
      
      return result;
    } catch (error) {
      logger.error('获取订单详情失败', { error: error.message, orderId });
      throw error;
    }
  }

  /**
   * 查询订单包裹详情
   */
  async getOrderPackages(orderId, kdtId) {
    try {
      const params = {
        tid: orderId,
        kdt_id: String(kdtId),
        source_id: '1002',
        from_app: '',
        request_id: '',
      };
      
      const result = await this.callApi('youzan.logistics.order.query', '1.0.0', params);
      
      return result;
    } catch (error) {
      logger.error('查询订单包裹详情失败', { error: error.message, orderId });
      throw error;
    }
  }

  /**
   * 获取商品详情
   */
  async getProduct(itemId) {
    try {
      const params = {
        item_id: String(itemId),
      };
      
      const result = await this.callApi('youzan.item.itemdetail.get', '1.0.0', params);
      
      return result;
    } catch (error) {
      logger.error('获取商品详情失败', { error: error.message, itemId });
      throw error;
    }
  }

  /**
   * 获取退款信息
   */
  async getRefund(orderId) {
    try {
      const params = {
        tid: orderId,
      };
      
      const result = await this.callApi('youzan.trade.refund.get', '1.0.0', params);
      
      return result;
    } catch (error) {
      logger.error('获取退款信息失败', { error: error.message, orderId });
      throw error;
    }
  }

  async getOrders({ page = 1, pageSize = 20, status, startCreated, endCreated, startUpdate, endUpdate } = {}) {
    try {
      const params = {
        page_no: String(page),
        page_size: String(pageSize),
      };

      if (status) {
        params.status = status;
      }
      if (startCreated) {
        params.start_created = startCreated;
      }
      if (endCreated) {
        params.end_created = endCreated;
      }
      if (startUpdate) {
        params.start_update = startUpdate;
      }
      if (endUpdate) {
        params.end_update = endUpdate;
      }

      const result = await this.callApi('youzan.trades.sold.get', '4.0.2', params);

      return result;
    } catch (error) {
      logger.error('获取订单列表失败', { error: error.message, params: arguments[0] });
      throw error;
    }
  }
}

module.exports = new YouzanClient();
