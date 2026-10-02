/**
 * app.js - Taiwan Live Weather Map (Windy Inspired)
 * Leaflet.js + OpenStreetMap Dark Tiles + g0v Taiwan Counties GeoJSON + CWA API
 */

document.addEventListener("DOMContentLoaded", () => {

  // ==========================================================================
  //  State
  // ==========================================================================
  const state = {
    currentCity: null,
    currentLayer: "temp",
    isDrawerOpen: true,
    allCitiesData: null,
    cityTemps: {},
    cityPops: {},
    cityWeathers: {},
    geoJsonLayer: null,
    tempLabelsLayer: null,
    showTempBadges: true,
    showBoundaries: true,
    typhoonEnabled: false,
    typhoons: [],
    selectedTyphoonId: null,
    typhoonCursor: 0,
    typhoonPlayback: null,
    typhoonLayer: null,
    obsMetric: null,
    observations: null,
    obsLayer: null,
    radarLayer: null
  };

  // ==========================================================================
  //  DOM refs
  // ==========================================================================
  const weatherDrawer = document.getElementById("weather-drawer");
  const closeDrawerBtn = document.getElementById("close-drawer-btn");
  const toggleDrawerBtn = document.getElementById("toggle-drawer-btn");
  const btnLoadAll = document.getElementById("btn-load-all");
  const btnTyphoonToggle = document.getElementById("btn-typhoon-toggle");
  const btnTyphoonRefresh = document.getElementById("btn-typhoon-refresh");
  const btnTyphoonRetry = document.getElementById("btn-typhoon-retry");
  const btnTyphoonPlay = document.getElementById("btn-typhoon-play");
  const typhoonState = document.getElementById("typhoon-state");
  const typhoonStatus = document.getElementById("typhoon-status");
  const typhoonError = document.getElementById("typhoon-error");
  const typhoonEmpty = document.getElementById("typhoon-empty");
  const typhoonList = document.getElementById("typhoon-list");
  const typhoonDetails = document.getElementById("typhoon-details");
  const typhoonTimelineSlider = document.getElementById("typhoon-timeline-slider");
  const toggleBoundaries = document.getElementById("toggle-boundaries");
  const toggleTempBadges = document.getElementById("toggle-temp-badges");
  const layerButtons = document.querySelectorAll(".layer-btn[data-layer]");
  const legendUnitText = document.getElementById("legend-unit-text");
  const legendHintText = document.getElementById("legend-hint-text");
  const legendBar = document.getElementById("legend-bar");
  const legendLabels = document.getElementById("legend-labels");

  const initialState = document.getElementById("initial-state");
  const loadingState = document.getElementById("loading-state");
  const errorState = document.getElementById("error-state");
  const contentState = document.getElementById("content-state");
  const loadingText = document.getElementById("loading-text");
  const errorTitle = document.getElementById("error-title");
  const errorDesc = document.getElementById("error-desc");
  const retryBtn = document.getElementById("retry-btn");

  const currentCityName = document.getElementById("current-city-name");
  const cityRegion = document.getElementById("city-region");
  const updateTimestamp = document.getElementById("update-timestamp");
  const summaryWeatherDesc = document.getElementById("summary-weather-desc");
  const summaryWeatherIcon = document.getElementById("summary-weather-icon");
  const summaryComfort = document.getElementById("summary-comfort");
  const summaryTempRange = document.getElementById("summary-temp-range");
  const summaryPop = document.getElementById("summary-pop");
  const forecastIntervalsContainer = document.getElementById("forecast-intervals-container");

  // ==========================================================================
  //  Constants & Helpers
  // ==========================================================================
  const REGION_MAP = {
    "基隆市": "北部地區", "臺北市": "北部地區", "新北市": "北部地區", "桃園市": "北部地區",
    "新竹市": "北部地區", "新竹縣": "北部地區", "宜蘭縣": "北部地區",
    "苗栗縣": "中部地區", "臺中市": "中部地區", "彰化縣": "中部地區",
    "南投縣": "中部地區", "雲林縣": "中部地區",
    "嘉義市": "南部地區", "嘉義縣": "南部地區", "臺南市": "南部地區",
    "高雄市": "南部地區", "屏東縣": "南部地區",
    "花蓮縣": "東部地區", "臺東縣": "東部地區",
    "澎湖縣": "離島地區", "金門縣": "離島地區", "連江縣": "離島地區"
  };

  // GeoJSON COUNTYNAME → 系統 CWA 名稱 (處理「台」vs「臺」問題)
  const NAME_ALIAS = {
    "台北市": "臺北市", "台中市": "臺中市", "台南市": "臺南市", "台東縣": "臺東縣",
    "桃園縣": "桃園市"
  };
  function normalizeCityName(n) { return NAME_ALIAS[n] || n; }

  function getWeatherIcon(w) {
    if (!w) return "⛅";
    if (w.includes("晴")) return w.includes("雲") ? "🌤️" : "☀️";
    if (w.includes("雨") || w.includes("陣雨")) return w.includes("雷") ? "⛈️" : "🌧️";
    if (w.includes("陰") || w.includes("多雲")) return "☁️";
    return "⛅";
  }

  function getTempColor(t) {
    if (t <= 5) return "#2c7bb6";
    if (t <= 10) return "#5aa2cf";
    if (t <= 15) return "#abd9e9";
    if (t <= 20) return "#7fcdbb";
    if (t <= 24) return "#d9ef8b";
    if (t <= 28) return "#fee08b";
    if (t <= 32) return "#fdae61";
    if (t <= 36) return "#f46d43";
    return "#d73027";
  }

  function getRainColor(p) {
    if (p <= 10) return "#94a3b8";
    if (p <= 30) return "#38bdf8";
    if (p <= 50) return "#22c55e";
    if (p <= 70) return "#facc15";
    if (p <= 90) return "#f97316";
    return "#dc2626";
  }

  // ==========================================================================
  //  1. Initialise Leaflet Map
  // ==========================================================================
  const map = L.map("leaflet-map", {
    center: [23.7, 121],
    zoom: 7,
    minZoom: 6,
    maxZoom: 12,
    zoomSnap: 0.25,
    zoomControl: false,
    attributionControl: false
  });
  state.typhoonLayer = L.layerGroup();

  // CARTO Voyager
  const voyagerTiles = L.tileLayer(
    "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_3v36_1_fda4eba4a7c33c44504087c6",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>',
      maxZoom: 18
    }
  );

  // Taiwan's official electronic map provides local Chinese place labels.
  const nlscTiles = L.tileLayer(
    "https://wmts.nlsc.gov.tw/wmts/EMAP/default/EPSG:3857/{z}/{y}/{x}",
    {
      attribution: '&copy; <a href="https://maps.nlsc.gov.tw/">內政部國土測繪中心</a>',
      minZoom: 6,
      maxZoom: 18
    }
  );

  const BASEMAPS = {
    standard: L.layerGroup([voyagerTiles, nlscTiles]),
    dark: L.tileLayer(
      "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=cb1_3v36_1_fda4eba4a7c33c44504087c6",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18
      }
    )
  };
  let activeBasemap = BASEMAPS.standard.addTo(map);

  L.control.attribution({
    position: "bottomleft"
  }).addTo(map);

  L.control.zoom({
    position: "bottomleft"
  }).addTo(map);

  function formatTyphoonTime(value) {
    if (!value) return "時間未提供";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-TW", {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  function selectedTyphoon() {
    return state.typhoons.find(storm => storm.id === state.selectedTyphoonId) || null;
  }

  function typhoonTimeline(storm) {
    if (!storm) return [];
    const history = (storm.history || []).map(point => ({ ...point, kind: "observed" }));
    const points = storm.current ? [...history, { ...storm.current, kind: "current" }] : history;
    return points.concat((storm.forecasts || []).map(point => ({ ...point, kind: "forecast" })));
  }

  function formatValue(value, suffix, digits = 0) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return `${Number(value).toFixed(digits)}${suffix}`;
  }

  function destinationPoint(lat, lon, bearing, distanceKm) {
    const earthRadiusKm = 6371;
    const angular = distanceKm / earthRadiusKm;
    const bearingRad = bearing * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearingRad));
    const lon2 = lon1 + Math.atan2(Math.sin(bearingRad) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
    return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];
  }

  function drawTyphoonRadius(point, radius, quadrants, color, label, dashArray) {
    if (!point || !(Number(radius) > 0)) return;
    const center = [point.latitude, point.longitude];
    const directions = { NE: [0, 90], SE: [90, 180], SW: [180, 270], NW: [270, 360] };
    const validQuadrants = quadrants && Object.keys(quadrants).some(key => Number(quadrants[key]) > 0);
    const style = { color, weight: 2, opacity: 0.95, fillColor: color, fillOpacity: 0.1, dashArray: dashArray || null };
    if (validQuadrants) {
      Object.entries(directions).forEach(([direction, [start, end]]) => {
        const distance = Number(quadrants[direction]);
        if (!(distance > 0)) return;
        const arc = [];
        for (let bearing = start; bearing <= end; bearing += 15) arc.push(destinationPoint(point.latitude, point.longitude, bearing, distance));
        if (arc.at(-1)?.[0] !== destinationPoint(point.latitude, point.longitude, end, distance)[0]) {
          arc.push(destinationPoint(point.latitude, point.longitude, end, distance));
        }
        L.polygon([center, ...arc, center], style).bindTooltip(`${label} ${direction}: ${distance} km`).addTo(state.typhoonLayer);
      });
    } else {
      L.circle(center, { ...style, radius: Number(radius) * 1000 }).bindTooltip(`${label}: ${Number(radius)} km`).addTo(state.typhoonLayer);
    }
  }

  function renderTyphoonTrack(storm, cursor = state.typhoonCursor) {
    if (!state.typhoonLayer) return;
    state.typhoonLayer.clearLayers();
    const timeline = typhoonTimeline(storm);
    if (!timeline.length) return;

    const currentIndex = timeline.findIndex(point => point.kind === "current");
    const splitIndex = currentIndex >= 0 ? currentIndex : Math.max(0, (storm.history || []).length - 1);
    const observed = timeline.slice(0, splitIndex + 1);
    const forecast = timeline.slice(splitIndex).filter(point => point.kind !== "observed");
    if (observed.length > 1) {
      L.polyline(observed.map(point => [point.latitude, point.longitude]), {
        color: "#38bdf8", weight: 4, opacity: 0.95
      }).addTo(state.typhoonLayer);
    }
    if (forecast.length > 1) {
      L.polyline(forecast.map(point => [point.latitude, point.longitude]), {
        color: "#fb923c", weight: 4, opacity: 0.95, dashArray: "10 8"
      }).addTo(state.typhoonLayer);
    }

    (storm.forecasts || []).forEach(point => {
      L.circleMarker([point.latitude, point.longitude], {
        radius: 5, color: "#fff7ed", weight: 2, fillColor: "#f97316", fillOpacity: 1
      }).bindTooltip(`${formatTyphoonTime(point.time)}${point.forecast_hour != null ? ` (+${point.forecast_hour}h)` : ""}`).addTo(state.typhoonLayer);
      if (Number(point.radius_70_percent_km) > 0) {
        drawTyphoonRadius(point, point.radius_70_percent_km, null, "#c084fc", "70% 機率半徑", "5 6");
      }
    });

    const point = timeline[Math.max(0, Math.min(cursor, timeline.length - 1))];
    const name = storm.name_zh || storm.name_en || "熱帶氣旋";
    L.marker([point.latitude, point.longitude], {
      icon: L.divIcon({ className: "typhoon-center-marker", html: "<span aria-hidden='true'>🌀</span>", iconSize: [42, 42], iconAnchor: [21, 21] }),
      zIndexOffset: 1000
    }).bindTooltip(escapeHtml(name)).addTo(state.typhoonLayer);

    drawTyphoonRadius(point, point.radius_15ms_km, point.radius_15ms_quadrants_km, "#22d3ee", "七級風圈");
    drawTyphoonRadius(point, point.radius_25ms_km, point.radius_25ms_quadrants_km, "#fbbf24", "十級風圈");
    if (state.typhoonEnabled && !map.hasLayer(state.typhoonLayer)) state.typhoonLayer.addTo(map);
  }

  function setTyphoonDetail(storm, point) {
    const text = (id, value) => { document.getElementById(id).textContent = value || "—"; };
    text("typhoon-name-zh", storm.name_zh || storm.name_en || "熱帶氣旋");
    text("typhoon-name-en", storm.name_en || "");
    text("typhoon-classification", storm.classification === "typhoon" ? "颱風" : storm.classification === "tropical_depression" ? "熱帶性低氣壓" : "熱帶氣旋");
    text("typhoon-point-time", formatTyphoonTime(point.time));
    text("typhoon-wind", formatValue(point.max_wind_speed_ms, " m/s", 1));
    text("typhoon-gust", formatValue(point.max_gust_speed_ms, " m/s", 1));
    text("typhoon-pressure", formatValue(point.pressure_hpa, " hPa"));
    const motion = point.moving_direction || point.moving_speed_kmh != null
      ? `${point.moving_direction || "方向未提供"} / ${formatValue(point.moving_speed_kmh, " km/h", 0)}` : "—";
    text("typhoon-motion", motion);
    text("typhoon-prediction", point.moving_prediction || "—");
    document.getElementById("typhoon-timeline-kind").textContent = point.kind === "forecast" ? "預報位置" : point.kind === "current" ? "目前位置" : "歷史分析位置";
    document.getElementById("typhoon-timeline-time").textContent = formatTyphoonTime(point.time);
    document.getElementById("typhoon-timeline-hour").textContent = point.forecast_hour != null ? `預報 +${point.forecast_hour} 小時` : "";
  }

  function selectTyphoon(stormId, fit = true) {
    const storm = state.typhoons.find(item => item.id === stormId);
    if (!storm) return;
    state.selectedTyphoonId = stormId;
    state.typhoonCursor = Math.max(0, (storm.history || []).length);
    typhoonList.querySelectorAll(".typhoon-choice").forEach(button => {
      const selected = button.dataset.stormId === stormId;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const timeline = typhoonTimeline(storm);
    typhoonTimelineSlider.max = String(Math.max(0, timeline.length - 1));
    typhoonTimelineSlider.value = String(state.typhoonCursor);
    typhoonTimelineSlider.disabled = timeline.length < 2;
    typhoonDetails.classList.remove("hidden");
    setTyphoonDetail(storm, timeline[state.typhoonCursor] || timeline[0]);
    renderTyphoonTrack(storm, state.typhoonCursor);

    if (fit) {
      const bounds = L.latLngBounds(timeline.map(point => [point.latitude, point.longitude]));
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.15), { maxZoom: 8, padding: [70, 70] });
    }
  }

  function renderTyphoonList() {
    typhoonList.replaceChildren();
    state.typhoons.forEach(storm => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "typhoon-choice";
      button.dataset.stormId = storm.id;
      button.setAttribute("aria-pressed", "false");
      const name = storm.name_zh || storm.name_en || "未命名熱帶氣旋";
      const english = storm.name_en && storm.name_zh ? ` · ${storm.name_en}` : "";
      const latest = storm.current;
      button.innerHTML = `<span class="typhoon-choice-symbol" aria-hidden="true">🌀</span><span class="typhoon-choice-copy"><strong>${escapeHtml(name + english)}</strong><small>${latest ? `目前 ${formatValue(latest.max_wind_speed_ms, " m/s", 0)} · ${formatTyphoonTime(latest.time)}` : "尚無目前定位"}</small></span><span aria-hidden="true">›</span>`;
      button.addEventListener("click", () => selectTyphoon(storm.id));
      typhoonList.appendChild(button);
    });
  }

  async function loadTyphoons(forceRefresh = false) {
    typhoonStatus.textContent = "正在取得中央氣象署颱風資料…";
    typhoonError.classList.add("hidden");
    btnTyphoonRetry.classList.add("hidden");
    typhoonEmpty.classList.add("hidden");
    try {
      const response = await fetch(`/api/typhoons${forceRefresh ? "?refresh=true" : ""}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "暫時無法取得颱風資料。");
      state.typhoons = Array.isArray(data.cyclones) ? data.cyclones : [];
      typhoonStatus.textContent = `資料時間：${formatTyphoonTime(data.updated_at)} · 來源：中央氣象署`;
      renderTyphoonList();
      typhoonEmpty.classList.toggle("hidden", state.typhoons.length > 0);
      if (!state.typhoons.length) {
        typhoonDetails.classList.add("hidden");
        state.selectedTyphoonId = null;
        state.typhoonLayer.clearLayers();
        return;
      }
      const selected = state.typhoons.some(storm => storm.id === state.selectedTyphoonId)
        ? state.selectedTyphoonId : state.typhoons[0].id;
      selectTyphoon(selected, !state.selectedTyphoonId);
    } catch (error) {
      typhoonStatus.textContent = "颱風資料更新失敗";
      typhoonError.textContent = error.message || "連線失敗，請稍後重試。";
      typhoonError.classList.remove("hidden");
      btnTyphoonRetry.classList.remove("hidden");
    }
  }

  function setTyphoonMode(enabled) {
    state.typhoonEnabled = enabled;
    btnTyphoonToggle.classList.toggle("active", enabled);
    btnTyphoonToggle.setAttribute("aria-pressed", String(enabled));
    if (enabled) {
      weatherDrawer.classList.remove("collapsed");
      initialState.classList.add("hidden");
      loadingState.classList.add("hidden");
      errorState.classList.add("hidden");
      contentState.classList.add("hidden");
      typhoonState.classList.remove("hidden");
      if (!map.hasLayer(state.typhoonLayer)) state.typhoonLayer.addTo(map);
      loadTyphoons(false);
    } else {
      if (map.hasLayer(state.typhoonLayer)) map.removeLayer(state.typhoonLayer);
      typhoonState.classList.add("hidden");
      loadingState.classList.add("hidden");
      errorState.classList.add("hidden");
      if (state.currentCity) {
        initialState.classList.add("hidden");
        contentState.classList.remove("hidden");
      } else {
        contentState.classList.add("hidden");
        initialState.classList.remove("hidden");
      }
      stopTyphoonPlayback();
    }
  }

  function stopTyphoonPlayback() {
    if (state.typhoonPlayback) window.clearInterval(state.typhoonPlayback);
    state.typhoonPlayback = null;
    btnTyphoonPlay.textContent = "播放";
    btnTyphoonPlay.setAttribute("aria-pressed", "false");
  }

  function setTyphoonTimeline(index) {
    const storm = selectedTyphoon();
    const timeline = typhoonTimeline(storm);
    if (!storm || !timeline.length) return;
    state.typhoonCursor = Math.max(0, Math.min(Number(index), timeline.length - 1));
    typhoonTimelineSlider.value = String(state.typhoonCursor);
    setTyphoonDetail(storm, timeline[state.typhoonCursor]);
    renderTyphoonTrack(storm, state.typhoonCursor);
  }

  btnTyphoonToggle.addEventListener("click", () => setTyphoonMode(!state.typhoonEnabled));
  btnTyphoonRefresh.addEventListener("click", () => loadTyphoons(true));
  btnTyphoonRetry.addEventListener("click", () => loadTyphoons(true));
  typhoonTimelineSlider.addEventListener("input", event => setTyphoonTimeline(event.target.value));
  btnTyphoonPlay.addEventListener("click", () => {
    if (state.typhoonPlayback) {
      stopTyphoonPlayback();
      return;
    }
    const max = Number(typhoonTimelineSlider.max);
    if (max < 1) return;
    btnTyphoonPlay.textContent = "暫停";
    btnTyphoonPlay.setAttribute("aria-pressed", "true");
    state.typhoonPlayback = window.setInterval(() => {
      const next = state.typhoonCursor >= max ? 0 : state.typhoonCursor + 1;
      setTyphoonTimeline(next);
    }, 1200);
  });

  // ==========================================================================
  //  2. Load Counties GeoJSON
  // ==========================================================================
  async function loadGeoJson() {
    try {
      const res = await fetch("/static/taiwan_counties.geojson");
      if (!res.ok) throw new Error("GeoJSON 載入失敗");
      const geojsonData = await res.json();

      state.geoJsonLayer = L.geoJSON(geojsonData, {
        style: defaultGeoStyle,
        onEachFeature: onEachCounty
      }).addTo(map);

      state.tempLabelsLayer = L.layerGroup().addTo(map);
    } catch (err) {
      console.error("無法載入台灣縣市 GeoJSON:", err);
    }
  }

  function defaultGeoStyle() {
    return {
      fillColor: "#1e293b",
      fillOpacity: 0.55,
      color: "#475569",
      weight: 1.8,
      opacity: 0.9
    };
  }

  function onEachCounty(feature, layer) {
    const rawName = feature.properties.COUNTYNAME || feature.properties.name || "";
    const cityName = normalizeCityName(rawName);
    feature.properties._cwaCityName = cityName;

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({ weight: 3, color: "#ffffff", fillOpacity: 0.75 });
        l.bringToFront();
      },
      mouseout: (e) => {
        if (state.currentCity !== cityName) {
          state.geoJsonLayer.resetStyle(e.target);
          applyLayerColorToFeature(e.target, cityName);
        }
      },
      click: () => {
        selectCity(cityName);
      }
    });

    layer.bindTooltip(cityName, {
      sticky: true,
      className: "weather-county-tooltip",
      direction: "top",
      offset: [0, -10]
    });
  }

  // ==========================================================================
  //  3. Select City
  // ==========================================================================
  function selectCity(cityName) {
    if (state.typhoonEnabled) setTyphoonMode(false);
    // Reset previous selection
    if (state.geoJsonLayer) {
      state.geoJsonLayer.eachLayer(l => {
        const cn = l.feature.properties._cwaCityName;
        state.geoJsonLayer.resetStyle(l);
        applyLayerColorToFeature(l, cn);
      });
    }

    // Highlight selected
    if (state.geoJsonLayer) {
      state.geoJsonLayer.eachLayer(l => {
        if (l.feature.properties._cwaCityName === cityName) {
          l.setStyle({ weight: 3.5, color: "#f59e0b", fillOpacity: 0.85 });
          l.bringToFront();
          map.fitBounds(l.getBounds(), { padding: [80, 80], maxZoom: 10 });
        }
      });
    }

    state.currentCity = cityName;
    openDrawer();
    loadWeather(cityName);
  }

  // ==========================================================================
  //  4. Load Single City Weather
  // ==========================================================================
  async function loadWeather(cityName) {
    showLoading(cityName);
    try {
      const res = await fetch(`/api/weather/${encodeURIComponent(cityName)}`);
      const data = await res.json();

      if (!res.ok) {
        const detail = data && data.detail ? data.detail : "";
        if (res.status === 404) showError("找不到指定縣市", "請選擇有效的台灣 22 縣市。");
        else if (detail.includes("CWA_API_KEY")) showError("系統尚未設定 CWA_API_KEY", "請於 .env 設定有效的 CWA_API_KEY。");
        else if (detail.includes("資料庫")) showError("資料庫讀取失敗", "SQLite 資料庫無法完成查詢或儲存。");
        else showError("無法取得氣象資料", detail || "請檢查網路連線或 API 金鑰配置。");
        return;
      }

      if (data.forecasts && data.forecasts.length > 0) {
        const f = data.forecasts[0];
        const avg = Math.round((f.min_temp + f.max_temp) / 2);
        state.cityTemps[cityName] = avg;
        state.cityPops[cityName] = f.pop;
        state.cityWeathers[cityName] = f.weather;
        applyCurrentLayerColorsSingle(cityName);
        updateTempLabels();
      }

      renderWeatherDashboard(data);
    } catch (err) {
      console.error("Fetch weather failed:", err);
      showError("無法取得氣象資料", "連線伺服器發生異常，請稍後再試。");
    }
  }

  // ==========================================================================
  //  5. Render Weather Dashboard
  // ==========================================================================
  function renderWeatherDashboard(data) {
    const forecasts = data.forecasts || [];
    if (!forecasts.length) { showError("無可用預報資料", "目前該縣市查無有效時段預報。"); return; }

    const first = forecasts[0];
    const city = data.city;

    currentCityName.textContent = city;
    cityRegion.textContent = REGION_MAP[city] || "台灣縣市";
    updateTimestamp.textContent = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
    summaryWeatherDesc.textContent = first.weather || "多雲";
    summaryWeatherIcon.textContent = getWeatherIcon(first.weather);
    summaryComfort.textContent = first.comfort || "舒適";
    summaryTempRange.textContent = `${first.min_temp}°C ~ ${first.max_temp}°C`;
    summaryPop.textContent = `${first.pop}%`;

    forecastIntervalsContainer.innerHTML = "";
    forecasts.forEach((f, i) => forecastIntervalsContainer.appendChild(createBarCard(f, i)));

    requestAnimationFrame(() => {
      document.querySelectorAll(".bar-fill").forEach(b => { b.style.width = b.dataset.targetWidth || "0%"; });
    });

    showContent();
  }

  function createBarCard(f, idx) {
    const card = document.createElement("div");
    card.className = "interval-card";
    const s = f.start_time ? f.start_time.substring(5) : "";
    const e = f.end_time ? f.end_time.substring(5) : "";
    const mxW = Math.min(100, Math.max(5, (f.max_temp / 45) * 100));
    const mnW = Math.min(100, Math.max(5, (f.min_temp / 45) * 100));
    const ppW = Math.min(100, Math.max(2, f.pop));
    card.innerHTML = `
      <div class="interval-header">
        <span class="interval-time">🕒 時段 ${idx + 1}：${s} ~ ${e}</span>
        <span class="interval-weather">${getWeatherIcon(f.weather)} ${f.weather}（${f.comfort || "舒適"}）</span>
      </div>
      <div class="bar-chart-group">
        <div class="bar-row"><span class="bar-label">最高溫</span><div class="bar-track"><div class="bar-fill bar-maxt" data-target-width="${mxW.toFixed(1)}%"></div></div><span class="bar-val">${f.max_temp}°C</span></div>
        <div class="bar-row"><span class="bar-label">最低溫</span><div class="bar-track"><div class="bar-fill bar-mint" data-target-width="${mnW.toFixed(1)}%"></div></div><span class="bar-val">${f.min_temp}°C</span></div>
        <div class="bar-row"><span class="bar-label">降雨機率</span><div class="bar-track"><div class="bar-fill bar-pop" data-target-width="${ppW}%"></div></div><span class="bar-val">${f.pop}%</span></div>
      </div>`;
    return card;
  }

  // ==========================================================================
  //  6. Load All & Heatmap
  // ==========================================================================
  async function loadAllCitiesData() {
    btnLoadAll.disabled = true;
    btnLoadAll.innerHTML = "<span>⏳ 正在同步全台資料...</span>";
    try {
      const res = await fetch("/api/weather");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "無法取得全台資料");

      state.allCitiesData = data.forecasts || [];
      const seen = {};
      state.allCitiesData.forEach(f => {
        const c = f.city;
        if (!seen[c]) {
          seen[c] = true;
          state.cityTemps[c] = Math.round((f.min_temp + f.max_temp) / 2);
          state.cityPops[c] = f.pop;
          state.cityWeathers[c] = f.weather;
        }
      });

      applyCurrentLayerColors();
      updateTempLabels();

      btnLoadAll.innerHTML = "<span>✅ 全台資料已就緒</span>";
      setTimeout(() => { btnLoadAll.disabled = false; btnLoadAll.innerHTML = "<span>🔄 重新整理熱力分佈</span>"; }, 2000);
    } catch (err) {
      console.error("Load all weather failed:", err);
      btnLoadAll.disabled = false;
      btnLoadAll.innerHTML = "<span>⚠️ 載入失敗 (重試)</span>";
    }
  }

  // ==========================================================================
  //  7. Layer Color Application
  // ==========================================================================
  function applyCurrentLayerColors() {
    if (!state.geoJsonLayer) return;
    state.geoJsonLayer.eachLayer(l => {
      const cn = l.feature.properties._cwaCityName;
      applyLayerColorToFeature(l, cn);
    });
  }

  function applyCurrentLayerColorsSingle(cityName) {
    if (!state.geoJsonLayer) return;
    state.geoJsonLayer.eachLayer(l => {
      if (l.feature.properties._cwaCityName === cityName) {
        applyLayerColorToFeature(l, cityName);
      }
    });
  }

  function applyLayerColorToFeature(layer, cityName) {
    // Dim county fills while station dots are shown.
    if (state.obsMetric) {
      layer.setStyle({ fillColor: "#0f172a", fillOpacity: 0.12, color: state.showBoundaries ? "#334155" : "transparent", weight: 1.2 });
      return;
    }
    const t = state.cityTemps[cityName];
    const p = state.cityPops[cityName];

    if (state.currentLayer === "temp" && t !== undefined) {
      layer.setStyle({ fillColor: getTempColor(t), fillOpacity: 0.82, color: state.showBoundaries ? "#0f172a" : "transparent", weight: 2 });
    } else if (state.currentLayer === "rain" && p !== undefined) {
      layer.setStyle({ fillColor: getRainColor(p), fillOpacity: 0.84, color: state.showBoundaries ? "#0f172a" : "transparent", weight: 2 });
    } else {
      layer.setStyle({ fillColor: "#1e293b", fillOpacity: 0.55, color: state.showBoundaries ? "#475569" : "transparent", weight: 1.8 });
    }
  }

  // ==========================================================================
  //  8. Temperature Badge Labels on Map
  // ==========================================================================
  // Show county names only when zoomed in far enough to avoid overlapping badges.
  const BADGE_NAME_MIN_ZOOM = 9;

  // Pick dark or light text so the badge stays readable on any scale colour.
  function badgeTextColor(hex) {
    const n = parseInt(hex.slice(1), 16);
    const luminance = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return luminance > 0.6 ? "#0f172a" : "#ffffff";
  }

  function updateTempLabels() {
    if (!state.tempLabelsLayer || !state.geoJsonLayer) return;
    state.tempLabelsLayer.clearLayers();
    if (!state.showTempBadges || state.obsMetric) return;

    const showName = map.getZoom() >= BADGE_NAME_MIN_ZOOM;
    state.geoJsonLayer.eachLayer(l => {
      const cn = l.feature.properties._cwaCityName;
      const shortName = cn.replace("市", "").replace("縣", "");
      let value = "";
      let bg = "#0f172a";
      if (state.currentLayer === "temp" && state.cityTemps[cn] !== undefined) {
        value = `${state.cityTemps[cn]}°`;
        bg = getTempColor(state.cityTemps[cn]);
      } else if (state.currentLayer === "rain" && state.cityPops[cn] !== undefined) {
        value = `${state.cityPops[cn]}%`;
        bg = getRainColor(state.cityPops[cn]);
      } else if (state.currentLayer === "weather" && state.cityWeathers[cn]) {
        value = getWeatherIcon(state.cityWeathers[cn]);
      }
      if (!value) return;

      const isWeather = state.currentLayer === "weather";
      const label = showName && !isWeather ? `<span class="badge-name">${shortName}</span>${value}` : value;
      const marker = L.marker(l.getBounds().getCenter(), {
        icon: L.divIcon({
          className: "map-badge-anchor",
          html: `<span class="map-data-badge${isWeather ? " weather-map-badge" : ""}" style="--badge-bg:${bg};--badge-fg:${badgeTextColor(bg)}" title="${cn}">${label}</span>`,
          iconSize: [0, 0]
        }),
        interactive: false,
        keyboard: false
      });
      state.tempLabelsLayer.addLayer(marker);
    });
  }

  map.on("zoomend", updateTempLabels);

  // ==========================================================================
  //  9. Layer Switching
  // ==========================================================================
  const TEMP_GRADIENT = ["#2c7bb6", "#5aa2cf", "#abd9e9", "#7fcdbb", "#d9ef8b", "#fee08b", "#fdae61", "#f46d43", "#d73027"];
  const TEMP_TICKS = ["5", "10", "15", "20", "24", "28", "32", "36"];
  const LEGENDS = {
    temp: { unit: "氣溫 °C", hint: "5°C ~ 36°C", colors: TEMP_GRADIENT, ticks: TEMP_TICKS },
    rain: { unit: "降雨機率 %", hint: "0% ~ 100%", colors: ["#94a3b8", "#38bdf8", "#22c55e", "#facc15", "#f97316", "#dc2626"], ticks: ["0%", "20%", "40%", "60%", "80%", "100%"] },
    weather: { unit: "天氣狀況", hint: "現象圖標", colors: ["#f59e0b", "#38bdf8", "#64748b", "#3b82f6"], ticks: ["晴天", "多雲", "陰天", "雨天"] },
    obs_temp: { unit: "測站氣溫 °C", hint: "即時觀測", colors: TEMP_GRADIENT, ticks: TEMP_TICKS },
    obs_rain: { unit: "今日累積雨量 mm", hint: "即時觀測", colors: ["#94a3b8", "#7dd3fc", "#22c55e", "#facc15", "#f97316", "#dc2626"], ticks: ["0", "0.5", "10", "40", "80", "200"] },
    obs_wind: { unit: "風速 m/s", hint: "箭頭＝風吹去的方向", colors: ["#a7f3d0", "#34d399", "#facc15", "#f97316", "#dc2626"], ticks: ["0", "3.4", "5.5", "8", "10.8"] },
    obs_humidity: { unit: "相對濕度 %", hint: "即時觀測", colors: ["#f59e0b", "#fde68a", "#a5f3fc", "#38bdf8", "#2563eb"], ticks: ["0", "40", "60", "75", "90"] }
  };

  function renderLegend(key) {
    const legend = LEGENDS[key];
    legendUnitText.textContent = legend.unit;
    legendHintText.textContent = legend.hint;
    legendBar.style.background = `linear-gradient(to right, ${legend.colors.join(", ")})`;
    legendLabels.innerHTML = legend.ticks.map(t => `<span>${t}</span>`).join("");
  }

  function switchLayer(layer) {
    state.currentLayer = layer;
    layerButtons.forEach(b => b.classList.toggle("active", b.dataset.layer === layer));
    if (state.obsMetric) setObsMetric(null);
    renderLegend(layer);

    if (!state.allCitiesData) { loadAllCitiesData(); }
    else { applyCurrentLayerColors(); updateTempLabels(); }
  }

  layerButtons.forEach(b => b.addEventListener("click", () => switchLayer(b.dataset.layer)));
  btnLoadAll.addEventListener("click", loadAllCitiesData);

  toggleBoundaries.addEventListener("change", (e) => {
    state.showBoundaries = e.target.checked;
    applyCurrentLayerColors();
  });
  toggleTempBadges.addEventListener("change", (e) => {
    state.showTempBadges = e.target.checked;
    updateTempLabels();
  });

  // ==========================================================================
  //  10. Drawer Controls
  // ==========================================================================
  function openDrawer() { weatherDrawer.classList.remove("collapsed"); state.isDrawerOpen = true; }
  function closeDrawer() { weatherDrawer.classList.add("collapsed"); state.isDrawerOpen = false; }
  closeDrawerBtn.addEventListener("click", closeDrawer);
  toggleDrawerBtn.addEventListener("click", () => state.isDrawerOpen ? closeDrawer() : openDrawer());

  function showLoading(city) {
    loadingText.textContent = `Loading... 正在取得：${city}`;
    initialState.classList.add("hidden"); errorState.classList.add("hidden");
    contentState.classList.add("hidden"); loadingState.classList.remove("hidden");
  }
  function showError(t, d) {
    errorTitle.textContent = t; errorDesc.textContent = d;
    initialState.classList.add("hidden"); loadingState.classList.add("hidden");
    contentState.classList.add("hidden"); errorState.classList.remove("hidden");
  }
  function showContent() {
    initialState.classList.add("hidden"); loadingState.classList.add("hidden");
    errorState.classList.add("hidden"); contentState.classList.remove("hidden");
  }
  retryBtn.addEventListener("click", () => { if (state.currentCity) loadWeather(state.currentCity); });

  // Mobile: the layer panel is hidden behind a toggle button in the nav bar.
  const mapControls = document.getElementById("map-controls");
  const toggleControlsBtn = document.getElementById("toggle-controls-btn");
  toggleControlsBtn.addEventListener("click", () => {
    const open = mapControls.classList.toggle("open");
    toggleControlsBtn.setAttribute("aria-expanded", String(open));
  });

  // Fit Taiwan (main island + Penghu) into the part of the map not covered by floating panels.
  const TAIWAN_MAIN_BOUNDS = L.latLngBounds([21.85, 119.3], [25.35, 122.05]);
  function fitTaiwan() {
    const mapRect = map.getContainer().getBoundingClientRect();
    const navRect = document.querySelector(".floating-nav").getBoundingClientRect();
    const isDesktop = window.innerWidth > 900;
    const pad = { top: navRect.bottom - mapRect.top + 12, left: 16, right: 16, bottom: 16 };
    if (state.isDrawerOpen) {
      const d = weatherDrawer.getBoundingClientRect();
      if (isDesktop) pad.left = d.right - mapRect.left + 16;
      else pad.bottom = mapRect.bottom - d.top + 16;
    }
    if (isDesktop) pad.right = mapRect.right - mapControls.getBoundingClientRect().left + 16;
    map.fitBounds(TAIWAN_MAIN_BOUNDS, {
      paddingTopLeft: [pad.left, pad.top],
      paddingBottomRight: [pad.right, pad.bottom],
      animate: false
    });
  }

  // ==========================================================================
  //  11. Weather Warnings Banner
  // ==========================================================================
  const warningBanner = document.getElementById("warning-banner");
  const warningToggle = document.getElementById("warning-toggle");

  async function loadWarnings() {
    try {
      const res = await fetch("/api/warnings");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { warnings } = await res.json();
      if (!warnings.length) return;
      document.getElementById("warning-count").textContent = warnings.length;
      document.getElementById("warning-names").textContent = warnings.map(w => w.title).join("、");
      document.getElementById("warning-list").innerHTML = warnings.map(w => `
        <article class="warning-item">
          <div class="warning-item-head">
            <span class="warning-tag">${escapeHtml(w.title)}</span>
            <span class="warning-time">有效至 ${escapeHtml(w.end_time.substring(5))}</span>
          </div>
          <p class="warning-text">${escapeHtml(w.text)}</p>
          ${w.areas.length ? `<p class="warning-areas">影響：${w.areas.map(escapeHtml).join("、")}</p>` : ""}
        </article>`).join("");
      warningBanner.classList.remove("hidden");
    } catch (err) {
      // Warnings are optional; keep the banner hidden when they cannot be loaded.
      console.error("Load warnings failed:", err);
    }
  }

  warningToggle.addEventListener("click", () => {
    const collapsed = warningBanner.classList.toggle("collapsed");
    warningToggle.setAttribute("aria-expanded", String(!collapsed));
  });

  // ==========================================================================
  //  12. Real-time Station Observations
  // ==========================================================================
  const obsButtons = document.querySelectorAll(".obs-btn");
  const obsMsg = document.getElementById("obs-msg");
  state.obsLayer = L.layerGroup();

  function bandColor(value, steps, colors) {
    let i = 0;
    while (i < steps.length && value >= steps[i]) i++;
    return colors[i];
  }

  const OBS_METRICS = {
    temp: { field: "temp", unit: "°C", color: v => getTempColor(v) },
    rain: { field: "rain", unit: " mm", color: v => bandColor(v, [0.5, 10, 40, 80, 200], LEGENDS.obs_rain.colors) },
    wind: { field: "wind_speed", unit: " m/s", color: v => bandColor(v, [3.4, 5.5, 8, 10.8], LEGENDS.obs_wind.colors) },
    humidity: { field: "humidity", unit: "%", color: v => bandColor(v, [40, 60, 75, 90], LEGENDS.obs_humidity.colors) }
  };

  function fmt(value, unit) {
    return value === null || value === undefined ? "—" : `${value}${unit}`;
  }

  function stationPopup(s) {
    return `
      <div class="station-popup">
        <strong>${escapeHtml(s.name)}</strong> <span>${escapeHtml(s.county)}${escapeHtml(s.town)}</span>
        <dl>
          <dt>天氣</dt><dd>${escapeHtml(s.weather || "—")}</dd>
          <dt>氣溫</dt><dd>${fmt(s.temp, "°C")}</dd>
          <dt>今日雨量</dt><dd>${fmt(s.rain, " mm")}</dd>
          <dt>風速</dt><dd>${fmt(s.wind_speed, " m/s")}</dd>
          <dt>濕度</dt><dd>${fmt(s.humidity, "%")}</dd>
        </dl>
        <small>觀測時間 ${escapeHtml(state.observations.summary.obs_time)}</small>
      </div>`;
  }

  function renderObservations() {
    state.obsLayer.clearLayers();
    const metric = OBS_METRICS[state.obsMetric];
    if (!metric || !state.observations) return;
    state.observations.stations.forEach(s => {
      const value = s[metric.field];
      if (value === null) return;
      const color = metric.color(value);
      let marker;
      if (state.obsMetric === "wind" && s.wind_dir !== null && value > 0) {
        // CWA wind direction is where the wind comes from; the arrow points downwind.
        marker = L.marker([s.lat, s.lon], {
          icon: L.divIcon({
            className: "map-badge-anchor",
            html: `<span class="wind-arrow" style="--arrow-color:${color};transform:translate(-50%,-50%) rotate(${s.wind_dir + 180}deg)">↑</span>`,
            iconSize: [0, 0]
          })
        });
      } else {
        marker = L.circleMarker([s.lat, s.lon], {
          radius: 6, color: "#0f172a", weight: 1.2, fillColor: color, fillOpacity: 0.95
        });
      }
      marker.bindTooltip(`${escapeHtml(s.name)} ${fmt(value, metric.unit)}`, { direction: "top", offset: [0, -6] });
      marker.bindPopup(() => stationPopup(s));
      state.obsLayer.addLayer(marker);
    });
  }

  function renderObsSummary() {
    const summary = state.observations.summary;
    const cards = [
      ["最高溫", summary.max_temp, "°C"],
      ["最低溫", summary.min_temp, "°C"],
      ["最大雨量", summary.max_rain, " mm"],
      ["最大風速", summary.max_wind, " m/s"]
    ];
    document.getElementById("obs-summary-time").textContent = `${summary.obs_time.substring(5)} · ${summary.count} 站`;
    document.getElementById("obs-summary-grid").innerHTML = cards.map(([label, item, unit]) => `
      <div class="obs-stat">
        <span class="obs-stat-label">${label}</span>
        <strong>${item ? fmt(item.value, unit) : "—"}</strong>
        <span class="obs-stat-station">${item ? escapeHtml(item.station) : ""}</span>
      </div>`).join("");
    document.getElementById("obs-summary").classList.remove("hidden");
  }

  async function loadObservations() {
    try {
      const res = await fetch("/api/observations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      state.observations = data;
      renderObsSummary();
      return true;
    } catch (err) {
      console.error("Load observations failed:", err);
      return false;
    }
  }

  function markObsButtons(metric) {
    obsButtons.forEach(b => {
      const on = b.dataset.obs === metric;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  async function setObsMetric(metric) {
    obsMsg.classList.add("hidden");
    if (metric && !state.observations && !(await loadObservations())) {
      obsMsg.textContent = "無法取得即時觀測資料，請稍後再試。";
      obsMsg.classList.remove("hidden");
      return;
    }
    state.obsMetric = metric;
    markObsButtons(metric);
    if (metric) {
      renderObservations();
      state.obsLayer.addTo(map);
      renderLegend(`obs_${metric}`);
    } else {
      map.removeLayer(state.obsLayer);
      renderLegend(state.currentLayer);
    }
    applyCurrentLayerColors();
    updateTempLabels();
  }

  obsButtons.forEach(b => b.addEventListener("click", () => {
    setObsMetric(state.obsMetric === b.dataset.obs ? null : b.dataset.obs);
  }));

  // ==========================================================================
  //  13. Radar, Basemap and Locate Me
  // ==========================================================================
  const toggleRadar = document.getElementById("toggle-radar");
  const radarMsg = document.getElementById("radar-msg");

  function showPanelMsg(el, text) {
    el.textContent = text;
    el.classList.remove("hidden");
  }

  toggleRadar.addEventListener("change", async () => {
    radarMsg.classList.add("hidden");
    if (state.radarLayer) map.removeLayer(state.radarLayer);
    if (!toggleRadar.checked) return;
    try {
      const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      const data = await res.json();
      const latest = data.radar.past[data.radar.past.length - 1];
      // RainViewer's free tiles stop at zoom 7; Leaflet upscales beyond that.
      state.radarLayer = L.tileLayer(`${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0.6,
        maxNativeZoom: 7,
        zIndex: 10,
        attribution: '<a href="https://www.rainviewer.com/">RainViewer</a>'
      });
      if (!toggleRadar.checked) return;
      state.radarLayer.addTo(map);
      const time = new Date(latest.time * 1000).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
      showPanelMsg(radarMsg, `雷達時間 ${time}`);
    } catch (err) {
      console.error("Load radar failed:", err);
      toggleRadar.checked = false;
      showPanelMsg(radarMsg, "無法取得雷達圖，請稍後再試。");
    }
  });

  const basemapButtons = document.querySelectorAll(".basemap-btn");
  basemapButtons.forEach(b => b.addEventListener("click", () => {
    map.removeLayer(activeBasemap);
    activeBasemap = BASEMAPS[b.dataset.basemap].addTo(map);
    basemapButtons.forEach(other => {
      const on = other === b;
      other.classList.toggle("active", on);
      other.setAttribute("aria-pressed", String(on));
    });
  }));

  const btnLocate = document.getElementById("btn-locate");
  const locateMsg = document.getElementById("locate-msg");
  const LOCATE_LABEL = "📍 定位我的位置";
  const LOCATE_ERRORS = { 1: "你沒有允許定位權限。", 2: "找不到你的位置。", 3: "定位逾時，請再試一次。" };
  let locateMarker = null;

  function resetLocateButton() {
    btnLocate.disabled = false;
    btnLocate.textContent = LOCATE_LABEL;
  }

  btnLocate.addEventListener("click", () => {
    locateMsg.classList.add("hidden");
    if (!navigator.geolocation) {
      showPanelMsg(locateMsg, "這個瀏覽器不支援定位。");
      return;
    }
    btnLocate.disabled = true;
    btnLocate.textContent = "⏳ 定位中...";
    navigator.geolocation.getCurrentPosition(pos => {
      const latlng = [pos.coords.latitude, pos.coords.longitude];
      if (locateMarker) map.removeLayer(locateMarker);
      locateMarker = L.circleMarker(latlng, {
        radius: 8, color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1
      }).bindTooltip("你在這裡").addTo(map);
      map.flyTo(latlng, 10);
      resetLocateButton();
    }, err => {
      showPanelMsg(locateMsg, LOCATE_ERRORS[err.code] || "定位失敗。");
      resetLocateButton();
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  // ==========================================================================
  //  14. Boot: load the county geometry first, then paint the full-island weather map.
  // ==========================================================================
  loadGeoJson().then(() => { fitTaiwan(); return loadAllCitiesData(); });
  loadWarnings();
  loadObservations();

});
