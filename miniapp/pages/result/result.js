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
    maxPollCount: api.MAX_POLL_COUNT,
    // Word 文档相关
    docxUrl: '',
    docxFilename: '',
    hasDocx: false,
    downloading: false
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
        progressMessage: pollCount < 3 ? '正在连接服务...' : pollCount < 8 ? '正在分析数据...' : '正在生成报告...'
      });

      api.getTaskStatus(taskId)
        .then((task) => {
          if (task.status === 'completed') {
            const resultText = typeof task.data === 'string' ? task.data : JSON.stringify(task.data, null, 2);
            const richNodes = parseMarkdown(resultText);

            const updateData = {
              loading: false,
              result: resultText,
              richNodes
            };

            // 检查是否有 Word 文档
            if (task.docx && task.docx.url) {
              updateData.hasDocx = true;
              updateData.docxUrl = task.docx.url;
              updateData.docxFilename = task.docx.filename || '报告.docx';
            }

            this.setData(updateData);

            // 成功震动反馈
            wx.vibrateShort({ type: 'medium' });

            // 更新历史记录
            this.updateHistory(taskId, 'completed', resultText);
          } else if (task.status === 'failed') {
            this.setData({
              loading: false,
              error: task.error || '任务处理失败'
            });
            wx.vibrateShort({ type: 'heavy' });
            this.updateHistory(taskId, 'failed');
          } else {
            // 继续轮询
            setTimeout(poll, 5000);
          }
        })
        .catch((err) => {
          if (pollCount < api.MAX_POLL_COUNT) {
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
        wx.vibrateShort({ type: 'light' });
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },

  // 分享结果
  shareResult() {
    // 触发微信分享
    wx.vibrateShort({ type: 'light' });
  },

  // 导出 Word 文档
  exportWord() {
    if (!this.data.hasDocx) {
      wx.showToast({ title: 'Word文档未生成', icon: 'none' });
      return;
    }

    if (this.data.downloading) return;

    this.setData({ downloading: true });
    wx.vibrateShort({ type: 'light' });

    wx.showLoading({ title: '正在下载...' });

    api.downloadDocx(this.data.docxUrl, this.data.docxFilename)
      .then((tempFilePath) => {
        wx.hideLoading();
        // 打开文档
        return api.openDocx(tempFilePath);
      })
      .then(() => {
        this.setData({ downloading: false });
      })
      .catch((err) => {
        wx.hideLoading();
        this.setData({ downloading: false });
        wx.showToast({
          title: err.message || '下载失败',
          icon: 'none',
          duration: 2000
        });
      });
  },

  // 导出 PDF（预留功能）
  exportPDF() {
    wx.vibrateShort({ type: 'light' });
    wx.showToast({
      title: 'PDF导出功能即将上线',
      icon: 'none',
      duration: 2000
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
