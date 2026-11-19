// pages/history/history.js — 防治记录列表（点击进详情查看/生成防治建议）
const api = require('../../utils/api')

// 危害等级兼容：后端可能返回字符串，也可能返回 {level, ...} 对象，统一取文本
function severityText(sev) {
  if (!sev) return ''
  if (typeof sev === 'string') return sev
  return sev.level || ''
}

Page({
  data: {
    records: [],
    loading: false
  },

  onShow() {
    // 每次进入页面刷新（从详情页返回时也能看到最新建议状态）
    this.loadRecords()
  },

  loadRecords() {
    this.setData({ loading: true })
    api.request('/records?limit=50', 'GET').then(res => {
      const records = (res.data || []).map(r => ({
        ...r,
        thumbUrl: api.fileUrl(r.result_url),
        severityText: severityText(r.severity)
      }))
      this.setData({ records, loading: false })
    }).catch(err => {
      this.setData({ loading: false })
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    })
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  goDetect() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
