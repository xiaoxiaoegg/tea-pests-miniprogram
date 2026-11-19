// pages/index/index.js — 检测页（对标网页端：图片/视频检测 → 结果 → 建议 → 复拍）
const api = require('../../utils/api')

// 类别中文表（与 shared/Config.py CH_namenegs 保持一致）
const CN_NAMES = [
  '茶叶黑腐病', '茶叶褐斑病', '茶叶锈病', '红蜘蛛危害茶叶',
  '茶蚊虫危害茶叶', '健康茶叶', '茶叶白斑病', '其他病害'
]

// 危害等级 → 徽章样式（与网页端 sev-none/light/mid/heavy 同色系）
const SEV_CLASS = {
  '无': 'sev-none',
  '轻度': 'sev-light',
  '中度': 'sev-mid',
  '重度': 'sev-heavy'
}

Page({
  data: {
    source: 'image',      // image | video
    mediaUrl: '',         // 本地临时路径（图片或视频）
    isVideo: false,
    result: null,         // /firefly 返回的检测结果
    resultUrl: '',        // 标注结果（图片/视频）完整链接
    resultIsVideo: false,
    severityLevel: '无',
    severityClass: 'sev-none',
    detecting: false,
    errMsg: ''
  },

  // 切换检测来源（图片 / 视频）
  switchSource(e) {
    const source = e.currentTarget.dataset.source
    if (source === this.data.source) return
    this.setData({
      source: source, mediaUrl: '', isVideo: false,
      result: null, resultUrl: '', errMsg: ''
    })
  },

  // 拍照 / 相册选择（图片走 camera 也能直接拍，等价网页端“摄像头”入口）
  chooseMedia() {
    const isVideo = this.data.source === 'video'
    wx.chooseMedia({
      count: 1,
      mediaType: [isVideo ? 'video' : 'image'],
      sourceType: ['album', 'camera'],
      maxDuration: 30,
      camera: 'back',
      success: (res) => {
        const file = res.tempFiles[0]
        this.setData({
          mediaUrl: file.tempFilePath,
          isVideo: isVideo,
          result: null, resultUrl: '', errMsg: ''
        })
      }
    })
  },

  startDetect() {
    if (!this.data.mediaUrl || this.data.detecting) return
    this.setData({ detecting: true, errMsg: '' })
    api.detectFile(this.data.mediaUrl).then(data => {
      // 附上中文名与百分比置信度，便于展示
      const dets = data.detections || []
      dets.forEach(d => {
        d.cnName = CN_NAMES[d.class_id] || d.class_name
        d.confidencePercent = Math.round((d.confidence || 0) * 100)
      })
      const level = (data.severity && data.severity.level) || '无'
      this.setData({
        result: data,
        resultUrl: data.result_url ? api.fileUrl(data.result_url) : '',
        resultIsVideo: data.file_type === 'video',
        severityLevel: level,
        severityClass: SEV_CLASS[level] || 'sev-none',
        detecting: false
      })
    }).catch(err => {
      this.setData({ detecting: false, errMsg: err.message || '检测失败' })
    })
  },

  previewResult() {
    if (!this.data.resultUrl || this.data.resultIsVideo) return
    wx.previewImage({ urls: [this.data.resultUrl] })
  },

  goAdvice() {
    const record = this.data.result
    if (!record || !record.record_id) return
    wx.navigateTo({ url: '/pages/detail/detail?id=' + record.record_id })
  },

  // 防治后复拍：清空本次结果，引导 7-15 天后对同一部位复检（对标网页端防治闭环）
  retestRecheck() {
    wx.showModal({
      title: '防治后复拍',
      content: '请在执行防治方案 7-15 天后，对同一茶园部位重新拍照上传，系统将重新检测，便于对比验证防治效果。',
      confirmText: '开始复拍',
      success: (res) => {
        if (!res.confirm) return
        this.setData({
          mediaUrl: '', result: null, resultUrl: '', errMsg: '',
          severityLevel: '无', severityClass: 'sev-none'
        })
        wx.showToast({ title: '请重新拍摄同一部位', icon: 'none', duration: 2200 })
      }
    })
  }
})
