<template>
  <div class="products-page">
    <el-card shadow="always">
      <template #header>
        <div class="card-header">
          <span>创建产品</span>
        </div>
      </template>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px" style="max-width: 600px">
        <el-form-item label="产品ID" prop="productID">
          <el-input v-model="createForm.productID" placeholder="请输入产品ID" />
        </el-form-item>
        <el-form-item label="产品编码" prop="productCode">
          <el-input v-model="createForm.productCode" placeholder="请输入产品编码" />
        </el-form-item>
        <el-form-item label="产品名称" prop="productName">
          <el-input v-model="createForm.productName" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="规格" prop="standard">
          <el-input v-model="createForm.standard" placeholder="请输入产品规格" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="createLoading" @click="handleCreate">创建产品</el-button>
          <el-button @click="resetCreateForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="always" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>查询产品</span>
        </div>
      </template>
      <div class="filter-bar">
        <el-input v-model="queryForm.productID" placeholder="产品ID" clearable style="width: 180px" @keyup.enter="fetchProducts" />
        <el-input v-model="queryForm.productCode" placeholder="产品编码" clearable style="width: 180px; margin-left: 10px" @keyup.enter="fetchProducts" />
        <el-input v-model="queryForm.productName" placeholder="产品名称" clearable style="width: 180px; margin-left: 10px" @keyup.enter="fetchProducts" />
        <el-button type="primary" style="margin-left: 10px" @click="fetchProducts">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
      </div>
      <el-table :data="productList" stripe v-loading="queryLoading" style="margin-top: 15px">
        <el-table-column prop="productID" label="产品ID" min-width="120" />
        <el-table-column prop="productCode" label="产品编码" min-width="120" />
        <el-table-column prop="productName" label="产品名称" min-width="150" />
        <el-table-column prop="standard" label="规格" min-width="120" />
      </el-table>
      <el-pagination
        v-if="pagination.total > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 15px"
        @size-change="fetchProducts"
        @current-change="fetchProducts"
      />
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const createFormRef = ref(null)
const createLoading = ref(false)
const createForm = reactive({
  productID: '',
  productCode: '',
  productName: '',
  standard: '',
})

const createRules = {
  productID: [{ required: true, message: '请输入产品ID', trigger: 'blur' }],
  productCode: [{ required: true, message: '请输入产品编码', trigger: 'blur' }],
  productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  standard: [{ required: true, message: '请输入产品规格', trigger: 'blur' }],
}

function resetCreateForm() {
  createFormRef.value?.resetFields()
}

async function handleCreate() {
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    createLoading.value = true
    await api.post('/oioc/products', { ...createForm })
    ElMessage.success('创建产品成功')
    resetCreateForm()
    fetchProducts()
  } catch (error) {
    console.error('创建产品失败:', error)
  } finally {
    createLoading.value = false
  }
}

const queryForm = reactive({
  productID: '',
  productCode: '',
  productName: '',
})

const productList = ref([])
const queryLoading = ref(false)
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

async function fetchProducts() {
  try {
    queryLoading.value = true
    const params = {
      limit: pagination.pageSize,
      skip: (pagination.page - 1) * pagination.pageSize,
    }
    if (queryForm.productID) params.productID = queryForm.productID
    if (queryForm.productCode) params.productCode = queryForm.productCode
    if (queryForm.productName) params.productName = queryForm.productName

    const res = await api.get('/oioc/products', { params })
    const data = res.data
    if (Array.isArray(data)) {
      productList.value = data
      pagination.total = data.length
    } else if (data && data.list) {
      productList.value = data.list
      pagination.total = data.total || data.list.length
    } else if (data && data.data) {
      const inner = data.data
      if (Array.isArray(inner)) {
        productList.value = inner
        pagination.total = inner.length
      } else if (inner && inner.list) {
        productList.value = inner.list
        pagination.total = inner.total || inner.list.length
      }
    } else {
      productList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('查询产品失败:', error)
  } finally {
    queryLoading.value = false
  }
}

function resetQuery() {
  queryForm.productID = ''
  queryForm.productCode = ''
  queryForm.productName = ''
  pagination.page = 1
  fetchProducts()
}
</script>

<style scoped>
.products-page .filter-bar {
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
