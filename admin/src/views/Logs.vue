<template>
  <div class="logs-page">
    <el-card shadow="always">
      <template #header>
        <div class="card-header">
          <span>同步日志</span>
          <el-button type="primary" @click="fetchLogs">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      
      <div class="filter-bar">
        <el-select v-model="filters.type" placeholder="类型" clearable style="width: 150px;" @change="handleFilter">
          <el-option label="入库" value="inbound" />
          <el-option label="出库" value="outbound" />
          <el-option label="订单创建" value="order_created" />
          <el-option label="退货创建" value="refund_created" />
          <el-option label="退货完成" value="return_complete" />
        </el-select>
        
        <el-select v-model="filters.status" placeholder="状态" clearable style="width: 120px;" @change="handleFilter">
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
        </el-select>
        
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          style="width: 260px;"
          @change="handleFilter"
        />
      </div>
      
      <el-table :data="logs" stripe v-loading="loading">
        <el-table-column prop="timestamp" label="时间" width="180" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">{{ getTypeName(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="data" label="数据" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ JSON.stringify(row.data) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="error" label="错误信息" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.error" class="error-text">{{ row.error }}</span>
            <span v-else>-</span>
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
          @size-change="fetchLogs"
          @current-change="fetchLogs"
        />
      </div>
    </el-card>
    
    <el-dialog v-model="detailVisible" title="日志详情" width="600px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="时间">{{ currentLog.timestamp }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ getTypeName(currentLog.type) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentLog.status === 'success' ? 'success' : 'danger'">
            {{ currentLog.status === 'success' ? '成功' : '失败' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="数据">
          <pre class="json-data">{{ JSON.stringify(currentLog.data, null, 2) }}</pre>
        </el-descriptions-item>
        <el-descriptions-item v-if="currentLog.error" label="错误信息">
          <span class="error-text">{{ currentLog.error }}</span>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import api from '@/api'

const loading = ref(false)
const logs = ref([])
const detailVisible = ref(false)
const currentLog = ref({})
let refreshTimer = null
const REFRESH_INTERVAL = 30000

const filters = reactive({
  type: '',
  status: '',
  dateRange: null
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const typeMap = {
  inbound: '入库',
  outbound: '出库',
  order_created: '订单创建',
  refund_created: '退货创建',
  return_complete: '退货完成'
}

const typeTagMap = {
  inbound: 'success',
  outbound: 'warning',
  order_created: 'primary',
  refund_created: 'danger',
  return_complete: 'info'
}

function getTypeName(type) {
  return typeMap[type] || type
}

function getTypeTag(type) {
  return typeTagMap[type] || ''
}

async function fetchLogs() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters
    }
    
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.startDate = filters.dateRange[0].toISOString()
      params.endDate = filters.dateRange[1].toISOString()
    }
    
    const res = await api.get('/logs', { params })
    logs.value = res.data.list
    pagination.total = res.data.total
  } catch (error) {
    console.error('获取日志失败:', error)
  } finally {
    loading.value = false
  }
}

function handleFilter() {
  pagination.page = 1
  fetchLogs()
}

function showDetail(log) {
  currentLog.value = log
  detailVisible.value = true
}

function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    fetchLogs()
  }, REFRESH_INTERVAL)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

onMounted(() => {
  fetchLogs()
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

.error-text {
  color: #f56c6c;
}

.json-data {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
