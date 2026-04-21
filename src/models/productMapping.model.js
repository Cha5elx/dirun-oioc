const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const ProductMappingModel = sequelize.define('ProductMapping', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  youzanItemId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '有赞商品ID'
  },
  youzanSkuId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '有赞SKU ID'
  },
  youzanItemName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '有赞商品名称'
  },
  oiocProductCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '第三方产品编码'
  },
  oiocProductName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '第三方产品名称'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'product_mappings',
  timestamps: true,
  updatedAt: 'updatedAt',
  createdAt: 'createdAt'
});

module.exports = ProductMappingModel;
