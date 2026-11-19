// pages/detail/detail.js — 详情页：拉取记录 + 触发智能体生成防治建议
const api = require('../../utils/api')
const CN_NAMES = [
  '茶叶黑腐病', '茶叶褐斑病', '茶叶锈病', '红蜘蛛危害茶叶',
  '茶蚊虫危害茶叶', '健康茶叶', '茶叶白斑病', '其他病害'
]

// 危害等级兼容：后端可能返回字符串，也可能返回 {level, ...} 对象，统一取文本
function severityText(sev) {
  if (!sev) return ''
  if (typeof sev === 'string') return sev
  return sev.level || ''
}

Page({
  data: {
    record: null,
    resultImageUrl: '',
    adviceSourceName: '',
    severityText: '',
    asking: false
  },

  onLoad(options) {
    this.recordId = options.id
    this.loadRecord()
  },

  loadRecord() {
    api.request('/records/' + this.recordId, 'GET').then(res => {
      const record = res.data
      record.detections.forEach(d => {
        d.cnName = CN_NAMES[d.class_id] || d.class_name
        d.confidencePercent = Math.round((d.confidence || 0) * 100)
      })
      // 建议来源（三级降级链：coze/llm/local）
      const srcNames = { coze: 'Coze 智能体', llm: '本地大模型（Ollama）', local: '离线知识库' }
      this.setData({
        record,
        resultImageUrl: api.fileUrl(record.result_url),
        adviceSourceName: srcNames[record.advice_source] || '',
        severityText: severityText(record.severity)
      })
    }).catch(err => {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' })
    })
  },

  getAdvice() { this.requestAdvice(false) },
  refreshAdvice() { this.requestAdvice(true) },

  /**
   * 调用后端 /records/<id>/advice
   * 后端会：读取检测结果 -> 调 Coze 智能体 ->（失败用本地知识库兜底）-> 保存并返回
   */
  requestAdvice(refresh) {
    if (this.data.asking) return
    this.setData({ asking: true })
    wx.showLoading({ title: '智能体生成中…' })
    api.request('/records/' + this.recordId + '/advice', 'POST',
                refresh ? { refresh: true } : {}).then(res => {
      wx.hideLoading()
      if (res.data.source !== 'coze') {
        const sn = { llm: '本地大模型', local: '离线知识库' }[res.data.source] || ''
        wx.showToast({ title: '已用' + sn + '生成', icon: 'none', duration: 2000 })
      }
      this.loadRecord() // 重新拉取，展示建议 + 生成时间
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({ title: err.message || '生成失败', icon: 'none' })
    }).finally(() => {
      // 兼容低版本基础库（不支持 finally 时直接忽略）
      this.setData({ asking: false })
    })
  },

  previewResult(e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.url] })
  }
})
