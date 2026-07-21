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
  ? (urlParams.get("label") || "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u0442\u043E\u0447\u043A\u0430").slice(0, 80)
  : (hasSavedPoint
    ? String(storedPoint.label || "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u044F\u044F \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u0442\u043E\u0447\u043A\u0430").slice(0, 80)
    : "\u0421\u0438\u043C\u0444\u0435\u0440\u043E\u043F\u043E\u043B\u044C");

telegram?.ready();
telegram?.expand();
telegram?.disableVerticalSwipes?.();
L.Browser.any3d = false;

const map = L.map("map", {
  center: INITIAL_POINT,
  zoom: 10,
  minZoom: 7,
  maxZoom: 18,
  maxBoundsViscosity: 0,
  zoomControl: true,
  attributionControl: false,
  preferCanvas: true,
  fadeAnimation: false,
  zoomAnimation: false,
  markerZoomAnimation: false,
  zoomSnap: 0.25,
  zoomDelta: 0.5,
  wheelPxPerZoomLevel: 90,
  touchZoom: true,
  scrollWheelZoom: true,
  inertia: false,
  bounceAtZoomLimits: false,
  worldCopyJump: false,
  tap: false,
});

document.body.classList.toggle("telegram-ios-map", isTelegramIos);

const localMapPane = map.createPane("localBasemap");
localMapPane.style.zIndex = "180";
localMapPane.style.pointerEvents = "none";

const crimeaOutline = [
  [46.10, 33.57], [46.16, 33.75], [46.08, 34.02], [46.12, 34.30],
  [45.98, 34.52], [45.80, 34.72], [45.62, 35.02], [45.48, 35.36],
  [45.38, 35.78], [45.44, 36.18], [45.36, 36.49], [45.18, 36.62],
  [45.02, 36.42], [44.91, 36.12], [44.84, 35.76], [44.76, 35.42],
  [44.70, 35.12], [44.60, 34.84], [44.49, 34.55], [44.39, 34.25],
  [44.39, 33.98], [44.46, 33.73], [44.52, 33.49], [44.61, 33.32],
  [44.75, 33.39], [44.89, 33.55], [45.05, 33.55], [45.16, 33.39],
  [45.33, 33.20], [45.50, 32.94], [45.67, 32.61], [45.82, 32.53],
  [45.91, 32.78], [45.99, 33.10],
];

const localRoads = [
  [[44.62, 33.53], [44.75, 33.86], [44.95, 34.10], [45.17, 34.31], [45.48, 34.39], [45.71, 34.39]],
  [[45.19, 33.37], [45.08, 33.61], [44.95, 34.10], [45.04, 34.45], [45.13, 34.74], [45.03, 35.38], [45.36, 36.47]],
  [[44.95, 34.10], [44.76, 34.28], [44.68, 34.41], [44.50, 34.17]],
  [[44.95, 34.10], [44.84, 33.85], [44.75, 33.86], [44.62, 33.53]],
];

const localCities = [
  [44.9521, 34.1024, "\u0421\u0438\u043C\u0444\u0435\u0440\u043E\u043F\u043E\u043B\u044C"],
  [44.6167, 33.5254, "\u0421\u0435\u0432\u0430\u0441\u0442\u043E\u043F\u043E\u043B\u044C"],
  [44.4952, 34.1663, "\u042F\u043B\u0442\u0430"],
  [45.1904, 33.3669, "\u0415\u0432\u043F\u0430\u0442\u043E\u0440\u0438\u044F"],
  [45.3561, 36.4674, "\u041A\u0435\u0440\u0447\u044C"],
  [45.0319, 35.3824, "\u0424\u0435\u043E\u0434\u043E\u0441\u0438\u044F"],
  [45.7086, 34.3933, "\u0414\u0436\u0430\u043D\u043A\u043E\u0439"],
  [44.6764, 34.4100, "\u0410\u043B\u0443\u0448\u0442\u0430"],
];

L.polygon(crimeaOutline, {
  pane: "localBasemap",
  color: "#6f9177",
  weight: 2,
  fillColor: "#f1f2df",
  fillOpacity: 1,
  interactive: false,
}).addTo(map);

for (const road of localRoads) {
  L.polyline(road, {
    pane: "localBasemap",
    color: "#d49b62",
    weight: 2,
    opacity: 0.85,
    interactive: false,
  }).addTo(map);
}

for (const [latitude, longitude, name] of localCities) {
  L.marker([latitude, longitude], {
    pane: "localBasemap",
    interactive: false,
    icon: L.divIcon({
      className: "local-city-label",
      html: `<span>${name}</span>`,
      iconSize: [100, 20],
      iconAnchor: [50, 10],
    }),
  }).addTo(map);
}

document.body.classList.add("local-map-ready");

const tileProviders = [
  {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
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
];
let activeTileLayer;
let tileProviderIndex = 0;
let tileErrors = 0;
let tileLoads = 0;
let tileFallbackTimer;
const minimumReadyTiles = 4;
const mapRetry = document.querySelector("#mapRetry");

function createTileLayer(provider) {
  return L.tileLayer(provider.url, {
    maxZoom: 19,
    noWrap: true,
    keepBuffer: 2,
    updateWhenIdle: false,
    updateWhenZooming: false,
    detectRetina: false,
    className: "fuel-map-tile",
    ...(provider.options || {}),
  });
}

function setTileState(state) {
  document.body.classList.toggle("tiles-loading", state === "loading");
  document.body.classList.toggle("tiles-ready", state === "ready");
  window.__fuelTileState = {
    state,
    provider: tileProviders[tileProviderIndex]?.name || "",
    loads: tileLoads,
    errors: tileErrors,
  };
}

function loadTileProvider(index) {
  window.clearTimeout(tileFallbackTimer);
  if (activeTileLayer) map.removeLayer(activeTileLayer);
  tileProviderIndex = Math.min(index, tileProviders.length - 1);
  tileErrors = 0;
  tileLoads = 0;
  mapRetry.hidden = true;
  setTileState("loading");
  const provider = tileProviders[tileProviderIndex];
  const layer = createTileLayer(provider);
  activeTileLayer = layer;
  layer.on("tileload", (event) => {
    if (activeTileLayer !== layer) return;
    if (!event.tile?.complete || event.tile.naturalWidth === 0) return;
    tileLoads += 1;
    if (tileLoads >= minimumReadyTiles) {
      setTileState("ready");
      mapRetry.hidden = true;
      window.clearTimeout(tileFallbackTimer);
    } else {
      setTileState("loading");
    }
  });
  layer.on("tileerror", () => {
    if (activeTileLayer !== layer) return;
    tileErrors += 1;
    setTileState(tileLoads >= minimumReadyTiles ? "ready" : "loading");
    if (tileLoads < minimumReadyTiles && tileErrors >= 3) {
      tryNextTileProvider(layer);
    }
  });
  layer.addTo(map);
  tileFallbackTimer = window.setTimeout(() => {
    if (activeTileLayer !== layer || tileLoads >= minimumReadyTiles) return;
    tryNextTileProvider(layer);
  }, 6_000);
}

function tryNextTileProvider(layer) {
  if (activeTileLayer !== layer || tileLoads >= minimumReadyTiles) return;
  if (tileProviderIndex + 1 < tileProviders.length) {
    loadTileProvider(tileProviderIndex + 1);
    return;
  }
  window.clearTimeout(tileFallbackTimer);
  setTileState("failed");
  mapRetry.hidden = false;
  window.__showStationList?.();
}

loadTileProvider(0);
mapRetry.addEventListener("click", () => {
  loadTileProvider(0);
  map.invalidateSize(true);
});

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
  document.querySelector("h1").textContent = "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u0433\u0435\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u0439";
  document.querySelector(".eyebrow").textContent =
    `\u0421\u041E\u0425\u0420\u0410\u041D\u0415\u041D\u041E \u0422\u041E\u0427\u0415\u041A: ${points.length}`;
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
      : "\u0412\u0440\u0435\u043C\u044F \u043D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E";
    L.marker(position, { icon })
      .bindPopup(`<strong>\u0422\u043E\u0447\u043A\u0430 ${index + 1}</strong><br>${date}`)
      .addTo(map);
  }
  if (bounds.length === 1) map.setView(bounds[0], 13, { animate: false });
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [36, 36], animate: false });
  placeLabel.textContent = "\u0412\u0441\u0435 \u0433\u0435\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u0438";
  coordinatesLabel.textContent = `${points.length} \u0442\u043E\u0447\u0435\u043A \u043D\u0430 \u043A\u0430\u0440\u0442\u0435`;
  mapTip.textContent = "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u043C\u0435\u0442\u043A\u0443, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0434\u0430\u0442\u0443";
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

function navigationUrls(point) {
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  return {
    yandex: `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=16&l=map`,
    google: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    dgis: `https://2gis.ru/geo/${longitude}%2C${latitude}/16`,
  };
}

function createStationList(points, stationMarkers) {
  const mapWrap = document.querySelector(".map-wrap");
  const toggle = document.createElement("button");
  const panel = document.createElement("section");
  toggle.type = "button";
  toggle.className = "station-list-toggle";
  toggle.textContent = `\u0421\u043F\u0438\u0441\u043E\u043A \u0410\u0417\u0421 (${points.length})`;
  panel.className = "station-list-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "\u0421\u043F\u0438\u0441\u043E\u043A \u043D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0445 \u0410\u0417\u0421");

  const heading = document.createElement("div");
  heading.className = "station-list-heading";
  heading.innerHTML = `<strong>\u041D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u0410\u0417\u0421</strong><span>${points.length}</span>`;
  panel.append(heading);

  for (const [index, point] of points.entries()) {
    const fuels = Array.isArray(point.fuels) ? point.fuels : [];
    const item = document.createElement("article");
    item.className = "station-list-item";
    item.innerHTML = `
      <button class="station-focus" type="button">
        <strong>${escapeHtml(point.title || "\u0410\u0417\u0421")}</strong>
        <span>${escapeHtml(point.address || "\u0410\u0434\u0440\u0435\u0441 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D")}</span>
        <b>${escapeHtml(fuels.join(", ") || "\u0422\u043E\u043F\u043B\u0438\u0432\u043E \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E")}</b>
        ${point.actualAt ? `<small>\u0410\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E: ${escapeHtml(point.actualAt)}</small>` : ""}
      </button>
      <div class="station-nav" aria-label="\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044E">
        <a href="${navigationUrls(point).yandex}" target="_blank" rel="noopener">\u042F\u043D\u0434\u0435\u043A\u0441</a>
        <a href="${navigationUrls(point).google}" target="_blank" rel="noopener">Google</a>
        <a href="${navigationUrls(point).dgis}" target="_blank" rel="noopener">2\u0413\u0418\u0421</a>
      </div>`;
    item.querySelector(".station-focus").addEventListener("click", () => {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      const position = L.latLng(point.latitude, point.longitude);
      map.setView(position, 15, { animate: false });
      stationMarkers[index]?.openPopup();
    });
    panel.append(item);
  }

  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A" : `\u0421\u043F\u0438\u0441\u043E\u043A \u0410\u0417\u0421 (${points.length})`;
  };
  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", () => setOpen(panel.hidden));
  mapWrap.append(toggle, panel);
  window.__showStationList = () => setOpen(true);
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
          source: point[6],
          distanceKm: point[7],
        }
      : point)
    .filter((point) =>
    Number.isFinite(Number(point.latitude)) &&
    Number.isFinite(Number(point.longitude))
  );
  document.body.classList.add("stations-mode");
  document.querySelector("h1").textContent = "\u0410\u0417\u0421 \u0441 \u0442\u043E\u043F\u043B\u0438\u0432\u043E\u043C";
  document.querySelector(".eyebrow").textContent =
    `\u041D\u0410\u0419\u0414\u0415\u041D\u041E \u0410\u0417\u0421: ${points.length}`;
  map.removeLayer(marker);
  const bounds = [];
  const stationMarkers = [];
  for (const point of points) {
    const position = L.latLng(point.latitude, point.longitude);
    bounds.push(position);
    const fuels = Array.isArray(point.fuels) ? point.fuels : [];
    const markerLabel = fuels
      .map((fuel) => String(fuel).replace("\u0410\u0418-", ""))
      .join(" \u00B7 ");
    const icon = L.divIcon({
      className: "",
      html: `<div class="fuel-marker">${escapeHtml(markerLabel || "\u0410\u0417\u0421")}</div>`,
      iconSize: [86, 34],
      iconAnchor: [43, 17],
    });
    const details = [
      `<strong>${escapeHtml(point.title || "\u0410\u0417\u0421")}</strong>`,
      escapeHtml(point.address || ""),
      `<b>\u0422\u043E\u043F\u043B\u0438\u0432\u043E:</b> ${escapeHtml(fuels.join(", "))}`,
      point.actualAt
        ? `<b>\u0410\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E:</b> ${escapeHtml(point.actualAt)}`
        : "",
      point.distanceKm !== undefined && point.distanceKm !== null
        ? `<b>\u0420\u0430\u0441\u0441\u0442\u043E\u044F\u043D\u0438\u0435:</b> ${escapeHtml(String(point.distanceKm))} \u043A\u043C`
        : "",
      point.source ? `<b>\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A:</b> ${escapeHtml(point.source)}` : "",
    ].filter(Boolean).join("<br>");
    const stationMarker = L.marker(position, { icon })
      .bindPopup(details)
      .addTo(map);
    stationMarkers.push(stationMarker);
  }
  if (bounds.length === 1) map.setView(bounds[0], 14, { animate: false });
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [44, 44], animate: false });
  setTimeout(() => map.invalidateSize({ pan: false }), 80);
  placeLabel.textContent = "\u041D\u0430\u0439\u0434\u0435\u043D\u043D\u044B\u0435 \u0410\u0417\u0421";
  coordinatesLabel.textContent = `${points.length} \u0442\u043E\u0447\u0435\u043A \u043D\u0430 \u043A\u0430\u0440\u0442\u0435`;
  mapTip.textContent = "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u0410\u0417\u0421, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0442\u043E\u043F\u043B\u0438\u0432\u043E";
  createStationList(points, stationMarkers);
  return true;
}

function withinCrimea(point) {
  return CRIMEA_BOUNDS.contains(point);
}

function setPoint(point, name = "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u0442\u043E\u0447\u043A\u0430", moveMap = true) {
  if (!withinCrimea(point)) {
    telegram?.showAlert("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0442\u043E\u0447\u043A\u0443 \u0432 \u043F\u0440\u0435\u0434\u0435\u043B\u0430\u0445 \u041A\u0440\u044B\u043C\u0430.");
    return false;
  }
  selectedPoint = L.latLng(point.lat, point.lng);
  selectedName = name;
  marker.setLatLng(selectedPoint);
  if (moveMap) map.setView(selectedPoint, Math.max(map.getZoom(), 13), {
    animate: false,
  });
  placeLabel.textContent = selectedName;
  coordinatesLabel.textContent =
    `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`;
  mapTip.textContent = "\u0422\u043E\u0447\u043A\u0430 \u0432\u044B\u0431\u0440\u0430\u043D\u0430";
  window.setTimeout(() => {
    mapTip.textContent = "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430 \u043A\u0430\u0440\u0442\u0443 \u0438\u043B\u0438 \u043F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u043C\u0435\u0442\u043A\u0443";
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
  if (!setPoint(point, "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u0430\u044F \u0442\u043E\u0447\u043A\u0430", false)) {
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
    empty.textContent = "\u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E";
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
    q: `${query}, \u041A\u0440\u044B\u043C`,
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
    telegram?.showAlert("\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0433\u0435\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.");
    return;
  }
  locateButton.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locateButton.disabled = false;
      setPoint(
        L.latLng(position.coords.latitude, position.coords.longitude),
        "\u041C\u043E\u0451 \u043C\u0435\u0441\u0442\u043E\u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435",
      );
    },
    () => {
      locateButton.disabled = false;
      telegram?.showAlert("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0433\u0435\u043E\u043F\u043E\u0437\u0438\u0446\u0438\u044E.");
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
  const startPayload = [
    "locv2",
    Math.round(selected.latitude * 1_000_000),
    Math.round(selected.longitude * 1_000_000),
  ].join("_");
  const botLink = `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(startPayload)}`;

  confirmButton.disabled = true;
  confirmButton.lastChild.textContent = " \u0421\u043E\u0445\u0440\u0430\u043D\u044F\u044E...";
  if (telegram?.sendData) {
    try {
      telegram.sendData(payload);
      return;
    } catch {
      // Fall back to the bot deep link outside a supported Telegram Mini App.
    }
  }
  if (telegram?.openTelegramLink) telegram.openTelegramLink(botLink);
  else window.location.href = botLink;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideResults();
});

initializeHistoryMode();
initializeStationsMode();

function refreshMapSize() {
  map.invalidateSize({ pan: false, animate: false, debounceMoveend: true });
}

for (const delay of [0, 150, 500, 1200]) {
  window.setTimeout(refreshMapSize, delay);
}
window.addEventListener("resize", refreshMapSize);
window.addEventListener("orientationchange", () => {
  window.setTimeout(refreshMapSize, 100);
  window.setTimeout(refreshMapSize, 600);
});
window.addEventListener("pageshow", refreshMapSize);
window.addEventListener("load", refreshMapSize);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    window.setTimeout(refreshMapSize, 50);
    window.setTimeout(refreshMapSize, 400);
  }
});
telegram?.onEvent?.("viewportChanged", refreshMapSize);

