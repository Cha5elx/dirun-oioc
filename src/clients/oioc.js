/**
 * 第三方一物一码系统API客户端
 * 封装所有第三方一物一码系统的API调用
 */
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class OiocClient {
  constructor() {
    this.baseUrl = config.oioc.baseUrl;
    this.token = null;
    this.tokenExpiry = null;
    this.userTokens = new Map();
    this.syskey = 'DIRUN';
    this.isProduction = config.server.env === 'production';
    this.loginPromise = null;
    this.loginPromises = new Map();
    this.loginRetryCount = 0;
    this.maxLoginRetries = 3;
    this.loginRetryDelay = 2000;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use(
      (axiosConfig) => {
        axiosConfig.headers['syskey'] = this.syskey;
        
        const username = axiosConfig._username;
        let tokenToUse = this.token;
        
        if (username) {
          const userTokenInfo = this.userTokens.get(username);
          if (userTokenInfo && userTokenInfo.token) {
            tokenToUse = userTokenInfo.token;
          }
        }
        
        if (tokenToUse) {
          axiosConfig.headers['token'] = tokenToUse;
        }
        
        delete axiosConfig._username;
        
        axiosConfig.metadata = { startTime: Date.now() };
        
        logger.info('API请求', {
          method: axiosConfig.method?.toUpperCase(),
          url: `${axiosConfig.baseURL}${axiosConfig.url}`,
          params: axiosConfig.params,
          data: axiosConfig.data
        });
        
        return axiosConfig;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const duration = Date.now() - response.config.metadata.startTime;
        
        logger.info('API响应', {
          status: response.status,
          url: response.config.url,
          duration: `${duration}ms`
        });
        if (duration > 1000) {
          logger.warn('慢请求警告', {
            url: response.config.url,
            duration: `${duration}ms`
          });
        }
        
        return response;
      },
      (error) => {
        const duration = Date.now() - error.config?.metadata?.startTime;
        
        logger.error('API响应错误', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
          duration: `${duration}ms`
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * 登录第三方一物一码系统（使用配置文件中的账号）
   */
  async login() {
    if (this.loginPromise) {
      return this.loginPromise;
    }
    
    this.loginPromise = this._doLogin();
    
    try {
      const result = await this.loginPromise;
      return result;
    } finally {
      this.loginPromise = null;
    }
  }
  
  async _doLogin() {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxLoginRetries; attempt++) {
      try {
        const response = await this.axiosInstance.post('/login/access-token', {
          account: config.oioc.username,
          password: config.oioc.password,
          type: 'PDA',
        });
        
        if (response.data && response.data.data && response.data.data.token) {
          this.token = response.data.data.token;
          this.tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
          this.loginRetryCount = 0;
          logger.info('第三方系统登录成功，Token已保存');
          return response.data.data;
        } else {
          throw new Error('登录失败：未返回token');
        }
      } catch (error) {
        lastError = error;
        logger.error(`登录失败 (尝试 ${attempt}/${this.maxLoginRetries})`, { error: error.message });
        
        if (attempt < this.maxLoginRetries) {
          logger.debug(`${this.loginRetryDelay / 1000}秒后重试...`);
          await new Promise(resolve => setTimeout(resolve, this.loginRetryDelay));
        }
      }
    }
    
    throw lastError || new Error('登录失败：超过最大重试次数');
  }

  /**
   * 使用自定义账号密码登录（用于管理后台登录验证）
   */
  async loginWithCredentials(account, password) {
    if (this.loginPromises.has(account)) {
      return this.loginPromises.get(account);
    }
    
    const loginPromise = this._doLoginWithCredentials(account, password);
    this.loginPromises.set(account, loginPromise);
    
    try {
      const result = await loginPromise;
      return result;
    } finally {
      this.loginPromises.delete(account);
    }
  }
  
  async _doLoginWithCredentials(account, password) {
    try {
      const cachedToken = this.userTokens.get(account);
      if (cachedToken && cachedToken.expiry > Date.now()) {
        logger.debug(`使用缓存的Token: ${account}`);
        return { token: cachedToken.token };
      }
      
      const response = await this.axiosInstance.post('/login/access-token', {
        account: account,
        password: password,
        type: 'PDA',
      });
      
      if (response.data && response.data.data && response.data.data.token) {
        this.userTokens.set(account, {
          token: response.data.data.token,
          expiry: Date.now() + (23 * 60 * 60 * 1000)
        });
        logger.info(`用户 ${account} 登录成功，Token已缓存`);
        return response.data.data;
      } else {
        throw new Error('登录失败：未返回token');
      }
    } catch (error) {
      logger.error(`用户 ${account} 登录失败`, { error: error.message });
      throw error;
    }
  }

  /**
   * 确保已登录
   */
  async ensureLogin(username = null) {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    if (username) {
      const userTokenInfo = this.userTokens.get(username);
      if (!userTokenInfo || userTokenInfo.expiry <= now - oneHour) {
        const reason = !userTokenInfo ? '用户Token不存在' : '用户Token即将过期';
        logger.warn(`${reason}，用户 ${username} 需要重新登录`);
        throw new Error(`用户 ${username} Token无效或已过期，请重新登录`);
      }
      return username;
    }
    
    if (!this.token || (this.tokenExpiry && now >= this.tokenExpiry - oneHour)) {
      const reason = !this.token ? 'Token不存在' : 'Token即将过期';
      logger.debug(`${reason}，自动登录...`);
      await this.login();
    }
    return null;
  }

  /**
   * 获取用户名
   */
  getUsername() {
    return config.oioc.username;
  }

  /**
   * 创建产品
   */
  async createProduct(productData, username = null) {
    try {
      await this.ensureLogin(username);
      
      const response = await this.axiosInstance.post('/products/', {
        productID: productData.productID,
        productCode: productData.productCode,
        productName: productData.productName,
        standard: productData.standard,
      }, {
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('创建产品失败', { error: error.message, productData });
      throw error;
    }
  }

  /**
   * 查询产品
   */
  async getProduct(params = {}, username = null) {
    try {
      await this.ensureLogin(username);
      
      const queryParams = {};
      if (params.productID) queryParams.productID = params.productID;
      if (params.productName) queryParams.productName = params.productName;
      if (params.productCode) queryParams.productCode = params.productCode;
      if (params.standard) queryParams.standard = params.standard;
      if (params.limit) queryParams.limit = params.limit;
      if (params.skip) queryParams.skip = params.skip;
      
      const response = await this.axiosInstance.get('/products/', {
        params: queryParams,
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('查询产品失败', { error: error.message, params });
      throw error;
    }
  }

  /**
   * 创建代理商
   */
  async createAgent(agentData, username = null) {
    try {
      await this.ensureLogin(username);
      
      const response = await this.axiosInstance.post('/users/', {
        userID: agentData.userID,
        account: agentData.account,
        password: agentData.password || '888333',
        userTypeNumber: agentData.userTypeNumber || 30,
        parentID: agentData.parentID || 'admin',
      }, {
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('创建代理商失败', { error: error.message, agentData });
      throw error;
    }
  }

  /**
   * 查询代理商
   */
  async getAgent(params = {}, username = null) {
    try {
      await this.ensureLogin(username);
      
      const queryParams = {};
      if (params.userID) queryParams.userID = params.userID;
      if (params.account) queryParams.account = params.account;
      if (params.userName) queryParams.userName = params.userName;
      if (params.limit) queryParams.limit = params.limit;
      if (params.skip) queryParams.skip = params.skip;
      
      const response = await this.axiosInstance.get('/users/', {
        params: queryParams,
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('查询代理商失败', { error: error.message, params });
      throw error;
    }
  }

  /**
   * 创建入库单
   */
  async createInboundOrder(orderData, username = null) {
    try {
      await this.ensureLogin(username);
      
      const response = await this.axiosInstance.post('/orders/order-and-detail/', {
        shipperID: orderData.shipperID || '',
        orderNumber: orderData.orderNumber,
        orderDesc: orderData.orderDesc || '创建入库单',
        orderSource: orderData.orderSource || 'API',
        orderTypeNumber: orderData.orderTypeNumber || 10,
        receiverID: orderData.receiverID,
        orderInType: orderData.orderInType || 20,
        detailList: orderData.detailList,
      }, {
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('创建入库单失败', { error: error.message, orderNumber: orderData.orderNumber });
      throw error;
    }
  }

  /**
   * 创建出库单
   */
  async createOutboundOrder(orderData, username = null) {
    try {
      await this.ensureLogin(username);
      
      const response = await this.axiosInstance.post('/orders/order-and-detail/', {
        shipperID: orderData.shipperID || '',
        orderNumber: orderData.orderNumber,
        orderDesc: orderData.orderDesc || '创建出库单',
        orderSource: orderData.orderSource || 'API',
        orderTypeNumber: orderData.orderTypeNumber || 20,
        orderInType: orderData.orderInType || 0,
        receiverID: orderData.receiverID,
        detailList: orderData.detailList,
      }, {
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('创建出库单失败', { error: error.message, orderNumber: orderData.orderNumber });
      throw error;
    }
  }

  /**
   * 创建退货单
   */
  async createReturnOrder(orderData, username = null) {
    try {
      await this.ensureLogin(username);
      
      const response = await this.axiosInstance.post('/orders/order-and-detail/', {
        shipperID: orderData.shipperID || '',
        orderNumber: orderData.orderNumber,
        orderDesc: orderData.orderDesc || '创建退货单',
        orderSource: orderData.orderSource || 'API',
        orderTypeNumber: orderData.orderTypeNumber || 30,
        orderInType: orderData.orderInType || 0,
        receiverID: orderData.receiverID,
        detailList: orderData.detailList,
      }, {
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('创建退货单失败', { error: error.message, orderNumber: orderData.orderNumber });
      throw error;
    }
  }

  /**
   * 查询订单条码
   */
  async getOrderCodes(orderID, username = null) {
    try {
      await this.ensureLogin(username);
      
      const response = await this.axiosInstance.get(`/barcodes/get_by_order/${orderID}`, {
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('查询订单条码失败', { error: error.message, orderID });
      throw error;
    }
  }

  /**
   * 查询入库订单详情
   */
  async getInboundOrderDetail(params = {}, username = null) {
    try {
      await this.ensureLogin(username);
      
      const queryParams = {};
      
      if (params.orderNumber) queryParams.orderNumber = params.orderNumber;
      if (params.orderStateNumber) queryParams.orderStateNumber = params.orderStateNumber;
      if (params.receiverID) queryParams.receiverID = params.receiverID;
      if (params.receiverUsername) queryParams.receiverUsername = params.receiverUsername;
      if (params.productID) queryParams.productID = params.productID;
      if (params.productName) queryParams.productName = params.productName;
      if (params.batchID) queryParams.batchID = params.batchID;
      if (params.batchName) queryParams.batchName = params.batchName;
      if (params.createdStartTime) queryParams.createdStartTime = params.createdStartTime;
      if (params.createdEndTime) queryParams.createdEndTime = params.createdEndTime;
      if (params.finishStartTime) queryParams.finishStartTime = params.finishStartTime;
      if (params.finishEndTime) queryParams.finishEndTime = params.finishEndTime;
      if (params.isAccurate !== undefined) queryParams.isAccurate = params.isAccurate;
      if (params.isScan !== undefined) queryParams.isScan = params.isScan;
      if (params.isStatSum !== undefined) queryParams.isStatSum = params.isStatSum;
      if (params.orderInType) queryParams.orderInType = params.orderInType;
      if (params.orderInTypeList) queryParams.orderInTypeList = params.orderInTypeList;
      if (params.orderDetailDesc) queryParams.orderDetailDesc = params.orderDetailDesc;
      if (params.showMiddleCodeCount !== undefined) queryParams.showMiddleCodeCount = params.showMiddleCodeCount;
      if (params.returnSerialTag !== undefined) queryParams.returnSerialTag = params.returnSerialTag;
      if (params.limit) queryParams.limit = params.limit;
      if (params.skip) queryParams.skip = params.skip;
      
      const response = await this.axiosInstance.get('/reports/hq/order-in/has-scan', {
        params: queryParams,
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('查询入库订单详情失败', { error: error.message, params });
      throw error;
    }
  }

  /**
   * 查询出库订单详情
   */
  async getOutboundOrderDetail(params = {}, username = null) {
    try {
      await this.ensureLogin(username);
      
      const queryParams = {};
      
      if (params.userID) queryParams.userID = params.userID;
      if (params.orderNumber) queryParams.orderNumber = params.orderNumber;
      if (params.orderStateNumber) queryParams.orderStateNumber = params.orderStateNumber;
      if (params.receiverID) queryParams.receiverID = params.receiverID;
      if (params.receiverUsername) queryParams.receiverUsername = params.receiverUsername;
      if (params.productID) queryParams.productID = params.productID;
      if (params.productName) queryParams.productName = params.productName;
      if (params.batchID) queryParams.batchID = params.batchID;
      if (params.batchName) queryParams.batchName = params.batchName;
      if (params.createdStartTime) queryParams.createdStartTime = params.createdStartTime;
      if (params.createdEndTime) queryParams.createdEndTime = params.createdEndTime;
      if (params.finishStartTime) queryParams.finishStartTime = params.finishStartTime;
      if (params.finishEndTime) queryParams.finishEndTime = params.finishEndTime;
      if (params.shipperID) queryParams.shipperID = params.shipperID;
      if (params.shipperName) queryParams.shipperName = params.shipperName;
      if (params.orderTypeNumber) queryParams.orderTypeNumber = params.orderTypeNumber;
      if (params.isAccurate !== undefined) queryParams.isAccurate = params.isAccurate;
      if (params.isScan !== undefined) queryParams.isScan = params.isScan;
      if (params.isStatSum !== undefined) queryParams.isStatSum = params.isStatSum;
      if (params.orderTypeNumberList) queryParams.orderTypeNumberList = params.orderTypeNumberList;
      if (params.limit) queryParams.limit = params.limit;
      if (params.skip) queryParams.skip = params.skip;
      
      const response = await this.axiosInstance.get('/reports/hq/order-out/has-scan', {
        params: queryParams,
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('查询出库订单详情失败', { error: error.message, params });
      throw error;
    }
  }

  /**
   * 查询退货订单详情
   */
  async getReturnOrderDetail(params = {}, username = null) {
    try {
      await this.ensureLogin(username);
      
      const queryParams = {};
      
      if (params.userID) queryParams.userID = params.userID;
      if (params.orderNumber) queryParams.orderNumber = params.orderNumber;
      if (params.orderStateNumber) queryParams.orderStateNumber = params.orderStateNumber;
      if (params.receiverID) queryParams.receiverID = params.receiverID;
      if (params.receiverUsername) queryParams.receiverUsername = params.receiverUsername;
      if (params.productID) queryParams.productID = params.productID;
      if (params.productName) queryParams.productName = params.productName;
      if (params.batchID) queryParams.batchID = params.batchID;
      if (params.batchName) queryParams.batchName = params.batchName;
      if (params.createdStartTime) queryParams.createdStartTime = params.createdStartTime;
      if (params.createdEndTime) queryParams.createdEndTime = params.createdEndTime;
      if (params.finishStartTime) queryParams.finishStartTime = params.finishStartTime;
      if (params.finishEndTime) queryParams.finishEndTime = params.finishEndTime;
      if (params.shipperID) queryParams.shipperID = params.shipperID;
      if (params.shipperName) queryParams.shipperName = params.shipperName;
      if (params.isAccurate !== undefined) queryParams.isAccurate = params.isAccurate;
      if (params.createdUserID) queryParams.createdUserID = params.createdUserID;
      if (params.createdUserName) queryParams.createdUserName = params.createdUserName;
      if (params.isStatSum !== undefined) queryParams.isStatSum = params.isStatSum;
      if (params.limit) queryParams.limit = params.limit;
      if (params.skip) queryParams.skip = params.skip;
      
      const response = await this.axiosInstance.get('/reports/hq/order-return/has-scan', {
        params: queryParams,
        _username: username
      });
      
      return response.data;
    } catch (error) {
      logger.error('查询退货订单详情失败', { error: error.message, params });
      throw error;
    }
  }
}

module.exports = new OiocClient();
