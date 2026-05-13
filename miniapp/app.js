// app.js
// 银行业务助手微信小程序 - 优化版

// 环境配置：支持 dev/prod 切换
const ENV_CONFIG = {
  dev: {
    apiBaseUrl: 'http://42.193.153.178'
  },
  prod: {
    apiBaseUrl: 'https://api.bank-assistant.com'
  }
};

// 当前环境（可通过微信开发者工具条件编译或手动切换）
const CURRENT_ENV = 'dev';

App({
  globalData: {
    apiBaseUrl: ENV_CONFIG[CURRENT_ENV].apiBaseUrl,
    env: CURRENT_ENV,
    version: '2.0.0',
    isVerified: false  // 邀请码验证状态
  },

  onLaunch() {
    console.log(`银行助手小程序启动 [环境: ${CURRENT_ENV}]`);
    // 检查本地是否已验证过邀请码
    this.checkInviteCode();
    // 清理过期的历史记录（保留最近50条）
    this.cleanHistory();
  },

  // 检查邀请码验证状态
  checkInviteCode() {
    try {
      const verified = wx.getStorageSync('invite_verified');
      if (verified) {
        this.globalData.isVerified = true;
      }
    } catch (e) {
      console.error('检查邀请码状态失败:', e);
    }
  },

  // 设置邀请码已验证
  setVerified() {
    this.globalData.isVerified = true;
    wx.setStorageSync('invite_verified', true);
  },

  // 清理过期历史记录
  cleanHistory() {
    try {
      const history = wx.getStorageSync('task_history') || [];
      if (history.length > 50) {
        wx.setStorageSync('task_history', history.slice(0, 50));
      }
    } catch (e) {
      console.error('清理历史记录失败:', e);
    }
  },

  // 获取环境配置
  getEnvConfig() {
    return ENV_CONFIG[CURRENT_ENV];
  }
});
