// 坐标为原型定位值，使用微信地图所需的 GCJ-02 坐标系，投用前需逐点核对。
const spots = [
  { id: 1, name: '应天门', latitude: 34.6802, longitude: 112.4650 },
  { id: 2, name: '明堂', latitude: 34.6863, longitude: 112.4650 },
  { id: 3, name: '天堂', latitude: 34.6871, longitude: 112.4645 },
  { id: 4, name: '九洲池', latitude: 34.6862, longitude: 112.4588 },
  { id: 5, name: '定鼎门（候选）', latitude: 34.6321, longitude: 112.4614 }
].map(spot => ({
  ...spot,
  intro: '这里的讲解待补充，点击查看试听样例。',
  imageUrl: '/assets/placeholder.png',
  storyId: 'story-' + spot.id
}))

// pending 表示尚未审核。补齐资料后再改为 history 或 legend，勿用占位内容充当史实。
const stories = spots.map(spot => ({
  id: spot.storyId,
  spotId: spot.id,
  title: spot.name + ' · 故事待补充',
  type: 'pending',
  audioUrl: '/assets/demo.mp3',
  demo: true,
  text: '待补充，需人工审核史实。当前图片与音频用于演示，音频为测试提示音。',
  duration: 12
}))

// 时长为界面测试值。故事数量按景点关联数据计算，避免配置修改后数量过期。
const routes = [
  { id: 'gate', name: '从应天门出发', budget: 'halfDay', totalDuration: '约 3 小时', spotIds: [1, 2, 3] },
  { id: 'garden', name: '从九洲池出发', budget: 'halfDay', totalDuration: '约 4 小时', spotIds: [4, 2, 3] },
  { id: 'central', name: '城中四站', budget: 'oneDay', totalDuration: '约 6 小时', spotIds: [1, 2, 3, 4] },
  { id: 'south', name: '南北五站', budget: 'oneDay', totalDuration: '约 7 小时', spotIds: [5, 1, 2, 3, 4] },
  { id: 'reverse', name: '从九洲池到定鼎门', budget: 'oneDay', totalDuration: '约 7 小时', spotIds: [4, 3, 2, 1, 5] }
].map(route => {
  const stops = route.spotIds.map(id => spots.find(spot => spot.id === id)).filter(Boolean)
  return { ...route, stops, storyCount: stops.filter(spot => stories.some(story => story.id === spot.storyId)).length }
})

module.exports = { spots, stories, routes }
