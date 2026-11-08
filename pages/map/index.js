const { spots, routes } = require('../../data/content')
const { readRecord, writeRecord, failureMessage } = require('../../utils/record')

Page({
  data: {
    latitude: 34.6758,
    longitude: 112.4645,
    markers: spots.map(spot => ({
      id: spot.id, latitude: spot.latitude, longitude: spot.longitude,
      iconPath: '/assets/marker.png', width: 26, height: 32,
      title: spot.name
    })),
    mapVisible: true, mapFailed: false, mapSlow: false,
    activeSpot: null, showRoutes: false, budget: 'halfDay', routeCards: [],
    selectedRouteId: '', savedRoute: null, lastSpot: null, storageNotice: ''
  },
  onLoad() {
    this.filterRoutes('halfDay')
    this.watchMap()
  },
  onShow() {
    const record = readRecord()
    const savedRoute = routes.find(route => route.id === record.selectedRouteId) || null
    this.setData({
      savedRoute,
      selectedRouteId: record.selectedRouteId,
      lastSpot: spots.find(spot => spot.id === record.lastSpotId) || null
    })
  },
  onUnload() {
    clearTimeout(this.mapTimer)
    clearTimeout(this.remountTimer)
  },
  watchMap() {
    clearTimeout(this.mapTimer)
    // 等待地图首次渲染，网络慢时给出可操作的重试入口。
    this.mapTimer = setTimeout(() => this.setData({ mapSlow: true }), 9000)
  },
  mapReady() {
    clearTimeout(this.mapTimer)
    if (!this.data.mapFailed) this.setData({ mapSlow: false })
  },
  mapError() {
    clearTimeout(this.mapTimer)
    this.setData({ mapFailed: true, mapSlow: false, mapVisible: false })
  },
  retryMap() {
    clearTimeout(this.remountTimer)
    clearTimeout(this.mapTimer)
    this.setData({ mapVisible: false, mapFailed: false, mapSlow: false })
    this.remountTimer = setTimeout(() => {
      this.setData({ mapVisible: true })
      this.watchMap()
    }, 120)
  },
  showSpot(event) {
    const activeSpot = spots.find(spot => spot.id === Number(event.detail.markerId))
    if (activeSpot) this.setData({ activeSpot })
  },
  closeSpot() { this.setData({ activeSpot: null }) },
  toggleRoutes() {
    this.setData({ showRoutes: !this.data.showRoutes, activeSpot: null })
    if (!this.data.showRoutes) return
    wx.pageScrollTo({ selector: '#routes', duration: 200 })
  },
  changeBudget(event) { this.filterRoutes(event.currentTarget.dataset.budget) },
  filterRoutes(budget) {
    this.setData({ budget, routeCards: routes.filter(route => route.budget === budget) })
  },
  selectRoute(event) {
    const route = routes.find(item => item.id === event.currentTarget.dataset.id)
    if (!route) return
    this.persistRoute(route)
  },
  persistRoute(route) {
    const saved = writeRecord({ selectedRouteId: route.id })
    this.setData({ selectedRouteId: route.id, savedRoute: route, storageNotice: saved ? '' : failureMessage })
  },
  retrySave() {
    this.setData({ storageNotice: writeRecord({}) ? '' : failureMessage })
  },
  openSpot(event) {
    const { spot, route } = event.currentTarget.dataset
    const selected = routes.find(item => item.id === route)
    if (selected) this.persistRoute(selected)
    // 导航期间忽略重复点击，避免在页面栈里打开多份相同故事。
    if (this.openingSpot) return
    this.openingSpot = true
    wx.navigateTo({
      url: '/pages/story/index?id=' + Number(spot),
      fail: () => wx.showToast({ title: '故事页没打开，点景点再试', icon: 'none' }),
      complete: () => { this.openingSpot = false }
    })
  }
})
