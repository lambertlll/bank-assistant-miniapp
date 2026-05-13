// pages/result/result.js
// 银行业务助手 - 结果展示页（支持 Markdown 渲染和分享）

const api = require('../../utils/api.js');
const { parseMarkdown } = require('../../utils/markdown.js');

Page({
  data: {
    taskId: '',
    result: '',
    richNodes: [],
    loading: true,
    error: '',
    progressMessage: '正在加载结果...',
    pollCount: 0,
    maxPollCount: api.MAX_POLL_COUNT
  },

  onLoad(options) {
    const taskId = options.taskId;
    if (taskId) {
      this.setData({ taskId });
      this.loadResult(taskId);
    } else {
      this.setData({
        loading: false,
        error: '任务ID不存在'
      });
    }
  },

  // 加载结果
  loadResult(taskId) {
    let pollCount = 0;

    const poll = () => {
      pollCount++;

      if (pollCount > api.MAX_POLL_COUNT) {
        this.setData({
          loading: false,
          error: '加载超时，请稍后在历史记录中查看'
        });
        return;
      }

      this.setData({
        pollCount,
        progressMessage: pollCount < 3 ? '正在加载结果...' : '仍在处理中，请耐心等待...'
      });

      api.getTaskStatus(taskId)
        .then((task) => {
          if (task.status === 'completed') {
            const resultText = typeof task.data === 'string' ? task.data : JSON.stringify(task.data, null, 2);
            const richNodes = parseMarkdown(resultText);

            this.setData({
              loading: false,
              result: resultText,
              richNodes
            });

            // 更新历史记录
            this.updateHistory(taskId, 'completed', resultText);
          } else if (task.status === 'failed') {
            this.setData({
              loading: false,
              error: task.error || '任务处理失败'
            });
            this.updateHistory(taskId, 'failed');
          } else {
            // 继续轮询
            setTimeout(poll, 5000);
          }
        })
        .catch((err) => {
          if (pollCount < api.MAX_POLL_COUNT) {
            // 网络错误继续重试
            setTimeout(poll, 5000);
          } else {
            this.setData({
              loading: false,
              error: err.message || '加载失败，请检查网络'
            });
          }
        });
    };

    poll();
  },

  // 更新历史记录
  updateHistory(taskId, status, result) {
    try {
      const history = wx.getStorageSync('task_history') || [];
      const index = history.findIndex(item => item.taskId === taskId);
      if (index !== -1) {
        history[index].status = status;
        history[index].completeTime = Date.now();
        if (result) {
          // 只保存前500字符作为预览
          history[index].preview = result.substring(0, 500);
        }
        wx.setStorageSync('task_history', history);
      }
    } catch (e) {
      console.error('更新历史记录失败:', e);
    }
  },

  // 重试加载
  retryLoad() {
    this.setData({
      loading: true,
      error: '',
      pollCount: 0
    });
    this.loadResult(this.data.taskId);
  },

  // 复制结果
  copyResult() {
    if (!this.data.result) {
      wx.showToast({ title: '暂无内容', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: this.data.result,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 返回首页
  backToHome() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '银行业务助手 - 分析报告',
      path: `/pages/result/result?taskId=${this.data.taskId}`,
      desc: '查看分析报告结果'
    };
  }
});
