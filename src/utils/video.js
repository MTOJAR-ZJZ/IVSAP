/* ========================================
   Stream Analyzer — Unified Video Player
   支持 HTTP-FLV / HLS / WebRTC 统一播放
   ======================================== */

function isDemoUrl(url) {
  if (!url) return true;
  try { const u = new URL(url); return u.hostname === 'localhost' || u.hostname === '127.0.0.1'; }
  catch { return true; }
}

function detectPlayerType(stream) {
  if (stream.playerType) return stream.playerType;
  const url = stream.playUrl || stream.addr || '';
  if (!url) return 'none';
  // 1. 按 URL 内容判断
  if (url.endsWith('.m3u8')) return 'hls';
  if (url.startsWith('webrtc://')) return 'webrtc';
  if (url.endsWith('.flv') || url.includes('.flv')) return 'flv';
  if (url.startsWith('rtsp://') || url.startsWith('rtmp://')) return 'none';
  // 2. 按协议字段辅助判断
  if (stream.protocol === 'HTTP-FLV') return 'flv';
  if (stream.protocol === 'HLS') return 'hls';
  if (stream.protocol === 'WebRTC') return 'webrtc';
  // 3. HTTP URL 默认尝试 FLV 播放
  if (url.startsWith('http')) return 'flv';
  return 'none';
}

function getPlayUrl(stream) {
  return stream.playUrl || stream.addr || '';
}

// --- FLV ---
function playFLV(container, url) {
  if (typeof flvjs === 'undefined') {
    container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">flv.js 未加载</div>';
    return;
  }
  if (!flvjs.isSupported()) {
    container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">浏览器不支持 FLV</div>';
    return;
  }
  const video = document.createElement('video');
  video.style.cssText = 'width:100%;height:100%;object-fit:cover';
  video.muted = true; video.autoplay = true; video.playsInline = true;
  container.innerHTML = ''; container.appendChild(video);
  let retryCount = 0;
  const maxRetries = 3;
  function tryPlay() {
    const player = flvjs.createPlayer({ type: 'flv', isLive: true, url });
    player.attachMediaElement(video);
    player.onerror = () => {
      retryCount++;
      if (retryCount < maxRetries) {
        player.destroy();
        setTimeout(tryPlay, Math.min(1000 * Math.pow(2, retryCount), 8000));
      } else {
        container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">FLV 播放失败</div>';
      }
    };
    try { player.load(); player.play(); } catch(e) { player.onerror(); }
  }
  tryPlay();
  container.style.cursor = 'pointer';
  container.onclick = () => video.requestFullscreen?.();
}

// --- HLS ---
function playHLS(container, url) {
  const video = document.createElement('video');
  video.style.cssText = 'width:100%;height:100%;object-fit:cover';
  video.muted = true; video.autoplay = true; video.playsInline = true;
  container.innerHTML = ''; container.appendChild(video);
  if (typeof Hls !== 'undefined' && Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (e, d) => {
      if (d.fatal) container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">HLS 播放失败</div>';
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
  } else {
    container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">浏览器不支持 HLS</div>';
    return;
  }
  container.style.cursor = 'pointer';
  container.onclick = () => video.requestFullscreen?.();
}

// --- WebRTC ---
function playWebRTC(container, stream) {
  const url = stream.playUrl || stream.addr || '';
  const video = document.createElement('video');
  video.style.cssText = 'width:100%;height:100%;object-fit:cover';
  video.muted = true; video.autoplay = true; video.playsInline = true;
  if (isDemoUrl(url)) {
    container.innerHTML = '🔄<div style="font-size:12px;margin-top:4px;color:#999">WebRTC · 本地演示</div>';
    container.style.cursor = 'default'; return;
  }
  container.innerHTML = ''; container.appendChild(video);
  let signalingUrl;
  try { const u = new URL(url.replace('webrtc://', 'http://')); signalingUrl = `http://${u.host}/rtc/v1/play/`; }
  catch { signalingUrl = url; }
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  pc.ontrack = (event) => { if (event.streams[0]) video.srcObject = event.streams[0]; };
  pc.createOffer().then(offer => pc.setLocalDescription(offer)).then(() => {
    setTimeout(() => {
      const desc = pc.localDescription; if (!desc) return;
      fetch(signalingUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api: 'play', streamurl: url, sdp: desc.sdp, type: desc.type }),
      }).then(r => r.json()).then(data => {
        if (data.code === 0 && data.sdp) pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
        else container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">信令服务拒绝</div>';
      }).catch(() => { container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">WebRTC 连接失败</div>'; });
    }, 500);
  }).catch(() => { container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">WebRTC 初始化失败</div>'; });
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')
      container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">WebRTC 连接断开</div>';
  };
  container.style.cursor = 'pointer';
  container.onclick = () => video.requestFullscreen?.();
}

// --- 统一入口 ---
function initVideoPlayers() {
  document.querySelectorAll('.video-player[data-stream]').forEach(container => {
    const streamId = container.dataset.stream;
    if (!streamId || container.dataset.videoInited) return;
    container.dataset.videoInited = '1';
    const stream = window.DB.streams.find(s => s.id === streamId);
    if (!stream) { container.innerHTML = '❓<div style="font-size:12px;margin-top:4px;color:#999">流已删除</div>'; return; }
    const type = detectPlayerType(stream);
    const url = getPlayUrl(stream);
    container.dataset.playerType = type;
    if (stream.status !== 'online') {
      container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">设备离线</div>';
      container.style.cursor = 'default'; return;
    }
    if (isDemoUrl(url) && type !== 'none') {
      const labels = { flv: 'HTTP-FLV', hls: 'HLS', webrtc: 'WebRTC' };
      container.innerHTML = `🎥<div style="font-size:12px;margin-top:4px;color:#999">${labels[type] || type} · 本地演示</div>`;
      container.style.cursor = 'default'; return;
    }
    if (type === 'none' || !url) {
      container.innerHTML = '🔄<div style="font-size:12px;margin-top:4px;color:#999">需流媒体服务器转码</div><div style="font-size:10px;color:var(--text-secondary);margin-top:2px">RTSP/RTMP → SRS/ZLMediaKit → HTTP-FLV/HLS/WebRTC</div>';
      container.style.cursor = 'default'; return;
    }
    if (type === 'flv') playFLV(container, url);
    else if (type === 'hls') playHLS(container, url);
    else if (type === 'webrtc') playWebRTC(container, stream);
  });
}

window.initVideoPlayers = initVideoPlayers;
window.detectPlayerType = detectPlayerType;
