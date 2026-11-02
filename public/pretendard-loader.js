// Pretendard 웹폰트 지연 로더 (#89: CSP script-src 'self' 허용을 위해 index.html 인라인 스크립트에서 분리)
// 첫 scroll/click/keypress/touch 이후에만 CDN 스타일시트를 붙여 첫 로드 지표에 폰트 요청이 잡히지 않게 한다.
(function () {
  var HREF = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
  var events = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
  var loaded = false;
  function loadPretendard() {
    if (loaded) return;
    loaded = true;
    events.forEach(function (eventName) {
      window.removeEventListener(eventName, loadPretendard);
    });
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = HREF;
    document.head.appendChild(link);
  }
  events.forEach(function (eventName) {
    window.addEventListener(eventName, loadPretendard, { once: true, passive: true });
  });
})();
