// 参数说明
// 请求url
// https://v6api.xolo.kim/api/v1

// syskey说明
// 使用的syskey为 DIRUN.

// 此syskey在所有接口的header上添加.

// token说明
// 请求登录接口后, 得到token.

// 此后其他接口均需要使用到token, 请在header上添加.

// 使用账号说明
// 需使用 仓库员工 的账号密码进行登录
// 默认是: cangku001 123456

// 可以在后台添加其他的 仓库员工 账号使用

// post 登录
var axios = require('axios');
var data = JSON.stringify({
   "account": "cangku001",
   "password": "123456",
   "type": "PDA"
});

var config = {
   method: 'post',
   url: 'https://v6api.xolo.kim/api/v1/login/access-token',
   headers: { 
      'syskey': 'DIRUN', 
      'Content-Type': 'application/json'
   },
   data : data
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});

// post 创建产品
var axios = require('axios');
var data = JSON.stringify({
   "productID": "产品id",
   "productCode": "编号",
   "productName": "名称",
   "standard": "规格"
});

var config = {
   method: 'post',
   url: 'https://v6api.xolo.kim/api/v1/products/',
   headers: { 
      'Content-Type': 'application/json'
   },
   data : data
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});

// get 查询产品
var axios = require('axios');

var config = {
   method: 'get',
   url: 'https://v6api.xolo.kim/api/v1/products/?productID&productName&productCode&standard',
   headers: { }
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});


// post 创建代理
var axios = require('axios');
var data = JSON.stringify({
   "userID": "代理id",
   "account": "账号",
   "password": "888333",
   "userTypeNumber": 30,
   "parentID": "admin"
});

var config = {
   method: 'post',
   url: 'https://v6api.xolo.kim/api/v1/users/',
   headers: { 
      'Content-Type': 'application/json'
   },
   data : data
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});


// get 查询代理
var axios = require('axios');

var config = {
   method: 'get',
   url: 'https://v6api.xolo.kim/api/v1/users/?userID&account&userName',
   headers: { }
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});


// post 创建入库/出库/退货单
var axios = require('axios');
var data = JSON.stringify({
   "shipperID": "",
   "orderNumber": "A20260129001",
   "orderDesc": "创建后绑定有码入库单",
   "orderSource": "API",
   "orderTypeNumber": 10,
   "receiverID": "FE7D844D-5CAB-4DB9-97FB-2C812C6F142D",
   "orderInType": 20,
   "detailList": [
      {
         "productID": "df4ba8e4-8092-11ec-adc3-f78536c9c35a",
         "expectedQty": 10
      }
   ]
});

var config = {
   method: 'post',
   url: 'https://v6api.xolo.kim/api/v1/orders/order-and-detail/',
   headers: { 
      'Content-Type': 'application/json'
   },
   data : data
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});

// get 查询订单条码 
// /barcodes/get_by_order/{orderID}
// orderID是传入的参数
var axios = require('axios');

var config = {
   method: 'get',
   url: 'https://v6api.xolo.kim/api/v1/barcodes/get_by_order/saa10001',
   headers: { }
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});


// get 查询退货订单详情
// userID是传入的参数
var axios = require('axios');

var config = {
   method: 'get',
   url: 'https://v6api.xolo.kim/api/v1/reports/hq/order-return/has-scan?userID=85110428-20CB-477E-9516-390A96320C7B&orderNumber=&orderStateNumber=&receiverID=&receiverUsername=&productID=&productName=&batchID=&batchName=&createdStartTime=&createdEndTime=&finishStartTime=&finishEndTime=&shipperID=&shipperName=&isAccurate=0&createdUserID=&createdUserName=&isStatSum=0',
   headers: { }
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});



// get 查询出库订单详情
// userID是传入的参数
var axios = require('axios');

var config = {
   method: 'get',
   url: 'https://v6api.xolo.kim/api/v1/reports/hq/order-out/has-scan?userID=85110428-20CB-477E-9516-390A96320C7B&orderNumber&orderStateNumber&receiverID&receiverUsername&productID&productName&batchID&batchName&createdStartTime&createdEndTime&finishStartTime&finishEndTime&shipperID&shipperName=成品&orderTypeNumber=29&isAccurate=0&isScan=1&isStatSum=0&orderTypeNumberList=22,23',
   headers: { }
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});


// get 查询入库订单详情
// has-scan之后都是传入的参数
var axios = require('axios');

var config = {
   method: 'get',
   url: 'https://v6api.xolo.kim/api/v1/reports/hq/order-in/has-scan?orderNumber&orderStateNumber&receiverID&receiverUsername&productID&productName&batchID&batchName&createdStartTime&createdEndTime&finishStartTime&finishEndTime&isAccurate=0&isScan=1&isStatSum=0&orderInType=20&orderInTypeList=41,42&orderDetailDesc&showMiddleCodeCount=&returnSerialTag',
   headers: { }
};

axios(config)
.then(function (response) {
   console.log(JSON.stringify(response.data));
})
.catch(function (error) {
   console.log(error);
});
