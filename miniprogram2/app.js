// app.js — 茶安智检小程序入口
App({
  onLaunch() {
    // 启动时探测后端服务是否可用（失败不阻塞，页面内各自提示）
    const api = require('./utils/api')
    api.request('/health', 'GET').then(res => {
      console.log('后端服务正常:', res)
    }).catch(err => {
      console.warn('后端服务不可达，请在“我的-设置”中检查服务器地址:', err)
    })
  },
  globalData: {
    // 全局可访问的运行时状态
    serverOk: false
  }
})
