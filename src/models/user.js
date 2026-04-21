const UserModel = require('./user.model');
const bcrypt = require('bcryptjs');

async function findAll() {
  const users = await UserModel.findAll({
    attributes: { exclude: ['password'] },
    order: [['id', 'ASC']]
  });
  return users.map(u => u.toJSON());
}

async function findById(id) {
  const user = await UserModel.findByPk(id);
  return user ? user.toJSON() : null;
}

async function findByUsername(username) {
  const user = await UserModel.findOne({ where: { username } });
  return user ? user.toJSON() : null;
}

async function create(userData) {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const user = await UserModel.create({
    username: userData.username,
    password: hashedPassword,
    role: userData.role || 'operator',
    createdAt: new Date(),
    lastLoginAt: null
  });
  
  const { password, ...result } = user.toJSON();
  return result;
}

async function update(id, updates) {
  const user = await UserModel.findByPk(id);
  if (!user) return null;
  
  await user.update(updates);
  const { password, ...result } = user.toJSON();
  return result;
}

async function updatePassword(id, hashedPassword) {
  const user = await UserModel.findByPk(id);
  if (!user) return false;
  
  await user.update({ password: hashedPassword });
  return true;
}

async function remove(id) {
  const user = await UserModel.findByPk(id);
  if (!user) return false;
  
  await user.destroy();
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
