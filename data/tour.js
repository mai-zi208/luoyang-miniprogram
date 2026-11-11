// 讲解短稿以公开资料为底稿，第一人称只用于角色串场。坐标为原型参考，正式导览需核对。
const park = 'https://www.ly.gov.cn/public-jc/2024/06/13/6103.html'
const heritage = 'https://www.ndrc.gov.cn/xwdt/ztzl/dyhgjwhgy/202010/t20201021_1301702_ext.html'
const stops = [
  { id: 1, name: '应天门', latitude: 34.6802, longitude: 112.4650, story: '且随朕先看应天门。它和明堂、天堂、九洲池都在隋唐洛阳城的宫城区。站在这座门前，不妨想一想，宫城的尺度是如何被一扇门展示出来的。', source: park, era: '应天门始建于隋大业元年（605），是隋唐洛阳城宫城的正门，门上三重楼观曾称紫微观。唐末毁于战火，遗址长期埋于地下；1980 年代起经考古发掘，2016 年在遗址上建成保护性展示建筑，门阙轮廓重新回到城市天际线。', nearby: [{ kind: '食', text: '老城十字街夜市：不翻汤、水席小份菜，汤馆多傍晚开市。' }, { kind: '游', text: '丽景门城楼与洛邑古城夜游，与遗址同处老城一片。' }] },
  { id: 2, name: '明堂', latitude: 34.6863, longitude: 112.4650, story: '随朕看明堂。在朕执政的时期，明堂是洛阳最重要的宫殿建筑之一。你若与天堂一同看，会发现两处建筑各有用途，也各有气象。', source: park, era: '明堂为武周布政之宫，号万象神宫，证圣元年毁于火后重建为通天宫。北宋以后渐废，遗址于 20 世纪下半叶经考古确认，其上建成遗址保护展示厅，中心柱坑作原状陈列。', nearby: [{ kind: '食', text: '西工一带的浆面条、糊涂面等本地小吃铺子集中。' }, { kind: '游', text: '与天堂同属隋唐洛阳城国家遗址公园，可联游。' }] },
  { id: 3, name: '天堂', latitude: 34.6871, longitude: 112.4645, story: '抬头看，这是天堂。朕在洛阳的这处内道场是楼阁式建筑，里面曾供奉一尊巨大的夹纻佛像。且把它与方才的明堂放在一起看，便能领会两处建筑的不同。', source: heritage, era: '天堂是宫城内供奉佛像的高阁，记载中层数甚高、可俯视明堂，唐末与明堂同毁。今遗址上建有保护性展示建筑，登临其上可北望宫城轴线。', nearby: [{ kind: '食', text: '景区周边水席馆子集中，宜先订座。' }, { kind: '游', text: '与明堂同园，夜场灯光下两阁相望。' }] },
  { id: 4, name: '九洲池', latitude: 34.6862, longitude: 112.4588, story: '到九洲池，且随朕放慢脚步。这里是隋唐宫城内的一处御苑，皇室曾在这里居住、宴游。读懂一座宫城，也要看看它的池水与园林。', source: heritage, era: '九洲池为宫城御苑池沼，唐末淤废。20 世纪末以来的考古发掘理清了池岸与岛屿格局，遗址公园以水面复原苑囿气象。', nearby: [{ kind: '食', text: '老城西关一带汤馆与水席老店步行可至。' }, { kind: '游', text: '池畔夜游与演艺活动不定期举行，行前可查当期安排。' }] },
  { id: 5, name: '龙门石窟奉先寺', short: '奉先寺', latitude: 34.5555, longitude: 112.4711, story: '随朕到伊水边看奉先寺。像龛记记下朕为皇后时，曾出脂粉钱两万贯助造。你眼前的卢舍那像龛，在唐高宗上元二年完工。', source: 'https://ir.pku.edu.cn/handle/20.500.11897/581545?mode=full', legend: '民间传说卢舍那大佛依朕的面容雕成。此说流传甚广，现有材料能确认的是出资记录，面容原型仍无定论。', legendSource: 'https://www.edb.gov.hk/attachment/sc/curriculum-development/kla/pshe/references-and-resources/ethics-and-religious-studies/ch9_sc.pdf', era: '奉先寺像龛开凿于唐高宗时期，上元二年完工，属皇家功德。宋以后屡经风化与盗损，20 世纪中叶起加固保护，2000 年随龙门石窟列入世界遗产名录。', nearby: [{ kind: '食', text: '龙门古街与关林一带餐馆集中，宜顺路用餐。' }, { kind: '游', text: '伊河对岸可望西山全景，关林庙可同线安排。' }] },
  { id: 6, name: '上阳宫', latitude: 34.6597, longitude: 112.4342, story: '随朕把目光移到洛河北岸。上阳宫遗址就在这一带。关于宫中的具体人物故事，朕手边的底稿还有待补充。', source: 'https://www.fymate.net/html/text/lar/170419/17041965_1.html', era: '上阳宫为高宗以后帝后常居的别宫，唐末毁废。今洛河北岸一带建有上阳宫文化园，以园林示意旧时宫苑的位置与尺度。', nearby: [{ kind: '食', text: '西工商业圈餐馆集中，午市选择多。' }, { kind: '游', text: '洛浦公园沿河步道与文化园相连，宜散步衔接。' }] },
  { id: 7, name: '定鼎门天街', short: '定鼎门', latitude: 34.6321, longitude: 112.4614, story: '请从定鼎门向北望。这里是外郭城的正南门，北面的天街是洛阳城中轴线上的干道。随朕循着这条轴线看去，就能读到古城的布局。', source: 'https://www.orgcc.cn/site/6.html', era: '定鼎门为外郭城正南门，门北天街是城中轴线干道，宽度逾百米。遗址经考古发掘后建成博物馆，门道与车辙痕迹作原状展示。', nearby: [{ kind: '食', text: '洛龙区关林一带夜市与汤馆，晚间热闹。' }, { kind: '游', text: '隋唐城遗址植物园春秋季花事，与遗址博物馆相邻。' }] }
]
const durations = [{ count: 3, title: '半日轻游' }, { count: 5, title: '一日漫游' }, { count: 7, title: '深度寻访' }]

function resolveStops(ids) {
  // 页面参数也可能被手工修改，统一过滤非法值、去重，并保留用户勾选顺序。
  return [...new Set(ids.map(Number))].map(id => stops.find(stop => stop.id === id)).filter(Boolean)
}

module.exports = { stops, durations, resolveStops }
