(function stabilizeTelegramMiniAppMap() {
  const telegram = window.Telegram?.WebApp;
  const storageKey = "crimea-fuel-point";
  const botUsername = "benz_test_bot";

  function refreshMap() {
    if (!window.__fuelMap) return;
    window.__fuelMap.invalidateSize({ pan: false });
  }

  function markerPoint() {
    if (!window.__fuelMarker) return null;
    return window.__fuelMarker.getLatLng();
  }

  function payloadFor(point) {
    const label = document.querySelector("#placeLabel")?.textContent || "Selected point";
    return {
      type: "manual_location",
      latitude: Number(point.lat.toFixed(7)),
      longitude: Number(point.lng.toFixed(7)),
      label: label.slice(0, 120),
      platform: String(telegram?.platform || "").slice(0, 24),
    };
  }

  function openBotWithLocation(point) {
    const lat = Number(point.lat.toFixed(7));
    const lon = Number(point.lng.toFixed(7));
    window.location.href = `https://t.me/${botUsername}?start=loc_${lat}_${lon}_map`;
  }

  function stabilizeTileFallback() {
    const fallbackPane = document.querySelector(".leaflet-fallback-map-pane");
    if (fallbackPane) {
      fallbackPane.style.zIndex = "180";
      fallbackPane.style.pointerEvents = "none";
    }

    const loadedTiles = Array.from(document.querySelectorAll(".leaflet-tile-loaded"));
    const hasRealTile = loadedTiles.some((tile) =>
      tile.naturalWidth > 1 && tile.naturalHeight > 1
    );
    if (fallbackPane && hasRealTile) {
      fallbackPane.style.display = "none";
    }

    document.body.classList.toggle("tiles-ready", hasRealTile);
    if (hasRealTile) document.body.classList.remove("tiles-loading");
  }

  function confirmSelectedPoint(event) {
    const button = event.target?.closest?.("#confirmButton");
    if (!button) return;

    const point = markerPoint();
    if (!point) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const selected = payloadFor(point);

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(selected));
    } catch {}

    button.disabled = true;
    button.classList.add("is-loading");

    if (telegram?.sendData) {
      try {
        telegram.sendData(JSON.stringify(selected));
      } catch {}

      const platform = String(telegram?.platform || "").toLowerCase();
      if (platform.includes("tdesktop") || platform.includes("web")) {
        window.setTimeout(() => openBotWithLocation(point), 900);
      } else {
        window.setTimeout(() => telegram.close?.(), 900);
      }
      return;
    }

    openBotWithLocation(point);
  }

  document.addEventListener("click", confirmSelectedPoint, true);

  const observer = new MutationObserver(() => {
    refreshMap();
    stabilizeTileFallback();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  [100, 300, 700, 1200, 2500, 5000].forEach((delay) => {
    window.setTimeout(() => {
      refreshMap();
      stabilizeTileFallback();
    }, delay);
  });

  window.setInterval(stabilizeTileFallback, 1500);
  window.addEventListener("resize", () => {
    refreshMap();
    stabilizeTileFallback();
  });
  telegram?.onEvent?.("viewportChanged", () => {
    refreshMap();
    stabilizeTileFallback();
  });
})();
