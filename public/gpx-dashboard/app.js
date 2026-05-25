/* VELOFLUX GPX Telemetry & Ride Analyzer Logic */

// Global XML Helper to find tag values ignoring namespaces and case
function getTagVal(elem, localNames) {
  if (!elem || typeof elem.getElementsByTagName !== 'function') return null;
  const names = Array.isArray(localNames) ? localNames : [localNames];
  
  for (const name of names) {
    // 1. Try exact match (including namespace wildcard)
    const match = elem.getElementsByTagName(name)[0] || 
                  elem.getElementsByTagNameNS('*', name)[0];
    if (match && match.textContent.trim()) return match.textContent;
    
    // 2. Try case-insensitive search through all descendants
    const descendants = elem.getElementsByTagName('*');
    const targetLower = name.toLowerCase();
    for (let i = 0; i < descendants.length; i++) {
      const desc = descendants[i];
      const local = (desc.localName || desc.nodeName.split(':').pop() || '').toLowerCase();
      if (local === targetLower && desc.textContent.trim()) {
        return desc.textContent;
      }
    }
  }
  
  // 3. Fallback: aggressive search for any tag containing the word
  const descendants = elem.getElementsByTagName('*');
  for (let i = 0; i < descendants.length; i++) {
    const desc = descendants[i];
    const local = (desc.localName || desc.nodeName.split(':').pop() || '').toLowerCase();
    for (const name of names) {
      if (local.includes(name.toLowerCase()) && desc.textContent.trim()) {
        const val = parseFloat(desc.textContent);
        if (!isNaN(val)) return desc.textContent;
      }
    }
  }
  return null;
}

// Global Application State
const state = {
  rideName: "No Ride Loaded",
  points: [],          // Cleaned trackpoint array with all telemetry
  summary: {},         // Summary stats (distance, time, NP, etc.)
  climbs: [],          // Detected climb segments
  pacingPhases: [],    // Optimal pacing strategy segments
  
  // Playback Simulation
  isPlaying: false,
  currentIndex: 0,
  playbackSpeed: 1,    // Multiplier: 1x, 5x, 15x, 30x
  playbackTimer: null,
  
  // Map Elements
  map: null,
  trackPolyline: null,
  glowPolyline: null,
  playbackMarker: null,
  climbHighlightLines: [],
  
  // Chart.js Instances
  charts: {
    elevation: null,
    power: null,
    biometrics: null
  },
  
  // UI Configuration
  xAxisType: 'distance', // 'distance' or 'time'
  
  // Segment Selection
  selectionStartIdx: null,
  selectionEndIdx: null,
  isSelecting: false,
  activeCanvas: null,
  activeChart: null,
  dragStartPixelX: null,
  
  // Constants
  FTP: 250, // Functional Threshold Power in Watts (default for TSS calculations)
  totalWeight: 78 // Default total weight (rider + bike) in kg
};

// DOM References
const dom = {
  fileInput: document.getElementById('gpx-file-input'),
  secondaryFileInput: document.getElementById('secondary-file-input'),
  uploadBtn: document.getElementById('upload-btn'),
  mergeBtn: document.getElementById('merge-btn'),
  sampleBtn: document.getElementById('sample-btn'),
  rideBadge: document.getElementById('ride-name-badge'),
  riderWeightInput: document.getElementById('pacing-rider-weight'),
  bikeWeightInput: document.getElementById('pacing-bike-weight'),
  cdaInput: document.getElementById('pacing-cda-input'),
  
  // Metrics
  distVal: document.querySelector('#metric-distance .metric-value'),
  eleVal: document.querySelector('#metric-elevation .metric-value'),
  timeVal: document.querySelector('#metric-time .metric-value'),
  speedVal: document.querySelector('#metric-speed .metric-value'),
  maxSpeedVal: document.getElementById('max-speed-val'),
  powerVal: document.querySelector('#metric-power .metric-value'),
  npVal: document.getElementById('np-val'),
  tssVal: document.getElementById('tss-val'),
  avgHrVal: document.getElementById('avg-hr-val'),
  avgCadVal: document.getElementById('avg-cad-val'),
  maxHrVal: document.getElementById('max-hr-val'),
  maxCadVal: document.getElementById('max-cad-val'),
  
  // Top Aero & Efficiency Cards
  topCdaVal: document.getElementById('top-cda-val'),
  topBikeType: document.getElementById('top-bike-type'),
  topViVal: document.getElementById('top-vi-val'),
  topKjVal: document.getElementById('top-kj-val'),
  
  // Climb List
  climbsList: document.getElementById('climbs-list'),

  // Interactive Pacing Panel
  phaseBadge: document.getElementById('current-phase-badge'),
  pacingAeroStats: document.getElementById('pacing-aero-stats'),
  aeroCdaVal: document.getElementById('aero-cda-val'),
  aeroBikeType: document.getElementById('aero-bike-type'),
  aeroViVal: document.getElementById('aero-vi-val'),
  aeroViDesc: document.getElementById('aero-vi-desc'),
  aeroKjVal: document.getElementById('aero-kj-val'),
  
  interactivePanel: document.getElementById('interactive-pacing-panel'),
  
  slShort: document.getElementById('slider-climb-short'),
  valShort: document.getElementById('val-climb-short'),
  distShort: document.getElementById('dist-climb-short'),
  spdShort: document.getElementById('spd-climb-short'),
  
  slMed: document.getElementById('slider-climb-medium'),
  valMed: document.getElementById('val-climb-medium'),
  distMed: document.getElementById('dist-climb-medium'),
  spdMed: document.getElementById('spd-climb-medium'),
  
  slLong: document.getElementById('slider-climb-long'),
  valLong: document.getElementById('val-climb-long'),
  distLong: document.getElementById('dist-climb-long'),
  spdLong: document.getElementById('spd-climb-long'),
  
  slFlat: document.getElementById('slider-flat'),
  valFlat: document.getElementById('val-flat'),
  distFlat: document.getElementById('dist-flat'),
  spdFlat: document.getElementById('spd-flat'),
  
  slDesc: document.getElementById('slider-descent'),
  valDesc: document.getElementById('val-descent'),
  distDesc: document.getElementById('dist-descent'),
  spdDesc: document.getElementById('spd-descent'),
  
  simTotalTime: document.getElementById('sim-total-time'),
  simAvgSpeed: document.getElementById('sim-avg-speed'),
  simAvgPower: document.getElementById('sim-avg-power'),
  simMaxSpeed: document.getElementById('sim-max-speed'),
  
  // Playback Panel
  playBtn: document.getElementById('play-btn'),
  pauseBtn: document.getElementById('pause-btn'),
  stopBtn: document.getElementById('stop-btn'),
  slider: document.getElementById('playback-slider'),
  currentTime: document.getElementById('playback-current-time'),
  totalTime: document.getElementById('playback-total-time'),
  speedBtns: document.querySelectorAll('.speed-btn'),
  
  // Chart Hover Overlay
  overlay: document.getElementById('sync-tooltip-overlay'),
  oDist: document.getElementById('overlay-dist'),
  oTime: document.getElementById('overlay-time'),
  oEle: document.getElementById('overlay-ele'),
  oSpeed: document.getElementById('overlay-speed'),
  oPower: document.getElementById('overlay-power'),
  oCad: document.getElementById('overlay-cad'),
  oHr: document.getElementById('overlay-hr'),
  oGrade: document.getElementById('overlay-grade'),
  
  // Segment Analysis
  chartsBody: document.querySelector('.charts-body'),
  selectionBox: document.getElementById('chart-selection-box'),
  segmentPanel: document.getElementById('segment-analysis-panel'),
  closeSegmentBtn: document.getElementById('close-segment-btn'),
  segDist: document.getElementById('seg-dist'),
  segTime: document.getElementById('seg-time'),
  segSpeed: document.getElementById('seg-speed'),
  segAvgPwr: document.getElementById('seg-avg-pwr'),
  segNp: document.getElementById('seg-np'),
  segEle: document.getElementById('seg-ele'),
  
  // Chart Axis Buttons
  distAxisBtn: document.getElementById('chart-distance-axis-btn'),
  timeAxisBtn: document.getElementById('chart-time-axis-btn')
};

// Initial setup on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupEventListeners();
  
  // Auto-load sample ride on start to create an instant WOW factor
  setTimeout(() => {
    loadSampleRide();
  }, 500);
});

// Event Listeners setup
function setupEventListeners() {
  // GPX Upload Trigger Buttons
  dom.uploadBtn.addEventListener('click', () => {
    dom.fileInput.click();
  });
  dom.mergeBtn.addEventListener('click', () => {
    dom.secondaryFileInput.click();
  });

  // GPX Upload Event Handlers
  dom.fileInput.addEventListener('change', handleFileUpload);
  dom.secondaryFileInput.addEventListener('change', handleSecondaryUpload);
  
  // Sample Loader
  dom.sampleBtn.addEventListener('click', loadSampleRide);
  
  // Playback Simulator Buttons
  dom.playBtn.addEventListener('click', startSimulation);
  dom.pauseBtn.addEventListener('click', pauseSimulation);
  dom.stopBtn.addEventListener('click', stopSimulation);
  
  // Progress Slider scrubbing
  dom.slider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    seekSimulation(val);
  });
  
  // Playback Speed Selector
  dom.speedBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      dom.speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.playbackSpeed = parseInt(btn.getAttribute('data-speed'));
      if (state.isPlaying) {
        // Restart timer with new speed
        pauseSimulation();
        startSimulation();
      }
    });
  });
  
  // Chart Axis Toggles
  dom.distAxisBtn.addEventListener('click', () => {
    if (state.xAxisType === 'distance') return;
    state.xAxisType = 'distance';
    dom.distAxisBtn.classList.add('active');
    dom.timeAxisBtn.classList.remove('active');
    rebuildCharts();
  });
  
  dom.timeAxisBtn.addEventListener('click', () => {
    if (state.xAxisType === 'time') return;
    state.xAxisType = 'time';
    dom.timeAxisBtn.classList.add('active');
    dom.distAxisBtn.classList.remove('active');
    rebuildCharts();
  });
  
  // Weight Inputs change listeners
  const updateWeight = () => {
    const rW = parseFloat(dom.riderWeightInput.value) || 68;
    const bW = parseFloat(dom.bikeWeightInput.value) || 10;
    if (rW > 30 && rW < 150 && bW >= 5 && bW < 30) {
      state.totalWeight = rW + bW;
      if (state.points.length > 0) {
        renderPacingStrategy();
      }
    }
  };
  
  if (dom.riderWeightInput) dom.riderWeightInput.addEventListener('input', updateWeight);
  if (dom.bikeWeightInput) dom.bikeWeightInput.addEventListener('input', updateWeight);

  // CdA Input change listener
  if (dom.cdaInput) {
    dom.cdaInput.addEventListener('input', () => {
      const val = parseFloat(dom.cdaInput.value);
      if (!isNaN(val) && val > 0.05 && val < 1.0) {
        state.customCda = val;
        if (state.points.length > 0) {
          renderPacingStrategy();
        }
      } else if (dom.cdaInput.value.trim() === '') {
        state.customCda = null;
        if (state.points.length > 0) {
          renderPacingStrategy();
        }
      }
    });
  }

  // Interactive sliders
  const sliders = [dom.slShort, dom.slMed, dom.slLong, dom.slFlat, dom.slDesc];
  const vals = [dom.valShort, dom.valMed, dom.valLong, dom.valFlat, dom.valDesc];
  if (sliders[0]) {
    sliders.forEach((sl, idx) => {
      sl.addEventListener('input', () => {
        vals[idx].textContent = sl.value + 'W';
        runInteractiveSimulation();
      });
    });
  }

  // GPX diagnostics collapsible header toggle
  const debugHeader = document.getElementById('debug-header');
  const debugCard = document.getElementById('debug-card');
  const debugBody = document.querySelector('.debug-body');
  if (debugHeader && debugCard && debugBody) {
    debugHeader.addEventListener('click', () => {
      const isCollapsed = debugCard.classList.contains('collapsed');
      if (isCollapsed) {
        debugCard.classList.remove('collapsed');
        debugBody.style.display = 'block';
      } else {
        debugCard.classList.add('collapsed');
        debugBody.style.display = 'none';
      }
    });
  }
  
  // Chart selection mouse events
  dom.chartsBody.addEventListener('mousedown', (e) => {
    const canvas = e.target.closest('canvas');
    if (!canvas || state.points.length === 0) return;
    
    const chart = Chart.getChart(canvas);
    if (!chart) return;
    
    state.activeCanvas = canvas;
    state.activeChart = chart;
    
    // Clear active elements (highlights/hover states) on all charts to reset cached states
    Object.values(state.charts).forEach(c => {
      if (c) {
        c.setActiveElements([]);
        c.update('none');
      }
    });
    
    // Find index under cursor
    const rect = canvas.getBoundingClientRect();
    const canvasX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const xAxis = chart.scales.x;
    const val = xAxis.getValueForPixel(canvasX);
    const index = findClosestIndexForXValue(val, state.xAxisType);
    
    state.selectionStartIdx = index;
    state.selectionEndIdx = index;
    state.isSelecting = true;
    
    // Position of mousedown relative to chartsBody container
    const parentRect = dom.chartsBody.getBoundingClientRect();
    state.dragStartPixelX = e.clientX - parentRect.left;
    
    // Show/reset selection box
    dom.selectionBox.style.display = 'block';
    dom.selectionBox.style.left = state.dragStartPixelX + 'px';
    dom.selectionBox.style.width = '0px';
    
    // Hide segment panel while dragging
    dom.segmentPanel.style.display = 'none';
  });
  
  window.addEventListener('mousemove', (e) => {
    if (!state.isSelecting || !state.activeChart || !state.activeCanvas) return;
    
    const canvasRect = state.activeCanvas.getBoundingClientRect();
    const canvasX = Math.max(0, Math.min(canvasRect.width, e.clientX - canvasRect.left));
    const xAxis = state.activeChart.scales.x;
    const val = xAxis.getValueForPixel(canvasX);
    const index = findClosestIndexForXValue(val, state.xAxisType);
    
    state.selectionEndIdx = index;
    updateSelectionBoxVisuals();
  });
  
  window.addEventListener('mouseup', (e) => {
    if (!state.isSelecting) return;
    state.isSelecting = false;
    
    const startIdx = Math.min(state.selectionStartIdx, state.selectionEndIdx);
    const endIdx = Math.max(state.selectionStartIdx, state.selectionEndIdx);
    const indexDiff = Math.abs(state.selectionStartIdx - state.selectionEndIdx);
    
    // Require a minimum of 3 points selected to show stats
    if (startIdx !== null && endIdx !== null && indexDiff > 2) {
      showSegmentStats(startIdx, endIdx);
    } else {
      dom.selectionBox.style.display = 'none';
      dom.segmentPanel.style.display = 'none';
      state.selectionStartIdx = null;
      state.selectionEndIdx = null;
    }
    
    state.activeCanvas = null;
    state.activeChart = null;
  });
  
  // Close segment panel button
  dom.closeSegmentBtn.addEventListener('click', () => {
    dom.selectionBox.style.display = 'none';
    dom.segmentPanel.style.display = 'none';
    state.selectionStartIdx = null;
    state.selectionEndIdx = null;
  });
}

// Map Initialization (CartoDB Dark Matter)
function initMap() {
  state.map = L.map('map', {
    zoomControl: true,
    attributionControl: true
  }).setView([-27.4352390, -48.5138060], 13);
  
  // Add premium dark tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(state.map);
}

// Handle local GPX Upload
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  state.rideName = file.name.replace('.gpx', '');
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    processGPXData(evt.target.result);
  };
  reader.readAsText(file);
}

// Handle secondary sensor/HR GPX Upload
function handleSecondaryUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(evt.target.result, "text/xml");
      
      if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        throw new Error("Formato XML inválido");
      }
      
      const trkpts = xmlDoc.getElementsByTagName("trkpt");
      if (trkpts.length === 0) {
        throw new Error("Nenhum trackpoint encontrado no arquivo secundário");
      }
      
      const secondaryPoints = [];
      
      for (let i = 0; i < trkpts.length; i++) {
        const pt = trkpts[i];
        const lat = parseFloat(pt.getAttribute("lat"));
        const lon = parseFloat(pt.getAttribute("lon"));
        const eleVal = getTagVal(pt, ["ele", "elevation"]);
        const ele = eleVal ? parseFloat(eleVal) : 0;
        
        const powerVal = getTagVal(pt, ["power", "watts", "watt", "pwr"]);
        const power = (powerVal !== null && !isNaN(parseFloat(powerVal))) ? parseFloat(powerVal) : null;
        
        const cadVal = getTagVal(pt, ["cad", "cadence", "rpm"]);
        const cad = (cadVal !== null && !isNaN(parseFloat(cadVal))) ? parseFloat(cadVal) : null;
        
        const hrVal = getTagVal(pt, ["hr", "heartrate", "bpm"]);
        const hr = (hrVal !== null && !isNaN(parseFloat(hrVal))) ? parseFloat(hrVal) : null;
        
        const tempVal = getTagVal(pt, ["atemp", "temp", "temperature"]);
        const temp = (tempVal !== null && !isNaN(parseFloat(tempVal))) ? parseFloat(tempVal) : null;
        
        secondaryPoints.push({ lat, lon, ele, power, cad, hr, temp });
      }
      
      alignAndMergeGPX(secondaryPoints);
      
      const dbgXmlContent = document.getElementById('debug-xml-content');
      if (dbgXmlContent && trkpts.length > 0) {
        const serializer = new XMLSerializer();
        const rawXml = serializer.serializeToString(trkpts[0]);
        const formattedXml = rawXml
          .replace(/></g, '>\n<')
          .replace(/<extensions>/g, '\n  <extensions>\n')
          .replace(/<\/extensions>/g, '\n  </extensions>\n')
          .replace(/<gpxtpx:/g, '\n    <gpxtpx:')
          .replace(/<\/gpxtpx:/g, '\n    </gpxtpx:')
          .replace(/<power>/g, '\n    <power>')
          .replace(/<\/power>/g, '</power>\n')
          .replace(/\n\s*\n/g, '\n');
        dbgXmlContent.textContent = "--- SECONDARY FILE FIRST POINT SNIPPET ---\n" + formattedXml;
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao ler GPX secundário: " + err.message);
    }
  };
  reader.readAsText(file);
}

// Align and merge sensors from secondary GPX into primary rideData by closest GPS position
function alignAndMergeGPX(secondaryPoints) {
  if (state.points.length === 0) {
    alert("Por favor, carregue primeiro o percurso principal.");
    return;
  }
  
  let mergedCount = 0;
  
  state.points.forEach(primaryPt => {
    let minDist = Infinity;
    let closestPt = null;
    
    // Find closest spatial point in secondary list
    for (let j = 0; j < secondaryPoints.length; j++) {
      const secPt = secondaryPoints[j];
      const dist = haversineDistance(primaryPt.lat, primaryPt.lon, secPt.lat, secPt.lon);
      if (dist < minDist) {
        minDist = dist;
        closestPt = secPt;
      }
    }
    
    // If the closest secondary point is within 40 meters, merge its data
    if (closestPt && minDist < 40) {
      if (closestPt.hr !== null) {
        primaryPt.hr = closestPt.hr;
        mergedCount++;
      }
      // Also copy cadence, power, or temp if missing in primary but present in secondary
      if (primaryPt.cad === null && closestPt.cad !== null) primaryPt.cad = closestPt.cad;
      if (primaryPt.power === null && closestPt.power !== null) primaryPt.power = closestPt.power;
      if (primaryPt.temp === null && closestPt.temp !== null) primaryPt.temp = closestPt.temp;
    }
  });
  
  if (mergedCount > 0) {
    alert(`Mesclagem realizada com sucesso! Sensor de frequência cardíaca adicionado a ${mergedCount} pontos.`);
    
    // Re-run the calculations with the merged datasets
    calculateTelemetry(state.points);
  } else {
    alert("Erro na mesclagem. Os dois percursos não parecem coincidir geograficamente (nenhum ponto encontrado a menos de 40 metros de distância).");
  }
}

// Load Precompiled Sample Ride
function loadSampleRide() {
  if (window.sampleGPX) {
    state.rideName = "Florianópolis Coastal Loop";
    processGPXData(window.sampleGPX);
  } else {
    alert("Sample ride data not loaded.");
  }
}

// Core GPX Parsing & Calculation Pipeline
function processGPXData(gpxText) {
  stopSimulation();
  
  // Reset segment selection state
  state.selectionStartIdx = null;
  state.selectionEndIdx = null;
  state.isSelecting = false;
  if (dom.selectionBox) dom.selectionBox.style.display = 'none';
  if (dom.segmentPanel) dom.segmentPanel.style.display = 'none';
  
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, "text/xml");
    
    // Check for XML parsing error
    if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
      throw new Error("Invalid XML file format");
    }
    
    const trkpts = xmlDoc.getElementsByTagName("trkpt");
    if (trkpts.length === 0) {
      throw new Error("No trackpoints found in GPX file");
    }
    
    // Parse track name if available
    const nameNode = xmlDoc.getElementsByTagName("name")[0];
    if (nameNode && state.rideName === "No Ride Loaded") {
      state.rideName = nameNode.textContent;
    }
    
    const rawPoints = [];
    
    // Loop through trackpoints and extract fields
    for (let i = 0; i < trkpts.length; i++) {
      const pt = trkpts[i];
      const lat = parseFloat(pt.getAttribute("lat"));
      const lon = parseFloat(pt.getAttribute("lon"));
      const eleVal = getTagVal(pt, ["ele", "elevation"]);
      const ele = eleVal ? parseFloat(eleVal) : 0;
      const timeStr = getTagVal(pt, ["time", "timestamp"]);
      const time = timeStr ? new Date(timeStr) : null;
      
      // Extensions: Power, Cadence, HR, Temp
      const powerVal = getTagVal(pt, ["power", "watts", "watt", "pwr"]);
      const power = (powerVal !== null && !isNaN(parseFloat(powerVal))) ? parseFloat(powerVal) : null;
      
      const cadVal = getTagVal(pt, ["cad", "cadence", "rpm"]);
      const cad = (cadVal !== null && !isNaN(parseFloat(cadVal))) ? parseFloat(cadVal) : null;
      
      const hrVal = getTagVal(pt, ["hr", "heartrate", "bpm"]);
      const hr = (hrVal !== null && !isNaN(parseFloat(hrVal))) ? parseFloat(hrVal) : null;
      
      const tempVal = getTagVal(pt, ["atemp", "temp", "temperature"]);
      const temp = (tempVal !== null && !isNaN(parseFloat(tempVal))) ? parseFloat(tempVal) : null;
      
      rawPoints.push({
        lat,
        lon,
        ele,
        time,
        power,
        cad,
        hr,
        temp,
        dist: 0,       // Distance from start in meters
        speed: 0,      // m/s
        grade: 0,      // % slope
        elapsed: 0     // cumulative seconds
      });
    }
    
    // Sort points by time just in case
    if (rawPoints[0].time) {
      rawPoints.sort((a, b) => a.time - b.time);
    }
    
    // Compute secondary telemetry (distance, speed, slope)
    calculateTelemetry(rawPoints);
    
    // Enable merge button once primary is loaded
    dom.mergeBtn.removeAttribute('disabled');
    
    // Update GPX Diagnostics XML snippet
    const dbgXmlContent = document.getElementById('debug-xml-content');
    if (dbgXmlContent && trkpts.length > 0) {
      const serializer = new XMLSerializer();
      const rawXml = serializer.serializeToString(trkpts[0]);
      const formattedXml = rawXml
        .replace(/></g, '>\n<')
        .replace(/<extensions>/g, '\n  <extensions>\n')
        .replace(/<\/extensions>/g, '\n  </extensions>\n')
        .replace(/<gpxtpx:/g, '\n    <gpxtpx:')
        .replace(/<\/gpxtpx:/g, '\n    </gpxtpx:')
        .replace(/<power>/g, '\n    <power>')
        .replace(/<\/power>/g, '</power>\n')
        .replace(/\n\s*\n/g, '\n');
      dbgXmlContent.textContent = "--- PRIMARY FILE FIRST POINT SNIPPET ---\n" + formattedXml;
    }
    
  } catch (err) {
    console.error(err);
    alert("Error parsing GPX file: " + err.message);
  }
}

// Haversine formula to compute distance between lat/lon coords
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Compute cumulative values and smooth speed/grades
function calculateTelemetry(rawPoints) {
  let cumulativeDist = 0;
  let totalMovingTime = 0;
  let totalEleGain = 0;
  let totalEleLoss = 0;
  
  const startTime = rawPoints[0].time;
  
  for (let i = 0; i < rawPoints.length; i++) {
    const curr = rawPoints[i];
    
    if (i === 0) {
      curr.dist = 0;
      curr.speed = 0;
      curr.grade = 0;
      curr.elapsed = 0;
      continue;
    }
    
    const prev = rawPoints[i - 1];
    
    // Time delta
    const timeDelta = curr.time && prev.time ? (curr.time - prev.time) / 1000 : 1; // seconds
    curr.elapsed = prev.elapsed + timeDelta;
    
    // Distance delta
    const dDist = haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
    cumulativeDist += dDist;
    curr.dist = cumulativeDist;
    
    // Instantaneous speed
    let instSpeed = timeDelta > 0 ? dDist / timeDelta : 0;
    
    // Elevation delta
    const dEle = curr.ele - prev.ele;
    if (dEle > 0.3) {
      totalEleGain += dEle;
    } else if (dEle < -0.3) {
      totalEleLoss += Math.abs(dEle);
    }
    
    // Grade/Slope
    curr.grade = dDist > 1 ? (dEle / dDist) * 100 : 0;
    // Cap grade to remove outlier spikes from GPS anomalies
    curr.grade = Math.max(-25, Math.min(25, curr.grade));
    
    // Moving Time Accumulation
    // Standard threshold: speed > 1.0 m/s (~3.6 km/h)
    if (instSpeed > 1.0) {
      totalMovingTime += timeDelta;
    }
    
    curr.speed = instSpeed;
  }
  
  // Smooth Speed via 5-point moving average
  const speedWindow = 5;
  const smoothedSpeeds = [];
  for (let i = 0; i < rawPoints.length; i++) {
    let sum = 0, count = 0;
    const s = Math.max(0, i - Math.floor(speedWindow / 2));
    const e = Math.min(rawPoints.length - 1, i + Math.floor(speedWindow / 2));
    for (let j = s; j <= e; j++) { sum += rawPoints[j].speed; count++; }
    smoothedSpeeds.push((sum / count) * 3.6); // convert m/s to km/h
  }
  
  // Smooth Grade via wider 25-point window to eliminate GPS noise on flat courses
  const gradeWindow = 25;
  const smoothedGrades = [];
  for (let i = 0; i < rawPoints.length; i++) {
    let sum = 0, count = 0;
    const s = Math.max(0, i - Math.floor(gradeWindow / 2));
    const e = Math.min(rawPoints.length - 1, i + Math.floor(gradeWindow / 2));
    for (let j = s; j <= e; j++) { sum += rawPoints[j].grade; count++; }
    smoothedGrades.push(sum / count);
  }
  
  // Apply smoothed values back to points
  for (let i = 0; i < rawPoints.length; i++) {
    rawPoints[i].speed = smoothedSpeeds[i];
    rawPoints[i].grade = smoothedGrades[i];
  }
  
  // Calculations completed. Update State
  state.points = rawPoints;
  
  // Generate summaries
  const powerPoints = rawPoints.filter(p => p.power !== null).map(p => p.power);
  const hrPoints = rawPoints.filter(p => p.hr !== null).map(p => p.hr);
  const cadPoints = rawPoints.filter(p => p.cad !== null).map(p => p.cad);
  
  const totalDuration = rawPoints[rawPoints.length - 1].elapsed;
  const avgSpeed = (cumulativeDist / (totalMovingTime || totalDuration)) * 3.6;
  const maxSpeed = Math.max(...rawPoints.map(p => p.speed));
  
  // Calculate NP (Normalized Power)
  let np = 0;
  let tss = 0;
  if (powerPoints.length > 30) {
    np = calculateNP(rawPoints);
    const intensityFactor = np / state.FTP;
    // TSS Formula: (s * NP * IF) / (FTP * 3600) * 100
    tss = Math.round((totalDuration * np * intensityFactor) / (state.FTP * 3600) * 100);
  }
  
  state.summary = {
    distance: cumulativeDist / 1000, // km
    eleGain: Math.round(totalEleGain),
    eleLoss: Math.round(totalEleLoss),
    elapsedTime: totalDuration,
    movingTime: totalMovingTime || totalDuration,
    avgSpeed: avgSpeed,
    maxSpeed: maxSpeed,
    avgPower: powerPoints.length > 0 ? Math.round(powerPoints.reduce((a,b)=>a+b, 0) / powerPoints.length) : null,
    maxPower: powerPoints.length > 0 ? Math.max(...powerPoints) : null,
    np: np,
    tss: tss,
    avgHr: hrPoints.length > 0 ? Math.round(hrPoints.reduce((a,b)=>a+b, 0) / hrPoints.length) : null,
    maxHr: hrPoints.length > 0 ? Math.max(...hrPoints) : null,
    avgCad: cadPoints.length > 0 ? Math.round(cadPoints.reduce((a,b)=>a+b, 0) / cadPoints.length) : null,
    maxCad: cadPoints.length > 0 ? Math.max(...cadPoints) : null
  };
  
  // Detect climbs along the ride
  detectClimbSegments();
  
  // Generate optimal pacing zones
  generatePacingStrategy();
  
  // Refresh Visual Elements
  updateSummaryUI();
  renderRouteOnMap();
  rebuildCharts();
  renderClimbsList();
  renderPacingStrategy();
  
  // Reset Playback controls
  dom.slider.max = state.points.length - 1;
  dom.slider.value = 0;
  dom.totalTime.textContent = formatDuration(state.summary.elapsedTime);
  dom.currentTime.textContent = "00:00:00";

  // Update GPX Diagnostics Inspector metadata
  const hasPower = state.points.some(p => p.power !== null);
  const hasHr = state.points.some(p => p.hr !== null);
  const hasCad = state.points.some(p => p.cad !== null);
  
  const dbgFilename = document.getElementById('debug-filename');
  const dbgPoints = document.getElementById('debug-points');
  const dbgHasPower = document.getElementById('debug-has-power');
  const dbgHasHr = document.getElementById('debug-has-hr');
  const dbgHasCad = document.getElementById('debug-has-cad');
  
  if (dbgFilename) dbgFilename.textContent = state.rideName;
  if (dbgPoints) dbgPoints.textContent = state.points.length;
  
  if (dbgHasPower) {
    dbgHasPower.textContent = hasPower ? "Yes" : "No";
    dbgHasPower.className = hasPower ? "debug-yes" : "debug-no";
  }
  if (dbgHasHr) {
    dbgHasHr.textContent = hasHr ? "Yes" : "No";
    dbgHasHr.className = hasHr ? "debug-yes" : "debug-no";
  }
  if (dbgHasCad) {
    dbgHasCad.textContent = hasCad ? "Yes" : "No";
    dbgHasCad.className = hasCad ? "debug-yes" : "debug-no";
  }
}

// Normalized Power calculation (30-second rolling average raised to the 4th power)
// Uses real elapsed time for the 30-second window, not point counts
function calculateNP(points) {
  const roll30 = [];
  
  for (let i = 0; i < points.length; i++) {
    if (points[i].power === null) continue;
    
    // Find start index: go back until we have 30 seconds of data
    let sum = 0;
    let count = 0;
    let j = i;
    while (j >= 0 && (points[i].elapsed - points[j].elapsed) <= 30) {
      if (points[j].power !== null) {
        sum += points[j].power;
        count++;
      }
      j--;
    }
    
    if (count > 0) {
      roll30.push(sum / count);
    }
  }
  
  if (roll30.length === 0) return 0;
  
  // Raise to 4th power, average, and take 4th root
  const sum4th = roll30.reduce((acc, val) => acc + Math.pow(val, 4), 0);
  const avg4th = sum4th / roll30.length;
  return Math.round(Math.pow(avg4th, 0.25));
}

// Scan trackpoints to isolate major climbs
// Rules: sustained uphill section, gain > 12m, avg grade > 3%, min length 250m
function detectClimbSegments() {
  const points = state.points;
  const climbs = [];
  
  let inClimb = false;
  let startIdx = 0;
  
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    
    // Check local grade trend (using rolling average grades)
    const isUphill = p.grade > 1.5; // climbing
    
    if (isUphill && !inClimb) {
      inClimb = true;
      startIdx = i - 1;
    } else if (!isUphill && inClimb) {
      // Check if we hit a flatter section or downhill
      // Give a 15-second grace period for small dips in a climb
      let dipCount = 0;
      let checkLength = Math.min(points.length - 1, i + 15);
      for (let j = i; j < checkLength; j++) {
        if (points[j].grade <= 0) dipCount++;
      }
      
      // If mostly flat/downhill in the next 15 points, terminate climb segment
      if (dipCount > 10 || i === points.length - 1) {
        inClimb = false;
        const endIdx = i;
        
        const climbDist = points[endIdx].dist - points[startIdx].dist; // meters
        const climbEleGain = points[endIdx].ele - points[startIdx].ele; // meters
        
        if (climbDist > 250 && climbEleGain > 12) {
          const avgGrade = (climbEleGain / climbDist) * 100;
          
          // Find max grade inside climb
          let maxGrade = 0;
          for (let k = startIdx; k <= endIdx; k++) {
            if (points[k].grade > maxGrade) maxGrade = points[k].grade;
          }
          
          climbs.push({
            name: `Climb #${climbs.length + 1}`,
            startIdx,
            endIdx,
            distance: climbDist / 1000, // km
            eleGain: climbEleGain,
            avgGrade: avgGrade,
            maxGrade: maxGrade
          });
        }
      }
    }
  }
  
  state.climbs = climbs;
}

// Determine pacing segments based on course topography
function generatePacingStrategy() {
  const points = state.points;
  if (points.length < 10) return;
  
  const np = state.summary.np || state.summary.avgPower || 180;
  const distances = { 'climb-short': 0, 'climb-medium': 0, 'climb-long': 0, 'flat': 0, 'descent': 0 };
  const times = { 'climb-short': 0, 'climb-medium': 0, 'climb-long': 0, 'flat': 0, 'descent': 0 };
  const powers = { 'climb-short': {sum:0, count:0}, 'climb-medium': {sum:0, count:0}, 'climb-long': {sum:0, count:0}, 'flat': {sum:0, count:0}, 'descent': {sum:0, count:0} };
  
  // Create an array mapping each point to its terrain category
  state.pointCategories = new Array(points.length).fill('flat');
  
  // 1. Mark recognized climbs
  if (state.climbs) {
    state.climbs.forEach(climb => {
      let cat = 'climb-short';
      if (climb.distance < 0.5) cat = 'climb-short';
      else if (climb.distance <= 1.0) cat = 'climb-medium';
      else cat = 'climb-long';
      
      for (let i = climb.startIdx; i <= climb.endIdx; i++) {
        state.pointCategories[i] = cat;
      }
    });
  }
  
  // 2. Mark descents and accumulate distances, times, and powers
  for (let i = 1; i < points.length; i++) {
    if (state.pointCategories[i] === 'flat' && points[i].grade < -1.5) {
      state.pointCategories[i] = 'descent';
    }
    
    const cat = state.pointCategories[i];
    const dist = points[i].dist - points[i-1].dist;
    const timeSecs = (points[i].time - points[i-1].time) / 1000;
    
    distances[cat] += dist;
    if (timeSecs > 0 && timeSecs < 60) {
      times[cat] += timeSecs;
    }
    
    if (points[i].power != null && !isNaN(points[i].power)) {
      powers[cat].sum += points[i].power;
      powers[cat].count++;
    }
  }
  
  // Update UI distances, speeds and default sliders
  if(dom.distShort) {
    dom.distShort.textContent = (distances['climb-short']/1000).toFixed(1) + ' km';
    dom.distMed.textContent = (distances['climb-medium']/1000).toFixed(1) + ' km';
    dom.distLong.textContent = (distances['climb-long']/1000).toFixed(1) + ' km';
    dom.distFlat.textContent = (distances['flat']/1000).toFixed(1) + ' km';
    dom.distDesc.textContent = (distances['descent']/1000).toFixed(1) + ' km';
    
    const getSpeedStr = (cat) => {
      if (times[cat] > 0 && distances[cat] > 0) {
        return ((distances[cat] / 1000) / (times[cat] / 3600)).toFixed(1) + ' km/h';
      }
      return '-- km/h';
    };

    if (dom.spdShort) dom.spdShort.textContent = getSpeedStr('climb-short');
    if (dom.spdMed) dom.spdMed.textContent = getSpeedStr('climb-medium');
    if (dom.spdLong) dom.spdLong.textContent = getSpeedStr('climb-long');
    if (dom.spdFlat) dom.spdFlat.textContent = getSpeedStr('flat');
    if (dom.spdDesc) dom.spdDesc.textContent = getSpeedStr('descent');
    
    // Set default slider values based on actual GPX power for each terrain!
    const getAvg = (cat, fallbackFactor) => {
      if (powers[cat].count > 10) return Math.round(powers[cat].sum / powers[cat].count);
      return Math.round(np * fallbackFactor);
    };

    dom.slShort.value = getAvg('climb-short', 1.20);
    dom.valShort.textContent = dom.slShort.value + 'W';
    
    dom.slMed.value = getAvg('climb-medium', 1.10);
    dom.valMed.textContent = dom.slMed.value + 'W';
    
    dom.slLong.value = getAvg('climb-long', 0.95);
    dom.valLong.textContent = dom.slLong.value + 'W';
    
    dom.slFlat.value = getAvg('flat', 0.90);
    dom.valFlat.textContent = dom.slFlat.value + 'W';
    
    dom.slDesc.value = getAvg('descent', 0.40);
    dom.valDesc.textContent = dom.slDesc.value + 'W';
  }
}

// Estimate rider CdA (aerodynamic drag coefficient) from speed, power, and slope
function estimateCdA(points, mass = 78) {
  const g = 9.81;
  const Crr = 0.0033; // rolling resistance coefficient (race tires)
  const rho = 1.225;  // standard air density at sea level
  const eta = 0.97;   // drivetrain efficiency
  
  // Try different tiers of filtering to find enough data points to compute CdA.
  const configs = [
    // Tier 1: strict flat roads at decent speed (best quality)
    { minV: 6.0, minPower: 80, minGrade: -1.0, maxGrade: 1.0 },
    // Tier 2: moderate grade and speed
    { minV: 5.0, minPower: 60, minGrade: -2.0, maxGrade: 2.0 },
    // Tier 3: any pedaling point at reasonable speed
    { minV: 4.0, minPower: 40, minGrade: -4.0, maxGrade: 4.0 },
    // Tier 4: extremely relaxed to catch almost any pedaling point if data is noisy
    { minV: 1.0, minPower: 10, minGrade: -10.0, maxGrade: 10.0 }
  ];

  for (let t = 0; t < configs.length; t++) {
    const cfg = configs[t];
    let sumPAir = 0;
    let sumV3 = 0;
    let count = 0;

    points.forEach(pt => {
      if (pt.power === null || isNaN(pt.power) || pt.speed === null || isNaN(pt.speed)) return;
      
      const v = pt.speed / 3.6; // convert km/h to m/s
      if (v > cfg.minV && pt.power > cfg.minPower && pt.grade >= cfg.minGrade && pt.grade <= cfg.maxGrade) {
        const gradeFraction = pt.grade / 100;
        
        const pGravity = mass * g * gradeFraction * v;
        const pRolling = mass * g * Crr * v;
        
        const powerToRoad = pt.power * eta;
        const pAir = powerToRoad - pGravity - pRolling;
        
        // Filter out absurd point-by-point anomalies before summing
        if (pAir > 10 && pAir < 800) {
          sumPAir += pAir;
          sumV3 += (0.5 * rho * Math.pow(v, 3));
          count++;
        }
      }
    });

    // If we have a reasonable amount of points, use this tier's pooled CdA
    const minRequiredPoints = (t === configs.length - 1) ? 10 : 30;
    if (count >= minRequiredPoints) {
      const cda = sumPAir / sumV3;
      if (cda > 0.15 && cda < 0.45) {
        return cda;
      }
    }
  }
  
  return 0.220; // default fallback if not enough data
}

// Solve cubic physics equation for velocity: a*v^3 + c*v - power = 0 using Newton-Raphson
function solveVelocity(power, grade, cda, mass = 78) {
  const g = 9.81;
  const Crr = 0.0045;
  const rho = 1.2;
  
  const a = 0.5 * cda * rho;
  const c = mass * g * (grade / 100 + Crr);
  
  // Use a high initial guess (30 m/s = 108 km/h) to ensure we are always on the 
  // positive-slope side of the cubic curve, avoiding negative derivatives on steep downhills.
  let v = 30.0; 
  for (let iter = 0; iter < 15; iter++) {
    const f = a * Math.pow(v, 3) + c * v - power;
    const df = 3 * a * Math.pow(v, 2) + c;
    
    if (Math.abs(df) < 1e-6) break;
    
    const vNew = v - f / df;
    
    // If it overshoots below zero, clamp it, but don't break immediately
    // to allow it to recover if the curve is weird.
    if (vNew <= 0) {
      v = 0.1;
    } else {
      v = vNew;
    }
    
    if (Math.abs(f) < 0.1) break; // Converged
  }
  
  return Math.min(25.0, Math.max(0, v)); // limit max speed to 90 km/h
}

// Simulate completion time using analytical steady-state physics
// Uses net elevation change to avoid GPS noise amplification
function simulateCourseTime(targetPower, cda, mass = 78) {
  const points = state.points;
  const g = 9.81;
  const Crr = 0.0045;
  const rho = 1.2;
  const eta = 0.97; // drivetrain efficiency
  
  const totalDist = points[points.length - 1].dist; // meters
  const startEle = points[0].ele;
  const endEle = points[points.length - 1].ele;
  
  // Net grade accounts for whether the course finishes higher/lower than it starts
  // For a loop course, this is ~0. For point-to-point uphill, this is positive.
  const netGradeFraction = (endEle - startEle) / (totalDist || 1);
  
  // Power delivered to the rear wheel
  const powerToRoad = targetPower * eta;
  
  // Solve the steady-state cubic: 0.5*CdA*rho*v³ + m*g*(netGrade+Crr)*v = powerToRoad
  const a = 0.5 * cda * rho;
  const c = mass * g * (netGradeFraction + Crr);
  
  // Newton-Raphson to solve a*v³ + c*v - P = 0
  let v = 10.0; // initial guess ~36 km/h
  for (let iter = 0; iter < 20; iter++) {
    const f = a * Math.pow(v, 3) + c * v - powerToRoad;
    const df = 3 * a * Math.pow(v, 2) + c;
    if (Math.abs(df) < 1e-9) break;
    v = v - f / df;
    if (v <= 0) v = 1.0;
    if (Math.abs(f) < 0.001) break;
  }
  
  // Apply a small "course difficulty" penalty for elevation variability
  // Hilly courses cost more energy due to v³ asymmetry on climbs vs descents
  const eleGain = state.summary.eleGain || 0;
  const hillinessFactor = eleGain / (totalDist / 1000); // meters gained per km
  // Typical penalty: ~0.1 km/h per m/km of hilliness (empirical from cycling models)
  const hillinesspenalty = hillinessFactor * 0.003; // as fraction of speed
  v = v * (1 - hillinesspenalty);
  
  v = Math.max(v, 1.0); // safety floor
  
  const avgSpeedKmh = v * 3.6;
  const time180k = 180000 / v; // seconds for 180 km
  
  return {
    time: time180k,
    speed: avgSpeedKmh
  };
}

// Render Pacing Strategy cards and predictions table
function renderPacingStrategy() {
  if (state.points.length === 0) {
    if (dom.pacingAeroStats) dom.pacingAeroStats.style.display = 'none';
    if (dom.interactivePanel) dom.interactivePanel.style.display = 'none';
    return;
  }
  
  // Calculate Aero and Efficiency
  const hasPower = state.points.some(p => p.power !== null && p.power > 0);
  const mass = state.totalWeight || 78;
  let cda = state.customCda || estimateCdA(state.points, mass) || 0.22;
  
  if (dom.cdaInput && !state.customCda) {
    dom.cdaInput.value = cda.toFixed(3);
  }
  let vi = 1.00;
  let workKj = 0;
  
  if (hasPower) {
    cda = estimateCdA(state.points, mass);
    
    // Variability Index = NP / Average Power
    const avgPower = state.summary.avgPower || 1;
    const np = state.summary.np || 1;
    vi = np / avgPower;
    
    // Work done = avgPower * duration / 1000 (kJ)
    workKj = Math.round((avgPower * state.summary.elapsedTime) / 1000);
  } else {
    // If no power, estimate work based on normal energy model (approx 180W average)
    workKj = Math.round((180 * state.summary.elapsedTime) / 1000);
  }
  
  // Display Aero stats
  dom.pacingAeroStats.style.display = 'grid';
  if (!hasPower) {
    dom.aeroCdaVal.textContent = "0.000 m² (Sem Pot.)";
    dom.aeroBikeType.textContent = "Potência Ausente";
    dom.aeroViVal.textContent = "N/A";
    dom.aeroViDesc.textContent = "Requer Watts";
    dom.aeroKjVal.textContent = workKj + " kJ (Est.)";
  } else {
    dom.aeroCdaVal.textContent = cda.toFixed(3) + " m²";
    
    // Determine bike type based on CdA
    let bikeType = "Road Bike (Hoods)";
    if (cda < 0.20) bikeType = "TT Bike (Super Aero)";
    else if (cda < 0.235) bikeType = "TT Bike / Aero Position";
    else if (cda < 0.28) bikeType = "Road Bike (Drops)";
    else if (cda > 0.45) bikeType = "MTB / Upright";
    
    dom.aeroBikeType.textContent = bikeType;
    
    dom.aeroViVal.textContent = vi.toFixed(2);
    if (vi < 1.05) dom.aeroViDesc.textContent = "Pacing Perfeito (TT)";
    else if (vi < 1.15) dom.aeroViDesc.textContent = "Bom (Pacing Variado)";
    else dom.aeroViDesc.textContent = "Ruim (Muitos picos)";
    
    dom.aeroKjVal.textContent = workKj + " kJ";
  }
  
  // Show the interactive panel and run simulation
  if (dom.interactivePanel) {
    dom.interactivePanel.style.display = 'block';
    runInteractiveSimulation();
  }
}

// Compute expected time and speed based on user's slider values
function runInteractiveSimulation() {
  if (!state.pointCategories || state.pointCategories.length === 0) return;
  
  const mass = state.totalWeight || 78;
  const cda = state.customCda || estimateCdA(state.points, mass) || 0.230;
  const g = 9.81;
  const Crr = 0.0033; // Race tires
  const rho = 1.225; // Standard air density
  const eta = 0.97;
  const a = 0.5 * cda * rho;
  
  // Get current targets
  const targets = {
    'climb-short': parseInt(dom.slShort.value),
    'climb-medium': parseInt(dom.slMed.value),
    'climb-long': parseInt(dom.slLong.value),
    'flat': parseInt(dom.slFlat.value),
    'descent': parseInt(dom.slDesc.value)
  };
  
  let totalTime = 0;
  let totalDist = 0;
  let totalWorkJ = 0;
  let maxV = 0;
  
  const simTimes = { 'climb-short': 0, 'climb-medium': 0, 'climb-long': 0, 'flat': 0, 'descent': 0 };
  const simDists = { 'climb-short': 0, 'climb-medium': 0, 'climb-long': 0, 'flat': 0, 'descent': 0 };
  
  // Simulate point by point for maximum terrain accuracy
  for (let i = 1; i < state.points.length; i++) {
    const pt = state.points[i];
    const prevPt = state.points[i-1];
    const dist = pt.dist - prevPt.dist;
    if (dist <= 0) continue;
    
    const cat = state.pointCategories[i];
    const targetPower = targets[cat] || targets['flat'];
    const powerToRoad = targetPower * eta;
    const gradeFraction = pt.grade / 100;
    const c = mass * g * (gradeFraction + Crr);
    
    // Newton-Raphson to solve a*v³ + c*v - P = 0
    let v = 30.0; // High initial guess to stay on the positive slope of the cubic curve (solves steep descent bugs)
    for (let iter = 0; iter < 15; iter++) {
      const f = a * Math.pow(v, 3) + c * v - powerToRoad;
      const df = 3 * a * Math.pow(v, 2) + c;
      if (Math.abs(df) < 1e-9) break;
      
      const vNew = v - f / df;
      if (vNew <= 0) {
        v = 0.1;
      } else {
        v = vNew;
      }
      
      if (Math.abs(f) < 0.001) break;
    }
    
    // Safety limit max speed (e.g., terminal coasting on very steep descents)
    if (targetPower === 0 && gradeFraction < -0.05 && v < 15.0) {
       v = Math.sqrt((mass * g * Math.abs(gradeFraction)) / a);
    }
    
    v = Math.max(v, 1.0); // Minimum 3.6 km/h on impossible grades
    if (v > maxV) maxV = v;
    
    const segTime = dist / v;
    totalTime += segTime;
    totalDist += dist;
    totalWorkJ += (targetPower * segTime);
    
    simTimes[cat] += segTime;
    simDists[cat] += dist;
  }
  
  // Scale to 180 km
  const scale = 180000 / (totalDist || 180000);
  const time180k = totalTime * scale;
  
  const avgSpeedKmh = (180000 / time180k) * 3.6;
  const avgPower = totalTime > 0 ? (totalWorkJ / totalTime) : 0;
  
  // Update Individual Category Speeds in UI
  const updateSpeedLabel = (domEl, distCat, timeCat) => {
    if (domEl && timeCat > 0) {
       const speedKmh = ((distCat / 1000) / (timeCat / 3600)).toFixed(1);
       domEl.textContent = speedKmh + ' km/h';
    } else if (domEl) {
       domEl.textContent = '-- km/h';
    }
  };
  
  updateSpeedLabel(dom.spdShort, simDists['climb-short'], simTimes['climb-short']);
  updateSpeedLabel(dom.spdMed, simDists['climb-medium'], simTimes['climb-medium']);
  updateSpeedLabel(dom.spdLong, simDists['climb-long'], simTimes['climb-long']);
  updateSpeedLabel(dom.spdFlat, simDists['flat'], simTimes['flat']);
  updateSpeedLabel(dom.spdDesc, simDists['descent'], simTimes['descent']);
  
  // Format Time
  const hrs = Math.floor(time180k / 3600);
  const mins = Math.floor((time180k % 3600) / 60);
  const secs = Math.floor(time180k % 60);
  
  if(dom.simTotalTime) {
    dom.simTotalTime.textContent = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    dom.simAvgSpeed.textContent = avgSpeedKmh.toFixed(1) + ' km/h';
    dom.simAvgPower.textContent = Math.round(avgPower) + ' W';
    if(dom.simMaxSpeed) dom.simMaxSpeed.textContent = (maxV * 3.6).toFixed(1);
  }
}

// Update Top Row Key Cards
function updateSummaryUI() {
  const s = state.summary;
  
  dom.rideBadge.textContent = state.rideName;
  
  dom.distVal.innerHTML = `${s.distance.toFixed(2)} <span class="unit">km</span>`;
  dom.eleVal.innerHTML = `${s.eleGain} <span class="unit">m</span>`;
  dom.timeVal.innerHTML = formatDuration(s.movingTime);
  dom.speedVal.innerHTML = `${s.avgSpeed.toFixed(1)} <span class="unit">km/h</span>`;
  dom.maxSpeedVal.textContent = s.maxSpeed.toFixed(1);
  
  if (s.avgPower !== null) {
    dom.powerVal.innerHTML = `${s.avgPower} <span class="unit">W</span>`;
    dom.npVal.textContent = s.np;
    dom.tssVal.textContent = s.tss;
    document.getElementById('metric-power').style.opacity = '1';
  } else {
    dom.powerVal.innerHTML = `-- <span class="unit">W</span>`;
    dom.npVal.textContent = "--";
    dom.tssVal.textContent = "--";
  }
  
  dom.avgHrVal.textContent = s.avgHr !== null ? s.avgHr : "--";
  dom.maxHrVal.textContent = s.maxHr !== null ? s.maxHr : "--";
  dom.avgCadVal.textContent = s.avgCad !== null ? s.avgCad : "--";
  dom.maxCadVal.textContent = s.maxCad !== null ? s.maxCad : "--";
  
  // Top Aero & Efficiency Cards
  if (s.avgPower !== null && state.points.length > 0) {
    const mass = state.totalWeight || 78;
    const cda = estimateCdA(state.points, mass);
    const np = s.np || 1;
    const avgP = s.avgPower || 1;
    const vi = np / avgP;
    const workKj = Math.round((avgP * s.elapsedTime) / 1000);
    
    if (dom.topCdaVal) dom.topCdaVal.textContent = cda.toFixed(3);
    if (dom.topBikeType) {
      let bt = "Road Bike (Hoods)";
      if (cda < 0.20) bt = "TT Bike (Super Aero)";
      else if (cda < 0.235) bt = "TT Bike / Aero Position";
      else if (cda < 0.28) bt = "Road Bike (Drops)";
      else if (cda > 0.45) bt = "MTB / Upright";
      dom.topBikeType.textContent = bt;
    }
    if (dom.topViVal) dom.topViVal.textContent = vi.toFixed(2);
    if (dom.topKjVal) dom.topKjVal.textContent = workKj;
  }
}

// Render Track on Leaflet Map
function renderRouteOnMap() {
  const points = state.points;
  const latLons = points.map(p => [p.lat, p.lon]);
  
  // Clear existing polyline
  if (state.trackPolyline) state.map.removeLayer(state.trackPolyline);
  if (state.glowPolyline) state.map.removeLayer(state.glowPolyline);
  
  // Clear climb lines
  state.climbHighlightLines.forEach(l => state.map.removeLayer(l));
  state.climbHighlightLines = [];
  
  // Glow background polyline
  state.glowPolyline = L.polyline(latLons, {
    color: 'rgba(124, 77, 255, 0.3)',
    weight: 8,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(state.map);
  
  // Core route line
  state.trackPolyline = L.polyline(latLons, {
    color: '#00e5ff',
    weight: 4,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(state.map);
  
  // Fit map boundaries
  state.map.fitBounds(state.trackPolyline.getBounds(), { padding: [30, 30] });
  
  // Add or reset Playback Rider Marker
  if (state.playbackMarker) state.map.removeLayer(state.playbackMarker);
  
  const riderIcon = L.divIcon({
    className: 'custom-rider-marker',
    html: `<div class="rider-dot"></div><div class="rider-pulse"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
  
  state.playbackMarker = L.marker(latLons[0], { icon: riderIcon }).addTo(state.map);
}

// Populate Climb Segment Cards
function renderClimbsList() {
  dom.climbsList.innerHTML = "";
  
  if (state.climbs.length === 0) {
    dom.climbsList.innerHTML = `<div class="placeholder-text">No significant climbs detected on this route.</div>`;
    return;
  }
  
  state.climbs.forEach((climb, idx) => {
    const item = document.createElement('div');
    item.className = 'climb-item';
    item.innerHTML = `
      <div class="climb-info">
        <span class="climb-name">${climb.name}</span>
        <span class="climb-stats">${climb.distance.toFixed(2)} km // Gain: ${Math.round(climb.eleGain)}m // Max Grade: ${climb.maxGrade.toFixed(1)}%</span>
      </div>
      <div class="climb-badge-container">
        <span class="climb-grade-badge">Avg: ${climb.avgGrade.toFixed(1)}%</span>
      </div>
    `;
    
    // Zoom map & chart to climb section on click
    item.addEventListener('click', () => {
      focusOnSegment(climb.startIdx, climb.endIdx);
    });
    
    dom.climbsList.appendChild(item);
  });
}

// Zoom into climb segment on Map & highlight it
function focusOnSegment(startIdx, endIdx) {
  // Clear any existing segment highlight lines
  state.climbHighlightLines.forEach(l => state.map.removeLayer(l));
  state.climbHighlightLines = [];
  
  const climbPoints = state.points.slice(startIdx, endIdx + 1);
  const latLons = climbPoints.map(p => [p.lat, p.lon]);
  
  // Draw glowing red climb trace overlay
  const climbLine = L.polyline(latLons, {
    color: '#ff1744',
    weight: 6,
    opacity: 0.8,
    dashArray: '2, 6'
  }).addTo(state.map);
  
  state.climbHighlightLines.push(climbLine);
  
  // Fit map bounds
  state.map.fitBounds(climbLine.getBounds(), { padding: [40, 40] });
  
  // Seek simulation to start of climb
  seekSimulation(startIdx);
  
  // Zoom charts to the segment
  Object.values(state.charts).forEach(chart => {
    if (chart) {
      chart.zoomScale('x', {
        min: state.xAxisType === 'distance' ? state.points[startIdx].dist / 1000 : state.points[startIdx].elapsed,
        max: state.xAxisType === 'distance' ? state.points[endIdx].dist / 1000 : state.points[endIdx].elapsed
      }, 'easeOutQuad');
      chart.update();
    }
  });
}

// Chart.js Synchronization & Setup
function rebuildCharts() {
  const points = state.points;
  if (points.length === 0) return;
  
  // Destroy existing charts to avoid memory leaks / redraw overlay glitches
  Object.keys(state.charts).forEach(key => {
    if (state.charts[key]) {
      state.charts[key].destroy();
      state.charts[key] = null;
    }
  });
  
  const isTimeX = state.xAxisType === 'time';
  const xLabels = points.map(p => isTimeX ? p.elapsed : p.dist / 1000);
  
  const elevationData = points.map(p => p.ele);
  const speedData = points.map(p => p.speed);
  const powerData = points.map(p => p.power);
  const cadData = points.map(p => p.cad);
  const hrData = points.map(p => p.hr);
  const tempData = points.map(p => p.temp);
  
  // Dynamic gradient generators
  const getGradient = (ctx, colorStart, colorEnd) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 120);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
  };
  
  // Shared chart configurations
  const sharedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable all animations for instant high-performance rendering
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false } // We use custom synced HUD overlay tooltip
    },
    scales: {
      x: {
        type: 'linear',
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: {
          color: '#8e9bb3',
          font: { family: 'Outfit', size: 10 },
          callback: function(value) {
            return isTimeX ? formatDuration(value) : value.toFixed(1) + ' km';
          }
        }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#8e9bb3', font: { family: 'Outfit', size: 10 } }
      },
      ySecondary: {
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: '#8e9bb3', font: { family: 'Outfit', size: 10 } }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    hover: {
      intersect: false
    },
    onHover: (event, chartElements) => {
      if (chartElements.length > 0) {
        const index = chartElements[0].index;
        syncHoverAcrossComponents(index);
      }
    }
  };
  
  // 1. ELEVATION + SPEED CHART
  const ctxEle = document.getElementById('chart-elevation').getContext('2d');
  const gradientEle = getGradient(ctxEle, 'rgba(0, 230, 118, 0.25)', 'rgba(0, 230, 118, 0.0)');
  
  state.charts.elevation = new Chart(ctxEle, {
    type: 'line',
    data: {
      labels: xLabels,
      datasets: [
        {
          label: 'Elevation',
          data: elevationData,
          borderColor: '#00e676',
          borderWidth: 2,
          fill: true,
          backgroundColor: gradientEle,
          yAxisID: 'y',
          pointRadius: 0
        },
        {
          label: 'Speed',
          data: speedData,
          borderColor: '#ff9100',
          borderWidth: 1.5,
          yAxisID: 'ySecondary',
          pointRadius: 0
        }
      ]
    },
    options: JSON.parse(JSON.stringify(sharedOptions)) // Deep copy
  });
  
  // Custom label overrides
  state.charts.elevation.options.scales.y.title = { display: true, text: 'Elevation (m)', color: '#00e676', font: { family: 'Outfit' } };
  state.charts.elevation.options.scales.ySecondary.title = { display: true, text: 'Speed (km/h)', color: '#ff9100', font: { family: 'Outfit' } };
  state.charts.elevation.options.onHover = (e, elements) => {
    if (elements.length > 0) syncHoverAcrossComponents(elements[0].index);
  };
  state.charts.elevation.update();

  // 2. POWER + CADENCE CHART
  const ctxPower = document.getElementById('chart-power').getContext('2d');
  const gradientPower = getGradient(ctxPower, 'rgba(255, 234, 0, 0.25)', 'rgba(255, 234, 0, 0.0)');
  const hasPowerData = powerData.some(p => p !== null);
  
  state.charts.power = new Chart(ctxPower, {
    type: 'line',
    data: {
      labels: xLabels,
      datasets: [
        {
          label: 'Power',
          data: hasPowerData ? powerData : points.map(()=>0),
          borderColor: '#ffea00',
          borderWidth: 2,
          fill: true,
          backgroundColor: gradientPower,
          yAxisID: 'y',
          pointRadius: 0
        },
        {
          label: 'Cadence',
          data: cadData.some(c => c !== null) ? cadData : points.map(()=>0),
          borderColor: '#00e5ff',
          borderWidth: 1.5,
          yAxisID: 'ySecondary',
          pointRadius: 0
        }
      ]
    },
    options: JSON.parse(JSON.stringify(sharedOptions))
  });
  
  state.charts.power.options.scales.y.title = { display: true, text: 'Power (W)', color: '#ffea00', font: { family: 'Outfit' } };
  state.charts.power.options.scales.ySecondary.title = { display: true, text: 'Cadence (rpm)', color: '#00e5ff', font: { family: 'Outfit' } };
  state.charts.power.options.onHover = (e, elements) => {
    if (elements.length > 0) syncHoverAcrossComponents(elements[0].index);
  };
  state.charts.power.update();

  // 3. HEART RATE + TEMPERATURE CHART
  const ctxBio = document.getElementById('chart-biometrics').getContext('2d');
  
  state.charts.biometrics = new Chart(ctxBio, {
    type: 'line',
    data: {
      labels: xLabels,
      datasets: [
        {
          label: 'Heart Rate',
          data: hrData.some(h => h !== null) ? hrData : points.map(()=>0),
          borderColor: '#ff1744',
          borderWidth: 2,
          yAxisID: 'y',
          pointRadius: 0
        },
        {
          label: 'Temperature',
          data: tempData.some(t => t !== null) ? tempData : points.map(()=>0),
          borderColor: '#29b6f6',
          borderWidth: 1.5,
          yAxisID: 'ySecondary',
          pointRadius: 0
        }
      ]
    },
    options: JSON.parse(JSON.stringify(sharedOptions))
  });
  
  state.charts.biometrics.options.scales.y.title = { display: true, text: 'Heart Rate (bpm)', color: '#ff1744', font: { family: 'Outfit' } };
  state.charts.biometrics.options.scales.ySecondary.title = { display: true, text: 'Temp (°C)', color: '#29b6f6', font: { family: 'Outfit' } };
  state.charts.biometrics.options.onHover = (e, elements) => {
    if (elements.length > 0) syncHoverAcrossComponents(elements[0].index);
  };
  state.charts.biometrics.update();
  
  // Keep selection visually aligned on scale updates
  if (state.selectionStartIdx !== null && state.selectionEndIdx !== null) {
    state.activeChart = state.charts.elevation;
    state.activeCanvas = document.getElementById('chart-elevation');
    updateSelectionBoxVisuals();
  }
}

// Synchronize tooltip highlight and Map marker crosshair
let lastSyncIndex = -1;
function syncHoverAcrossComponents(index) {
  if (index === lastSyncIndex || index < 0 || index >= state.points.length) return;
  lastSyncIndex = index;
  
  const pt = state.points[index];
  
  // 1. Update Telemetry HUD overlay numbers
  dom.overlay.classList.add('visible');
  dom.oDist.textContent = (pt.dist / 1000).toFixed(2);
  dom.oTime.textContent = formatDuration(pt.elapsed);
  dom.oEle.textContent = Math.round(pt.ele);
  dom.oSpeed.textContent = pt.speed.toFixed(1);
  dom.oPower.textContent = pt.power !== null ? Math.round(pt.power) : '--';
  dom.oCad.textContent = pt.cad !== null ? Math.round(pt.cad) : '--';
  dom.oHr.textContent = pt.hr !== null ? Math.round(pt.hr) : '--';
  dom.oGrade.textContent = pt.grade.toFixed(1);
  
  // Color the grade overlay depending on climb/descent
  if (pt.grade > 3) {
    dom.oGrade.style.color = '#ff1744';
  } else if (pt.grade < -3) {
    dom.oGrade.style.color = '#00e676';
  } else {
    dom.oGrade.style.color = '#fff';
  }
  
  // 2. Draw/align sync line markers on all 3 charts (Skip during selection drag to optimize performance)
  if (!state.isSelecting) {
    Object.values(state.charts).forEach(chart => {
      if (chart) {
        chart.setActiveElements([
          { datasetIndex: 0, index: index },
          { datasetIndex: 1, index: index }
        ]);
        chart.update('none'); // Update without animation for high performance
      }
    });
  }
  
  // 3. Move map rider dot icon
  if (state.playbackMarker) {
    state.playbackMarker.setLatLng([pt.lat, pt.lon]);
  }
  
  // 4. Update pacing strategy active card state
  if (state.pacingPhases && state.pacingPhases.length > 0) {
    for (let i = 0; i < state.pacingPhases.length; i++) {
      const phase = state.pacingPhases[i];
      const nextPhase = state.pacingPhases[i + 1];
      const endDist = nextPhase ? nextPhase.startDist : 9999999;
      
      const stepElem = document.getElementById(`pacing-step-${i}`);
      if (stepElem) {
        if (pt.dist >= phase.startDist && pt.dist < endDist) {
          stepElem.className = 'pacing-step active';
          dom.phaseBadge.textContent = phase.zone.split(":")[0];
        } else if (pt.dist >= endDist) {
          stepElem.className = 'pacing-step completed';
        } else {
          stepElem.className = 'pacing-step pending';
        }
      }
    }
  }
}

// SIMULATOR CONTROLS
function startSimulation() {
  if (state.points.length === 0 || state.isPlaying) return;
  
  state.isPlaying = true;
  dom.playBtn.style.display = 'none';
  dom.pauseBtn.style.display = 'flex';
  
  // Run simulator loop
  const intervalMs = Math.round(1000 / state.playbackSpeed);
  state.playbackTimer = setInterval(() => {
    if (state.currentIndex >= state.points.length - 1) {
      stopSimulation();
      return;
    }
    
    state.currentIndex++;
    syncSimulationState();
  }, intervalMs);
}

function pauseSimulation() {
  state.isPlaying = false;
  dom.playBtn.style.display = 'flex';
  dom.pauseBtn.style.display = 'none';
  
  if (state.playbackTimer) {
    clearInterval(state.playbackTimer);
    state.playbackTimer = null;
  }
}

function stopSimulation() {
  pauseSimulation();
  state.currentIndex = 0;
  syncSimulationState();
}

function seekSimulation(index) {
  state.currentIndex = index;
  syncSimulationState();
}

// Keep UI elements in lockstep with simulator frame
function syncSimulationState() {
  const points = state.points;
  if (points.length === 0) return;
  
  const idx = state.currentIndex;
  const pt = points[idx];
  
  // Update progress slider
  dom.slider.value = idx;
  
  // Update time displays
  dom.currentTime.textContent = formatDuration(pt.elapsed);
  
  // Sync map & charts to current position
  syncHoverAcrossComponents(idx);
  
  // Pan map if rider marker exits view bounds
  if (state.map && state.playbackMarker) {
    const bounds = state.map.getBounds();
    if (!bounds.contains(state.playbackMarker.getLatLng())) {
      state.map.panTo([pt.lat, pt.lon]);
    }
  }
  
  // Update instant numeric display in top metrics widgets in real-time
  dom.distVal.innerHTML = `${(pt.dist / 1000).toFixed(2)} <span class="unit">km</span>`;
  dom.speedVal.innerHTML = `${pt.speed.toFixed(1)} <span class="unit">km/h</span>`;
  dom.eleVal.innerHTML = `${Math.round(pt.ele)} <span class="unit">m</span>`;
  
  if (pt.power !== null) {
    dom.powerVal.innerHTML = `${Math.round(pt.power)} <span class="unit">W</span>`;
  }
  
  document.getElementById('avg-hr-val').textContent = pt.hr !== null ? Math.round(pt.hr) : '--';
  document.getElementById('avg-cad-val').textContent = pt.cad !== null ? Math.round(pt.cad) : '--';
}

// Time display formatter: seconds -> hh:mm:ss
function formatDuration(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  
  return [
    hrs.toString().padStart(2, '0'),
    mins.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
}

// Chart Brushing & Segment Analysis Helpers
function findClosestIndexForXValue(xVal, type) {
  const points = state.points;
  if (points.length === 0) return 0;
  
  let low = 0;
  let high = points.length - 1;
  
  const targetFunc = (idx) => {
    return type === 'time' ? points[idx].elapsed : points[idx].dist / 1000;
  };
  
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const midVal = targetFunc(mid);
    if (midVal < xVal) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  
  if (low > 0) {
    const val1 = targetFunc(low);
    const val2 = targetFunc(low - 1);
    if (Math.abs(val1 - xVal) > Math.abs(val2 - xVal)) {
      return low - 1;
    }
  }
  return low;
}

function updateSelectionBoxVisuals() {
  if (state.selectionStartIdx === null || state.selectionEndIdx === null || !state.activeChart || !state.activeCanvas) {
    dom.selectionBox.style.display = 'none';
    return;
  }
  
  const points = state.points;
  const startIdx = Math.min(state.selectionStartIdx, state.selectionEndIdx);
  const endIdx = Math.max(state.selectionStartIdx, state.selectionEndIdx);
  
  if (startIdx < 0 || endIdx >= points.length) return;
  
  const xAxis = state.activeChart.scales.x;
  const getVal = (idx) => state.xAxisType === 'time' ? points[idx].elapsed : points[idx].dist / 1000;
  
  const startVal = getVal(startIdx);
  const endVal = getVal(endIdx);
  
  const startPixel = xAxis.getPixelForValue(startVal);
  const endPixel = xAxis.getPixelForValue(endVal);
  
  const canvasRect = state.activeCanvas.getBoundingClientRect();
  const parentRect = dom.chartsBody.getBoundingClientRect();
  const canvasLeftOffset = canvasRect.left - parentRect.left;
  
  const pixelLeft = startPixel + canvasLeftOffset;
  const pixelRight = endPixel + canvasLeftOffset;
  
  const left = Math.min(pixelLeft, pixelRight);
  const width = Math.abs(pixelLeft - pixelRight);
  
  dom.selectionBox.style.left = left + 'px';
  dom.selectionBox.style.width = width + 'px';
  dom.selectionBox.style.display = 'block';
}

function showSegmentStats(startIdx, endIdx) {
  const points = state.points;
  if (points.length === 0 || startIdx === null || endIdx === null) return;
  
  const segmentPoints = points.slice(startIdx, endIdx + 1);
  if (segmentPoints.length === 0) return;
  
  // Calculate distance
  const distMeters = segmentPoints[segmentPoints.length - 1].dist - segmentPoints[0].dist;
  const distKm = distMeters / 1000;
  
  // Calculate time
  const timeSec = segmentPoints[segmentPoints.length - 1].elapsed - segmentPoints[0].elapsed;
  
  // Calculate average speed
  const avgSpeed = timeSec > 0 ? (distMeters / timeSec) * 3.6 : 0;
  
  // Calculate elevation gain
  let eleGain = 0;
  for (let i = 1; i < segmentPoints.length; i++) {
    const dEle = segmentPoints[i].ele - segmentPoints[i - 1].ele;
    if (dEle > 0.3) {
      eleGain += dEle;
    }
  }
  
  // Calculate power metrics
  const powerPoints = segmentPoints.filter(p => p.power !== null).map(p => p.power);
  const hasPower = powerPoints.length > 0;
  let avgPowerStr = '--';
  let npStr = '--';
  
  if (hasPower) {
    const avgPower = Math.round(powerPoints.reduce((a, b) => a + b, 0) / powerPoints.length);
    avgPowerStr = avgPower + ' W';
    const np = calculateNP(segmentPoints);
    npStr = np + ' W';
  }
  
  // Update DOM elements
  dom.segDist.textContent = distKm.toFixed(2) + ' km';
  dom.segTime.textContent = formatDuration(timeSec);
  dom.segSpeed.textContent = avgSpeed.toFixed(1) + ' km/h';
  dom.segAvgPwr.textContent = avgPowerStr;
  dom.segNp.textContent = npStr;
  dom.segEle.textContent = Math.round(eleGain) + ' m';
  
  // Show the panel
  dom.segmentPanel.style.display = 'block';
}

// Window resize handler to reposition the selection box dynamically
window.addEventListener('resize', () => {
  if (state.selectionStartIdx !== null && state.selectionEndIdx !== null && state.charts.elevation) {
    state.activeChart = state.charts.elevation;
    state.activeCanvas = document.getElementById('chart-elevation');
    updateSelectionBoxVisuals();
  }
});
