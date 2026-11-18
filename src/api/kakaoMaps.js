const javascriptKey = import.meta.env.VITE_KAKAO_MAP_JS_KEY || "KAKAO_JAVASCRIPT_KEY_PLACEHOLDER";
let loadingMaps;

export function hasKakaoMapKey() {
  return Boolean(javascriptKey && !javascriptKey.includes("PLACEHOLDER"));
}

export function loadKakaoMaps() {
  if (!hasKakaoMapKey()) return Promise.reject(new Error("카카오 지도 JavaScript 키를 먼저 연결해 주세요."));
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps);
  if (loadingMaps) return loadingMaps;

  loadingMaps = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(javascriptKey)}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps?.load) return reject(new Error("카카오 지도 서비스를 불러오지 못했어요."));
      window.kakao.maps.load(() => resolve(window.kakao.maps));
    };
    script.onerror = () => reject(new Error("카카오 지도를 불러오지 못했어요. Kakao Developers의 JavaScript 키 설정에서 http://localhost:5173을 JavaScript SDK 도메인에 등록했는지 확인해 주세요."));
    document.head.appendChild(script);
  }).catch((error) => { loadingMaps = null; throw error; });

  return loadingMaps;
}
