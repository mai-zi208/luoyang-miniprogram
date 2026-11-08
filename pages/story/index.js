const { spots, stories } = require('../../data/content')
const { readRecord, writeRecord, failureMessage } = require('../../utils/record')

Page({
  data: {
    spot: null, story: null, imageUrl: '', playing: false, loading: false,
    progress: 0, duration: 0, audioError: '', storageNotice: ''
  },
  onLoad(options) {
    const spot = spots.find(item => item.id === Number(options.id))
    const story = spot && stories.find(item => item.id === spot.storyId)
    if (!story) return
    const progress = Number(readRecord().playProgress[spot.id]) || 0
    this.setData({ spot, story, progress, duration: story.duration, imageUrl: spot.imageUrl || '/assets/placeholder.png' })
  },
  onHide() { this.releaseAudio() },
  onUnload() { this.releaseAudio() },
  usePlaceholder() {
    if (this.data.imageUrl !== '/assets/placeholder.png') this.setData({ imageUrl: '/assets/placeholder.png' })
  },
  togglePlay() {
    if (this.data.loading) return
    if (this.data.playing && this.audio) {
      this.audio.pause()
      return
    }
    if (this.audio) {
      this.beginPlayback(this.audio)
      return
    }
    this.openAudio()
  },
  beginPlayback(audio) {
    this.setData({ loading: true, audioError: '' })
    clearTimeout(this.audioTimer)
    this.audioTimer = setTimeout(() => this.failAudio(audio), 8000)
    audio.play()
  },
  openAudio() {
    const { story, progress } = this.data
    if (!story || !story.audioUrl) {
      this.failAudio(null)
      return
    }
    const audio = wx.createInnerAudioContext()
    this.audio = audio
    // 先设置起播点并绑定事件，再加载资源。回调核对实例，避免旧实例在重试后覆盖界面。
    audio.startTime = progress
    audio.onPlay(() => {
      if (this.audio !== audio) return
      clearTimeout(this.audioTimer)
      this.setData({ playing: true, loading: false })
      this.saveProgress(this.data.progress)
    })
    audio.onTimeUpdate(() => {
      if (this.audio !== audio || !this.data.playing) return
      const position = Math.floor(audio.currentTime)
      if (!Number.isFinite(position) || position < 0 || position === this.data.progress) return
      this.setData({ progress: position, duration: Math.ceil(audio.duration) || this.data.duration })
      this.saveProgress(position)
    })
    audio.onPause(() => {
      if (this.audio !== audio) return
      this.setData({ playing: false })
      this.saveProgress(this.data.progress)
    })
    audio.onEnded(() => {
      if (this.audio !== audio) return
      this.releaseAudio()
      this.setData({ progress: 0 })
      this.saveProgress(0)
    })
    audio.onError(() => this.failAudio(audio))
    audio.src = story.audioUrl
    this.beginPlayback(audio)
  },
  failAudio(audio) {
    if (audio && this.audio !== audio) return
    this.releaseAudio()
    this.setData({ audioError: '故事没加载出来，点这里重试' })
  },
  releaseAudio() {
    clearTimeout(this.audioTimer)
    const audio = this.audio
    if (audio) {
      this.audio = null
      audio.destroy()
    }
    if (this.data.playing || this.data.loading) this.setData({ playing: false, loading: false })
  },
  saveProgress(position) {
    const { spot } = this.data
    const record = readRecord()
    const saved = writeRecord({
      lastSpotId: spot.id,
      playProgress: { ...record.playProgress, [spot.id]: position }
    })
    const storageNotice = saved ? '' : failureMessage
    if (storageNotice !== this.data.storageNotice) this.setData({ storageNotice })
  },
  retrySave() {
    this.setData({ storageNotice: writeRecord({}) ? '' : failureMessage })
  }
})
