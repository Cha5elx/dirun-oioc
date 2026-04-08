// 获取token
const youzanyun = require('youzanyun-sdk');

async function getToken() {
  try {
    const resp = await youzanyun.token.get({
      authorize_type: 'silent',
      client_id: '891289185e2cb0d394',
      client_secret: '9476911249fdb3b6fcbb1da7c766bfc1',
      grant_id: 158310016,
      refresh: true, // 是否获取refresh_token(可通过refresh_token刷新token)
    });
    
    console.log('获取到的token响应：');
    console.log(resp);
  } catch (error) {
    console.error('获取token失败：', error);
  }
}

getToken();

// 全量或增量方式更新SKU库存
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = {
	"quantity":"110",
	"item_id":"702735944",
	"sku_id":"",
	"type":"0"
};

const resp = youzanyun.client.call({
    api: 'youzan.item.quantity.update',
    version: '3.0.0',
    token,
    params,
});

// 实物库存调整
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = {
	"operate_type":"",
	"creator":"",
	"retail_source":"GUANYIYUN",
	"create_time":"2020-03-30 16:18:44",
	"warehouse_code":"",
	"remark":"",
	"source_order_no":"PKML02L1585556321",
	"order_items":"[{\"quantity\":\"171\",\"sku_code\":\"KML02L\"}]"
};

const resp = youzanyun.client.call({
    api: 'youzan.retail.open.stock.adjust',
    version: '3.0.0',
    token,
    params,
});

// 零售库存唯一码查询
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = {
	"retail_source":"GUANYIYUN",
	"warehouse_code":"test134",
	"page_no":"1",
	"page_size":"20"
};

const resp = youzanyun.client.call({
    api: 'youzan.retail.open.stock.unique.code',
    version: '3.0.0',
    token,
    params,
});

// 查询商品库存扣减记录
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = null;

const resp = youzanyun.client.call({
    api: 'youzan.item.sku.list.deduct',
    version: '1.0.0',
    token,
    params,
});

// 查询仓库商品库存
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = null;

const resp = youzanyun.client.call({
    api: 'youzan.retail.open.query.warehousestock',
    version: '1.0.0',
    token,
    params,
});

// 更新商品的库存设置相关信息
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = null;

const resp = youzanyun.client.call({
    api: 'youzan.item.stock.setting.update',
    version: '1.0.0',
    token,
    params,
});

// 全量更新商品计划库存
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = null;

const resp = youzanyun.client.call({
    api: 'youzan.retail.open.modify.planstock',
    version: '1.0.0',
    token,
    params,
});

// 根据订单号查询唯一码
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = null;

const resp = youzanyun.client.call({
    api: 'youzan.retail.open.list.uniquecode',
    version: '1.0.0',
    token,
    params,
});

// 查询订单包裹详情
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = {
	"kdt_id":"42426237",
	"from_app":"",
	"source_id":"1002",
	"request_id":"",
	"tid":"E20200529225447084600005"
};

const resp = youzanyun.client.call({
    api: 'youzan.logistics.order.query',
    version: '1.0.0',
    token,
    params,
});

// 订单发货
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = {
	"out_stype":"1",
	"out_sid":"1232314",
	"admin_id":"",
	"is_no_express":"",
	"oids":"",
	"tid":"E20200828154641023700067",
	"outer_tid":""
};

const resp = youzanyun.client.call({
    api: 'youzan.logistics.online.confirm',
    version: '3.0.0',
    token,
    params,
});

// 查询订单包裹列表 
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = {
	"order_detail_params":"[{\"order_id\":\"E20200331150807008800005\",\"source_id\":1002},{\"order_id\":\"E20200331150819008800001\",\"source_id\":1002}]",
	"from_app":"",
	"request_id":""
};

const resp = youzanyun.client.call({
    api: 'youzan.logistics.order.batch.query',
    version: '1.0.0',
    token,
    params,
});

// 查询换货订单详情
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = {
	"order_no":"www",
	"exchange_goods_id":"",
	"retail_source":"WDT"
};

const resp = youzanyun.client.call({
    api: 'youzan.retail.open.exchange.order.get',
    version: '1.0.0',
    token,
    params,
});

// 更新订单备注
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = {
	"flag":"2",
	"memo":"备注测试",
	"tid":"E20200602151020001500009"
};

const resp = youzanyun.client.call({
    api: 'youzan.trade.memo.update',
    version: '3.0.0',
    token,
    params,
});

// 更新订单收货地址
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = null;

const resp = youzanyun.client.call({
    api: 'youzan.trade.order.address.update',
    version: '1.0.0',
    token,
    params,
});

// 查询商品详情
const youzanyun = require('youzanyun-sdk');

const token = 'YOUR_TOKEN';
const params = null;

const resp = youzanyun.client.call({
    api: 'youzan.item.itemdetail.get',
    version: '1.0.0',
    token,
    params,
});


