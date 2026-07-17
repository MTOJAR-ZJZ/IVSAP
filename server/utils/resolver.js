// === 视频流协议解析工具函数 ===

const PROTOCOLS = {
  RTSP:     { label: 'RTSP',     playable: false, defaultPort: 554 },
  RTMP:     { label: 'RTMP',     playable: false, defaultPort: 1935 },
  'HTTP-FLV': { label: 'HTTP-FLV', playable: true,  defaultPort: 80 },
  HLS:      { label: 'HLS',      playable: true,  defaultPort: 80 },
  WebRTC:   { label: 'WebRTC',   playable: true,  defaultPort: 1985 },
};

/**
 * 根据源地址自动识别协议
 * @param {string} addr - 源地址
 * @returns {{ protocol: string, playable: boolean, playUrl: string|null, streamType: string }}
 */
function resolveStream(addr, mediaServerUrl) {
  if (!addr) return { protocol: '', playable: false, playUrl: null, streamType: 'unknown', message: '地址为空' };

  const url = addr.trim();
  let protocol = '';
  let playable = false;
  let playUrl = null;
  let streamType = 'unknown';
  let message = '';

  // 1. 按 URL scheme 检测
  if (url.startsWith('rtsp://')) {
    protocol = 'RTSP';
    streamType = 'rtsp';
    // RTSP 需要媒体服务器转码
    if (mediaServerUrl) {
      const streamId = url.split('/').pop() || url.replace(/^rtsp:\/\/[^/]+\//, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      playUrl = `${mediaServerUrl}/live/${streamId}.flv`;
      message = `已通过媒体服务器转码为 HTTP-FLV：${playUrl}`;
    } else {
      message = 'RTSP 流需要流媒体服务器（如 SRS/ZLMediaKit）转码后才能播放';
    }
  } else if (url.startsWith('rtmp://')) {
    protocol = 'RTMP';
    streamType = 'rtmp';
    if (mediaServerUrl) {
      const streamId = url.split('/').pop() || url.replace(/^rtmp:\/\/[^/]+\//, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      playUrl = `${mediaServerUrl}/live/${streamId}.flv`;
      message = `已通过媒体服务器转码为 HTTP-FLV：${playUrl}`;
    } else {
      message = 'RTMP 流需要流媒体服务器（如 SRS/ZLMediaKit）转码后才能播放';
    }
  } else if (url.startsWith('webrtc://')) {
    protocol = 'WebRTC';
    streamType = 'webrtc';
    playUrl = url;
    playable = true;
    message = 'WebRTC 流，可直接播放';
  } else if (url.endsWith('.m3u8')) {
    protocol = 'HLS';
    streamType = 'hls';
    playUrl = url;
    playable = true;
    message = 'HLS 流，可直接播放';
  } else if (url.endsWith('.flv') || url.includes('.flv')) {
    protocol = 'HTTP-FLV';
    streamType = 'flv';
    playUrl = url;
    playable = true;
    message = 'HTTP-FLV 流，可直接播放';
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    // HTTP 地址无明确后缀，默认尝试 HTTP-FLV
    protocol = 'HTTP-FLV';
    streamType = 'flv';
    playUrl = url;
    playable = true;
    message = 'HTTP 流，默认尝试 HTTP-FLV 播放';
  } else {
    message = `无法识别的地址格式：${url}`;
  }

  return { protocol, playable, playUrl, streamType, message, addr: url };
}

export { resolveStream, PROTOCOLS };
