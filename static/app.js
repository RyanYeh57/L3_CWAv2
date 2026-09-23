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
    showBoundaries: true
  };

  // ==========================================================================
  //  DOM refs
  // ==========================================================================
  const weatherDrawer     = document.getElementById("weather-drawer");
  const closeDrawerBtn    = document.getElementById("close-drawer-btn");
  const toggleDrawerBtn   = document.getElementById("toggle-drawer-btn");
  const btnLoadAll        = document.getElementById("btn-load-all");
  const toggleBoundaries  = document.getElementById("toggle-boundaries");
  const toggleTempBadges  = document.getElementById("toggle-temp-badges");
  const layerButtons      = document.querySelectorAll(".layer-btn");
  const legendUnitText    = document.getElementById("legend-unit-text");
  const legendHintText    = document.getElementById("legend-hint-text");
  const legendBar         = document.getElementById("legend-bar");
  const legendLabels      = document.getElementById("legend-labels");

  const initialState    = document.getElementById("initial-state");
  const loadingState    = document.getElementById("loading-state");
  const errorState      = document.getElementById("error-state");
  const contentState    = document.getElementById("content-state");
  const loadingText     = document.getElementById("loading-text");
  const errorTitle      = document.getElementById("error-title");
  const errorDesc       = document.getElementById("error-desc");
  const retryBtn        = document.getElementById("retry-btn");

  const currentCityName   = document.getElementById("current-city-name");
  const cityRegion        = document.getElementById("city-region");
  const updateTimestamp   = document.getElementById("update-timestamp");
  const summaryWeatherDesc = document.getElementById("summary-weather-desc");
  const summaryWeatherIcon = document.getElementById("summary-weather-icon");
  const summaryComfort    = document.getElementById("summary-comfort");
  const summaryTempRange  = document.getElementById("summary-temp-range");
  const summaryPop        = document.getElementById("summary-pop");
  const forecastIntervalsContainer = document.getElementById("forecast-intervals-container");

  // ==========================================================================
  //  Constants & Helpers
  // ==========================================================================
  const REGION_MAP = {
    "基隆市":"北部地區","臺北市":"北部地區","新北市":"北部地區","桃園市":"北部地區",
    "新竹市":"北部地區","新竹縣":"北部地區","宜蘭縣":"北部地區",
    "苗栗縣":"中部地區","臺中市":"中部地區","彰化縣":"中部地區",
    "南投縣":"中部地區","雲林縣":"中部地區",
    "嘉義市":"南部地區","嘉義縣":"南部地區","臺南市":"南部地區",
    "高雄市":"南部地區","屏東縣":"南部地區",
    "花蓮縣":"東部地區","臺東縣":"東部地區",
    "澎湖縣":"離島地區","金門縣":"離島地區","連江縣":"離島地區"
  };

  // GeoJSON COUNTYNAME → 系統 CWA 名稱 (處理「台」vs「臺」問題)
  const NAME_ALIAS = {
    "台北市":"臺北市","台中市":"臺中市","台南市":"臺南市","台東縣":"臺東縣"
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
    if (t <=  5) return "#2c7bb6";
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
    if (p <= 10) return "#1e293b";
    if (p <= 30) return "#0369a1";
    if (p <= 50) return "#0284c7";
    if (p <= 70) return "#2563eb";
    if (p <= 90) return "#4f46e5";
    return "#7c3aed";
  }

  // ==========================================================================
  //  1. Initialise Leaflet Map
  // ==========================================================================
  const map = L.map("leaflet-map", {
    center: [23.7, 121],
    zoom: 7,
    minZoom: 6,
    maxZoom: 12,
    zoomControl: false,
    attributionControl: false
  });

  // CartoDB Dark Matter tiles (dark style for Windy aesthetic)
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 18
  }).addTo(map);

  // Attribution bottom-left
  L.control.attribution({ position: "bottomleft" }).addTo(map);
  L.control.zoom({ position: "bottomleft" }).addTo(map);

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
      className: "leaflet-temp-label",
      direction: "top",
      offset: [0, -10]
    });
  }

  // ==========================================================================
  //  3. Select City
  // ==========================================================================
  function selectCity(cityName) {
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
        if (res.status === 404)           showError("找不到指定縣市", "請選擇有效的台灣 22 縣市。");
        else if (detail.includes("CWA_API_KEY")) showError("系統尚未設定 CWA_API_KEY", "請於 .env 設定有效的 CWA_API_KEY。");
        else if (detail.includes("資料庫"))      showError("資料庫讀取失敗", "SQLite 資料庫無法完成查詢或儲存。");
        else                                     showError("無法取得氣象資料", detail || "請檢查網路連線或 API 金鑰配置。");
        return;
      }

      if (data.forecasts && data.forecasts.length > 0) {
        const f = data.forecasts[0];
        const avg = Math.round((f.min_temp + f.max_temp) / 2);
        state.cityTemps[cityName]    = avg;
        state.cityPops[cityName]     = f.pop;
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
    const city  = data.city;

    currentCityName.textContent   = city;
    cityRegion.textContent        = REGION_MAP[city] || "台灣縣市";
    updateTimestamp.textContent    = new Date().toLocaleTimeString("zh-TW", { hour:"2-digit", minute:"2-digit" });
    summaryWeatherDesc.textContent = first.weather || "多雲";
    summaryWeatherIcon.textContent = getWeatherIcon(first.weather);
    summaryComfort.textContent     = first.comfort || "舒適";
    summaryTempRange.textContent   = `${first.min_temp}°C ~ ${first.max_temp}°C`;
    summaryPop.textContent         = `${first.pop}%`;

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
    const e = f.end_time   ? f.end_time.substring(5)   : "";
    const mxW = Math.min(100, Math.max(5, (f.max_temp / 45) * 100));
    const mnW = Math.min(100, Math.max(5, (f.min_temp / 45) * 100));
    const ppW = Math.min(100, Math.max(2, f.pop));
    card.innerHTML = `
      <div class="interval-header">
        <span class="interval-time">🕒 時段 ${idx+1}：${s} ~ ${e}</span>
        <span class="interval-weather">${getWeatherIcon(f.weather)} ${f.weather}（${f.comfort||"舒適"}）</span>
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
      const res  = await fetch("/api/weather");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "無法取得全台資料");

      state.allCitiesData = data.forecasts || [];
      const seen = {};
      state.allCitiesData.forEach(f => {
        const c = f.city;
        if (!seen[c]) {
          seen[c] = true;
          state.cityTemps[c]    = Math.round((f.min_temp + f.max_temp) / 2);
          state.cityPops[c]     = f.pop;
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
    const t = state.cityTemps[cityName];
    const p = state.cityPops[cityName];

    if (state.currentLayer === "temp" && t !== undefined) {
      layer.setStyle({ fillColor: getTempColor(t), fillOpacity: 0.65, color: state.showBoundaries ? "#475569" : "transparent", weight: 1.8 });
    } else if (state.currentLayer === "rain" && p !== undefined) {
      layer.setStyle({ fillColor: getRainColor(p), fillOpacity: 0.65, color: state.showBoundaries ? "#475569" : "transparent", weight: 1.8 });
    } else {
      layer.setStyle({ fillColor: "#1e293b", fillOpacity: 0.55, color: state.showBoundaries ? "#475569" : "transparent", weight: 1.8 });
    }
  }

  // ==========================================================================
  //  8. Temperature Badge Labels on Map
  // ==========================================================================
  function updateTempLabels() {
    if (!state.tempLabelsLayer || !state.geoJsonLayer) return;
    state.tempLabelsLayer.clearLayers();
    if (!state.showTempBadges) return;

    state.geoJsonLayer.eachLayer(l => {
      const cn = l.feature.properties._cwaCityName;
      let text = "";
      if (state.currentLayer === "temp" && state.cityTemps[cn] !== undefined) {
        text = `${cn.replace("市","").replace("縣","")}\n${state.cityTemps[cn]}°`;
      } else if (state.currentLayer === "rain" && state.cityPops[cn] !== undefined) {
        text = `${cn.replace("市","").replace("縣","")}\n${state.cityPops[cn]}%`;
      } else if (state.currentLayer === "weather" && state.cityWeathers[cn]) {
        text = `${getWeatherIcon(state.cityWeathers[cn])}`;
      }

      if (text) {
        const center = l.getBounds().getCenter();
        const marker = L.marker(center, {
          icon: L.divIcon({
            className: "leaflet-temp-label",
            html: text.replace("\n", "<br>"),
            iconSize: [60, 30],
            iconAnchor: [30, 15]
          }),
          interactive: false
        });
        state.tempLabelsLayer.addLayer(marker);
      }
    });
  }

  // ==========================================================================
  //  9. Layer Switching
  // ==========================================================================
  function switchLayer(layer) {
    state.currentLayer = layer;
    layerButtons.forEach(b => b.classList.toggle("active", b.dataset.layer === layer));

    if (layer === "temp") {
      legendUnitText.textContent = "氣溫 °C";
      legendHintText.textContent = "5°C ~ 36°C";
      legendBar.style.background = "linear-gradient(to right, #2c7bb6, #5aa2cf, #abd9e9, #7fcdbb, #d9ef8b, #fee08b, #fdae61, #f46d43, #d73027)";
      legendLabels.innerHTML = "<span>5</span><span>10</span><span>15</span><span>20</span><span>24</span><span>28</span><span>32</span><span>36</span>";
    } else if (layer === "rain") {
      legendUnitText.textContent = "降雨機率 %";
      legendHintText.textContent = "0% ~ 100%";
      legendBar.style.background = "linear-gradient(to right, #1e293b, #0369a1, #0284c7, #2563eb, #4f46e5, #7c3aed)";
      legendLabels.innerHTML = "<span>0%</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>100%</span>";
    } else {
      legendUnitText.textContent = "天氣狀況";
      legendHintText.textContent = "現象圖標";
      legendBar.style.background = "linear-gradient(to right, #f59e0b, #38bdf8, #64748b, #3b82f6)";
      legendLabels.innerHTML = "<span>晴天</span><span>多雲</span><span>陰天</span><span>雨天</span>";
    }

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
  function openDrawer()  { weatherDrawer.classList.remove("collapsed"); state.isDrawerOpen = true; }
  function closeDrawer() { weatherDrawer.classList.add("collapsed");    state.isDrawerOpen = false; }
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

  // ==========================================================================
  //  11. Boot (spec.md §16: 首頁顯示地圖，不立即呼叫全部 API)
  // ==========================================================================
  loadGeoJson();

});
