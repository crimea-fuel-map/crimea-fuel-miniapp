(function fixTelegramMiniAppMap() {
  const telegram = window.Telegram?.WebApp;
  const isTelegramIos = Boolean(telegram) && /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  const css = `
    #map { background: #c9e5ee !important; position: relative !important; }
    .runtime-static-map {
      position: absolute !important;
      inset: 0 !important;
      z-index: 260 !important;
      pointer-events: none !important;
      background-color: #c9e5ee !important;
      background-image: var(--runtime-map-svg) !important;
      background-size: cover !important;
      background-position: center !important;
      opacity: .92 !important;
    }
    body:not(.telegram-ios-map) .runtime-static-map { opacity: .18 !important; }
    .runtime-fallback-pane { z-index: 350 !important; pointer-events: none !important; }
    .runtime-fallback-map { opacity: .92 !important; }
    body.telegram-ios-map .leaflet-tile-pane { opacity: 0 !important; }
    body.telegram-ios-map .runtime-fallback-pane { display: block !important; }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  document.body.classList.toggle("telegram-ios-map", isTelegramIos);

  const fallbackSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="640" viewBox="0 0 900 640">
      <rect width="900" height="640" fill="#c9e5ee"/>
      <path d="M101 267C150 201 224 159 300 151c96-10 165 17 247 8 100-11 155-47 219 1 50 38 61 108 33 167-34 72-101 98-157 133-70 44-137 67-229 62-104-5-181-35-260-95-69-52-93-105-52-160Z" fill="#f4f2dc" stroke="#8ead83" stroke-width="4"/>
      <path d="M188 291C276 291 354 294 456 289c108-6 201-21 289-54" fill="none" stroke="#e6a447" stroke-width="5" opacity=".7"/>
      <path d="M220 408C296 379 376 353 447 333c68-19 130-26 204-10" fill="none" stroke="#e16d50" stroke-width="6" opacity=".75"/>
      <path d="M342 164C357 226 386 279 422 337c38 61 72 112 96 171" fill="none" stroke="#95a6b2" stroke-width="4" opacity=".7"/>
      <g fill="#1f2d38" font-family="Arial, sans-serif" font-size="20" font-weight="700">
        <text x="382" y="360">Simferopol</text>
        <text x="683" y="252">Kerch</text>
        <text x="584" y="384">Feodosia</text>
        <text x="451" y="492">Yalta</text>
        <text x="214" y="446">Sevastopol</text>
        <text x="214" y="274">Evpatoria</text>
        <text x="500" y="287">Dzhankoy</text>
      </g>
      <g fill="#168c4b" opacity=".75">
        <circle cx="430" cy="355" r="8"/><circle cx="716" cy="248" r="7"/><circle cx="607" cy="380" r="7"/>
        <circle cx="478" cy="488" r="7"/><circle cx="259" cy="442" r="7"/><circle cx="532" cy="282" r="7"/>
      </g>
    </svg>`;
  document.documentElement.style.setProperty(
    "--runtime-map-svg",
    `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fallbackSvg)}")`,
  );

  function ensureStaticFallback() {
    const mapElement = document.querySelector("#map");
    if (!mapElement || mapElement.querySelector(".runtime-static-map")) return;
    const fallback = document.createElement("div");
    fallback.className = "runtime-static-map";
    fallback.setAttribute("aria-hidden", "true");
    mapElement.prepend(fallback);
  }

  function installFallback() {
    const map = window.__fuelMap;
    if (!map || !window.L || window.__fuelRuntimeFallbackInstalled) return Boolean(map);
    window.__fuelRuntimeFallbackInstalled = true;
    const pane = map.createPane("runtimeFallbackPane");
    pane.classList.add("runtime-fallback-pane");
    pane.style.zIndex = "350";
    pane.style.pointerEvents = "none";
    const bounds = L.latLngBounds(L.latLng(44.35, 32.45), L.latLng(46.25, 36.85));
    L.imageOverlay(
      `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fallbackSvg)}`,
      bounds,
      { pane: "runtimeFallbackPane", opacity: isTelegramIos ? 0.92 : 0.2, interactive: false, className: "runtime-fallback-map" },
    ).addTo(map);
    map.invalidateSize(true);
    return true;
  }

  function refresh() {
    ensureStaticFallback();
    if (!window.__fuelMap) return;
    installFallback();
    window.__fuelMap.invalidateSize(true);
  }

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("#confirmButton");
    if (!button || !telegram?.sendData || !window.__fuelMarker) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const point = window.__fuelMarker.getLatLng();
    const label = document.querySelector("#placeLabel")?.textContent || "Selected point";
    const selected = {
      type: "manual_location",
      latitude: Number(point.lat.toFixed(7)),
      longitude: Number(point.lng.toFixed(7)),
      label: label.slice(0, 120),
      platform: String(telegram.platform || "").slice(0, 24),
    };
    try { window.localStorage.setItem("crimea-fuel-point", JSON.stringify(selected)); } catch {}
    button.disabled = true;
    telegram.sendData(JSON.stringify(selected));
    window.setTimeout(() => telegram.close?.(), 1200);
  }, true);

  ensureStaticFallback();
  installFallback();
  window.setTimeout(refresh, 250);
  window.setTimeout(refresh, 900);
  window.setTimeout(refresh, 1800);
  window.setTimeout(refresh, 3500);
  telegram?.onEvent?.("viewportChanged", refresh);
})();
