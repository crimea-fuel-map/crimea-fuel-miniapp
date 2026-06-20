const CRIMEA_BOUNDS = L.latLngBounds(
  L.latLng(44.35, 32.45),
  L.latLng(46.25, 36.85),
);
const DEFAULT_POINT = L.latLng(44.9521, 34.1024);
const telegram = window.Telegram?.WebApp;
const urlParams = new URLSearchParams(window.location.search);
const historyMode = urlParams.get("mode") === "history";

telegram?.ready();
telegram?.expand();
L.Browser.any3d = false;

const map = L.map("map", {
  center: DEFAULT_POINT,
  zoom: 10,
  minZoom: 7,
  maxZoom: 18,
  maxBounds: CRIMEA_BOUNDS.pad(0.25),
  zoomControl: true,
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap",
}).addTo(map);

const markerIcon = L.divIcon({
  className: "",
  html: '<div class="selected-marker"></div>',
  iconSize: [30, 40],
  iconAnchor: [15, 38],
});

const marker = L.marker(DEFAULT_POINT, {
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

let selectedPoint = DEFAULT_POINT;
let selectedName = "Симферополь";
let searchTimer;

function decodeHistoryPoints() {
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
  const points = decodeHistoryPoints().filter((point) =>
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
  if (historyMode) return;
  setPoint(event.latlng);
  hideResults();
});

marker.on("dragend", () => {
  if (historyMode) return;
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
  const payload = JSON.stringify({
    type: "manual_location",
    latitude: Number(selectedPoint.lat.toFixed(7)),
    longitude: Number(selectedPoint.lng.toFixed(7)),
    label: selectedName.slice(0, 120),
  });
  if (telegram?.sendData) {
    confirmButton.disabled = true;
    telegram.sendData(payload);
    window.setTimeout(() => telegram.close(), 250);
    return;
  }
  window.alert(`Выбрано: ${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideResults();
});

initializeHistoryMode();

window.setTimeout(() => {
  map.invalidateSize({ pan: false });
  if (!historyMode) {
    map.setView(selectedPoint, 10, { animate: false });
    marker.setLatLng(selectedPoint);
  }
}, 150);
