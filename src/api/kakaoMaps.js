const javascriptKey = import.meta.env.VITE_KAKAO_MAP_JS_KEY || "KAKAO_JAVASCRIPT_KEY_PLACEHOLDER";
const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
let loadingMaps;

export function hasKakaoMapKey() {
  return Boolean((javascriptKey && !javascriptKey.includes("PLACEHOLDER")) || apiBase);
}

async function getJavascriptKey() {
  if (javascriptKey && !javascriptKey.includes("PLACEHOLDER")) return javascriptKey;
  const response = await fetch(`${apiBase}/api/map-key`);
  if (!response.ok) throw new Error("카카오 지도 키를 불러오지 못했어요.");
  const { key } = await response.json();
  if (!key) throw new Error("카카오 지도 JavaScript 키를 먼저 연결해 주세요.");
  return key;
}

export function loadKakaoMaps() {
  if (!hasKakaoMapKey()) return Promise.reject(new Error("카카오 지도 JavaScript 키를 먼저 연결해 주세요."));
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps);
  if (loadingMaps) return loadingMaps;

  loadingMaps = getJavascriptKey().then((key) => new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps?.load) return reject(new Error("카카오 지도 서비스를 불러오지 못했어요."));
      window.kakao.maps.load(() => resolve(window.kakao.maps));
    };
    script.onerror = () => reject(new Error("Kakao Maps SDK could not be loaded."));
    document.head.appendChild(script);
  })).catch((error) => { loadingMaps = null; throw error; });

  return loadingMaps;
}
