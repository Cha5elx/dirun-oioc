/**
 * 北京时间工具函数
 * 统一处理东八区时间格式化
 */
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

function getBeijingTime(dateOrTimestamp) {
  const now = dateOrTimestamp ? new Date(dateOrTimestamp) : new Date();
  const beijingTime = new Date(now.getTime() + BEIJING_OFFSET_MS);
  return beijingTime.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function getBeijingISO() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + BEIJING_OFFSET_MS);
  return beijingTime.toISOString().replace('Z', '+08:00');
}

function getBeijingDate() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + BEIJING_OFFSET_MS);
  return beijingTime.toISOString().slice(0, 10);
}

module.exports = {
  getBeijingTime,
  getBeijingISO,
  getBeijingDate,
  BEIJING_OFFSET_MS,
};
