const CRIMEA_BOUNDS = L.latLngBounds(
  L.latLng(44.35, 32.45),
  L.latLng(46.25, 36.85),
);
const DEFAULT_POINT = L.latLng(44.9521, 34.1024);
const telegram = window.Telegram?.WebApp;
const urlParams = new URLSearchParams(window.location.search);
const storageKey = "crimea-fuel-point";
const BOT_USERNAME = "benz_test_bot";
const historyMode = urlParams.get("mode") === "history";
const stationsMode = urlParams.get("mode") === "stations";
const isTelegramIos = Boolean(telegram) &&
  /iPhone|iPad|iPod/i.test(navigator.userAgent || "");

function validCrimeaPoint(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const point = L.latLng(lat, lon);
  return CRIMEA_BOUNDS.contains(point) ? point : null;
}

const requestedPoint = validCrimeaPoint(
  urlParams.get("lat"),
  urlParams.get("lon"),
);
let storedPoint;
try {
  storedPoint = JSON.parse(window.localStorage.getItem(storageKey) || "null");
} catch {
  storedPoint = null;
}
const savedPoint = validCrimeaPoint(
  storedPoint?.latitude,
  storedPoint?.longitude,
);
const hasRequestedPoint = Boolean(requestedPoint);
const hasSavedPoint = Boolean(savedPoint);
const INITIAL_POINT = hasRequestedPoint
  ? requestedPoint
  : (hasSavedPoint ? savedPoint : DEFAULT_POINT);
const INITIAL_NAME = hasRequestedPoint
  ? (urlParams.get("label") || "Последняя выбранная точка").slice(0, 80)
  : (hasSavedPoint
    ? String(storedPoint.label || "Последняя выбранная точка").slice(0, 80)
    : "Симферополь");

telegram?.ready();
telegram?.expand();
L.Browser.any3d = false;

const map = L.map("map", {
  center: INITIAL_POINT,
  zoom: 10,
  minZoom: 7,
  maxZoom: 18,
  maxBounds: CRIMEA_BOUNDS.pad(0.25),
  zoomControl: true,
  attributionControl: false,
  preferCanvas: true,
  fadeAnimation: false,
  zoomAnimation: false,
  markerZoomAnimation: false,
  tap: false,
});

const fallbackPane = map.createPane("fallbackMapPane");
fallbackPane.style.zIndex = isTelegramIos ? "350" : "230";
fallbackPane.style.pointerEvents = "none";
fallbackPane.classList.add("leaflet-fallback-map-pane");
const fallbackMapSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="820" viewBox="0 0 1200 820">
    <rect width="1200" height="820" fill="#b9dfe8"/>
    <path d="M128 374C191 282 286 224 391 214c137-14 227 25 346 13 139-14 217-69 305-2 71 54 82 153 43 232-47 96-138 130-215 178-97 60-187 91-316 84-142-8-250-50-358-133-94-72-124-144-68-212Z" fill="#f5f0d8" stroke="#87ad80" stroke-width="5"/>
    <path d="M206 394C322 391 466 383 608 371c142-12 288-40 399-84" fill="none" stroke="#d97357" stroke-width="7" opacity=".7"/>
    <path d="M297 568C420 520 516 487 638 452c105-30 202-40 322-24" fill="none" stroke="#e08d3c" stroke-width="6" opacity=".72"/>
    <path d="M452 225C477 316 520 402 574 485c55 85 101 152 135 232" fill="none" stroke="#8c9dab" stroke-width="5" opacity=".65"/>
    <path d="M175 657C299 633 408 632 522 661" fill="none" stroke="#e6a447" stroke-width="5" opacity=".65"/>
    <g fill="#1e2b35" font-family="Arial, sans-serif" font-size="28" font-weight="700">
      <text x="508" y="493">Simferopol</text>
      <text x="920" y="333">Kerch</text>
      <text x="791" y="488">Feodosia</text>
      <text x="609" y="683">Yalta</text>
      <text x="272" y="638">Sevastopol</text>
      <text x="282" y="374">Evpatoria</text>
      <text x="700" y="386">Dzhankoy</text>
    </g>
    <g fill="#168c4b" opacity=".75">
      <circle cx="565" cy="486" r="11"/>
      <circle cx="970" cy="328" r="10"/>
      <circle cx="828" cy="485" r="10"/>
      <circle cx="642" cy="677" r="10"/>
      <circle cx="326" cy="632" r="10"/>
      <circle cx="332" cy="370" r="10"/>
    </g>
  </svg>`;
L.imageOverlay(
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fallbackMapSvg)}`,
  CRIMEA_BOUNDS,
  {
    pane: "fallbackMapPane",
    opacity: isTelegramIos ? 0.92 : 1,
    interactive: false,
    className: "fallback-map-image",
  },
).addTo(map);
document.body.classList.toggle("telegram-ios-map", isTelegramIos);

const tileProviders = [
  {
    name: "Carto Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    options: { subdomains: "abcd" },
  },
  {
    name: "Carto Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    options: { subdomains: "abcd" },
  },
  {
    name: "Esri Streets",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  },
  {
    name: "OSM",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { subdomains: "abc" },
  },
  {
    name: "OSM Direct",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
  {
    name: "OSM FR",
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    options: { subdomains: "abc" },
  },
  {
    name: "OSM DE",
    url: "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
  },
];
let activeTileLayer;
let tileProviderIndex = 0;
let tileErrors = 0;
let tileLoads = 0;
let tileLayerStartedAt = 0;
const mapRetry = document.querySelector("#mapRetry");

const SafeTileLayer = L.TileLayer.extend({
  createTile(coords, done) {
    const tile = L.TileLayer.prototype.createTile.call(this, coords, done);
    tile.referrerPolicy = "strict-origin-when-cross-origin";
    tile.decoding = "async";
    tile.loading = "eager";
    return tile;
  },
});

function createTileLayer(provider) {
  return new SafeTileLayer(provider.url, {
    bounds: CRIMEA_BOUNDS.pad(0.08),
    maxZoom: 19,
    noWrap: true,
    keepBuffer: 2,
    updateWhenIdle: true,
    updateWhenZooming: false,
    detectRetina: false,
    crossOrigin: false,
    className: "fuel-map-tile",
    ...(provider.options || {}),
  });
}

function loadTileProvider(index) {
  if (activeTileLayer) map.removeLayer(activeTileLayer);
  tileProviderIndex = Math.min(index, tileProviders.length - 1);
  tileErrors = 0;
  tileLoads = 0;
  tileLayerStartedAt = Date.now();
  mapRetry.hidden = true;
  fallbackPane.style.display = "";
  document.body.classList.remove("tiles-ready");
  document.body.classList.add("tiles-loading");
  const provider = tileProviders[tileProviderIndex];
  const layer = createTileLayer(provider);
  activeTileLayer = layer;
  layer.on("tileload", () => {
    if (activeTileLayer !== layer) return;
    tileLoads += 1;
    if (!isTelegramIos && tileLoads >= 3) fallbackPane.style.display = "none";
    document.body.classList.add("tiles-ready");
    document.body.classList.remove("tiles-loading");
    mapRetry.hidden = true;
  });
  layer.on("tileerror", () => {
    if (activeTileLayer !== layer) return;
    tileErrors += 1;
    if (
      tileLoads === 0 &&
      tileErrors >= 6 &&
      tileProviderIndex + 1 < tileProviders.length
    ) {
      loadTileProvider(tileProviderIndex + 1);
    }
  });
  layer.on("load", () => {
    if (activeTileLayer !== layer) return;
    window.clearTimeout(window.__fuelTileFallback);
    if (tileLoads > 0) {
      document.body.classList.add("tiles-ready");
      document.body.classList.remove("tiles-loading");
      mapRetry.hidden = true;
    }
  });
  layer.addTo(map);
  window.clearTimeout(window.__fuelTileFallback);
  window.__fuelTileFallback = window.setTimeout(() => {
    if (activeTileLayer !== layer || tileLoads > 0) return;
    if (tileProviderIndex + 1 < tileProviders.length) {
      loadTileProvider(tileProviderIndex + 1);
    } else {
      document.body.classList.remove("tiles-loading");
      mapRetry.hidden = false;
    }
  }, 4_000);
}

loadTileProvider(0);
window.setInterval(() => {
  if (!isTelegramIos || !activeTileLayer) return;
  if (tileLoads > 0 && Date.now() - tileLayerStartedAt > 7_000) {
    fallbackPane.style.display = "";
    document.body.classList.add("tiles-ready");
    document.body.classList.remove("tiles-loading");
  }
}, 2_500);
mapRetry.addEventListener("click", () => {
  loadTileProvider(0);
  map.invalidateSize(true);
});
window.setTimeout(() => map.invalidateSize(true), 250);
window.addEventListener("resize", () => map.invalidateSize(false));

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="selected-marker"></div>',
  iconSize: [30, 40],
  iconAnchor: [15, 38],
});

const marker = L.marker(INITIAL_POINT, {
  draggable: true,
  icon: markerIcon,
}).addTo(map);
window.__fuelMap = map;
window.__fuelMarker = marker;

const searchInput = document.querySelector("#searchInput");
const searchResults = document.querySelector("#searchResults");
const clearSearch = document.querySelector("#clearSearch");
const locateButton = document.querySelector("#locateButton");
const confirmButton = document.querySelector("#confirmButton");
const placeLabel = document.querySelector("#placeLabel");
const coordinatesLabel = document.querySelector("#coordinatesLabel");
const mapTip = document.querySelector("#mapTip");

let selectedPoint = INITIAL_POINT;
let selectedName = INITIAL_NAME;
let searchTimer;

placeLabel.textContent = selectedName;
coordinatesLabel.textContent =
  `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`;

function decodePoints() {
  const encoded = urlParams.get("points");
  if (!encoded) return [];
  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + (4 - normalized.length % 4) % 4,
      "=",
    );
    const binary = window.atob(padded);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0)
    );
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return [];
  }
}

function initializeHistoryMode() {
  const points = decodePoints().filter((point) =>
    Number.isFinite(Number(point.latitude)) &&
    Number.isFinite(Number(point.longitude))
  );
  if (!historyMode) return false;

  document.body.classList.add("history-mode");
  document.querySelector("h1").textContent = "История геопозиций";
  document.querySelector(".eyebrow").textContent =
    `СОХРАНЕНО ТОЧЕК: ${points.length}`;
  map.removeLayer(marker);
  const bounds = [];
  for (const [index, point] of points.entries()) {
    const position = L.latLng(point.latitude, point.longitude);
    bounds.push(position);
    const icon = L.divIcon({
      className: "",
      html: `<div class="history-marker">${index + 1}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    const date = point.updatedAt
      ? new Date(point.updatedAt).toLocaleString("ru-RU")
      : "Время неизвестно";
    L.marker(position, { icon })
      .bindPopup(`<strong>Точка ${index + 1}</strong><br>${date}`)
      .addTo(map);
  }
  if (bounds.length === 1) map.setView(bounds[0], 13);
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [36, 36] });
  placeLabel.textContent = "Все геопозиции";
  coordinatesLabel.textContent = `${points.length} точек на карте`;
  mapTip.textContent = "Нажмите на метку, чтобы увидеть дату";
  return true;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initializeStationsMode() {
  if (!stationsMode) return false;
  const points = decodePoints()
    .map((point) => Array.isArray(point)
      ? {
          latitude: point[0],
          longitude: point[1],
          title: point[2],
          address: point[3],
          fuels: point[4],
          actualAt: point[5],
        }
      : point)
    .filter((point) =>
    Number.isFinite(Number(point.latitude)) &&
    Number.isFinite(Number(point.longitude))
  );
  document.body.classList.add("stations-mode");
  document.querySelector("h1").textContent = "АЗС с топливом";
  document.querySelector(".eyebrow").textContent =
    `НАЙДЕНО АЗС: ${points.length}`;
  map.removeLayer(marker);
  const bounds = [];
  for (const point of points) {
    const position = L.latLng(point.latitude, point.longitude);
    bounds.push(position);
    const fuels = Array.isArray(point.fuels) ? point.fuels : [];
    const markerLabel = fuels
      .map((fuel) => String(fuel).replace("АИ-", ""))
      .join(" · ");
    const icon = L.divIcon({
      className: "",
      html: `<div class="fuel-marker">${escapeHtml(markerLabel || "АЗС")}</div>`,
      iconSize: [86, 34],
      iconAnchor: [43, 17],
    });
    const details = [
      `<strong>${escapeHtml(point.title || "АЗС")}</strong>`,
      escapeHtml(point.address || ""),
      `<b>Топливо:</b> ${escapeHtml(fuels.join(", "))}`,
      point.actualAt
        ? `<b>Актуально:</b> ${escapeHtml(point.actualAt)}`
        : "",
    ].filter(Boolean).join("<br>");
    L.marker(position, { icon }).bindPopup(details).addTo(map);
  }
  if (bounds.length === 1) map.setView(bounds[0], 14);
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [44, 44] });
  placeLabel.textContent = "Найденные АЗС";
  coordinatesLabel.textContent = `${points.length} точек на карте`;
  mapTip.textContent = "Нажмите на АЗС, чтобы увидеть топливо";
  return true;
}

function withinCrimea(point) {
  return CRIMEA_BOUNDS.contains(point);
}

function setPoint(point, name = "Выбранная точка", moveMap = true) {
  if (!withinCrimea(point)) {
    telegram?.showAlert("Выберите точку в пределах Крыма.");
    return false;
  }
  selectedPoint = L.latLng(point.lat, point.lng);
  selectedName = name;
  marker.setLatLng(selectedPoint);
  if (moveMap) map.flyTo(selectedPoint, Math.max(map.getZoom(), 13));
  placeLabel.textContent = selectedName;
  coordinatesLabel.textContent =
    `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`;
  mapTip.textContent = "Точка выбрана";
  window.setTimeout(() => {
    mapTip.textContent = "Нажмите на карту или перетащите метку";
  }, 1600);
  return true;
}

map.on("click", (event) => {
  if (historyMode || stationsMode) return;
  setPoint(event.latlng);
  hideResults();
});

marker.on("dragend", () => {
  if (historyMode || stationsMode) return;
  const point = marker.getLatLng();
  if (!setPoint(point, "Выбранная точка", false)) {
    marker.setLatLng(selectedPoint);
  }
});

function hideResults() {
  searchResults.hidden = true;
  searchResults.replaceChildren();
}

function renderResults(items) {
  searchResults.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("button");
    empty.type = "button";
    empty.className = "result-button";
    empty.disabled = true;
    empty.textContent = "Ничего не найдено";
    searchResults.append(empty);
  } else {
    for (const item of items) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-button";
      const title = document.createElement("strong");
      const address = document.createElement("span");
      title.textContent = item.name;
      address.textContent = item.display_name;
      button.append(title, address);
      button.addEventListener("click", () => {
        setPoint(L.latLng(Number(item.lat), Number(item.lon)), item.name);
        searchInput.value = item.name;
        hideResults();
      });
      searchResults.append(button);
    }
  }
  searchResults.hidden = false;
}

async function searchPlaces(query) {
  const params = new URLSearchParams({
    q: `${query}, Крым`,
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    viewbox: "32.45,46.25,36.85,44.35",
    bounded: "1",
    "accept-language": "ru",
  });
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error("Search failed");
    renderResults(await response.json());
  } catch {
    renderResults([]);
  }
}

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  const query = searchInput.value.trim();
  if (query.length < 3) {
    hideResults();
    return;
  }
  searchTimer = window.setTimeout(() => searchPlaces(query), 450);
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.focus();
  hideResults();
});

locateButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    telegram?.showAlert("Определение геопозиции недоступно.");
    return;
  }
  locateButton.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locateButton.disabled = false;
      setPoint(
        L.latLng(position.coords.latitude, position.coords.longitude),
        "Моё местоположение",
      );
    },
    () => {
      locateButton.disabled = false;
      telegram?.showAlert("Не удалось определить геопозицию.");
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
  );
});

confirmButton.addEventListener("click", () => {
  const selected = {
    type: "manual_location",
    latitude: Number(selectedPoint.lat.toFixed(7)),
    longitude: Number(selectedPoint.lng.toFixed(7)),
    label: selectedName.slice(0, 120),
    platform: String(telegram?.platform || "").slice(0, 24),
  };
  window.localStorage.setItem(storageKey, JSON.stringify(selected));
  const payload = JSON.stringify(selected);
  if (telegram?.sendData) {
    confirmButton.disabled = true;
    confirmButton.lastChild.textContent = " Отправляю...";
    telegram.sendData(payload);
    window.setTimeout(() => telegram.close?.(), 1200);
    return;
  }
  const startPayload = [
    "loc",
    selected.latitude.toFixed(6),
    selected.longitude.toFixed(6),
  ].join("_");
  const botLink = `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(startPayload)}`;
  if (telegram?.openTelegramLink) {
    telegram.openTelegramLink(botLink);
    window.setTimeout(() => telegram.close?.(), 800);
    return;
  }
  window.location.href = botLink;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideResults();
});

initializeHistoryMode();
initializeStationsMode();

function refreshMapSize() {
  map.invalidateSize({ pan: false });
  if (!historyMode && !stationsMode) {
    map.setView(selectedPoint, 10, { animate: false });
    marker.setLatLng(selectedPoint);
  }
}

window.setTimeout(refreshMapSize, 150);
window.setTimeout(refreshMapSize, 900);
window.addEventListener("resize", refreshMapSize);
telegram?.onEvent?.("viewportChanged", refreshMapSize);
