const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const isProduction = config.server.env === 'production';

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat()
);

const consoleFormat = winston.format.combine(
  logFormat,
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    if (stack) {
      msg += `\n${stack}`;
    }
    
    return msg;
  })
);

const fileFormat = winston.format.combine(
  logFormat,
  winston.format.json()
);

const transports = [
  new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  })
];

if (isProduction) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      level: 'debug',
      format: fileFormat,
      maxsize: 5242880,
      maxFiles: 10
    })
  );
}

const logger = winston.createLogger({
  levels: winston.config.npm.levels,
  transports,
  exitOnError: false
});

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;
