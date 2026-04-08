/**
 * 第三方一物一码系统API客户端
 * 封装所有第三方一物一码系统的API调用
 */
const axios = require('axios');
const config = require('../config');

class OiocClient {
  constructor() {
    this.baseUrl = config.oioc.baseUrl;
    this.token = null;
    this.syskey = 'DIRUN';
    
    // 创建axios实例
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 添加请求拦截器，自动添加syskey和token
    this.axiosInstance.interceptors.request.use(
      (axiosConfig) => {
        // 所有请求都需要添加syskey
        axiosConfig.headers['syskey'] = this.syskey;
        
        // 如果已登录，添加token头
        if (this.token) {
          axiosConfig.headers['token'] = this.token;
        }
        
        // 打印完整请求信息
        console.log('\n📤 API请求:');
        console.log(`   方法: ${axiosConfig.method?.toUpperCase()}`);
        console.log(`   URL: ${axiosConfig.baseURL}${axiosConfig.url}`);
        if (axiosConfig.params) {
          console.log(`   Query参数: ${JSON.stringify(axiosConfig.params, null, 2)}`);
        }
        if (axiosConfig.data) {
          console.log(`   Body数据: ${JSON.stringify(axiosConfig.data, null, 2)}`);
        }
        console.log(`   Headers: ${JSON.stringify(axiosConfig.headers, null, 2)}`);
        
        return axiosConfig;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
    
    // 添加响应拦截器，打印完整响应信息
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log('\n📥 API响应:');
        console.log(`   状态码: ${response.status}`);
        console.log(`   URL: ${response.config.url}`);
        console.log(`   响应数据: ${JSON.stringify(response.data, null, 2)}`);
        return response;
      },
      (error) => {
        console.log('\n📥 API响应错误:');
        console.log(`   URL: ${error.config?.url}`);
        if (error.response) {
          console.log(`   状态码: ${error.response.status}`);
          console.log(`   响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
          console.log(`   错误信息: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 登录第三方一物一码系统
   * Header参数：syskey = DIRUN（必需）
   * Body参数：
   * @param {string} account - 账号（必需）
   * @param {string} password - 密码（必需）
   * @param {string} type - 登录类型（默认PDA）（必需）
   * @returns {Promise<object>} 登录结果，包含token
   */
  async login() {
    try {
      const response = await this.axiosInstance.post('/login/access-token', {
        account: config.oioc.username,
        password: config.oioc.password,
        type: 'PDA',
      });
      
      // 验证是否返回token
      // token在 response.data.data.token 中
      if (response.data && response.data.data && response.data.data.token) {
        this.token = response.data.data.token;
        console.log('✅ 第三方系统登录成功，Token已保存');
        return response.data.data;
      } else {
        throw new Error('登录失败：未返回token');
      }
    } catch (error) {
      console.error('登录失败:', error.message);
      throw error;
    }
  }

  /**
   * 确保已登录（如果没有token则自动登录）
   */
  async ensureLogin() {
    if (!this.token) {
      console.log('⚠️  Token不存在，自动登录...');
      await this.login();
    }
  }

  /**
   * 创建产品
   * Body参数：
   * @param {object} productData - 产品数据
   * @param {string} productData.productID - 产品ID（唯一）（必需）
   * @param {string} productData.productCode - 产品编号（可选）
   * @param {string} productData.productName - 产品名称（唯一）（必需）
   * @param {string} productData.standard - 产品规格（可选）
   * @returns {Promise<object>} 创建结果
   */
  async createProduct(productData) {
    try {
      await this.ensureLogin();
      
      const response = await this.axiosInstance.post('/products/', {
        productID: productData.productID,
        productCode: productData.productCode,
        productName: productData.productName,
        standard: productData.standard,
      });
      
      return response.data;
    } catch (error) {
      console.error('创建产品失败:', error.message);
      throw error;
    }
  }

  /**
   * 查询产品
   * Query参数：
   * @param {object} params - 查询参数（可选）
   * @param {string} params.productID - 产品ID（唯一）（可选）
   * @param {string} params.productName - 产品名称（可选）
   * @param {string} params.productCode - 产品编号（唯一）（可选）
   * @param {string} params.standard - 产品规格（可选）
   * @param {string} params.limit - 获取N个数据（默认：10）（可选）
   * @param {string} params.skip - 跳过N个数据（默认：0）（可选）
   * @returns {Promise<object>} 产品列表
   */
  async getProduct(params = {}) {
    try {
      await this.ensureLogin();
      
      const queryParams = {};
      if (params.productID) queryParams.productID = params.productID;
      if (params.productName) queryParams.productName = params.productName;
      if (params.productCode) queryParams.productCode = params.productCode;
      if (params.standard) queryParams.standard = params.standard;
      if (params.limit) queryParams.limit = params.limit;
      if (params.skip) queryParams.skip = params.skip;
      
      const response = await this.axiosInstance.get('/products/', {
        params: queryParams,
      });
      
      return response.data;
    } catch (error) {
      console.error('查询产品失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建代理商
   * Body参数：
   * @param {object} agentData - 代理商数据
   * @param {string} agentData.userID - 代理商ID（必需）
   * @param {string} agentData.account - 账号（唯一）（必需）
   * @param {string} agentData.password - 密码（必需）
   * @param {number} agentData.userTypeNumber - 用户类型编号（固定传30）（必需）
   * @param {string} agentData.parentID - 上级ID（固定传'admin'）（必需）
   * @returns {Promise<object>} 创建结果
   */
  async createAgent(agentData) {
    try {
      await this.ensureLogin();
      
      const response = await this.axiosInstance.post('/users/', {
        userID: agentData.userID,
        account: agentData.account,
        password: agentData.password || '888333',
        userTypeNumber: agentData.userTypeNumber || 30,
        parentID: agentData.parentID || 'admin',
      });
      
      return response.data;
    } catch (error) {
      console.error('创建代理商失败:', error.message);
      throw error;
    }
  }

  /**
   * 查询代理商
   * Query参数：
   * @param {object} params - 查询参数（可选）
   * @param {string} params.userID - 代理商ID（可选）
   * @param {string} params.account - 账号（可选）
   * @param {string} params.userName - 用户名（可选）
   * @param {string} params.limit - 获取N个数据（默认：10）（可选）
   * @param {string} params.skip - 跳过N个数据（默认：0）（可选）
   * @returns {Promise<object>} 代理商列表
   */
  async getAgent(params = {}) {
    try {
      await this.ensureLogin();
      
      const queryParams = {};
      if (params.userID) queryParams.userID = params.userID;
      if (params.account) queryParams.account = params.account;
      if (params.userName) queryParams.userName = params.userName;
      if (params.limit) queryParams.limit = params.limit;
      if (params.skip) queryParams.skip = params.skip;
      
      const response = await this.axiosInstance.get('/users/', {
        params: queryParams,
      });
      
      return response.data;
    } catch (error) {
      console.error('查询代理商失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建入库单
   * Body参数：
   * @param {object} orderData - 入库单数据
   * @param {string} orderData.shipperID       - 发货人ID（入库传空字符）（必需）
   * @param {string} orderData.orderNumber     - 订单号（所有订单唯一）（必需）
   * @param {string} orderData.orderDesc       - 订单备注（可选）
   * @param {string} orderData.orderSource     - 订单来源（默认: 'API'）（必需）
   * @param {number} orderData.orderTypeNumber - 订单类型编号（入库: 10）（必需）
   * @param {string} orderData.receiverID      - 收货人ID（入库：仓库ID）（必需）
   * @param {number} orderData.orderInType     - 入库类型（入库: 20）（必需）
   * @param {array} orderData.detailList       - 商品明细列表（必需）
   * @param {string} orderData.detailList[0].productID - 产品ID（必需）
   * @param {number} orderData.detailList[0].expectedQty - 开单数量（必需）
   * @returns {Promise<object>} 创建结果
   */
  async createInboundOrder(orderData) {
    try {
      await this.ensureLogin();
      
      const response = await this.axiosInstance.post('/orders/order-and-detail/', {
        shipperID: orderData.shipperID || '',
        orderNumber: orderData.orderNumber,
        orderDesc: orderData.orderDesc || '创建入库单',
        orderSource: orderData.orderSource || 'API',
        orderTypeNumber: orderData.orderTypeNumber || 10,
        receiverID: orderData.receiverID,
        orderInType: orderData.orderInType || 20,
        detailList: orderData.detailList,
      });
      
      return response.data;
    } catch (error) {
      console.error('创建入库单失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建出库单
   * Body参数：
   * @param {object} orderData - 出库单数据
   * @param {string} orderData.shipperID       - 发货人ID（出库传仓库id）（必需）
   * @param {string} orderData.orderNumber     - 订单号（所有订单唯一）（必需）
   * @param {string} orderData.orderDesc       - 订单备注（可选）
   * @param {string} orderData.orderSource     - 订单来源（默认: 'API'）（必需）
   * @param {number} orderData.orderTypeNumber - 订单类型编号（出库: 20）（必需）
   * @param {string} orderData.receiverID      - 收货人ID（出库：代理ID）（必需）
   * @param {number} orderData.orderInType     - 出库类型（出库: 0）（必需）
   * @param {array} orderData.detailList       - 商品明细列表（必需）
   * @param {string} orderData.detailList[0].productID - 产品ID（必需）
   * @param {number} orderData.detailList[0].expectedQty - 开单数量（必需）
   * @returns {Promise<object>} 创建结果
   */
  async createOutboundOrder(orderData) {
    try {
      await this.ensureLogin();
      
      const response = await this.axiosInstance.post('/orders/order-and-detail/', {
        shipperID: orderData.shipperID || '',
        orderNumber: orderData.orderNumber,
        orderDesc: orderData.orderDesc || '创建出库单',
        orderSource: orderData.orderSource || 'API',
        orderTypeNumber: orderData.orderTypeNumber || 20,
        orderInType: orderData.orderInType || 0,
        receiverID: orderData.receiverID,
        detailList: orderData.detailList,
      });
      
      return response.data;
    } catch (error) {
      console.error('创建出库单失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建退货单
   * Body参数：
   * @param {object} orderData - 退货单数据
   * @param {string} orderData.shipperID       - 发货人ID（退货传退货代理id）（必需）
   * @param {string} orderData.orderNumber     - 订单号（所有订单唯一）（必需）
   * @param {string} orderData.orderDesc       - 订单备注（可选）
   * @param {string} orderData.orderSource     - 订单来源（默认: 'API'）（必需）
   * @param {number} orderData.orderTypeNumber - 订单类型编号（退货: 30）（必需）
   * @param {string} orderData.receiverID      - 收货人ID（退货：仓库ID）（必需）
   * @param {number} orderData.orderInType     - 退货类型（退货: 0）（必需）    
   * @param {array} orderData.detailList       - 商品明细列表（必需）
   * @param {string} orderData.detailList[0].productID - 产品ID（必需）
   * @param {number} orderData.detailList[0].expectedQty - 开单数量（必需）
   * @returns {Promise<object>} 创建结果
   */
  async createReturnOrder(orderData) {
    try {
      await this.ensureLogin();
      
      const response = await this.axiosInstance.post('/orders/order-and-detail/', {
        shipperID: orderData.shipperID || '',
        orderNumber: orderData.orderNumber,
        orderDesc: orderData.orderDesc || '创建退货单',
        orderSource: orderData.orderSource || 'API',
        orderTypeNumber: orderData.orderTypeNumber || 30,
        orderInType: orderData.orderInType || 0,
        receiverID: orderData.receiverID,
        detailList: orderData.detailList,
      });
      
      return response.data;
    } catch (error) {
      console.error('创建退货单失败:', error.message);
      throw error;
    }
  }

  /**
   * 查询订单条码
   * Path参数：orderID - String 订单ID（必需）
   * Header参数：
   * @param {string} syskey - 系统KEY
   * @param {string} token - token
   * @returns {Promise<object>} 订单条码列表
   */
  async getOrderCodes(orderID) {
    try {
      await this.ensureLogin();
      
      const response = await this.axiosInstance.get(`/barcodes/get_by_order/${orderID}`);
      
      return response.data;
    } catch (error) {
      console.error('查询订单条码失败:', error.message);
      throw error;
    }
  }

  /**
   * 查询入库订单详情
   * Query参数：
   * @param {object} params - 查询参数（可选）
   * @param {string} params.orderNumber - 订单号（模糊查询）（可选）
   * @param {string} params.orderStateNumber - 订单状态（可选）
   * @param {string} params.receiverID - 入库仓库ID(总部人员可以单个查询, 仓库人员不需要传)（可选）
   * @param {string} params.receiverUsername - 仓库名称(模糊查询)(总部人员可以单个查询, 仓库人员不需要传)（可选）
   * @param {string} params.productID - 产品ID（可选）
   * @param {string} params.productName - 产品名称（可选）
   * @param {string} params.batchID - 批次ID（可选）
   * @param {string} params.batchName - 批次名称（可选）
   * @param {string} params.createdStartTime - 创建时间-开始（可选）
   * @param {string} params.createdEndTime - 创建时间-结束（可选）
   * @param {string} params.finishStartTime - 完成时间-开始（可选）
   * @param {string} params.finishEndTime - 完成时间-结束（可选）
   * @param {string} params.isAccurate - 是否开启精准查询(0: 模糊(默认), 1: 精准)（可选）
   * @param {string} params.isScan - 是否需要扫描, 0:无需, 1:需要（可选）
   * @param {string} params.isStatSum - 是否统计明细的数量(0:不统计, 1:统计)（可选）
   * @param {string} params.orderInType - 入库类型（可选）
   * @param {string} params.orderInTypeList - 入库类型列表（可选）示例：41,42
   * @param {string} params.orderDetailDesc - 明细备注（可选）
   * @param {number} params.showMiddleCodeCount - 是否计算箱规数量（可选）
   * @param {number} params.returnSerialTag - 是否返回条码（可选）
   * @param {string} params.limit - 获取N个数据（默认：10）（可选）
   * @param {string} params.skip - 跳过N个数据（默认：0）（可选）
   * Header参数：
   * Token - token（默认：{{token}}）（可选） 
   * @returns {Promise<object>} 入库订单详情
   */
  async getInboundOrderDetail(params = {}) {
    try {
      await this.ensureLogin();
      
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
      });
      
      return response.data;
    } catch (error) {
      console.error('查询入库订单详情失败:', error.message);
      throw error;
    }
  }

  /**
   * 查询出库订单详情
   * Query参数：
   * @param {object} params - 查询参数
   * @param {string} params.userID - 当前用户ID(当前人为仓库的, 仅查询自己的数据)（必需）
   * @param {string} params.orderNumber - 订单号（模糊查询）（可选）
   * @param {string} params.orderStateNumber - 订单状态（可选）
   * @param {string} params.receiverID - 接收人ID（可选）
   * @param {string} params.receiverUsername - 收货人名称（可选）
   * @param {string} params.productID - 产品ID（可选）
   * @param {string} params.productName - 产品名称（可选）
   * @param {string} params.batchID - 批次ID（可选）
   * @param {string} params.batchName - 批次名称（可选）
   * @param {string} params.createdStartTime - 创建时间-开始（可选）
   * @param {string} params.createdEndTime - 创建时间-结束（可选）
   * @param {string} params.finishStartTime - 完成时间-开始（可选）
   * @param {string} params.finishEndTime - 完成时间-结束（可选）
   * @param {string} params.shipperID - 发货人ID(总部人员可以单个查询, 仓库人员不需要传))（可选）
   * @param {string} params.shipperName - 发货人名称（示例：成品）（可选）
   * @param {string} params.orderTypeNumber - 订单类型，出库需填, 20:普通出库, 21:快捷出库, 29:所有出库（必需）
   * @param {string} params.isAccurate - 是否开启精准查询(0: 模糊(默认), 1: 精准)（可选）
   * @param {string} params.isScan - 是否需要扫描, 0:无需, 1:需要（可选）
   * @param {string} params.isStatSum - 是否统计明细的数量(0:不统计, 1:统计)（可选）
   * @param {string} params.orderTypeNumberList - 出库类型列表, 用于查询流水号快捷出库，示例：22,23
   * @param {string} params.limit - 获取N个数据（默认：10）（可选）
   * @param {string} params.skip - 跳过N个数据（默认：0）（可选）
   * @returns {Promise<object>} 出库订单详情
   */
  async getOutboundOrderDetail(params = {}) {
    try {
      await this.ensureLogin();
      
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
      });
      
      return response.data;
    } catch (error) {
      console.error('查询出库订单详情失败:', error.message);
      throw error;
    }
  }

  /**
   * 查询退货订单详情
   * Query参数：
   * @param {object} params - 查询参数
   * @param {string} params.userID - 当前用户ID（必需）
   * @param {string} params.orderNumber - 订单号（模糊查询）（可选）
   * @param {string} params.orderStateNumber - 订单状态（可选）
   * @param {string} params.receiverID - 收货人ID（可选）
   * @param {string} params.receiverUsername -收货人名称（可选）
   * @param {string} params.productID - 产品ID（可选）
   * @param {string} params.productName - 产品名称（可选）
   * @param {string} params.batchID - 批次ID（可选）
   * @param {string} params.batchName - 批次名称（可选）
   * @param {string} params.createdStartTime - 创建时间-开始（可选）
   * @param {string} params.createdEndTime - 创建时间-结束（可选）
   * @param {string} params.finishStartTime - 完成时间-开始（可选）
   * @param {string} params.finishEndTime - 完成时间-结束（可选）
   * @param {string} params.shipperID - 退货人ID（可选）
   * @param {string} params.shipperName - 退货人名称（可选）
   * @param {string} params.isAccurate - 是否开启精准查询(0: 模糊(默认))（可选）
   * @param {string} params.createdUserID - 创建人ID（可选）
   * @param {string} params.createdUserName - 创建人名称[支持精准/模糊查询]（可选）
   * @param {string} params.isStatSum - 0:不统计数据; 1:统计数据（可选）
   * @param {string} params.limit - 获取N个数据（默认：10）（可选）
   * @param {string} params.skip - 跳过N个数据（默认：0）（可选）
   * @returns {Promise<object>} 退货订单详情
   */
  async getReturnOrderDetail(params = {}) {
    try {
      await this.ensureLogin();
      
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
      });
      
      return response.data;
    } catch (error) {
      console.error('查询退货订单详情失败:', error.message);
      throw error;
    }
  }
}

module.exports = new OiocClient();
