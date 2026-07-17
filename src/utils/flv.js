/* ========================================
   Stream Analyzer — FLV Player with Retry
   ======================================== */

function isDemoUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch { return true; }
}

function initFlvPlayers() {
  if (typeof flvjs === 'undefined') return;
  document.querySelectorAll('.flv-player[data-url]').forEach(container => {
    const url = container.dataset.url;
    if (!url || container.dataset.flvInited) return;
    container.dataset.flvInited = '1';

    // 演示环境：localhost 地址直接跳过 FLV 连接，显示占位符
    if (isDemoUrl(url)) {
      container.innerHTML = '🎥<div style="font-size:12px;margin-top:4px;color:#999">本地演示</div>';
      return;
    }

    if (!flvjs.isSupported()) {
      container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">浏览器不支持</div>';
      return;
    }

    const video = document.createElement('video');
    video.style.cssText = 'width:100%;height:100%;object-fit:cover';
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    container.innerHTML = '';
    container.appendChild(video);

    let retryCount = 0;
    const maxRetries = 3;

    function tryPlay() {
      const flvPlayer = flvjs.createPlayer({ type: 'flv', isLive: true, url });
      flvPlayer.attachMediaElement(video);
      flvPlayer.onerror = () => {
        retryCount++;
        if (retryCount < maxRetries) {
          flvPlayer.destroy();
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          setTimeout(tryPlay, delay);
        } else {
          container.innerHTML = '📹<div style="font-size:12px;margin-top:4px;color:#999">播放失败</div>';
        }
      };
      try {
        flvPlayer.load();
        flvPlayer.play();
      } catch (e) {
        flvPlayer.onerror();
      }
    }
    tryPlay();

    container.style.cursor = 'pointer';
    container.onclick = () => video.requestFullscreen?.();
  });
}

window.initFlvPlayers = initFlvPlayers;
