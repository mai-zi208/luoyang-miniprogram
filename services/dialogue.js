// 留空时使用本地讲解。真机联调填入自己的 HTTPS 服务地址，密钥只放服务端。
const endpoint = ''

function askGuide(stop, question, history, success, fail) {
  return wx.request({
    url: endpoint,
    method: 'POST',
    timeout: 12000,
    data: { stopId: stop.id, question, history },
    success(result) {
      const answer = result.data && result.data.answer
      if (result.statusCode === 200 && typeof answer === 'string' && answer.trim()) success(answer.trim())
      else fail()
    },
    fail
  })
}

function localAnswer(stop, question, next, route) {
  if (/下一站|路线|顺序|还有几/.test(question)) return '本次游历依次为' + route.map(item => item.name).join('、') + '。' + (next ? '下一站，朕与你去' + next.name + '。' : '此处已是本次最后一站。')
  if (/位置|在哪|怎么走|地图/.test(question)) return '可打开右上方的「游历地图」查看' + stop.name + '的参考点位，再点「我的位置」。'
  if (/传说|传奇|面容|原型/.test(question)) return stop.legend ? '【传说】' + stop.legend : '关于此处的传奇，朕手边还没有可引用的底稿。'
  if (/讲解|故事|历史|介绍|脂粉|大佛|宫城/.test(question)) return stop.story
  return '这个问题，朕手边的讲解资料暂未收录。你可以问此站故事、传说、位置或下一站。'
}

module.exports = { endpoint, askGuide, localAnswer }
