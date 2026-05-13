// pages/index/index.js
// 银行业务助手首页 - 功能选择与任务提交

const api = require('../../utils/api.js');

const FUNCTION_NAMES = {
  'client-research': '客户尽调',
  'financial-report': '财报分析',
  'credit-committee': '审贷会助手'
};

Page({
  data: {
    selectedFunction: '',
    selectedFunctionName: '',
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
    remainingTime: '约5分钟',
    currentStep: 0,
    // 邀请码相关
    showInviteModal: false,
    inviteCode: '',
    inviteError: '',
    isVerified: false,
    // 输入焦点
    clientNameFocus: false,
    companyNameFocus: false
  },

  onLoad() {
    this.checkVerification();
    this.loadUsage();
  },

  onShow() {
    this.checkVerification();
    this.loadUsage();
  },

  // 检查邀请码验证状态
  checkVerification() {
    const app = getApp();
    if (app.globalData.isVerified) {
      this.setData({ isVerified: true, showInviteModal: false });
    } else {
      this.setData({ isVerified: false, showInviteModal: true });
    }
  },

  // 邀请码输入
  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value, inviteError: '' });
  },

  // 验证邀请码
  verifyInviteCode() {
    const code = this.data.inviteCode.trim();
    if (!code) {
      this.setData({ inviteError: '请输入邀请码' });
      return;
    }

    api.verifyInviteCode(code)
      .then((res) => {
        if (res.valid) {
          const app = getApp();
          app.setVerified();
          this.setData({ isVerified: true, showInviteModal: false, inviteError: '' });
          wx.showToast({ title: '验证成功', icon: 'success' });
          wx.vibrateShort({ type: 'medium' });
        } else {
          this.setData({ inviteError: '邀请码无效，请重新输入' });
          wx.vibrateShort({ type: 'heavy' });
        }
      })
      .catch((err) => {
        this.setData({ inviteError: err.message || '验证失败，请重试' });
      });
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
      selectedFunctionName: FUNCTION_NAMES[func] || '',
      error: ''
    });
    wx.vibrateShort({ type: 'light' });
  },

  // 输入框变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [field]: e.detail.value
    });
  },

  // 输入框焦点
  onInputFocus(e) {
    const focusField = e.currentTarget.dataset.focus;
    this.setData({ [focusField]: true });
  },

  onInputBlur(e) {
    const focusField = e.currentTarget.dataset.focus;
    this.setData({ [focusField]: false });
  },

  // 选项卡片点击（替代 radio）
  onOptionSelect(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.currentTarget.dataset.value;
    this.setData({ [field]: value });
    wx.vibrateShort({ type: 'light' });
  },

  // 单选框变化（保留兼容）
  onRadioChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [field]: value });
  },

  // 计算剩余时间
  calcRemainingTime(pollCount) {
    const remaining = (api.MAX_POLL_COUNT - pollCount) * 5;
    if (remaining > 60) {
      return `约${Math.ceil(remaining / 60)}分钟`;
    }
    return `约${remaining}秒`;
  },

  // 计算当前步骤
  calcCurrentStep(pollCount) {
    const max = api.MAX_POLL_COUNT;
    if (pollCount < max * 0.2) return 1;
    if (pollCount < max * 0.7) return 2;
    return 3;
  },

  // 提交任务
  submit() {
    const { selectedFunction, clientName, clientType, companyName, reportType, outputFormat } = this.data;

    // 验证输入
    if (selectedFunction === 'client-research' && !clientName.trim()) {
      this.setData({ error: '请输入客户名称' });
      wx.vibrateShort({ type: 'heavy' });
      return;
    }
    if ((selectedFunction === 'financial-report' || selectedFunction === 'credit-committee') && !companyName.trim()) {
      this.setData({ error: '请输入公司名称' });
      wx.vibrateShort({ type: 'heavy' });
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
      pollCount: 0,
      currentStep: 1
    });

    wx.vibrateShort({ type: 'medium' });

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
            remainingTime: this.calcRemainingTime(count),
            currentStep: this.calcCurrentStep(count)
          });
        });
      })
      .then((task) => {
        this.setData({ loading: false, currentStep: 3 });

        // 更新历史记录状态
        this.updateHistoryStatus(task.taskId, 'completed');

        // 成功震动反馈
        wx.vibrateShort({ type: 'medium' });

        // 跳转到结果页
        wx.navigateTo({
          url: `/pages/result/result?taskId=${task.taskId}`
        });
      })
      .catch((err) => {
        this.setData({
          loading: false,
          currentStep: 0,
          error: err.message || '处理失败，请重试'
        });
        wx.vibrateShort({ type: 'heavy' });
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
    wx.switchTab({
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
