// pages/history/history.js
// 银行业务助手 - 历史记录页

const FUNCTION_TYPE_MAP = {
  'client-research': '客户尽调',
  'financial-report': '财报分析',
  'credit-committee': '审贷会助手'
};

Page({
  data: {
    history: []
  },

  onShow() {
    this.loadHistory();
  },

  // 加载历史记录
  loadHistory() {
    try {
      const history = wx.getStorageSync('task_history') || [];
      // 格式化时间和类型
      const formatted = history.map(item => ({
        ...item,
        createTimeStr: this.formatTime(item.createTime),
        functionTypeStr: FUNCTION_TYPE_MAP[item.functionType] || item.functionType,
        preview: item.preview ? item.preview.substring(0, 100) + (item.preview.length > 100 ? '...' : '') : ''
      }));
      this.setData({ history: formatted });
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  // 查看详情
  viewDetail(e) {
    const taskId = e.currentTarget.dataset.taskId;
    if (taskId) {
      wx.navigateTo({
        url: `/pages/result/result?taskId=${taskId}`
      });
    }
  },

  // 清空历史记录
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？此操作不可恢复。',
      confirmColor: '#d32f2f',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('task_history');
            this.setData({ history: [] });
            wx.showToast({ title: '已清空', icon: 'success' });
          } catch (e) {
            console.error('清空历史记录失败:', e);
          }
        }
      }
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
