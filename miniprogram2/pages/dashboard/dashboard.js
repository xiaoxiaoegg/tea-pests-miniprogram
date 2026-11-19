// pages/dashboard/dashboard.js — 茶园数据看板（对标网页端 📊 茶园数据看板）
// 数据来源：后端 GET /records/stats
const api = require('../../utils/api')

// 危害等级展示顺序（后端返回对象，键序不保证，前端固定排序更好读）
const SEV_ORDER = ['无', '轻度', '中度', '重度']

Page({
  data: {
    loading: false,
    errMsg: '',
    todayCount: 0,
    totalCount: 0,
    severities: [],    // [{ name, count }]
    topClasses: [],    // [{ name, count, percent }]
    trend: [],         // [{ date, count, percent }]
    locations: [],     // [{ name, count, lat, lng }]
    markers: [],
    mapCenter: null,   // { latitude, longitude }
    hasMap: false,
    forecast: null,   // 茶叶病虫害预测（服务器 /risk/latest）
    fcErr: ''
  },

  onShow() {
    this.loadStats()
    this.loadForecast()
  },

  // ---- 茶叶病虫害预测：工作站 risk_engine 每小时上报，服务器 /risk/latest ----
  loadForecast() {
    api.request('/risk/latest', 'GET').then(res => {
      // /risk/latest 是裸数据式返回（没有 data 外壳），所以 res.data 取不到时要回落到 res 本身
      const rep = this.normReport(res.data || res)
      if (!rep) { this.setData({ forecast: null, fcErr: '预测数据格式未识别' }); return }
      const env = rep.env || {}
      const pests = (rep.pests || []).map(p => ({
        pest: p.pest,
        level: p.level,
        sub: (p.trend || '') + (p.env_fit ? ' · 环境' + p.env_fit : ''),
        color: p.level === '高' ? '#C62828' : (p.level === '中' ? '#EF6C00' : '#2E7D32'),
        bg: p.level === '高' ? '#FFEBEE' : (p.level === '中' ? '#FFF3E0' : '#E8F5E9')
      }))
      const vf = rep.verified || null
      this.setData({
        fcErr: '',
        forecast: {
          time: rep.time || '--',
          envText: rep.env ? (env.temp_c + '℃ / ' + env.hum + '%') : '',
          pests: pests,
          advice: (rep.advice || []).join(' '),
          outlook: rep.outlook || '',
          src: (vf && vf.checked) ? ('预测自校验 ' + (vf.hits || 0) + '/' + vf.checked + ' 命中') : ''
        }
      })
    }).catch(err => {
      this.setData({ forecast: null, fcErr: (err && err.message) || '预测数据获取失败' })
    })
  },

  // 兼容两种返回：直接是 report（含 pests）/ 表行（report 序列化在 detail 字符串里）
  normReport(d) {
    if (!d || typeof d !== 'object') return null
    const keys = ['report', 'detail']
    for (let i = 0; i < keys.length; i++) {
      let v = d[keys[i]]
      if (typeof v === 'string') { try { v = JSON.parse(v) } catch (e) { v = null } }
      if (v && v.pests) return v
    }
    return d.pests ? d : null
  },

  loadStats() {
    if (this.data.loading) return
    this.setData({ loading: true, errMsg: '' })
    api.request('/records/stats', 'GET').then(res => {
      this.renderStats(res.data || {})
      this.setData({ loading: false })
    }).catch(err => {
      this.setData({ loading: false, errMsg: err.message || '统计加载失败' })
    })
  },

  renderStats(d) {
    // 危害等级分布
    const sevObj = d.severity_distribution || {}
    const sevKeys = Object.keys(sevObj)
    sevKeys.sort(function (a, b) {
      const ia = SEV_ORDER.indexOf(a) < 0 ? 99 : SEV_ORDER.indexOf(a)
      const ib = SEV_ORDER.indexOf(b) < 0 ? 99 : SEV_ORDER.indexOf(b)
      return ia - ib
    })
    const severities = sevKeys.map(k => ({ name: k, count: sevObj[k] }))

    // TOP 病虫害（按最大值算条形宽度，RN 风格百分比条）
    const top = d.top_classes || []
    const maxTop = Math.max(1, Math.max.apply(null, top.map(t => t.count).concat([1])))
    const topClasses = top.map(t => ({
      name: t.name,
      count: t.count,
      percent: Math.round(t.count / maxTop * 100)
    }))

    // 近 7 天趋势
    const trendRaw = d.trend_7d || []
    const maxTrend = Math.max(1, Math.max.apply(null, trendRaw.map(t => t.count).concat([1])))
    const trend = trendRaw.map(t => ({
      date: (t.date || '').slice(5),
      count: t.count,
      percent: Math.round(t.count / maxTrend * 100)
    }))

    // 地块分布 + 地图标记（仅带经纬度的地块可上图）
    const locObj = d.locations || {}
    const locations = Object.keys(locObj).map(name => ({
      name: name,
      count: locObj[name].count,
      lat: locObj[name].lat,
      lng: locObj[name].lng
    }))
    const withLoc = locations.filter(l => l.lat && l.lng)
    const markers = withLoc.map((l, i) => ({
      id: i,
      latitude: l.lat,
      longitude: l.lng,
      width: 24,
      height: 24,
      callout: {
        content: l.name + ' · ' + l.count + ' 次',
        color: '#1B5E20',
        fontSize: 12,
        borderRadius: 6,
        bgColor: '#FFFFFF',
        padding: 6,
        display: 'ALWAYS'
      }
    }))

    this.setData({
      todayCount: d.today_count || 0,
      totalCount: d.total_count || 0,
      severities: severities,
      topClasses: topClasses,
      trend: trend,
      locations: locations,
      markers: markers,
      hasMap: markers.length > 0,
      mapCenter: markers.length ? { latitude: withLoc[0].lat, longitude: withLoc[0].lng } : null
    })
  },

  // 看板 → 防治记录（看某条明细）
  goHistory() {
    wx.switchTab({ url: '/pages/history/history' })
  }
})
