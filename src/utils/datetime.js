const BEIJING_TZ = 'Asia/Shanghai';
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

function _formatParts(date, options) {
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: BEIJING_TZ, ...options });
  const parts = formatter.formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value || '00';
  return { get, parts };
}

function getBeijingTime(dateOrTimestamp) {
  const date = dateOrTimestamp ? new Date(dateOrTimestamp) : new Date();
  const { get } = _formatParts(date, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function getBeijingISO() {
  const date = new Date();
  const { get } = _formatParts(date, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.000+08:00`;
}

function getBeijingDate() {
  const date = new Date();
  const { get } = _formatParts(date, {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  return `${get('year')}-${get('month')}-${get('day')}`;
}

module.exports = {
  getBeijingTime,
  getBeijingISO,
  getBeijingDate,
  BEIJING_OFFSET_MS,
};
