const ProductMappingModel = require('./productMapping.model');
const { Op } = require('sequelize');

async function findByYouzanSku(skuId) {
  const mapping = await ProductMappingModel.findOne({
    where: { youzanSkuId: skuId }
  });
  return mapping ? mapping.toJSON() : null;
}

async function findByYouzanItem(itemId) {
  const mapping = await ProductMappingModel.findOne({
    where: { youzanItemId: itemId }
  });
  return mapping ? mapping.toJSON() : null;
}

async function findByOiocCode(productCode) {
  const mapping = await ProductMappingModel.findOne({
    where: { oiocProductCode: productCode }
  });
  return mapping ? mapping.toJSON() : null;
}

async function findById(id) {
  const mapping = await ProductMappingModel.findByPk(id);
  return mapping ? mapping.toJSON() : null;
}

async function create(mappingData) {
  const mapping = await ProductMappingModel.create({
    youzanItemId: mappingData.youzanItemId,
    youzanSkuId: mappingData.youzanSkuId,
    youzanItemName: mappingData.youzanItemName || null,
    oiocProductCode: mappingData.oiocProductCode,
    oiocProductName: mappingData.oiocProductName || null
  });
  return mapping.toJSON();
}

async function update(id, mappingData) {
  const mapping = await ProductMappingModel.findByPk(id);
  if (!mapping) return null;
  
  await mapping.update(mappingData);
  return mapping.toJSON();
}

async function remove(id) {
  const mapping = await ProductMappingModel.findByPk(id);
  if (!mapping) return false;
  
  await mapping.destroy();
  return true;
}

async function findAll(options = {}) {
  const where = {};
  
  if (options.search) {
    where[Op.or] = [
      { youzanItemName: { [Op.like]: `%${options.search}%` } },
      { oiocProductName: { [Op.like]: `%${options.search}%` } },
      { youzanItemId: { [Op.like]: `%${options.search}%` } },
      { youzanSkuId: { [Op.like]: `%${options.search}%` } },
      { oiocProductCode: { [Op.like]: `%${options.search}%` } }
    ];
  }
  
  const total = await ProductMappingModel.count({ where });
  
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  const offset = (page - 1) * pageSize;
  
  const list = await ProductMappingModel.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset
  });
  
  return {
    list: list.map(m => m.toJSON()),
    total
  };
}

async function upsertByYouzanSku(mappingData) {
  const existing = await ProductMappingModel.findOne({
    where: { youzanSkuId: mappingData.youzanSkuId }
  });
  
  if (existing) {
    await existing.update({
      youzanItemId: mappingData.youzanItemId || existing.youzanItemId,
      youzanItemName: mappingData.youzanItemName || existing.youzanItemName,
      oiocProductCode: mappingData.oiocProductCode || existing.oiocProductCode,
      oiocProductName: mappingData.oiocProductName || existing.oiocProductName
    });
    return existing.toJSON();
  }
  
  return create(mappingData);
}

module.exports = {
  findByYouzanSku,
  findByYouzanItem,
  findByOiocCode,
  findById,
  create,
  update,
  remove,
  findAll,
  upsertByYouzanSku
};
