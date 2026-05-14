// utils/api.js
// 银行业务助手 - API 请求模块（含网络错误重试）

const app = getApp();

// 最大重试次数
const MAX_RETRY = 2;
// 轮询最大次数（60次 × 5秒 = 5分钟）
const MAX_POLL_COUNT = 60;

// 阶段性进度提示
const PROGRESS_MESSAGES = [
  { count: 1, message: '正在初始化任务...' },
  { count: 3, message: '正在搜索信息...' },
  { count: 8, message: '正在整理数据...' },
  { count: 15, message: '正在生成报告...' },
  { count: 30, message: '正在优化内容...' },
  { count: 45, message: '即将完成，请稍候...' }
];

/**
 * 获取当前阶段的进度提示
 */
function getProgressMessage(pollCount) {
  let message = '处理中...';
  for (let i = PROGRESS_MESSAGES.length - 1; i >= 0; i--) {
    if (pollCount >= PROGRESS_MESSAGES[i].count) {
      message = PROGRESS_MESSAGES[i].message;
      break;
    }
  }
  return message;
}

/**
 * 带重试的网络请求
 */
function requestWithRetry(options, retryCount = 0) {
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res);
        } else if (res.statusCode >= 500 && retryCount < MAX_RETRY) {
          // 服务端错误，自动重试
          console.log(`请求失败(${res.statusCode})，第${retryCount + 1}次重试...`);
          setTimeout(() => {
            requestWithRetry(options, retryCount + 1).then(resolve).catch(reject);
          }, 1000 * (retryCount + 1));
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        if (retryCount < MAX_RETRY) {
          console.log(`网络错误，第${retryCount + 1}次重试...`);
          setTimeout(() => {
            requestWithRetry(options, retryCount + 1).then(resolve).catch(reject);
          }, 1000 * (retryCount + 1));
        } else {
          reject(new Error('网络连接失败，请检查网络后重试'));
        }
      }
    });
  });
}

/**
 * 创建任务
 */
function createTask(endpoint, data) {
  return requestWithRetry({
    url: `${app.globalData.apiBaseUrl}/api/${endpoint}`,
    method: 'POST',
    data: data,
    header: {
      'Content-Type': 'application/json'
    }
  }).then((res) => {
    if (res.data && res.data.success) {
      return res.data;
    } else {
      throw new Error(res.data.error || '创建任务失败');
    }
  });
}

/**
 * 查询任务状态
 */
function getTaskStatus(taskId) {
  return requestWithRetry({
    url: `${app.globalData.apiBaseUrl}/api/task/${taskId}`,
    method: 'GET'
  }).then((res) => {
    if (res.data && res.data.success) {
      return res.data;
    } else {
      throw new Error(res.data.error || '查询失败');
    }
  });
}

/**
 * 轮询任务状态（带超时和进度提示）
 * @param {string} taskId - 任务ID
 * @param {function} onProgress - 进度回调 (message, pollCount, maxCount)
 * @returns {Promise}
 */
function pollTask(taskId, onProgress) {
  return new Promise((resolve, reject) => {
    let pollCount = 0;

    const poll = () => {
      pollCount++;

      // 超时检查
      if (pollCount > MAX_POLL_COUNT) {
        reject(new Error('任务处理超时（已等待5分钟），请稍后在历史记录中查看结果'));
        return;
      }

      // 通知进度
      if (onProgress) {
        const message = getProgressMessage(pollCount);
        onProgress(message, pollCount, MAX_POLL_COUNT);
      }

      getTaskStatus(taskId)
        .then((task) => {
          if (task.status === 'completed') {
            resolve(task);
          } else if (task.status === 'failed') {
            reject(new Error(task.error || '任务处理失败'));
          } else {
            // 5秒后重试
            setTimeout(poll, 5000);
          }
        })
        .catch((err) => {
          // 网络错误时不立即失败，继续重试
          if (pollCount < MAX_POLL_COUNT) {
            console.warn('轮询出错，继续重试:', err.message);
            setTimeout(poll, 5000);
          } else {
            reject(err);
          }
        });
    };

    poll();
  });
}

/**
 * 获取使用统计
 */
function getUsage() {
  return requestWithRetry({
    url: `${app.globalData.apiBaseUrl}/api/usage`,
    method: 'GET'
  }).then((res) => {
    return res.data;
  });
}

/**
 * 验证邀请码
 */
function verifyInviteCode(code) {
  return requestWithRetry({
    url: `${app.globalData.apiBaseUrl}/api/verify-code`,
    method: 'POST',
    data: { code },
    header: {
      'Content-Type': 'application/json'
    }
  }).then((res) => {
    return res.data;
  });
}

/**
 * 下载 Word 文档
 */
function downloadDocx(downloadUrl, filename) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${app.globalData.apiBaseUrl}${downloadUrl}`;
    
    wx.downloadFile({
      url: fullUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath);
        } else {
          reject(new Error(`下载失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(new Error('下载失败，请检查网络'));
      }
    });
  });
}

/**
 * 打开 Word 文档
 */
function openDocx(filePath) {
  return new Promise((resolve, reject) => {
    wx.openDocument({
      filePath: filePath,
      fileType: 'docx',
      showMenu: true,
      success: () => {
        resolve();
      },
      fail: (err) => {
        reject(new Error('打开文档失败'));
      }
    });
  });
}

module.exports = {
  createTask,
  getTaskStatus,
  pollTask,
  getUsage,
  verifyInviteCode,
  downloadDocx,
  openDocx,
  MAX_POLL_COUNT
};
