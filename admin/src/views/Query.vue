<template>
  <div class="query-page">
    <el-card shadow="always">
      <template #header>
        <span>防伪码查询</span>
      </template>
      
      <div class="search-box">
        <el-input
          v-model="code"
          placeholder="请输入防伪码"
          size="large"
          clearable
          style="width: 400px;"
          @keyup.enter="handleQuery"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" size="large" :loading="loading" @click="handleQuery">
          查询
        </el-button>
      </div>
    </el-card>
    
    <el-card v-if="result" shadow="always" class="result-card">
      <template #header>
        <div class="result-header">
          <span>查询结果</span>
          <el-tag v-if="result.valid" type="success" size="large">验证通过</el-tag>
          <el-tag v-else type="danger" size="large">验证失败</el-tag>
        </div>
      </template>
      
      <div v-if="result.valid" class="result-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="防伪码">{{ result.code }}</el-descriptions-item>
          <el-descriptions-item label="产品名称">{{ result.productName }}</el-descriptions-item>
          <el-descriptions-item label="产品规格">{{ result.standard || '-' }}</el-descriptions-item>
          <el-descriptions-item label="生产日期">{{ result.productionDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="入库时间">{{ result.inboundTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="入库仓库">{{ result.warehouse || '-' }}</el-descriptions-item>
          <el-descriptions-item label="出库时间">{{ result.outboundTime || '-' }}</el-descriptions-item>
          <el-descriptions-item label="销售渠道">{{ result.channel || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单号">{{ result.orderId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="物流单号">{{ result.logisticsNo || '-' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="trace-timeline">
          <h4>流转记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in result.trace"
              :key="index"
              :timestamp="item.time"
              placement="top"
            >
              <el-card>
                <h4>{{ item.action }}</h4>
                <p>{{ item.detail }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
      
      <el-empty v-else description="未找到该防伪码相关信息" />
    </el-card>
    
    <el-card v-else shadow="always" class="tip-card">
      <el-empty description="请输入防伪码进行查询">
        <template #image>
          <el-icon size="60" color="#c0c4cc"><Search /></el-icon>
        </template>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const code = ref('')
const loading = ref(false)
const result = ref(null)

async function handleQuery() {
  if (!code.value.trim()) {
    ElMessage.warning('请输入防伪码')
    return
  }
  
  loading.value = true
  try {
    const res = await api.get(`/query/code/${code.value.trim()}`)
    result.value = res.data
  } catch (error) {
    console.error('查询失败:', error)
    result.value = { valid: false }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.query-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-box {
  display: flex;
  gap: 12px;
  align-items: center;
}

.result-card {
  margin-top: 0;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-content {
  padding-top: 16px;
}

.trace-timeline {
  margin-top: 32px;
}

.trace-timeline h4 {
  margin-bottom: 16px;
  color: #303133;
}

.tip-card {
  margin-top: 0;
}
</style>
