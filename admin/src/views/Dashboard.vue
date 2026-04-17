<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <el-button type="primary" :icon="Refresh" :loading="refreshing" @click="handleRefresh">
        {{ refreshing ? '刷新中...' : '刷新数据' }}
      </el-button>
      <span class="last-update" v-if="lastUpdateTime">
        上次更新: {{ lastUpdateTime }}
      </span>
    </div>
    
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <el-card shadow="always" class="stat-card">
          <div class="stat-icon" style="background: #409eff;">
            <el-icon size="28"><ShoppingCart /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayOrders }}</div>
            <div class="stat-label">今日订单</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="always" class="stat-card">
          <div class="stat-icon" style="background: #67c23a;">
            <el-icon size="28"><Box /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayInbound }}</div>
            <div class="stat-label">今日入库</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="always" class="stat-card">
          <div class="stat-icon" style="background: #e6a23c;">
            <el-icon size="28"><Van /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayOutbound }}</div>
            <div class="stat-label">今日出库</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card shadow="always" class="stat-card">
          <div class="stat-icon" style="background: #f56c6c;">
            <el-icon size="28"><RefreshLeft /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.todayReturn }}</div>
            <div class="stat-label">今日退货</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" class="chart-row">
      <el-col :span="16">
        <el-card shadow="always">
          <template #header>
            <div class="card-header">
              <span>近7天同步趋势</span>
            </div>
          </template>
          <div ref="lineChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card shadow="always">
          <template #header>
            <div class="card-header">
              <span>同步成功率</span>
            </div>
          </template>
          <div ref="pieChartRef" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="always">
          <template #header>
            <div class="card-header">
              <span>最近同步记录</span>
              <el-button type="primary" link @click="goToLogs">查看全部</el-button>
            </div>
          </template>
          <el-table :data="recentLogs" stripe>
            <el-table-column prop="timestamp" label="时间" width="180" />
            <el-table-column prop="type" label="类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getTypeTag(row.type)">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="data" label="数据" show-overflow-tooltip />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import api from '@/api'

const router = useRouter()
const lineChartRef = ref()
const pieChartRef = ref()
let lineChart = null
let pieChart = null
const refreshing = ref(false)
const lastUpdateTime = ref('')

const stats = ref({
  todayOrders: 0,
  todayInbound: 0,
  todayOutbound: 0,
  todayReturn: 0
})

const recentLogs = ref([])

const typeMap = {
  inbound: '入库',
  outbound: '出库',
  order_created: '订单创建',
  refund_created: '退货创建',
  return_complete: '退货完成'
}

function getTypeTag(type) {
  const map = {
    inbound: 'success',
    outbound: 'warning',
    order_created: 'primary',
    refund_created: 'danger',
    return_complete: 'info'
  }
  return map[type] || ''
}

function goToLogs() {
  router.push('/logs')
}

async function fetchStats() {
  const res = await api.get('/stats/summary')
  stats.value = res.data
}

async function fetchRecentLogs() {
  const res = await api.get('/logs', { params: { limit: 10 } })
  recentLogs.value = res.data.list.map(log => ({
    ...log,
    type: typeMap[log.type] || log.type
  }))
}

async function handleRefresh() {
  if (refreshing.value) return
  
  refreshing.value = true
  try {
    await Promise.all([fetchStats(), fetchRecentLogs()])
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败')
  } finally {
    refreshing.value = false
  }
}

function initCharts() {
  lineChart = echarts.init(lineChartRef.value, null, { 
    renderer: 'svg'
  })
  pieChart = echarts.init(pieChartRef.value, null, { 
    renderer: 'svg'
  })
  
  const lineOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['入库', '出库', '退货'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: { type: 'value' },
    series: [
      { name: '入库', type: 'line', smooth: true, data: [12, 15, 10, 18, 22, 8, 16] },
      { name: '出库', type: 'line', smooth: true, data: [8, 12, 15, 10, 18, 6, 14] },
      { name: '退货', type: 'line', smooth: true, data: [2, 1, 3, 2, 1, 0, 2] }
    ]
  }
  
  const pieOption = {
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['50%', '70%'],
      data: [
        { value: 95, name: '成功', itemStyle: { color: '#67c23a' } },
        { value: 5, name: '失败', itemStyle: { color: '#f56c6c' } }
      ],
      label: {
        show: true,
        formatter: '{b}: {d}%'
      }
    }]
  }
  
  lineChart.setOption(lineOption)
  pieChart.setOption(pieOption)
}

function handleResize() {
  lineChart?.resize()
  pieChart?.resize()
}

onMounted(async () => {
  await handleRefresh()
  initCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  lineChart?.dispose()
  pieChart?.dispose()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dashboard-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.last-update {
  color: #909399;
  font-size: 14px;
}

.stat-cards {
  margin-bottom: 0;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 16px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.chart-row {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 300px;
}
</style>
