// pages/index/index.js
// 银行业务助手首页 - 功能选择与任务提交

const api = require('../../utils/api.js');

Page({
  data: {
    selectedFunction: '',
    clientName: '',
    clientType: 'enterprise',
    companyName: '',
    reportType: 'detailed',
    outputFormat: 'text',
    loading: false,
    error: '',
    usage: {
      used: 0,
      remaining: 100,
      total: 100
    },
    // 轮询进度相关
    progressMessage: '正在初始化...',
    pollCount: 0,
    maxPollCount: api.MAX_POLL_COUNT,
    remainingTime: '约5分钟'
  },

  onLoad() {
    this.loadUsage();
  },

  onShow() {
    this.loadUsage();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadUsage();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 加载使用统计
  loadUsage() {
    api.getUsage()
      .then((usage) => {
        this.setData({ usage });
      })
      .catch((err) => {
        console.error('获取使用统计失败:', err);
      });
  },

  // 选择功能
  selectFunction(e) {
    const func = e.currentTarget.dataset.function;
    this.setData({
      selectedFunction: func,
      error: ''
    });
  },

  // 输入框变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  // 单选框变化（使用 radio-group 的 bindchange）
  onRadioChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [field]: value
    });
  },

  // 计算剩余时间
  calcRemainingTime(pollCount) {
    const remaining = (api.MAX_POLL_COUNT - pollCount) * 5;
    if (remaining > 60) {
      return `约${Math.ceil(remaining / 60)}分钟`;
    }
    return `约${remaining}秒`;
  },

  // 提交任务
  submit() {
    const { selectedFunction, clientName, clientType, companyName, reportType, outputFormat } = this.data;

    // 验证输入
    if (selectedFunction === 'client-research' && !clientName.trim()) {
      this.setData({ error: '请输入客户名称' });
      return;
    }
    if ((selectedFunction === 'financial-report' || selectedFunction === 'credit-committee') && !companyName.trim()) {
      this.setData({ error: '请输入公司名称' });
      return;
    }

    // 构建请求数据
    let data = {};
    let endpoint = '';
    let taskName = '';

    if (selectedFunction === 'client-research') {
      endpoint = 'client-research';
      data = { clientName: clientName.trim(), clientType };
      taskName = `客户尽调 - ${clientName.trim()}`;
    } else if (selectedFunction === 'financial-report') {
      endpoint = 'financial-report';
      data = { companyName: companyName.trim(), reportType };
      taskName = `财报分析 - ${companyName.trim()}`;
    } else if (selectedFunction === 'credit-committee') {
      endpoint = 'credit-committee';
      data = { companyName: companyName.trim(), outputFormat };
      taskName = `审贷会助手 - ${companyName.trim()}`;
    }

    // 显示加载状态
    this.setData({
      loading: true,
      error: '',
      progressMessage: '正在创建任务...',
      pollCount: 0
    });

    // 创建任务
    api.createTask(endpoint, data)
      .then((result) => {
        // 保存到历史记录
        this.saveToHistory({
          taskId: result.taskId,
          taskName,
          functionType: selectedFunction,
          params: data,
          status: 'processing',
          createTime: Date.now()
        });

        // 轮询任务状态（带进度提示）
        return api.pollTask(result.taskId, (message, count, max) => {
          this.setData({
            progressMessage: message,
            pollCount: count,
            remainingTime: this.calcRemainingTime(count)
          });
        });
      })
      .then((task) => {
        this.setData({ loading: false });

        // 更新历史记录状态
        this.updateHistoryStatus(task.taskId, 'completed');

        // 跳转到结果页
        wx.navigateTo({
          url: `/pages/result/result?taskId=${task.taskId}`
        });
      })
      .catch((err) => {
        this.setData({
          loading: false,
          error: err.message || '处理失败，请重试'
        });
      });
  },

  // 重试提交
  retrySubmit() {
    this.setData({ error: '' });
    this.submit();
  },

  // 保存到历史记录
  saveToHistory(record) {
    try {
      const history = wx.getStorageSync('task_history') || [];
      history.unshift(record);
      // 最多保留50条
      if (history.length > 50) {
        history.pop();
      }
      wx.setStorageSync('task_history', history);
    } catch (e) {
      console.error('保存历史记录失败:', e);
    }
  },

  // 更新历史记录状态
  updateHistoryStatus(taskId, status) {
    try {
      const history = wx.getStorageSync('task_history') || [];
      const index = history.findIndex(item => item.taskId === taskId);
      if (index !== -1) {
        history[index].status = status;
        history[index].completeTime = Date.now();
        wx.setStorageSync('task_history', history);
      }
    } catch (e) {
      console.error('更新历史记录失败:', e);
    }
  },

  // 跳转到历史记录
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '银行业务助手 - 智能分析工具',
      path: '/pages/index/index'
    };
  }
});
