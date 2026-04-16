const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../database/db.json');

async function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    const initialData = {
      users: [
        {
          id: 1,
          username: 'cangku001',
          password: hashedPassword,
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLoginAt: null
        }
      ],
      syncLogs: []
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  }
}

function readDb() {
  const data = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(data);
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  readDb,
  writeDb,
  ensureDb
};
