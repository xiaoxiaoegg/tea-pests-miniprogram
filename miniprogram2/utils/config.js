// utils/config.js ? backend address (LAN)
// All APIs (detect/records/risk/advice) go through this single LAN address.
// If the server IP changes, edit BASE_URL below and recompile in WeChat DevTools.
const BASE_URL = 'http://192.168.1.100:26711'

module.exports = { BASE_URL }
