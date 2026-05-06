<template>
  <div class="oioc-orders-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 入库单 -->
      <el-tab-pane label="入库单" name="inbound">
        <el-card shadow="always">
          <template #header><div class="card-header"><span>创建入库单</span></div></template>
          <el-form ref="inboundCreateFormRef" :model="inboundCreate" :rules="inboundCreateRules" label-width="110px" style="max-width: 700px">
            <el-form-item label="订单号" prop="orderNumber">
              <el-input v-model="inboundCreate.orderNumber" placeholder="请输入订单号" />
            </el-form-item>
            <el-form-item label="收货代理ID" prop="receiverID">
              <el-input v-model="inboundCreate.receiverID" placeholder="请输入收货代理ID" />
            </el-form-item>
            <el-form-item label="发货代理ID">
              <el-input v-model="inboundCreate.shipperID" placeholder="可选" />
            </el-form-item>
            <el-form-item label="订单描述">
              <el-input v-model="inboundCreate.orderDesc" placeholder="默认 创建入库单" />
            </el-form-item>
            <el-form-item label="入库类型">
              <el-input-number v-model="inboundCreate.orderInType" :min="0" placeholder="默认 20" />
            </el-form-item>
            <el-divider content-position="left">明细列表</el-divider>
            <div v-for="(item, index) in inboundCreate.detailList" :key="index" style="margin-bottom: 10px; padding: 10px; background: #fafafa; border-radius: 4px">
              <el-row :gutter="10">
                <el-col :span="6"><el-input v-model="item.productID" placeholder="产品ID" /></el-col>
                <el-col :span="6"><el-input v-model="item.productCode" placeholder="产品编码" /></el-col>
                <el-col :span="4"><el-input v-model="item.batchID" placeholder="批次ID" /></el-col>
                <el-col :span="4"><el-input-number v-model="item.count" :min="1" placeholder="数量" style="width: 100%" /></el-col>
                <el-col :span="4">
                  <el-button type="danger" link @click="removeInboundDetail(index)">删除</el-button>
                </el-col>
              </el-row>
            </div>
            <el-form-item>
              <el-button type="success" @click="addInboundDetail">添加明细</el-button>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="inboundCreateLoading" @click="handleCreateInbound">创建入库单</el-button>
              <el-button @click="resetInboundCreate">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="always" style="margin-top: 20px">
          <template #header><div class="card-header"><span>查询入库单</span></div></template>
          <div class="filter-bar">
            <el-input v-model="inboundQuery.orderNumber" placeholder="订单号" clearable style="width: 160px" @keyup.enter="fetchInboundOrders" />
            <el-input v-model="inboundQuery.receiverID" placeholder="收货代理ID" clearable style="width: 160px; margin-left: 8px" @keyup.enter="fetchInboundOrders" />
            <el-input v-model="inboundQuery.productID" placeholder="产品ID" clearable style="width: 140px; margin-left: 8px" @keyup.enter="fetchInboundOrders" />
            <el-button type="primary" style="margin-left: 8px" @click="fetchInboundOrders">查询</el-button>
            <el-button @click="resetInboundQuery">重置</el-button>
          </div>
          <el-table :data="inboundList" stripe v-loading="inboundQueryLoading" style="margin-top: 15px">
            <el-table-column prop="orderNumber" label="订单号" min-width="140" />
            <el-table-column prop="receiverID" label="收货代理ID" min-width="120" />
            <el-table-column prop="receiverUsername" label="收货代理" min-width="120" />
            <el-table-column prop="orderStateNumber" label="状态" min-width="80" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="showInboundDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="inboundPagination.total > 0"
            v-model:current-page="inboundPagination.page"
            v-model:page-size="inboundPagination.pageSize"
            :total="inboundPagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 15px"
            @size-change="fetchInboundOrders"
            @current-change="fetchInboundOrders"
          />
        </el-card>
      </el-tab-pane>

      <!-- 出库单 -->
      <el-tab-pane label="出库单" name="outbound">
        <el-card shadow="always">
          <template #header><div class="card-header"><span>创建出库单</span></div></template>
          <el-form ref="outboundCreateFormRef" :model="outboundCreate" :rules="outboundCreateRules" label-width="110px" style="max-width: 700px">
            <el-form-item label="订单号" prop="orderNumber">
              <el-input v-model="outboundCreate.orderNumber" placeholder="请输入订单号" />
            </el-form-item>
            <el-form-item label="收货代理ID" prop="receiverID">
              <el-input v-model="outboundCreate.receiverID" placeholder="请输入收货代理ID" />
            </el-form-item>
            <el-form-item label="发货代理ID">
              <el-input v-model="outboundCreate.shipperID" placeholder="可选" />
            </el-form-item>
            <el-form-item label="订单描述">
              <el-input v-model="outboundCreate.orderDesc" placeholder="默认 创建出库单" />
            </el-form-item>
            <el-divider content-position="left">明细列表</el-divider>
            <div v-for="(item, index) in outboundCreate.detailList" :key="index" style="margin-bottom: 10px; padding: 10px; background: #fafafa; border-radius: 4px">
              <el-row :gutter="10">
                <el-col :span="6"><el-input v-model="item.productID" placeholder="产品ID" /></el-col>
                <el-col :span="6"><el-input v-model="item.productCode" placeholder="产品编码" /></el-col>
                <el-col :span="4"><el-input v-model="item.batchID" placeholder="批次ID" /></el-col>
                <el-col :span="4"><el-input-number v-model="item.count" :min="1" placeholder="数量" style="width: 100%" /></el-col>
                <el-col :span="4">
                  <el-button type="danger" link @click="removeOutboundDetail(index)">删除</el-button>
                </el-col>
              </el-row>
            </div>
            <el-form-item>
              <el-button type="success" @click="addOutboundDetail">添加明细</el-button>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="outboundCreateLoading" @click="handleCreateOutbound">创建出库单</el-button>
              <el-button @click="resetOutboundCreate">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="always" style="margin-top: 20px">
          <template #header><div class="card-header"><span>查询出库单</span></div></template>
          <div class="filter-bar">
            <el-input v-model="outboundQuery.orderNumber" placeholder="订单号" clearable style="width: 160px" @keyup.enter="fetchOutboundOrders" />
            <el-input v-model="outboundQuery.receiverID" placeholder="收货代理ID" clearable style="width: 160px; margin-left: 8px" @keyup.enter="fetchOutboundOrders" />
            <el-input v-model="outboundQuery.productID" placeholder="产品ID" clearable style="width: 140px; margin-left: 8px" @keyup.enter="fetchOutboundOrders" />
            <el-button type="primary" style="margin-left: 8px" @click="fetchOutboundOrders">查询</el-button>
            <el-button @click="resetOutboundQuery">重置</el-button>
          </div>
          <el-table :data="outboundList" stripe v-loading="outboundQueryLoading" style="margin-top: 15px">
            <el-table-column prop="orderNumber" label="订单号" min-width="140" />
            <el-table-column prop="receiverID" label="收货代理ID" min-width="120" />
            <el-table-column prop="receiverUsername" label="收货代理" min-width="120" />
            <el-table-column prop="orderStateNumber" label="状态" min-width="80" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="showOutboundDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="outboundPagination.total > 0"
            v-model:current-page="outboundPagination.page"
            v-model:page-size="outboundPagination.pageSize"
            :total="outboundPagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 15px"
            @size-change="fetchOutboundOrders"
            @current-change="fetchOutboundOrders"
          />
        </el-card>
      </el-tab-pane>

      <!-- 退货单 -->
      <el-tab-pane label="退货单" name="return">
        <el-card shadow="always">
          <template #header><div class="card-header"><span>创建退货单</span></div></template>
          <el-form ref="returnCreateFormRef" :model="returnCreate" :rules="returnCreateRules" label-width="110px" style="max-width: 700px">
            <el-form-item label="订单号" prop="orderNumber">
              <el-input v-model="returnCreate.orderNumber" placeholder="请输入订单号" />
            </el-form-item>
            <el-form-item label="收货代理ID" prop="receiverID">
              <el-input v-model="returnCreate.receiverID" placeholder="请输入收货代理ID" />
            </el-form-item>
            <el-form-item label="发货代理ID">
              <el-input v-model="returnCreate.shipperID" placeholder="可选" />
            </el-form-item>
            <el-form-item label="订单描述">
              <el-input v-model="returnCreate.orderDesc" placeholder="默认 创建退货单" />
            </el-form-item>
            <el-divider content-position="left">明细列表</el-divider>
            <div v-for="(item, index) in returnCreate.detailList" :key="index" style="margin-bottom: 10px; padding: 10px; background: #fafafa; border-radius: 4px">
              <el-row :gutter="10">
                <el-col :span="6"><el-input v-model="item.productID" placeholder="产品ID" /></el-col>
                <el-col :span="6"><el-input v-model="item.productCode" placeholder="产品编码" /></el-col>
                <el-col :span="4"><el-input v-model="item.batchID" placeholder="批次ID" /></el-col>
                <el-col :span="4"><el-input-number v-model="item.count" :min="1" placeholder="数量" style="width: 100%" /></el-col>
                <el-col :span="4">
                  <el-button type="danger" link @click="removeReturnDetail(index)">删除</el-button>
                </el-col>
              </el-row>
            </div>
            <el-form-item>
              <el-button type="success" @click="addReturnDetail">添加明细</el-button>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="returnCreateLoading" @click="handleCreateReturn">创建退货单</el-button>
              <el-button @click="resetReturnCreate">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="always" style="margin-top: 20px">
          <template #header><div class="card-header"><span>查询退货单</span></div></template>
          <div class="filter-bar">
            <el-input v-model="returnQuery.orderNumber" placeholder="订单号" clearable style="width: 160px" @keyup.enter="fetchReturnOrders" />
            <el-input v-model="returnQuery.receiverID" placeholder="收货代理ID" clearable style="width: 160px; margin-left: 8px" @keyup.enter="fetchReturnOrders" />
            <el-input v-model="returnQuery.productID" placeholder="产品ID" clearable style="width: 140px; margin-left: 8px" @keyup.enter="fetchReturnOrders" />
            <el-button type="primary" style="margin-left: 8px" @click="fetchReturnOrders">查询</el-button>
            <el-button @click="resetReturnQuery">重置</el-button>
          </div>
          <el-table :data="returnList" stripe v-loading="returnQueryLoading" style="margin-top: 15px">
            <el-table-column prop="orderNumber" label="订单号" min-width="140" />
            <el-table-column prop="receiverID" label="收货代理ID" min-width="120" />
            <el-table-column prop="receiverUsername" label="收货代理" min-width="120" />
            <el-table-column prop="orderStateNumber" label="状态" min-width="80" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="showReturnDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-if="returnPagination.total > 0"
            v-model:current-page="returnPagination.page"
            v-model:page-size="returnPagination.pageSize"
            :total="returnPagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            style="margin-top: 15px"
            @size-change="fetchReturnOrders"
            @current-change="fetchReturnOrders"
          />
        </el-card>
      </el-tab-pane>

      <!-- 条码查询 -->
      <el-tab-pane label="条码查询" name="barcodes">
        <el-card shadow="always">
          <template #header><div class="card-header"><span>查询订单条码</span></div></template>
          <div class="filter-bar">
            <el-input v-model="barcodeOrderId" placeholder="请输入订单ID" clearable style="width: 300px" @keyup.enter="fetchBarcodes" />
            <el-button type="primary" style="margin-left: 10px" :loading="barcodeLoading" @click="fetchBarcodes">查询</el-button>
          </div>
          <el-table :data="barcodeList" stripe v-loading="barcodeLoading" style="margin-top: 15px">
            <el-table-column prop="code" label="条码" min-width="200" />
            <el-table-column prop="productCode" label="产品编码" min-width="120" />
            <el-table-column prop="productName" label="产品名称" min-width="150" />
            <el-table-column prop="batchID" label="批次ID" min-width="120" />
            <el-table-column prop="status" label="状态" min-width="100" />
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="800px">
      <el-descriptions :column="2" border>
        <el-descriptions-item v-for="(value, key) in flatDetail" :key="key" :label="String(key)">
          {{ value ?? '-' }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const activeTab = ref('inbound')

// ==================== 入库单 ====================

const inboundCreateFormRef = ref(null)
const inboundCreateLoading = ref(false)

const emptyInboundDetail = () => ({ productID: '', productCode: '', batchID: '', count: 1 })

const inboundCreate = reactive({
  orderNumber: '',
  receiverID: '',
  shipperID: '',
  orderDesc: '',
  orderInType: 20,
  detailList: [emptyInboundDetail()],
})

const inboundCreateRules = {
  orderNumber: [{ required: true, message: '请输入订单号', trigger: 'blur' }],
  receiverID: [{ required: true, message: '请输入收货代理ID', trigger: 'blur' }],
}

function addInboundDetail() { inboundCreate.detailList.push(emptyInboundDetail()) }
function removeInboundDetail(index) { inboundCreate.detailList.splice(index, 1) }

function resetInboundCreate() {
  inboundCreateFormRef.value?.resetFields()
  inboundCreate.orderNumber = ''
  inboundCreate.receiverID = ''
  inboundCreate.shipperID = ''
  inboundCreate.orderDesc = ''
  inboundCreate.orderInType = 20
  inboundCreate.detailList = [emptyInboundDetail()]
}

async function handleCreateInbound() {
  const valid = await inboundCreateFormRef.value.validate().catch(() => false)
  if (!valid) return
  try {
    inboundCreateLoading.value = true
    await api.post('/oioc/inbound-orders', { ...inboundCreate })
    ElMessage.success('创建入库单成功')
    resetInboundCreate()
    fetchInboundOrders()
  } catch (error) {
    console.error('创建入库单失败:', error)
  } finally {
    inboundCreateLoading.value = false
  }
}

const inboundQuery = reactive({ orderNumber: '', receiverID: '', productID: '' })
const inboundList = ref([])
const inboundQueryLoading = ref(false)
const inboundPagination = reactive({ page: 1, pageSize: 20, total: 0 })

async function fetchInboundOrders() {
  try {
    inboundQueryLoading.value = true
    const params = {
      limit: inboundPagination.pageSize,
      skip: (inboundPagination.page - 1) * inboundPagination.pageSize,
    }
    if (inboundQuery.orderNumber) params.orderNumber = inboundQuery.orderNumber
    if (inboundQuery.receiverID) params.receiverID = inboundQuery.receiverID
    if (inboundQuery.productID) params.productID = inboundQuery.productID
    const res = await api.get('/oioc/inbound-orders', { params })
    setListData(res.data, inboundList, inboundPagination)
  } catch (error) {
    console.error('查询入库单失败:', error)
  } finally {
    inboundQueryLoading.value = false
  }
}

function resetInboundQuery() {
  inboundQuery.orderNumber = ''
  inboundQuery.receiverID = ''
  inboundQuery.productID = ''
  inboundPagination.page = 1
  fetchInboundOrders()
}

// ==================== 出库单 ====================

const outboundCreateFormRef = ref(null)
const outboundCreateLoading = ref(false)

const emptyOutboundDetail = () => ({ productID: '', productCode: '', batchID: '', count: 1 })

const outboundCreate = reactive({
  orderNumber: '',
  receiverID: '',
  shipperID: '',
  orderDesc: '',
  detailList: [emptyOutboundDetail()],
})

const outboundCreateRules = {
  orderNumber: [{ required: true, message: '请输入订单号', trigger: 'blur' }],
  receiverID: [{ required: true, message: '请输入收货代理ID', trigger: 'blur' }],
}

function addOutboundDetail() { outboundCreate.detailList.push(emptyOutboundDetail()) }
function removeOutboundDetail(index) { outboundCreate.detailList.splice(index, 1) }

function resetOutboundCreate() {
  outboundCreateFormRef.value?.resetFields()
  outboundCreate.orderNumber = ''
  outboundCreate.receiverID = ''
  outboundCreate.shipperID = ''
  outboundCreate.orderDesc = ''
  outboundCreate.detailList = [emptyOutboundDetail()]
}

async function handleCreateOutbound() {
  const valid = await outboundCreateFormRef.value.validate().catch(() => false)
  if (!valid) return
  try {
    outboundCreateLoading.value = true
    await api.post('/oioc/outbound-orders', { ...outboundCreate })
    ElMessage.success('创建出库单成功')
    resetOutboundCreate()
    fetchOutboundOrders()
  } catch (error) {
    console.error('创建出库单失败:', error)
  } finally {
    outboundCreateLoading.value = false
  }
}

const outboundQuery = reactive({ orderNumber: '', receiverID: '', productID: '' })
const outboundList = ref([])
const outboundQueryLoading = ref(false)
const outboundPagination = reactive({ page: 1, pageSize: 20, total: 0 })

async function fetchOutboundOrders() {
  try {
    outboundQueryLoading.value = true
    const params = {
      limit: outboundPagination.pageSize,
      skip: (outboundPagination.page - 1) * outboundPagination.pageSize,
    }
    if (outboundQuery.orderNumber) params.orderNumber = outboundQuery.orderNumber
    if (outboundQuery.receiverID) params.receiverID = outboundQuery.receiverID
    if (outboundQuery.productID) params.productID = outboundQuery.productID
    const res = await api.get('/oioc/outbound-orders', { params })
    setListData(res.data, outboundList, outboundPagination)
  } catch (error) {
    console.error('查询出库单失败:', error)
  } finally {
    outboundQueryLoading.value = false
  }
}

function resetOutboundQuery() {
  outboundQuery.orderNumber = ''
  outboundQuery.receiverID = ''
  outboundQuery.productID = ''
  outboundPagination.page = 1
  fetchOutboundOrders()
}

// ==================== 退货单 ====================

const returnCreateFormRef = ref(null)
const returnCreateLoading = ref(false)

const emptyReturnDetail = () => ({ productID: '', productCode: '', batchID: '', count: 1 })

const returnCreate = reactive({
  orderNumber: '',
  receiverID: '',
  shipperID: '',
  orderDesc: '',
  detailList: [emptyReturnDetail()],
})

const returnCreateRules = {
  orderNumber: [{ required: true, message: '请输入订单号', trigger: 'blur' }],
  receiverID: [{ required: true, message: '请输入收货代理ID', trigger: 'blur' }],
}

function addReturnDetail() { returnCreate.detailList.push(emptyReturnDetail()) }
function removeReturnDetail(index) { returnCreate.detailList.splice(index, 1) }

function resetReturnCreate() {
  returnCreateFormRef.value?.resetFields()
  returnCreate.orderNumber = ''
  returnCreate.receiverID = ''
  returnCreate.shipperID = ''
  returnCreate.orderDesc = ''
  returnCreate.detailList = [emptyReturnDetail()]
}

async function handleCreateReturn() {
  const valid = await returnCreateFormRef.value.validate().catch(() => false)
  if (!valid) return
  try {
    returnCreateLoading.value = true
    await api.post('/oioc/return-orders', { ...returnCreate })
    ElMessage.success('创建退货单成功')
    resetReturnCreate()
    fetchReturnOrders()
  } catch (error) {
    console.error('创建退货单失败:', error)
  } finally {
    returnCreateLoading.value = false
  }
}

const returnQuery = reactive({ orderNumber: '', receiverID: '', productID: '' })
const returnList = ref([])
const returnQueryLoading = ref(false)
const returnPagination = reactive({ page: 1, pageSize: 20, total: 0 })

async function fetchReturnOrders() {
  try {
    returnQueryLoading.value = true
    const params = {
      limit: returnPagination.pageSize,
      skip: (returnPagination.page - 1) * returnPagination.pageSize,
    }
    if (returnQuery.orderNumber) params.orderNumber = returnQuery.orderNumber
    if (returnQuery.receiverID) params.receiverID = returnQuery.receiverID
    if (returnQuery.productID) params.productID = returnQuery.productID
    const res = await api.get('/oioc/return-orders', { params })
    setListData(res.data, returnList, returnPagination)
  } catch (error) {
    console.error('查询退货单失败:', error)
  } finally {
    returnQueryLoading.value = false
  }
}

function resetReturnQuery() {
  returnQuery.orderNumber = ''
  returnQuery.receiverID = ''
  returnQuery.productID = ''
  returnPagination.page = 1
  fetchReturnOrders()
}

// ==================== 条码查询 ====================

const barcodeOrderId = ref('')
const barcodeList = ref([])
const barcodeLoading = ref(false)

async function fetchBarcodes() {
  if (!barcodeOrderId.value.trim()) {
    ElMessage.warning('请输入订单ID')
    return
  }
  try {
    barcodeLoading.value = true
    const res = await api.get(`/oioc/orders/${barcodeOrderId.value.trim()}/barcodes`)
    setListData(res.data, barcodeList, {})
  } catch (error) {
    console.error('查询条码失败:', error)
  } finally {
    barcodeLoading.value = false
  }
}

// ==================== 详情弹窗 ====================

const detailVisible = ref(false)
const flatDetail = ref({})

function flattenObject(obj, prefix = '') {
  const result = {}
  for (const key in obj) {
    const val = obj[key]
    const newKey = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, newKey))
    } else {
      result[newKey] = Array.isArray(val) ? JSON.stringify(val) : val
    }
  }
  return result
}

function showInboundDetail(row) {
  flatDetail.value = flattenObject(row)
  detailVisible.value = true
}
function showOutboundDetail(row) {
  flatDetail.value = flattenObject(row)
  detailVisible.value = true
}
function showReturnDetail(row) {
  flatDetail.value = flattenObject(row)
  detailVisible.value = true
}

// ==================== 通用 ====================

function setListData(data, listRef, pag) {
  if (Array.isArray(data)) {
    listRef.value = data
    if (pag.total !== undefined) pag.total = data.length
  } else if (data && data.list) {
    listRef.value = data.list
    if (pag.total !== undefined) pag.total = data.total || data.list.length
  } else if (data && data.data) {
    const inner = data.data
    if (Array.isArray(inner)) {
      listRef.value = inner
      if (pag.total !== undefined) pag.total = inner.length
    } else if (inner && inner.list) {
      listRef.value = inner.list
      if (pag.total !== undefined) pag.total = inner.total || inner.list.length
    }
  } else {
    listRef.value = []
    if (pag.total !== undefined) pag.total = 0
  }
}
</script>

<style scoped>
.oioc-orders-page .filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
