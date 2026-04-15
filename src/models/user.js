const { readDb, writeDb } = require('./jsonDb');
const bcrypt = require('bcryptjs');

async function findAll() {
  const db = readDb();
  return db.users.map(u => {
    const { password, ...user } = u;
    return user;
  });
}

async function findById(id) {
  const db = readDb();
  return db.users.find(u => u.id === id);
}

async function findByUsername(username) {
  const db = readDb();
  return db.users.find(u => u.username === username);
}

async function create(userData) {
  const db = readDb();
  const maxId = db.users.reduce((max, u) => Math.max(max, u.id), 0);
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const user = {
    id: maxId + 1,
    username: userData.username,
    password: hashedPassword,
    role: userData.role || 'user',
    createdAt: new Date().toISOString(),
    lastLoginAt: null
  };
  
  db.users.push(user);
  writeDb(db);
  
  const { password, ...result } = user;
  return result;
}

async function update(id, updates) {
  const db = readDb();
  const index = db.users.findIndex(u => u.id === id);
  
  if (index === -1) return null;
  
  db.users[index] = { ...db.users[index], ...updates };
  writeDb(db);
  
  const { password, ...result } = db.users[index];
  return result;
}

async function updatePassword(id, hashedPassword) {
  const db = readDb();
  const index = db.users.findIndex(u => u.id === id);
  
  if (index === -1) return false;
  
  db.users[index].password = hashedPassword;
  writeDb(db);
  
  return true;
}

async function remove(id) {
  const db = readDb();
  const index = db.users.findIndex(u => u.id === id);
  
  if (index === -1) return false;
  
  db.users.splice(index, 1);
  writeDb(db);
  
  return true;
}

async function validatePassword(user, password) {
  return bcrypt.compare(password, user.password);
}

module.exports = {
  findAll,
  findById,
  findByUsername,
  create,
  update,
  updatePassword,
  remove,
  validatePassword
};
