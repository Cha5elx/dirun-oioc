/**
 * 模拟数据生成器
 * 用于本地测试，生成模拟的订单、产品、防伪码等数据
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../database/db.json');

function generateMockData() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const mockData = {
    users: [
      {
        id: 1,
        username: 'admin',
        password: '$2a$10$IQkHP4WdANThwaDE7trzDOYVFMY3oxYc9TUus/RhS5QlDyYdOXFPW',
        role: 'admin',
        createdAt: '2026-04-01T08:00:00.000Z',
        lastLoginAt: now.toISOString()
      },
      {
        id: 2,
        username: 'warehouse',
        password: '$2a$10$vmYYhhulLNwX4fzaILbrzeK.y1zcYvfWlO2KZ7qqgxNGp1i3ssKzW',
        role: 'user',
        createdAt: '2026-04-05T10:30:00.000Z',
        lastLoginAt: '2026-04-10T14:20:00.000Z'
      }
    ],
    syncLogs: [
      {
        id: 1,
        type: 'inbound',
        status: 'success',
        data: {
          productId: 'PROD001',
          itemId: 'ITEM001',
          skuId: 'SKU001',
          quantity: 100,
          codes: generateCodes(100, 'IN'),
          receiverID: 'WAREHOUSE001'
        },
        error: null,
        timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        type: 'order_created',
        status: 'success',
        data: {
          orderId: 'YZ20260413001',
          items: [
            { productID: 'PROD001', expectedQty: 2 }
          ]
        },
        error: null,
        timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        type: 'outbound',
        status: 'success',
        data: {
          orderId: 'YZ20260413001',
          logisticsNo: 'SF1234567890',
          codes: generateCodes(2, 'OUT'),
          itemId: 'ITEM001',
          skuId: 'SKU001'
        },
        error: null,
        timestamp: new Date(now - 20 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        type: 'refund_created',
        status: 'success',
        data: {
          orderId: 'YZ20260413001',
          refundId: 'RF001',
          items: [
            { productID: 'PROD001', expectedQty: 1 }
          ]
        },
        error: null,
        timestamp: new Date(now - 10 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 5,
        type: 'return_complete',
        status: 'success',
        data: {
          orderId: 'YZ20260413001',
          codes: [generateCodes(1, 'RET')[0]],
          itemId: 'ITEM001',
          skuId: 'SKU001'
        },
        error: null,
        timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 6,
        type: 'inbound',
        status: 'success',
        data: {
          productId: 'PROD002',
          itemId: 'ITEM002',
          skuId: 'SKU002',
          quantity: 50,
          codes: generateCodes(50, 'IN2'),
          receiverID: 'WAREHOUSE001'
        },
        error: null,
        timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 7,
        type: 'order_created',
        status: 'failed',
        data: {
          orderId: 'YZ20260414001',
          items: [
            { productID: 'PROD003', expectedQty: 5 }
          ]
        },
        error: '产品不存在: PROD003',
        timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 8,
        type: 'outbound',
        status: 'success',
        data: {
          orderId: 'YZ20260414002',
          logisticsNo: 'YT9876543210',
          codes: generateCodes(3, 'OUT2'),
          itemId: 'ITEM002',
          skuId: 'SKU002'
        },
        error: null,
        timestamp: new Date(now - 30 * 60 * 1000).toISOString()
      }
    ]
  };
  
  fs.writeFileSync(dbPath, JSON.stringify(mockData, null, 2));
  console.log('✅ 模拟数据生成成功！');
  console.log(`   用户数: ${mockData.users.length}`);
  console.log(`   日志数: ${mockData.syncLogs.length}`);
  console.log(`   文件位置: ${dbPath}`);
  
  return mockData;
}

function generateCodes(count, prefix) {
  const codes = [];
  for (let i = 1; i <= count; i++) {
    codes.push({
      code: `${prefix}${Date.now()}${String(i).padStart(4, '0')}`,
      status: 'active',
      productId: `PROD${String(Math.floor(Math.random() * 3) + 1).padStart(3, '0')}`
    });
  }
  return codes;
}

function generateProducts() {
  return [
    {
      productId: 'PROD001',
      productCode: 'YJ001',
      productName: '橙花精油50ml',
      standard: '50ml',
      itemId: 'ITEM001',
      skuId: 'SKU001'
    },
    {
      productId: 'PROD002',
      productCode: 'YJ002',
      productName: '橙花精油100ml',
      standard: '100ml',
      itemId: 'ITEM002',
      skuId: 'SKU002'
    },
    {
      productId: 'PROD003',
      productCode: 'MS001',
      productName: '玫瑰面膜',
      standard: '30片/盒',
      itemId: 'ITEM003',
      skuId: 'SKU003'
    }
  ];
}

if (require.main === module) {
  generateMockData();
}

module.exports = { generateMockData, generateCodes, generateProducts };
