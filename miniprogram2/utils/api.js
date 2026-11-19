// utils/api.js — 后端接口封装
// The backend address is read from utils/config.js. Do not edit it here.
const { BASE_URL } = require('./config')

/**
 * 通用请求封装
 * @param {string} path 接口路径，如 /records
 * @param {string} method GET / POST
 * @param {object} data 请求体（POST 时）
 */12
function request(path, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method: method || 'GET',
      data: data || {},
      header: { 'Content-Type': 'application/json' },
      success(res) {
        // 后端现在有两套返回格式，不能只认 msg === 'success'：
        //   ① 信封式 { msg:'success', data:{...} }  —— /records、/records/stats、/health、/firefly…
        //   ② 裸数据式 { ok:true, time, env, pests… } —— /risk/latest 预测报告，没有 msg / data 外壳
        // 所以判定改为：HTTP 正常 + 有响应体 + 没有显式失败标记
        const body = res.data
        const httpOk = res.statusCode >= 200 && res.statusCode < 300
        const failed = !!(body && (body.ok === false ||
          (typeof body.msg === 'string' && /error|fail|失败|异常/i.test(body.msg))))
        if (httpOk && body && !failed) {
          resolve(body)
        } else {
          reject(new Error((body && (body.msg || body.error)) || ('HTTP ' + res.statusCode)))
        }
      },
      fail(err) {
        reject(new Error('网络请求失败，请检查服务器地址'))
      }
    })
  })
}

/**
 * 原始请求封装：不套 {msg:'success'} 信封的接口用它
 * 适用于 /chat（返回 {answer}）、/spray（返回 {ok,confirm}）、/spray/summary（返回裸汇总对象）
 * @param {string} path 接口路径，如 /chat
 * @param {string} method GET / POST
 * @param {object} data 请求体（POST 时）
 */
function raw(path, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method: method || 'GET',
      data: data || {},
      header: { 'Content-Type': 'application/json' },
      timeout: 160000,   // AI 助手/智能体生成较慢，放宽超时
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data) {
          resolve(res.data)
        } else {
          reject(new Error((res.data && (res.data.error || res.data.msg)) || ('HTTP ' + res.statusCode)))
        }
      },
      fail() {
        reject(new Error('网络请求失败，请检查服务器地址与网络'))
      }
    })
  })
}

/**
 * 上传图片/视频做病虫害检测（POST /firefly）
 * @param {string} filePath 本地临时文件路径
 */
function detectFile(filePath) {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: BASE_URL + '/firefly',
      filePath: filePath,
      name: 'file',
      success(res) {
        try {
          const body = JSON.parse(res.data)
          if (body.msg === 'success') {
            resolve(body.data)
          } else {
            reject(new Error(body.msg || '检测失败'))
          }
        } catch (e) {
          reject(new Error('服务返回格式异常'))
        }
      },
      fail() {
        reject(new Error('上传失败，请检查服务器地址与网络'))
      }
    })
  })
}

/** 拼接完整的结果文件地址（图片/视频展示用） */
function fileUrl(path) {
  return BASE_URL + path
}

module.exports = {
  BASE_URL,
  request,
  raw,
  detectFile,
  fileUrl
}
