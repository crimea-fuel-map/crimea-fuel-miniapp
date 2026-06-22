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
});

const tileProviders = [
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
];
let activeTileLayer;
let tileProviderIndex = 0;
let tileErrors = 0;

function loadTileProvider(index) {
  if (activeTileLayer) map.removeLayer(activeTileLayer);
  tileProviderIndex = Math.min(index, tileProviders.length - 1);
  tileErrors = 0;
  activeTileLayer = L.tileLayer(tileProviders[tileProviderIndex], {
    bounds: CRIMEA_BOUNDS.pad(0.08),
    maxZoom: 19,
    noWrap: true,
    keepBuffer: 1,
    updateWhenIdle: true,
    updateWhenZooming: false,
    detectRetina: false,
  });
  activeTileLayer.on("tileerror", () => {
    tileErrors += 1;
    if (tileErrors >= 1 && tileProviderIndex + 1 < tileProviders.length) {
      loadTileProvider(tileProviderIndex + 1);
    }
  });
  activeTileLayer.on("load", () => {
    window.clearTimeout(window.__fuelTileFallback);
  });
  activeTileLayer.addTo(map);
  window.clearTimeout(window.__fuelTileFallback);
  window.__fuelTileFallback = window.setTimeout(() => {
    if (
      !document.querySelector(".leaflet-tile-loaded") &&
      tileProviderIndex + 1 < tileProviders.length
    ) {
      loadTileProvider(tileProviderIndex + 1);
    }
  }, 2500);
}

loadTileProvider(0);
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
  };
  window.localStorage.setItem(storageKey, JSON.stringify(selected));
  const payload = JSON.stringify(selected);
  if (telegram?.sendData && telegram.initData) {
    confirmButton.disabled = true;
    confirmButton.lastChild.textContent = " Отправляю...";
    telegram.sendData(payload);
    window.setTimeout(() => telegram.close(), 600);
    return;
  }
  const startPayload = [
    "loc",
    selected.latitude.toFixed(6),
    selected.longitude.toFixed(6),
  ].join("_");
  window.location.href =
    `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(startPayload)}`;
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
