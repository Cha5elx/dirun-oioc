const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const SyncLogModel = sequelize.define('SyncLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  data: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const value = this.getDataValue('data');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('data', value ? JSON.stringify(value) : null);
    }
  },
  error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  timestamp: {
    type: DataTypes.STRING(50),
    allowNull: false
  }
}, {
  tableName: 'sync_logs',
  timestamps: false
});

module.exports = SyncLogModel;
