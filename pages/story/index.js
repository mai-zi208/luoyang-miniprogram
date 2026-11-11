const { resolveStops } = require('../../data/tour')

// 底稿是政府与文保网站的原文链接，小程序内无法直接打开外部域名，改为展示站点并复制全文。
const hostOf = url => String(url || '').replace(/^https?:\/\//, '').split('/')[0]

Page({
  data: { stop: null, sourceHost: '', legendHost: '' },
  onLoad(options) {
    const [stop] = resolveStops([options.id])
    if (!stop) return
    this.setData({
      stop,
      sourceHost: stop.source ? hostOf(stop.source) : '',
      legendHost: stop.legendSource ? hostOf(stop.legendSource) : ''
    })
  },
  // setClipboardData 自带成功提示，不再叠加 toast。
  copySource(event) {
    const url = event.currentTarget.dataset.url
    if (/^https?:\/\//.test(url)) wx.setClipboardData({ data: url })
  }
})
