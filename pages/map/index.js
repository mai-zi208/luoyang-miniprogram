const { resolveStops, stops } = require('../../data/tour')
const { bind, BEAT } = require('../../utils/motion')

Page({
  data: { route: [], points: [], markers: [], active: null, activeNo: 0, latitude: 34.66, longitude: 112.46, visible: true, mapNotice: '', locating: false, canOpenSettings: false, notice: '', flipping: false },
  onLoad(options) {
    this.motion = bind(this)
    const selected = resolveStops((options.ids || '').split(','))
    const route = selected.length ? selected : stops
    this.baseMarkers = route.map(({ id, name, latitude, longitude }) => ({
      id, latitude, longitude, title: name, iconPath: '/assets/marker.png', width: 22, height: 28
    }))
    this.setData({ route, markers: this.baseMarkers, points: route.map(({ latitude, longitude }) => ({ latitude, longitude })) })
    this.watchMap()
  },
  watchMap() {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.setData({ mapNotice: '地图加载有点慢，点此重试' }), 9000)
  },
  ready() { clearTimeout(this.timer); if (this.data.visible && this.data.mapNotice) this.setData({ mapNotice: '' }) },
  mapError() { clearTimeout(this.timer); this.setData({ visible: false, mapNotice: '地图没加载出来，点此重试' }) },
  retryMap() {
    clearTimeout(this.remount)
    this.setData({ visible: false, mapNotice: '' })
    this.remount = setTimeout(() => { this.setData({ visible: true }); this.watchMap() }, 100)
  },
  onUnload() { this.closed = true; this.motion.kill(); clearTimeout(this.timer); clearTimeout(this.remount) },
  selectMarker(event) {
    if (event.detail.markerId === 99) return this.setData({ active: null, notice: '蓝色标记为你的位置。' })
    this.setActive(event.detail.markerId)
  },
  selectStop(event) {
    const stop = this.data.route.find(item => item.id === Number(event.currentTarget.dataset.id))
    if (!stop) return
    this.setActive(stop.id)
    if (this.data.visible) wx.createMapContext('tour-map', this).moveToLocation(stop)
  },
  setActive(id) {
    const index = this.data.route.findIndex(stop => stop.id === Number(id))
    if (index < 0) return this.setData({ active: null, activeNo: 0 })
    // 面板内容每次换点位重放一遍浮起，让「点谁看谁」有落点而不是只做文字替换。
    this.setData({ active: this.data.route[index], activeNo: index + 1, flipping: true })
    this.motion.cue([{ gap: BEAT.flip, run: () => this.setData({ flipping: false }) }])
  },
  locate() {
    if (this.data.locating) return
    this.setData({ locating: true, notice: '', canOpenSettings: false })
    // 仅在游客主动点击时请求权限，坐标只用于当前地图标注。
    wx.getLocation({
      type: 'gcj02',
      success: ({ latitude, longitude }) => {
        if (this.closed) return
        const position = { latitude, longitude }
        this.setData({
          markers: [...this.baseMarkers, { id: 99, ...position, iconPath: '/assets/location.png', width: 24, height: 24, title: '我的位置' }],
          notice: '蓝色标记为你的位置。'
        }, () => { if (this.data.visible) wx.createMapContext('tour-map', this).moveToLocation(position) })
      },
      fail: error => {
        if (this.closed) return
        const denied = /deny|denied|auth|permission/.test(error.errMsg || '')
        this.setData({ canOpenSettings: denied, notice: denied ? '请在微信设置中允许定位，或直接查看景点。' : '暂时无法获取位置，请检查定位服务后重试。' })
      },
      complete: () => { if (!this.closed) this.setData({ locating: false }) }
    })
  },
  openSettings() {
    wx.openSetting({ success: result => { if (result.authSetting['scope.userLocation']) this.locate() } })
  },
  goStory() {
    if (!this.data.active) return
    wx.navigateTo({ url: '/pages/story/index?id=' + this.data.active.id })
  }
})
