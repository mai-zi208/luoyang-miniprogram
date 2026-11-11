const cues = require('../../data/voice-cues')
const { readRecord, writeRecord, failureMessage } = require('../../utils/record')

Component({
  properties: {
    script: { type: String, value: '' },
    stopId: { type: Number, value: 0, observer(id) {
      this.stop()
      const progress = readRecord().voiceProgress || {}
      this.setData({ position: progress[id] || 0, duration: 0, notice: '' })
    } }
  },
  data: { playing: false, loading: false, mouth: 0, position: 0, duration: 0, notice: '' },
  lifetimes: { detached() { this.dead = true; this.stop() } },
  pageLifetimes: { hide() { if (this.audio && this.data.loading) this.stop(); else if (this.audio && this.data.playing) this.audio.pause() } },
  methods: {
    toggle() {
      const id = this.properties.stopId
      if (!cues[id] || this.data.loading) return
      if (this.audio && this.data.playing) { this.audio.pause(); return }
      if (!this.audio) this.prepare(id)
      this.setData({ loading: true, notice: '' })
      this.timeout = setTimeout(() => this.failed(), 8000)
      this.audio.play()
    },
    prepare(id) {
      const audio = wx.createInnerAudioContext()
      this.audio = audio
      audio.startTime = this.data.position
      audio.onPlay(() => {
        if (this.audio !== audio) return
        clearTimeout(this.timeout)
        this.setData({ playing: true, loading: false })
        this.sync(id, audio)
      })
      audio.onPause(() => {
        if (this.audio !== audio) return
        clearTimeout(this.clock)
        this.save(id, audio.currentTime)
        this.setData({ playing: false, loading: false, mouth: 0 })
      })
      audio.onEnded(() => {
        if (this.audio !== audio) return
        this.stop()
        this.save(id, 0)
      })
      audio.onError(() => { if (this.audio === audio) this.failed() })
      audio.src = '/assets/voice-' + id + '.mp3'
    },
    sync(id, audio) {
      if (this.audio !== audio || !this.data.playing) return
      // 使用实际播放器的时间定位每 40 毫秒一帧的开合数据。
      const time = audio.currentTime || 0
      const mouth = Number(cues[id][Math.floor(time * 25)]) || 0
      const duration = Math.floor(audio.duration) || 0
      if (this.data.mouth !== mouth || this.data.duration !== duration) {
        this.setData({ mouth, duration })
      }
      const position = Math.floor(time)
      if (position !== this.data.position) this.save(id, time)
      this.clock = setTimeout(() => this.sync(id, audio), 40)
    },
    save(id, time) {
      const position = Math.max(0, Math.floor(time || 0))
      const progress = readRecord().voiceProgress || {}
      const saved = writeRecord({ lastSpotId: id, voiceProgress: { ...progress, [id]: position } })
      if (!this.dead) this.setData({ position, notice: saved ? '' : failureMessage })
    },
    stop() {
      clearTimeout(this.timeout)
      clearTimeout(this.clock)
      const audio = this.audio
      this.audio = null
      if (audio) audio.destroy()
      if (!this.dead) this.setData({ playing: false, loading: false, mouth: 0 })
    },
    failed() {
      this.stop()
      this.setData({ notice: '语音暂时没加载出来，请点按钮重试。' })
    }
  }
})
