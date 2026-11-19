// pages/spray/spray.js — 施药登记（对标网页端 🌿 施药登记）
// 区域块 + 病害类型改为下拉选择（picker），选中病害即带出打药建议并预填药剂/用量；
// 登记时间由服务器按提交时刻记录，无需手填日期。
const api = require('../../utils/api')
const SD = require('../../utils/spray_data')

Page({
  data: {
    plots: SD.PLOTS,
    diseases: SD.DISEASE_NAMES,
    plotIndex: -1,
    diseaseIndex: -1,
    // picker 的 value 必须是合法下标，未选择时给 0（避免在 WXML 里写三元/比较表达式）
    plotPickerIndex: 0,
    diseasePickerIndex: 0,
    plotName: '',
    diseaseName: '',

    advice: null,        // 当前病害的打药建议 { pesticide, dose, phi, tip }
    adviceMeta: '',      // 一行摘要（推荐药剂 / 倍数 / 间隔期）

    pesticide: '',
    dose: '',

    submitting: false,
    okMsg: '',

    trendOpen: false,
    trend: null
  },

  // —— 下拉选择 ——
  onPlotChange(e) {
    const i = Number(e.detail.value)
    this.setData({
      plotIndex: i,
      plotPickerIndex: i,
      plotName: this.data.plots[i],
      okMsg: ''
    })
  },

  onDiseaseChange(e) {
    const i = Number(e.detail.value)
    const name = this.data.diseases[i]
    const advice = SD.getAdvice(name)
    this.setData({
      diseaseIndex: i,
      diseasePickerIndex: i,
      diseaseName: name,
      advice: advice,
      adviceMeta: SD.adviceMeta(name),
      // 选中即预填，减少手输；手改后可点“一键填入”还原
      pesticide: (advice && advice.pesticide) || '',
      dose: (advice && advice.dose) || '',
      okMsg: ''
    })
  },

  fillAdvice() {
    const advice = this.data.advice
    if (!advice) {
      wx.showToast({ title: '请先选择病害类型', icon: 'none' })
      return
    }
    this.setData({ pesticide: advice.pesticide || '', dose: advice.dose || '' })
    wx.showToast({ title: '已填入推荐药剂', icon: 'none' })
  },

  onPesticideInput(e) { this.setData({ pesticide: e.detail.value }) },
  onDoseInput(e) { this.setData({ dose: e.detail.value }) },

  // —— 提交登记 ——
  submit() {
    const d = this.data
    if (!d.plotName) { wx.showToast({ title: '请选择区域块', icon: 'none' }); return }
    if (!d.diseaseName) { wx.showToast({ title: '请选择病害类型', icon: 'none' }); return }
    if (d.diseaseName === '健康茶叶') { wx.showToast({ title: '健康茶叶无需施药', icon: 'none' }); return }
    const pesticide = (d.pesticide || '').trim()
    if (!pesticide) { wx.showToast({ title: '请填写药剂名称', icon: 'none' }); return }

    this.setData({ submitting: true, okMsg: '' })
    api.raw('/spray', 'POST', {
      plot: d.plotName,          // 区域块（下拉）
      pesticide: pesticide,
      target: d.diseaseName,     // 防治对象 = 所选病害类型
      dose: (d.dose || '').trim(),
      source: 'miniprogram'
    }).then(res => {
      if (res && res.ok) {
        this.setData({
          submitting: false,
          okMsg: '✓ ' + (res.confirm || '登记成功'),
          pesticide: '',
          dose: '',
          diseaseIndex: -1,
          diseasePickerIndex: 0,
          diseaseName: '',
          advice: null,
          adviceMeta: ''
        })
        wx.vibrateShort({ type: 'light' })
        if (this.data.trendOpen) this.loadTrend()
      } else {
        this.setData({ submitting: false })
        wx.showToast({ title: (res && res.error) || '登记失败', icon: 'none' })
      }
    }).catch(err => {
      this.setData({ submitting: false })
      wx.showToast({ title: err.message || '登记失败', icon: 'none' })
    })
  },

  // —— 施药趋势 ——
  toggleTrend() {
    const open = !this.data.trendOpen
    this.setData({ trendOpen: open, okMsg: '' })
    if (open) this.loadTrend()
  },

  loadTrend() {
    api.raw('/spray/summary?days=30', 'GET').then(d => {
      const weeks = d.by_week || []
      const max = Math.max(1, Math.max.apply(null, weeks.map(w => w.count).concat([1])))
      this.setData({
        trend: {
          total: d.total || 0,
          last: d.last_applied || '-',
          weeks: weeks.map(w => ({
            week: w.week,
            count: w.count,
            percent: Math.round(w.count / max * 100)
          })),
          plotText: d.by_plot_text || '暂无',
          pesticideText: d.by_pesticide_text || '暂无'
        }
      })
    }).catch(err => {
      wx.showToast({ title: err.message || '趋势加载失败', icon: 'none' })
      this.setData({ trend: null })
    })
  }
})
