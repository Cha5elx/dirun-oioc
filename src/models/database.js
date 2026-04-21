const { Sequelize } = require('sequelize');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/dirun.db');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectModule: require('sqlite3'),
  dialectOptions: {
  },
  pool: {
    max: 5,
    min: 1,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    max: 3,
    match: [
      /SQLITE_BUSY/,
      /SQLITE_LOCKED/
    ]
  }
});

module.exports = sequelize;
