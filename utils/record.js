const key = 'luoyang-visit-v1'
const emptyRecord = { selectedRouteId: '', lastSpotId: 0, playProgress: {} }
const failureMessage = '记录没保存上，不影响继续使用'
let pending = {}

function readRecord() {
  try {
    return { ...emptyRecord, ...wx.getStorageSync(key), ...pending }
  } catch (error) {
    return { ...emptyRecord, ...pending }
  }
}

function writeRecord(patch) {
  // 每次写入前合并已有记录，避免选路线时覆盖各景点的播放进度。
  // 写入失败时留在内存里，下次写入或手动重试时一起提交。
  pending = { ...readRecord(), ...patch }
  try {
    wx.setStorageSync(key, pending)
    pending = {}
    return true
  } catch (error) {
    return false
  }
}

module.exports = { readRecord, writeRecord, failureMessage }
