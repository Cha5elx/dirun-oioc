<template>
  <div class="agents-page">
    <el-card shadow="always">
      <template #header>
        <div class="card-header">
          <span>创建代理</span>
        </div>
      </template>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="120px" style="max-width: 600px">
        <el-form-item label="代理ID" prop="userID">
          <el-input v-model="createForm.userID" placeholder="请输入代理ID" />
        </el-form-item>
        <el-form-item label="账号" prop="account">
          <el-input v-model="createForm.account" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="createForm.password" placeholder="默认 888333" />
        </el-form-item>
        <el-form-item label="用户类型">
          <el-input-number v-model="createForm.userTypeNumber" :min="1" placeholder="默认 30" />
        </el-form-item>
        <el-form-item label="父级ID">
          <el-input v-model="createForm.parentID" placeholder="默认 admin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="createLoading" @click="handleCreate">创建代理</el-button>
          <el-button @click="resetCreateForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="always" style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>查询代理</span>
        </div>
      </template>
      <div class="filter-bar">
        <el-input v-model="queryForm.userID" placeholder="代理ID" clearable style="width: 180px" @keyup.enter="fetchAgents" />
        <el-input v-model="queryForm.account" placeholder="账号" clearable style="width: 180px; margin-left: 10px" @keyup.enter="fetchAgents" />
        <el-input v-model="queryForm.userName" placeholder="用户名" clearable style="width: 180px; margin-left: 10px" @keyup.enter="fetchAgents" />
        <el-button type="primary" style="margin-left: 10px" @click="fetchAgents">查询</el-button>
        <el-button @click="resetQuery">重置</el-button>
      </div>
      <el-table :data="agentList" stripe v-loading="queryLoading" style="margin-top: 15px">
        <el-table-column prop="userID" label="代理ID" min-width="120" />
        <el-table-column prop="account" label="账号" min-width="120" />
        <el-table-column prop="userName" label="用户名" min-width="150" />
        <el-table-column prop="userTypeNumber" label="用户类型" min-width="100" />
      </el-table>
      <el-pagination
        v-if="pagination.total > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 15px"
        @size-change="fetchAgents"
        @current-change="fetchAgents"
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
  userID: '',
  account: '',
  password: '',
  userTypeNumber: 30,
  parentID: 'admin',
})

const createRules = {
  userID: [{ required: true, message: '请输入代理ID', trigger: 'blur' }],
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
}

function resetCreateForm() {
  createFormRef.value?.resetFields()
  createForm.userTypeNumber = 30
  createForm.parentID = 'admin'
  createForm.password = ''
}

async function handleCreate() {
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return

  try {
    createLoading.value = true
    await api.post('/oioc/agents', { ...createForm })
    ElMessage.success('创建代理成功')
    resetCreateForm()
    fetchAgents()
  } catch (error) {
    console.error('创建代理失败:', error)
  } finally {
    createLoading.value = false
  }
}

const queryForm = reactive({
  userID: '',
  account: '',
  userName: '',
})

const agentList = ref([])
const queryLoading = ref(false)
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

async function fetchAgents() {
  try {
    queryLoading.value = true
    const params = {
      limit: pagination.pageSize,
      skip: (pagination.page - 1) * pagination.pageSize,
    }
    if (queryForm.userID) params.userID = queryForm.userID
    if (queryForm.account) params.account = queryForm.account
    if (queryForm.userName) params.userName = queryForm.userName

    const res = await api.get('/oioc/agents', { params })
    const data = res.data
    if (Array.isArray(data)) {
      agentList.value = data
      pagination.total = data.length
    } else if (data && data.list) {
      agentList.value = data.list
      pagination.total = data.total || data.list.length
    } else if (data && data.data) {
      const inner = data.data
      if (Array.isArray(inner)) {
        agentList.value = inner
        pagination.total = inner.length
      } else if (inner && inner.list) {
        agentList.value = inner.list
        pagination.total = inner.total || inner.list.length
      }
    } else {
      agentList.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('查询代理失败:', error)
  } finally {
    queryLoading.value = false
  }
}

function resetQuery() {
  queryForm.userID = ''
  queryForm.account = ''
  queryForm.userName = ''
  pagination.page = 1
  fetchAgents()
}
</script>

<style scoped>
.agents-page .filter-bar {
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
