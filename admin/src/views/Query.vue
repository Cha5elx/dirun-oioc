<template>
  <div class="query-page">
    <el-card shadow="always">
      <template #header>
        <span>一物一码订单查询</span>
      </template>

      <div class="search-box">
        <el-input
          v-model="orderId"
          placeholder="请输入订单ID"
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

    <el-card v-if="queried" shadow="always" class="result-card">
      <template #header>
        <div class="result-header">
          <span>查询结果</span>
          <el-tag v-if="barcodeList.length > 0" type="success" size="large">{{ barcodeList.length }} 条记录</el-tag>
          <el-tag v-else type="info" size="large">无数据</el-tag>
        </div>
      </template>

      <el-table :data="barcodeList" stripe v-loading="loading" v-if="barcodeList.length > 0">
        <el-table-column prop="code" label="条码" min-width="200" />
        <el-table-column prop="productCode" label="产品编码" min-width="120" />
        <el-table-column prop="productName" label="产品名称" min-width="150" />
        <el-table-column prop="batchID" label="批次ID" min-width="120" />
        <el-table-column prop="status" label="状态" min-width="100" />
      </el-table>

      <el-empty v-else description="该订单暂无条码信息" />
    </el-card>

    <el-card v-else shadow="always" class="tip-card">
      <el-empty description="请输入订单ID进行查询">
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

const orderId = ref('')
const loading = ref(false)
const barcodeList = ref([])
const queried = ref(false)

async function handleQuery() {
  if (!orderId.value.trim()) {
    ElMessage.warning('请输入订单ID')
    return
  }

  loading.value = true
  try {
    const res = await api.get(`/oioc/orders/${orderId.value.trim()}/barcodes`)
    const data = res.data
    if (Array.isArray(data)) {
      barcodeList.value = data
    } else if (data && data.list) {
      barcodeList.value = data.list
    } else if (data && data.data) {
      const inner = data.data
      if (Array.isArray(inner)) {
        barcodeList.value = inner
      } else if (inner && inner.list) {
        barcodeList.value = inner.list
      } else if (inner && inner.data && Array.isArray(inner.data)) {
        barcodeList.value = inner.data
      }
    } else {
      barcodeList.value = []
    }
    queried.value = true
  } catch (error) {
    console.error('查询失败:', error)
    barcodeList.value = []
    queried.value = true
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

.tip-card {
  margin-top: 0;
}
</style>
