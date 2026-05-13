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
    const now = new Date();
    const diff = now - date;
    
    // 今天内显示"x小时前"或"x分钟前"
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000 && date.getDate() === now.getDate()) {
      return `${Math.floor(diff / 3600000)}小时前`;
    }
    
    // 昨天
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return `昨天 ${hour}:${minute}`;
    }
    
    // 更早
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

  // 跳转首页
  goToHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 清空历史记录
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？此操作不可恢复。',
      confirmColor: '#c0392b',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('task_history');
            this.setData({ history: [] });
            wx.vibrateShort({ type: 'medium' });
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
