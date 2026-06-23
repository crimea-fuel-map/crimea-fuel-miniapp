(function keepTelegramMapResponsive() {
  const refresh = () => {
    if (!window.__fuelMap) return;
    window.__fuelMap.invalidateSize(true);
  };

  window.setTimeout(refresh, 250);
  window.setTimeout(refresh, 900);
  window.setTimeout(refresh, 1800);
  window.Telegram?.WebApp?.onEvent?.("viewportChanged", refresh);
})();
