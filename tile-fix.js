(function stabilizeTelegramMiniAppMap() {
  const telegram = window.Telegram?.WebApp;

  function refreshMap() {
    if (!window.__fuelMap) return;
    window.__fuelMap.invalidateSize({ pan: false });
  }

  function openBotWithLocation(point) {
    const lat = Number(point.lat.toFixed(7));
    const lon = Number(point.lng.toFixed(7));
    window.location.href = `https://t.me/benz_test_bot?start=loc_${lat}_${lon}_map`;
  }

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("#confirmButton");
    if (!button || !window.__fuelMarker || telegram?.sendData) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const point = window.__fuelMarker.getLatLng();
    const label = document.querySelector("#placeLabel")?.textContent || "Selected point";
    const selected = {
      type: "manual_location",
      latitude: Number(point.lat.toFixed(7)),
      longitude: Number(point.lng.toFixed(7)),
      label: label.slice(0, 120),
      platform: String(telegram?.platform || "").slice(0, 24),
    };

    try {
      window.localStorage.setItem("crimea-fuel-point", JSON.stringify(selected));
    } catch {}

    button.disabled = true;
    openBotWithLocation(point);
  }, true);

  window.setTimeout(refreshMap, 150);
  window.setTimeout(refreshMap, 500);
  window.setTimeout(refreshMap, 1200);
  window.addEventListener("resize", refreshMap);
  telegram?.onEvent?.("viewportChanged", refreshMap);
})();
