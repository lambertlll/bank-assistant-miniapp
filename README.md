# 银行业务助手微信小程序 - 优化版

专为银行从业人员设计的智能分析工具，提供客户尽调、财报分析、审贷会助手等功能。

## 功能特性

### 核心功能
- 📋 **客户尽调** - 企业/个人背景调查报告
- 📊 **财报分析** - 上市公司财务分析报告
- 💼 **审贷会助手** - 审贷会准备材料生成

### 优化亮点
1. **修复 radio 绑定** - 使用 `radio-group` 的 `bindchange` 替代 radio 上的 `bindtap`，确保选择状态正确同步
2. **轮询超时与进度提示** - 最大轮询60次（5分钟），显示阶段性进度（"正在搜索信息..."、"正在生成报告..."）
3. **专业 UI 布局** - 功能卡片横向网格排列，深蓝色银行风格配色
4. **Markdown 渲染** - 结果页支持标题、加粗、列表、表格的基本渲染
5. **历史记录** - 使用 `wx.getStorageSync` 保存历史任务，支持查看和清空
6. **网络错误重试** - 请求失败自动重试，并提供手动重试按钮
7. **分享功能** - 支持将报告分享给同事
8. **下拉刷新** - 首页使用统计支持下拉刷新
9. **环境切换** - `apiBaseUrl` 支持 dev/prod 环境配置
10. **加载动画** - 专业的旋转加载动画 + 进度条

## 项目结构

```
bank-assistant-miniapp/
├── README.md
├── miniapp/
│   ├── app.js              # 应用入口（含环境配置）
│   ├── app.json            # 应用配置
│   ├── app.wxss            # 全局样式
│   ├── sitemap.json        # 小程序索引配置
│   ├── utils/
│   │   ├── api.js          # API 请求模块（含重试逻辑）
│   │   └── markdown.js     # 简易 Markdown 渲染模块
│   └── pages/
│       ├── index/          # 首页：功能选择
│       │   ├── index.js
│       │   ├── index.json
│       │   ├── index.wxml
│       │   └── index.wxss
│       ├── result/         # 结果页：报告展示
│       │   ├── result.js
│       │   ├── result.json
│       │   ├── result.wxml
│       │   └── result.wxss
│       └── history/        # 历史记录页
│           ├── history.js
│           ├── history.json
│           ├── history.wxml
│           └── history.wxss
```

## 环境配置

在 `app.js` 中修改环境：

```javascript
// 切换环境：'dev' 或 'prod'
const CURRENT_ENV = 'dev';

const ENV_CONFIG = {
  dev: {
    apiBaseUrl: 'http://42.193.153.178'
  },
  prod: {
    apiBaseUrl: 'https://api.bank-assistant.com'
  }
};
```

## 使用方法

1. 使用微信开发者工具打开 `miniapp/` 目录
2. 配置 AppID（或使用测试号）
3. 确保后端服务已启动
4. 编译运行

## 后端 API

小程序依赖以下后端接口：

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/client-research` | POST | 创建客户尽调任务 |
| `/api/financial-report` | POST | 创建财报分析任务 |
| `/api/credit-committee` | POST | 创建审贷会助手任务 |
| `/api/task/:taskId` | GET | 查询任务状态 |
| `/api/usage` | GET | 获取使用统计 |

## 技术栈

- 微信小程序原生框架
- ES6+ JavaScript
- WXSS (WeChat Style Sheets)
- rich-text 组件（Markdown 渲染）

## 注意事项

- 开发阶段需在微信开发者工具中关闭「不校验合法域名」
- 正式发布前需在小程序后台配置服务器域名
- 历史记录存储在本地，清除小程序缓存会丢失
