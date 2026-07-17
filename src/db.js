/* ========================================
   Stream Analyzer — 数据库层
   所有业务数据集中管理，各页面通过 window.DB 访问
   ======================================== */

window.DB = {
  streams: [
    { id: 'S001', name: '001', addr: 'http://localhost:8000/live/stream.flv', playUrl: 'http://localhost:8000/live/stream.flv', protocol: 'HTTP-FLV', res: '1080P', fps: 25, codec: 'H.264', status: 'online', captureInterval: 5, createdAt: '2026-07-14 09:00' },
    { id: 'S002', name: '仓库A区东侧', addr: 'rtsp://192.168.1.11:554/stream2', playUrl: 'http://localhost:8000/live/stream2.flv', protocol: 'RTSP', res: '1080P', fps: 25, codec: 'H.265', status: 'online', captureInterval: 3, createdAt: '2026-07-14 09:05' },
    { id: 'S003', name: '厂房西门通道', addr: 'rtmp://192.168.1.12/live/stream3', playUrl: '', protocol: 'RTMP', res: '720P', fps: 30, codec: 'H.264', status: 'offline', captureInterval: 5, createdAt: '2026-07-13 14:00' },
    { id: 'S004', name: '停车场监控', addr: 'rtsp://192.168.1.13:554/stream4', playUrl: '', protocol: 'RTSP', res: '1080P', fps: 25, codec: 'H.264', status: 'error', captureInterval: 10, createdAt: '2026-07-13 10:30' },
    { id: 'S005', name: '办公楼大厅', addr: 'http://localhost:8080/live/stream5.flv', playUrl: 'http://localhost:8000/live/stream5.flv', protocol: 'HTTP-FLV', res: '720P', fps: 15, codec: 'H.264', status: 'online', captureInterval: 5, createdAt: '2026-07-12 16:00' },
    { id: 'S006', name: '研发中心走廊', addr: 'rtsp://192.168.1.15:554/stream6', playUrl: '', protocol: 'RTSP', res: '1080P', fps: 25, codec: 'H.265', status: 'online', captureInterval: 3, createdAt: '2026-07-12 11:00' },
    { id: 'S007', name: '食堂后厨', addr: 'rtsp://192.168.1.16:554/stream7', playUrl: 'https://live.example.com/hls/stream7.m3u8', protocol: 'HLS', res: '1080P', fps: 25, codec: 'H.264', status: 'online', captureInterval: 5, createdAt: '2026-07-15 09:00' },
    { id: 'S008', name: '实验楼A座', addr: 'rtsp://192.168.1.17:554/stream8', playUrl: 'webrtc://192.168.1.100:1985/live/stream8', protocol: 'WebRTC', res: '4K', fps: 30, codec: 'H.265', status: 'online', captureInterval: 5, createdAt: '2026-07-15 09:00' },
  ],

  detections: [
    { id: 'D001', name: '周界入侵检测-北门', stream: '园区北门主入口', dataType: '实时视频流', algo: '人员入侵', roi: '多边形(8点)', sensitivity: 0.75, status: 'running', createdAt: '2026-07-14 09:10' },
    { id: 'D002', name: '仓库烟火监测', stream: '仓库A区东侧', dataType: '实时视频流', algo: '烟火检测', roi: '矩形', sensitivity: 0.65, status: 'running', createdAt: '2026-07-14 09:10' },
    { id: 'D003', name: '厂房区域越界', stream: '厂房西门通道', dataType: '实时视频流', algo: '区域越界', roi: '矩形+排除区域', sensitivity: 0.8, status: 'stopped', createdAt: '2026-07-13 14:30' },
    { id: 'D004', name: '停车场物品遗留', stream: '停车场监控', dataType: '实时视频流', algo: '物品遗留', roi: '多边形(6点)', sensitivity: 0.7, status: 'running', createdAt: '2026-07-13 10:45' },
  ],

  alerts: [
    { id: 'A001', stream: '园区北门主入口', type: '人员入侵', confidence: 92, status: 'pending', time: '2026-07-14 14:52:03', img: '📷', note: '' },
    { id: 'A002', stream: '仓库A区东侧', type: '烟火检测', confidence: 87, status: 'pending', time: '2026-07-14 14:48:15', img: '📷', note: '' },
    { id: 'A003', stream: '园区北门主入口', type: '人员入侵', confidence: 65, status: 'ignored', time: '2026-07-14 14:30:00', img: '📷', note: '树叶晃动' },
    { id: 'A004', stream: '停车场监控', type: '物品遗留', confidence: 95, status: 'confirmed', time: '2026-07-14 13:15:22', img: '📷', note: '可疑包裹已清理' },
    { id: 'A005', stream: '办公楼大厅', type: '区域越界', confidence: 78, status: 'pending', time: '2026-07-14 12:00:00', img: '📷', note: '' },
    { id: 'A006', stream: '仓库A区东侧', type: '烟火检测', confidence: 45, status: 'false', time: '2026-07-14 10:20:00', img: '📷', note: '施工灰尘' },
    { id: 'A007', stream: '园区北门主入口', type: '人员入侵', confidence: 88, status: 'pending', time: '2026-07-14 09:05:00', img: '📷', note: '' },
    { id: 'A008', stream: '研发中心走廊', type: '区域越界', confidence: 72, status: 'confirmed', time: '2026-07-13 22:30:00', img: '📷', note: '加班人员进入' },
  ],

  tickets: [
    { id: 'WO-20260714-00001', title: '北门人员入侵告警', priority: 'high', status: 'processing', assignee: '张工', alerts: ['A001'], sla: '剩余 22min', createdAt: '2026-07-14 14:52', desc: '', photos: [] },
    { id: 'WO-20260714-00002', title: '仓库A区烟雾告警', priority: 'high', status: 'pending_assign', assignee: '-', alerts: ['A002'], sla: '-', createdAt: '2026-07-14 14:48', desc: '', photos: [] },
    { id: 'WO-20260714-00003', title: '停车场可疑包裹处置', priority: 'mid', status: 'review', assignee: '李工', alerts: ['A004'], sla: '剩余 1h 12min', createdAt: '2026-07-14 13:15', desc: '已清理可疑包裹，现场无异常', photos: ['📸1'] },
    { id: 'WO-20260713-00004', title: '研发中心晚间越界', priority: 'low', status: 'closed', assignee: '王工', alerts: ['A008'], sla: '已完成', createdAt: '2026-07-13 22:30', desc: '确认为加班人员，已登记', photos: [] },
    { id: 'WO-20260713-00005', title: '北门人员入侵(低置信)', priority: 'low', status: 'closed', assignee: '张工', alerts: ['A003'], sla: '已完成', createdAt: '2026-07-13 14:30', desc: '树叶晃动误报，已忽略', photos: [] },
  ],

  users: [
    { id: 'U001', name: '管理员', account: 'admin', dept: '信息技术部', role: '系统管理员', phone: '13800001111', email: 'admin@sa.com', status: 'active' },
    { id: 'U002', name: '张工', account: 'zhang', dept: '运维部-一值班组', role: '值班人员', phone: '13800001122', email: 'zhang@sa.com', status: 'active' },
    { id: 'U003', name: '李工', account: 'li', dept: '运维部-一值班组', role: '值班人员', phone: '13800001133', email: 'li@sa.com', status: 'active' },
    { id: 'U004', name: '王工', account: 'wang', dept: '运维部-二值班组', role: '值班人员', phone: '13800001144', email: 'wang@sa.com', status: 'active' },
    { id: 'U005', name: '赵主管', account: 'zhao', dept: '运维部', role: '运维主管', phone: '13800001155', email: 'zhao@sa.com', status: 'active' },
    { id: 'U006', name: '刘工', account: 'liu', dept: '运维部-二值班组', role: '值班人员', phone: '13800001166', email: 'liu@sa.com', status: 'disabled' },
  ],

  roles: [
    { id: 'R001', name: '系统管理员', preset: true, perms: ['dashboard','streams','detection','algorithms','alerts','tickets','users','system'] },
    { id: 'R002', name: '运维主管', preset: true, perms: ['dashboard','streams','detection','algorithms','alerts','tickets','users'] },
    { id: 'R003', name: '值班人员', preset: true, perms: ['dashboard','alerts','tickets'] },
    { id: 'R004', name: '业务分析师', preset: true, perms: ['dashboard','alerts'] },
  ],

  depts: [
    { id: 'DEPT1', name: '信息技术部', children: [] },
    { id: 'DEPT2', name: '运维部', children: [
      { id: 'DEPT2-1', name: '一值班组', children: [] },
      { id: 'DEPT2-2', name: '二值班组', children: [] },
    ]},
  ],

  // 算法类型管理（每个算法关联提示词）
  algoTypes: [
    { name: '人员入侵', prompt: '检测画面中是否有人员闯入禁区，描述闯入者的位置、数量和行为。' },
    { name: '烟火检测', prompt: '检测画面中是否有火焰或烟雾，描述火势大小、烟雾颜色和具体位置。' },
    { name: '物品遗留', prompt: '检测画面中是否有被遗留的物品，描述物品类型、大小和位置。' },
    { name: '区域越界', prompt: '检测画面中是否有人员或物体越过设定的边界线，描述越界方向和目标。' },
  ],

  // 大模型接口管理（全局共享，所有算法共用）
  apiModels: [
    { id: 'M001', name: 'GPT-4o', provider: 'OpenAI', apiUrl: 'https://api.openai.com/v1/chat/completions', apiKey: '', isDefault: true },
    { id: 'M002', name: '通义千问', provider: '阿里云', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', apiKey: '', isDefault: false },
    { id: 'M003', name: 'DeepSeek-V3', provider: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1/chat/completions', apiKey: '', isDefault: false },
  ],

  schedules: [
    { year: 2026, month: 7, date: 14, name: '张工', shift: '早班 08-16' },
    { year: 2026, month: 7, date: 14, name: '李工', shift: '中班 16-00' },
    { year: 2026, month: 7, date: 15, name: '王工', shift: '早班 08-16' },
    { year: 2026, month: 7, date: 15, name: '刘工', shift: '夜班 00-08' },
    { year: 2026, month: 7, date: 16, name: '张工', shift: '中班 16-00' },
  ],

  // 工单分配完成日志（按每天时间表划分）
  ticketLogs: [
    { date: '2026-07-14', shift: '早班 08-16', operator: '张工', action: '分配 WO-20260714-00001 给张工', time: '14:52' },
    { date: '2026-07-14', shift: '早班 08-16', operator: '张工', action: '分配 WO-20260714-00002 给李工', time: '14:50' },
    { date: '2026-07-14', shift: '中班 16-00', operator: '李工', action: '验收通过 WO-20260714-00003', time: '15:10' },
    { date: '2026-07-13', shift: '中班 16-00', operator: '李工', action: '驳回 WO-20260713-00004', time: '23:45' },
    { date: '2026-07-13', shift: '早班 08-16', operator: '张工', action: '关闭 WO-20260713-00005', time: '15:30' },
  ],

  // 系统配置
  config: {
    logRetentionDays: 90,
    screenshotRetentionDays: 7,
    websocketHeartbeat: 30,
    globalSensitivity: 0.65,
  },
};

// ===================== 数据持久化 =====================
// 所有数据通过后端 API 写入数据库，前端不做本地持久化
// window.DB._save 保留为空函数，兼容旧代码调用

window.DB._save = function() {};

// 页面关闭时不做额外操作（数据库负责持久化）
