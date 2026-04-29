const logger = require('../utils/logger');
const { getBeijingTime } = require('../utils/datetime');

const MAX_RETRIES = 3;
const RETRY_DELAYS = [30000, 60000, 120000];

class RetryQueue {
  constructor() {
    this.queue = [];
    this.timer = null;
    this.processing = false;
  }

  enqueue(type, data, syncMethod) {
    const existing = this.queue.find(
      (job) => job.type === type && job.status === 'pending'
    );

    if (existing) {
      logger.warn('任务已在重试队列中，跳过重复入队', { type, dataSummary: this._summarizeData(data) });
      return existing.id;
    }

    const job = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      data,
      syncMethod,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      nextRetryAt: Date.now() + RETRY_DELAYS[0],
      status: 'pending',
      createdAt: getBeijingTime(),
    };

    this.queue.push(job);
    logger.info('任务加入重试队列', {
      jobId: job.id,
      type,
      nextRetryIn: `${RETRY_DELAYS[0] / 1000}s`,
      queueSize: this.queue.length,
    });

    this._ensureTimer();

    return job.id;
  }

  async processQueue() {
    if (this.processing) return;
    this.processing = true;

    try {
      const now = Date.now();
      const readyJobs = this.queue.filter(
        (job) => job.status === 'pending' && job.nextRetryAt <= now
      );

      for (const job of readyJobs) {
        job.status = 'processing';
        job.retryCount++;

        logger.info('开始重试任务', {
          jobId: job.id,
          type: job.type,
          attempt: `${job.retryCount}/${job.maxRetries}`,
        });

        try {
          const result = await job.syncMethod(job.data);

          if (result && result.success) {
            job.status = 'completed';
            logger.info('任务重试成功', {
              jobId: job.id,
              type: job.type,
              attempt: job.retryCount,
            });
          } else {
            this._handleRetryFailure(job, result?.message || '重试返回失败');
          }
        } catch (error) {
          this._handleRetryFailure(job, error.message);
        }
      }

      this.queue = this.queue.filter((job) => job.status === 'pending');
    } finally {
      this.processing = false;
    }
  }

  _handleRetryFailure(job, errorMessage) {
    if (job.retryCount >= job.maxRetries) {
      job.status = 'failed';
      logger.error('任务重试耗尽', {
        jobId: job.id,
        type: job.type,
        attempts: job.retryCount,
        error: errorMessage,
      });
    } else {
      job.status = 'pending';
      const delay = RETRY_DELAYS[job.retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      job.nextRetryAt = Date.now() + delay;
      logger.warn('任务重试失败，将再次重试', {
        jobId: job.id,
        type: job.type,
        attempt: job.retryCount,
        nextRetryIn: `${delay / 1000}s`,
        error: errorMessage,
      });
    }
  }

  _ensureTimer() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      this.processQueue().catch((err) => {
        logger.error('重试队列处理异常', { error: err.message });
      });
    }, 15000);
    this.timer.unref();
  }

  _summarizeData(data) {
    if (!data) return 'null';
    const keys = Object.keys(data);
    const summary = {};
    for (const key of keys.slice(0, 5)) {
      const val = data[key];
      if (Array.isArray(val)) {
        summary[key] = `Array(${val.length})`;
      } else if (typeof val === 'object') {
        summary[key] = '[Object]';
      } else {
        summary[key] = val;
      }
    }
    return JSON.stringify(summary);
  }

  getStats() {
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
    for (const job of this.queue) {
      stats[job.status] = (stats[job.status] || 0) + 1;
    }
    return { ...stats, total: this.queue.length };
  }

  getJobs(status) {
    if (status) return this.queue.filter((j) => j.status === status);
    return [...this.queue];
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('重试队列已停止');
    }
  }
}

module.exports = new RetryQueue();
