const { Sequelize } = require('sequelize');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/dirun.db');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
  dialectModule: require('sqlite3')
});

module.exports = sequelize;
