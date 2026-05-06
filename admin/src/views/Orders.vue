<template>
  <div class="orders-page">
    <el-card shadow="always">
      <template #header>
        <div class="card-header">
          <span>有赞订单列表</span>
          <el-button type="primary" @click="fetchOrders">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <div class="filter-bar">
        <el-select v-model="filters.status" placeholder="订单状态" clearable style="width: 160px;" @change="handleFilter">
          <el-option label="待付款" value="WAIT_BUYER_PAY" />
          <el-option label="已支付" value="TRADE_PAID" />
          <el-option label="待确认" value="WAIT_CONFIRM" />
          <el-option label="待发货" value="WAIT_SELLER_SEND_GOODS" />
          <el-option label="已发货" value="WAIT_BUYER_CONFIRM_GOODS" />
          <el-option label="已完成" value="TRADE_SUCCESS" />
          <el-option label="已关闭" value="TRADE_CLOSED" />
          <el-option label="退款中" value="TRADE_REFUND" />
        </el-select>

        <el-select v-model="filters.dateType" placeholder="时间类型" style="width: 120px;" @change="handleFilter">
          <el-option label="创建时间" value="created" />
          <el-option label="更新时间" value="update" />
        </el-select>

        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 260px;"
          :disabled-date="disabledDate"
          @change="handleDateChange"
          @calendar-change="handleCalendarChange"
        />

        <el-button type="success" @click="fetchTodayOrders">
          <el-icon><Calendar /></el-icon>
          今日订单
        </el-button>
      </div>

      <el-alert
        v-if="dateRangeError"
        :title="dateRangeError"
        type="warning"
        :closable="false"
        style="margin-bottom: 16px;"
      />

      <el-alert
        title="提示：时间跨度不能超过3个月"
        type="info"
        :closable="false"
        style="margin-bottom: 16px;"
      />

      <el-alert
        v-if="errorMsg && !loading"
        :title="errorMsg"
        :type="errorMsg.includes('暂无') ? 'info' : 'error'"
        :closable="false"
        style="margin-bottom: 16px;"
      />

      <el-table :data="orders" stripe v-loading="loading">
        <el-table-column prop="tid" label="订单号" width="180" />
        <el-table-column prop="created" label="下单时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="订单状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusName(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pay_type" label="支付方式" width="100">
          <template #default="{ row }">
            {{ getPayType(row.pay_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="total_fee" label="订单金额" width="120">
          <template #default="{ row }">
            ¥{{ (row.total_fee / 100).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="pay_fee" label="实付金额" width="120">
          <template #default="{ row }">
            ¥{{ (row.pay_fee / 100).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="receiver_name" label="收货人" width="100" />
        <el-table-column prop="receiver_mobile" label="手机号" width="120" />
        <el-table-column prop="orders" label="商品信息" min-width="200">
          <template #default="{ row }">
            <div v-for="item in row.orders" :key="item.oid" class="order-item">
              {{ item.title }} x {{ item.num }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchOrders"
          @current-change="fetchOrders"
        />
      </div>
    </el-card>

    <el-dialog v-model="detailVisible" title="订单详情" width="700px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="订单号">{{ currentOrder.tid }}</el-descriptions-item>
        <el-descriptions-item label="订单状态">
          <el-tag :type="getStatusType(currentOrder.status)">{{ getStatusName(currentOrder.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ formatTime(currentOrder.created) }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ formatTime(currentOrder.pay_time) }}</el-descriptions-item>
        <el-descriptions-item label="订单金额">¥{{ ((currentOrder.total_fee || 0) / 100).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="实付金额">¥{{ ((currentOrder.pay_fee || 0) / 100).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ getPayType(currentOrder.pay_type) }}</el-descriptions-item>
        <el-descriptions-item label="买家留言">{{ currentOrder.buyer_message || '-' }}</el-descriptions-item>
        <el-descriptions-item label="收货人" :span="2">{{ maskIfEncrypted(currentOrder.receiver_name) }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ maskIfEncrypted(currentOrder.receiver_mobile) }}</el-descriptions-item>
        <el-descriptions-item label="收货地址" :span="2">
          {{ maskIfEncrypted(currentOrder.receiver_state) }}{{ maskIfEncrypted(currentOrder.receiver_city) }}{{ maskIfEncrypted(currentOrder.receiver_district) }}{{ maskIfEncrypted(currentOrder.receiver_address) }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="order-items-title">商品明细</div>
      <el-table :data="currentOrder.orders || []" stripe size="small">
        <el-table-column prop="title" label="商品名称" min-width="200" />
        <el-table-column prop="sku_unique_code" label="SKU编码" width="120" />
        <el-table-column prop="num" label="数量" width="80" />
        <el-table-column prop="price" label="单价" width="100">
          <template #default="{ row }">
            ¥{{ Number(row.price || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="total_fee" label="小计" width="100">
          <template #default="{ row }">
            ¥{{ Number(row.total_fee || 0).toFixed(2) }}
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const loading = ref(false)
const orders = ref([])
const detailVisible = ref(false)
const currentOrder = ref({})
const dateRangeError = ref('')
const selectDate = ref(null)
let refreshTimer = null
const MAX_DAYS = 92 // 约3个月
const REFRESH_INTERVAL = 300000 // 5分钟

const filters = reactive({
  status: '',
  dateType: 'created',
  dateRange: null
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const statusMap = {
  'WAIT_BUYER_PAY': '待付款',
  'TRADE_PAID': '已支付',
  'WAIT_CONFIRM': '待确认',
  'WAIT_SELLER_SEND_GOODS': '待发货',
  'WAIT_BUYER_CONFIRM_GOODS': '已发货',
  'TRADE_SUCCESS': '已完成',
  'TRADE_CLOSED': '已关闭',
  'TRADE_REFUND': '退款中',
}

const statusTypeMap = {
  'WAIT_BUYER_PAY': 'warning',
  'TRADE_PAID': '',
  'WAIT_CONFIRM': 'warning',
  'WAIT_SELLER_SEND_GOODS': 'primary',
  'WAIT_BUYER_CONFIRM_GOODS': 'info',
  'TRADE_SUCCESS': 'success',
  'TRADE_CLOSED': 'danger',
  'TRADE_REFUND': 'danger'
}

const payTypeMap = {
  // 微信支付
  'WEIXIN': '微信支付',
  'WXPAY_DAIXIAO': '微信支付',
  'WXPAY_SHOULI': '微信支付-受理模式',
  'WX_APPPAY': '微信支付-SDK',
  'WX_WAPPAY': '微信支付',
  'WX_HB': '微信红包支付',
  'BARCODE_WX': '微信支付',
  'WX_NATIVE': '微信支付',
  'OF_YOUZAN_QR': '收款码',
  'OF_WEIXIN': '微信支付',
  // 微信代销
  'WEIXIN_DAIXIAO': '微信代销',
  // 支付宝
  'ALIPAY': '支付宝',
  'ALIWAP': '支付宝',
  'BARCODE_ALIPAY': '支付宝-商家扫',
  'ALIPAY_HBFQ': '支付宝花呗分期',
  'OF_ALIPAY': '支付宝',
  'MARK_PAY_ALIPAY': '标记支付-支付宝',
  'ALIPAY_FLOWER': '花呗支付',
  'ALIPAY_AGREEMENT': '支付宝免密支付',
  'ALIPAY_APPLET': '支付宝',
  // 银行卡
  'BANKCARDPAY': '银行卡支付',
  'UNIONPAY': '银联支付',
  'UNIONWAP': '银联WAP支付',
  'UMPAY': '联动优势',
  'YZPAY': '易宝支付',
  'CREDIT_CARD_UNIONPAY': '银行卡支付',
  'DEBIT_CARD_UNIONPAY': '银行卡支付',
  'BAIDUWAP': '银行卡支付',
  // 储值卡
  'PREPAIDCARD': '储值卡支付',
  'PREPAID_CARD': '储值卡支付',
  'UNIFIED_PREPAID_CARD': '储值卡支付',
  'OF_PREPAID_CARD': '储值卡支付',
  // E卡
  'ECARD': 'E卡支付',
  'OF_E_CARD': '有赞E卡',
  // 标记支付
  'MARKPAY': '标记支付',
  'MARK_PAY_WXPAY': '标记支付-微信',
  'MARK_PAY_POS': '标记支付-POS刷卡',
  'MARK_PAY_DIY': '标记收款-自定义',
  'MARK_PAY_CREDIT_PAY': '标记支付-挂账',
  // 礼品卡
  'ENCHASHMENT_GIFT_CARD': '礼品卡支付',
  'GIFT_CARD': '礼品卡支付',
  // 其他
  'DEFAULT': '未支付',
  'TENPAY': '财付通',
  'PEERPAY': '找人代付',
  'CODPAY': '货到付款',
  'COD': '货到付款',
  'FX_MERGED': '合并付货款',
  'UMP_PRESENT': '领取赠品',
  'UMP_COUPON': '优惠兑换',
  'FX_SPLITTING': '自动付货款',
  'AIXUEDAI': '爱学贷',
  'UMP_REBATE': '返利',
  'UMP_HB': 'UMP红包',
  'PAYZA': 'Payza',
  'PAYPAL': 'PayPal',
  'QQPAY': 'QQ钱包',
  'INSTALMENT': '分期支付',
  'PRIOR_USE': '先用后付',
  'UN_SETTLED_AMOUNT_PAY': '店铺余额支付',
  'OF_ONLINE_ACCOUNT': '代收账户',
  'OF_POS': '刷卡',
  'OF_TABLE_CARD': '二维码台卡',
  'ALLIN_SWIPECARD': 'POS刷卡',
  'CHANGE_PAY': '有赞零钱',
  'UMP_PAY': '优惠全额抵扣',
  'SUNMI_WX': '商米支付-微信',
  'SUNMI_ALIPAY': '商米支付-支付宝',
  'SUNMI_SWIPECARD': '商米POS',
  'OF_OFFLINE_ACCOUNT': '记账账户',
  'OF_CASH': '现金支付',
  'MIXED_PAYMENT': '组合支付',
  'OUTSIDE_PAYMENT': '外部支付',
  'TRANSFER_TO_PUBLIC': '对公转账',
  'OF_ONLINE_PREPAID_ACCOUNT': '储值账户',
  'OF_ONLINE_DEPOSIT_ACCOUNT': '保证金账户',
  'ABC_EPAY': '农行商E付',
  'ELECTRONIC_BANK_PAY': '银联网银支付',
  // 数字编码（有赞 API 返回的 pay_type 可能是数字）
  '0': '未支付',
  '1': '微信支付',
  '2': '支付宝',
  '3': '支付宝',
  '4': '银联支付',
  '5': '财付通',
  '6': '银联WAP支付',
  '7': '找人代付',
  '8': '联动优势',
  '9': '货到付款',
  '10': '微信支付',
  '11': '微信支付-受理模式',
  '12': '银行卡支付',
  '13': '微信支付-SDK',
  '14': '合并付货款',
  '15': '领取赠品',
  '16': '优惠兑换',
  '17': '自动付货款',
  '18': '爱学贷',
  '19': '微信支付',
  '20': '微信红包支付',
  '21': '返利',
  '22': 'UMP红包',
  '23': 'Payza',
  '24': '易宝支付',
  '25': '储值卡支付',
  '26': 'PayPal',
  '27': 'QQ钱包',
  '28': 'E卡支付',
  '29': '微信支付',
  '30': '支付宝-商家扫',
  '33': '礼品卡支付',
  '35': '储值卡支付',
  '36': '银行卡支付',
  '37': '银行卡支付',
  '40': '分期支付',
  '49': '先用后付',
  '53': '支付宝花呗分期',
  '72': '微信支付',
  '80': '店铺余额支付',
  '90': '礼品卡支付',
  '100': '代收账户',
  '101': '收款码',
  '102': '微信支付',
  '103': '支付宝',
  '104': '刷卡',
  '105': '二维码台卡',
  '106': '储值卡支付',
  '107': '有赞E卡',
  '110': '标记支付-微信',
  '111': '标记支付-支付宝',
  '112': '标记支付-POS刷卡',
  '113': 'POS刷卡',
  '114': '标记收款-自定义',
  '115': '有赞零钱',
  '116': '优惠全额抵扣',
  '117': '商米支付-微信',
  '118': '商米支付-支付宝',
  '119': '商米POS',
  '200': '记账账户',
  '201': '现金支付',
  '202': '组合支付',
  '203': '外部支付',
  '205': '标记支付-挂账',
  '206': '对公转账',
  '300': '储值账户',
  '400': '保证金账户',
  '4093': '农行商E付',
  '4095': '花呗支付',
  '4096': '支付宝免密支付',
  '4097': '支付宝',
  '4101': '银联网银支付',
}

function getStatusName(status) {
  return statusMap[status] || status
}

function getStatusType(status) {
  return statusTypeMap[status] || ''
}

function getPayType(type) {
  if (!type && type !== 0) return '-'
  return payTypeMap[String(type)] || payTypeMap[type] || type || '-'
}

function maskIfEncrypted(val) {
  if (!val) return val || '-'
  const str = String(val)
  // 有赞加密字段用 $...$ 包裹，替换为 ***
  if (str.startsWith('$') && str.endsWith('$')) return '***'
  return str
}

function formatTime(timestamp) {
  if (!timestamp) return '-'
  // 日期字符串直接解析
  if (typeof timestamp === 'string') {
    const d = new Date(timestamp.replace(/-/g, '/'))
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    }
    return timestamp
  }
  // 时间戳：秒级 (< 1e12) vs 毫秒级
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const date = new Date(ms)
  if (isNaN(date.getTime())) return String(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function formatDateTime(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function handleCalendarChange(val) {
  selectDate.value = val ? val[0] : null
}

function disabledDate(time) {
  if (selectDate.value) {
    const minDate = new Date(selectDate.value)
    minDate.setDate(minDate.getDate() - MAX_DAYS)
    const maxDate = new Date(selectDate.value)
    maxDate.setDate(maxDate.getDate() + MAX_DAYS)
    return time.getTime() < minDate.getTime() || time.getTime() > maxDate.getTime()
  }
  return false
}

function handleDateChange(val) {
  dateRangeError.value = ''
  if (val && val.length === 2) {
    const start = new Date(val[0])
    const end = new Date(val[1])
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    if (diffDays > MAX_DAYS) {
      dateRangeError.value = `时间跨度不能超过3个月（当前选择${diffDays}天）`
      filters.dateRange = null
      return
    }
  }
  handleFilter()
}

const errorMsg = ref('')

async function fetchOrders() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }

    if (filters.status) {
      params.status = filters.status
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      const startDate = new Date(filters.dateRange[0])
      const endDate = new Date(filters.dateRange[1])
      endDate.setHours(23, 59, 59, 999)

      if (filters.dateType === 'update') {
        params.startUpdate = formatDateTime(startDate)
        params.endUpdate = formatDateTime(endDate)
      } else {
        params.startCreated = formatDateTime(startDate)
        params.endCreated = formatDateTime(endDate)
      }
    }

    const res = await api.get('/youzan/orders', { params })

    if (!res.success) {
      errorMsg.value = res.message || '获取订单失败'
      orders.value = []
      pagination.total = 0
      return
    }

    orders.value = res.data.list || []
    pagination.total = res.data.total || 0

    if (orders.value.length === 0) {
      errorMsg.value = '暂无订单数据'
    }
  } catch (error) {
    console.error('获取订单失败:', error)
    errorMsg.value = error.response?.data?.message || '网络错误，请稍后重试'
    orders.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function fetchTodayOrders() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  filters.dateRange = [today, tomorrow]
  filters.dateType = 'created'
  pagination.page = 1
  fetchOrders()
}

function handleFilter() {
  pagination.page = 1
  fetchOrders()
}

async function showDetail(order) {
  try {
    const res = await api.get(`/youzan/orders/${order.tid}`)
    if (res.success && res.data) {
      currentOrder.value = res.data
    } else {
      currentOrder.value = order
    }
    detailVisible.value = true
  } catch (error) {
    console.error('获取订单详情失败:', error)
    currentOrder.value = order
    detailVisible.value = true
  }
}

function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    fetchOrders()
  }, REFRESH_INTERVAL)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  fetchOrders()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.order-item {
  line-height: 1.8;
}

.order-items-title {
  margin: 20px 0 12px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}
</style>
