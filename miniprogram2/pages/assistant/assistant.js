// pages/assistant/assistant.js — 茶园 AI 助手（对标网页端 🤖 茶园 AI 助手）
// 走 26717 records-api 的 /chat 代理（PAT 不出服务器），回答内容既含知识库也含真实检测数据
const api = require('../../utils/api')

const QUICK = ['最近哪种病害最多？', '打完药多久能采茶？', '叶子上有白斑怎么办？']

let seq = 0   // 消息自增 id，用于 scroll-into-view 定位

Page({
  data: {
    quick: QUICK,
    msgs: [{
      id: 0,
      role: 'bot',
      text: '你好，我是茶园 AI 助手 🍵 可以问我病虫害怎么防治，也可以查最近的真实检测数据。'
    }],
    input: '',
    busy: false,
    scrollTo: ''
  },

  /** 追加一条消息并滚动到底 */
  push(role, text) {
    const id = ++seq
    const msgs = this.data.msgs.concat([{ id: id, role: role, text: text }])
    this.setData({ msgs: msgs, scrollTo: 'm' + id })
    return id
  },

  /** 移除指定 id 的临时消息（思考态） */
  removeMsg(id) {
    const msgs = this.data.msgs.filter(m => m.id !== id)
    this.setData({ msgs: msgs })
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  quickAsk(e) {
    if (this.data.busy) return
    this.setData({ input: e.currentTarget.dataset.q })
    this.send()
  },

  send() {
    const q = (this.data.input || '').trim()
    if (!q || this.data.busy) return

    this.push('user', q)
    this.setData({ input: '', busy: true })
    const thinkId = this.push('thinking', '正在查询茶园数据与知识库…')

    const done = () => this.setData({ busy: false })

    api.raw('/chat', 'POST', { message: q }).then(res => {
      this.removeMsg(thinkId)
      if (res && res.answer) {
        this.push('bot', res.answer)
      } else {
        this.push('bot', '抱歉，AI 助手暂时不可用（' + ((res && res.error) || '未知错误') +
          '）。可稍后重试，或到「数据看板」查看真实统计。')
      }
      done()
    }).catch(err => {
      this.removeMsg(thinkId)
      this.push('bot', '连不上 AI 助手服务：' + (err.message || '网络异常') +
        '\n请确认服务器已启动且 /chat 可达。')
      done()
    })
  }
})
