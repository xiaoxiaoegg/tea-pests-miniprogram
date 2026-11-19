// utils/class_zh.js — 模型英文类名 → 中文显示映射（全端统一口径）
// 与训练 data.yaml 的 names 顺序一一对应，共 8 类
const CLASS_ZH = {
  'Black rot of tea': '茶叶黑腐病',
  'Brown blight of tea': '茶叶褐斑病',
  'Leaf rust of tea': '茶叶锈病',
  'Red Spider infested tea leaf': '红蜘蛛危害茶叶',
  'Tea Mosquito bug infested leaf': '茶蚊虫危害茶叶',
  'Tea leaf': '健康茶叶',
  'White spot of tea': '茶叶白斑病',
  'disease': '其他病害'
}

const HEALTHY = '健康茶叶'

module.exports = { CLASS_ZH, HEALTHY }
