/**
 * SpokeRoute Pro - MVP Interativo
 * Otimizador de Rotas de Entrega inspirado em Spoke & Circuit
 */

// Estado Global da Aplicação
const state = {
  // Ponto de Partida (Centro de Distribuição / Galpão SP)
  hub: {
    name: "CD Central - São Paulo",
    address: "Praça da Sé, Centro, São Paulo - SP",
    lat: -23.550520,
    lng: -46.633308
  },
  stops: [],
  activeStopIndex: 0,
  map: null,
  markers: [],
  routePolyline: null,
  mapTheme: 'dark', // 'dark' ou 'light'
  tileLayer: null,
  activeModalStopId: null,
  pendingOptimizedSequence: null
};

// Dados de Demonstração (Bairros reais de São Paulo)
const demoStops = [
  {
    id: "stop-1",
    recipient: "Mariana Souza",
    address: "Av. Paulista, 1578 - Bela Vista, São Paulo",
    lat: -23.561414,
    lng: -46.655881,
    notes: "Apto 82 - Deixar na portaria social",
    timeWindow: "Até 14:00",
    status: "pending",
    signature: null
  },
  {
    id: "stop-2",
    recipient: "Carlos Eduardo Silva",
    address: "Rua Oscar Freire, 900 - Cerqueira César, São Paulo",
    lat: -23.563604,
    lng: -46.669888,
    notes: "Loja de roupas - Entregar no balcão dos fundos",
    timeWindow: "Comercial",
    status: "pending",
    signature: null
  },
  {
    id: "stop-3",
    recipient: "Beatriz Lima",
    address: "Rua dos Pinheiros, 600 - Pinheiros, São Paulo",
    lat: -23.567800,
    lng: -46.685200,
    notes: "Tocar interfone 12B. Cão dócil no quintal",
    timeWindow: "Até 16:30",
    status: "pending",
    signature: null
  },
  {
    id: "stop-4",
    recipient: "Rafael Nogueira",
    address: "Av. Brigadeiro Faria Lima, 2232 - Itaim Bibi, São Paulo",
    lat: -23.582100,
    lng: -46.682900,
    notes: "Edifício comercial - Torre Sul, 14º andar",
    timeWindow: "Até 17:00",
    status: "pending",
    signature: null
  },
  {
    id: "stop-5",
    recipient: "Fernanda Ribeiro",
    address: "Av. Ibirapuera, 3103 - Moema, São Paulo",
    lat: -23.608300,
    lng: -46.666900,
    notes: "Condomínio fechado - Autorizado na portaria",
    timeWindow: "Sem restrição",
    status: "pending",
    signature: null
  },
  {
    id: "stop-6",
    recipient: "Lucas Albuquerque",
    address: "Rua Domingos de Morais, 2187 - Vila Mariana, São Paulo",
    lat: -23.598500,
    lng: -46.637500,
    notes: "Sobrado com portão cinza. Chamar no portão",
    timeWindow: "Até 15:00",
    status: "pending",
    signature: null
  },
  {
    id: "stop-7",
    recipient: "Juliana Mendes",
    address: "Rua Vergueiro, 1000 - Liberdade, São Paulo",
    lat: -23.571200,
    lng: -46.640100,
    notes: "Pacote frágil - Manter na vertical",
    timeWindow: "Até 18:00",
    status: "pending",
    signature: null
  }
];

// ============================================================================
// Inicialização da Aplicação
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  setupEventListeners();
  setupSignatureCanvas();
  loadDemoRoute(); // Inicia com a rota de demonstração carregada
});

// Inicialização do Mapa Leaflet
function initMap() {
  state.map = L.map("map", {
    zoomControl: false,
    attributionControl: false
  }).setView([state.hub.lat, state.hub.lng], 13);

  // Tiles de alta definição estilo Dark Matter da CartoDB
  setMapTheme('dark');

  // Adiciona controle de zoom no canto inferior direito
  L.control.zoom({ position: "bottomright" }).addTo(state.map);
}

function setMapTheme(theme) {
  if (state.tileLayer) {
    state.map.removeLayer(state.tileLayer);
  }

  const url = theme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  state.tileLayer = L.tileLayer(url, {
    maxZoom: 19
  }).addTo(state.map);

  state.mapTheme = theme;
}

// ============================================================================
// Renderização e Atualização do Mapa
// ============================================================================
function updateMap() {
  // Limpa marcadores anteriores
  state.markers.forEach(m => state.map.removeLayer(m));
  state.markers = [];

  if (state.routePolyline) {
    state.map.removeLayer(state.routePolyline);
    state.routePolyline = null;
  }

  // 1. Marcador do Ponto de Saída (Galpão / CD)
  const hubIcon = L.divIcon({
    className: "leaflet-div-icon",
    html: `
      <div class="custom-map-pin start-hub" title="Ponto de Saída: ${state.hub.name}">
        <span class="pin-number"><i class="fa-solid fa-warehouse" style="font-size: 0.65rem;"></i></span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34]
  });

  const hubMarker = L.marker([state.hub.lat, state.hub.lng], { icon: hubIcon })
    .bindPopup(`<b>Ponto de Partida:</b><br>${state.hub.name}<br>${state.hub.address}`)
    .addTo(state.map);

  state.markers.push(hubMarker);

  // 2. Marcadores das Paradas
  const latLngs = [[state.hub.lat, state.hub.lng]];
  const activeStop = getActiveStop();

  state.stops.forEach((stop, index) => {
    latLngs.push([stop.lat, stop.lng]);

    const isCurrentActive = activeStop && activeStop.id === stop.id;
    const isDelivered = stop.status === 'delivered';

    let pinClass = "custom-map-pin";
    let iconContent = index + 1;

    if (isDelivered) {
      pinClass += " delivered";
      iconContent = '<i class="fa-solid fa-check" style="font-size: 0.65rem;"></i>';
    } else if (isCurrentActive) {
      pinClass += " active";
    }

    const stopIcon = L.divIcon({
      className: "leaflet-div-icon",
      html: `
        <div class="${pinClass}" id="marker-pin-${stop.id}">
          <span class="pin-number">${iconContent}</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34]
    });

    const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon })
      .bindPopup(`
        <div style="font-family: var(--font-main);">
          <b>#${index + 1} - ${escapeHtml(stop.recipient)}</b><br>
          <span style="font-size: 0.8rem; color: #555;">${escapeHtml(stop.address)}</span><br>
          <div style="margin-top: 6px; font-size: 0.75rem; color: #10b981; font-weight: 600;">
            ${stop.status === 'delivered' ? '✓ Entregue' : '● Pendente'}
          </div>
        </div>
      `)
      .addTo(state.map);

    marker.on("click", () => {
      selectStop(index);
    });

    state.markers.push(marker);
  });

  // 3. Desenho da Linha de Rota (Polyline)
  if (latLngs.length > 1) {
    state.routePolyline = L.polyline(latLngs, {
      color: "#10b981",
      weight: 4,
      opacity: 0.85,
      dashArray: "8, 6",
      lineJoin: "round"
    }).addTo(state.map);
  }

  // Ajusta visão para englobar todas as paradas
  if (latLngs.length > 1) {
    state.map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
  }
}

// ============================================================================
// Renderização da Sidebar e Lista de Paradas
// ============================================================================
function updateUI() {
  renderStopsList();
  renderDriverHUD();
  updateRouteMetrics();
  updateMap();
}

function renderStopsList() {
  const container = document.getElementById("stopsList");
  container.innerHTML = "";

  if (state.stops.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <i class="fa-solid fa-map-location-dot" style="font-size: 2.4rem; margin-bottom: 12px; color: var(--accent-cyan); opacity: 0.6;"></i>
        <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">Nenhuma parada cadastrada</div>
        <div style="font-size: 0.8rem;">Digite um endereço acima ou clique em "Rota Demo SP" para testar o otimizador.</div>
      </div>
    `;
    return;
  }

  const activeStop = getActiveStop();

  state.stops.forEach((stop, index) => {
    const isCurrentActive = activeStop && activeStop.id === stop.id;
    const isDelivered = stop.status === "delivered";

    const card = document.createElement("div");
    card.className = `stop-card ${isCurrentActive ? "active" : ""} ${isDelivered ? "delivered" : ""}`;
    card.id = `stop-card-${stop.id}`;

    card.innerHTML = `
      <div class="stop-badge">
        ${isDelivered ? '<i class="fa-solid fa-check"></i>' : index + 1}
      </div>
      
      <div class="stop-details">
        <div class="stop-title-row">
          <span class="stop-recipient">${escapeHtml(stop.recipient)}</span>
          <span class="stop-time-tag">${escapeHtml(stop.timeWindow || "")}</span>
        </div>
        <div class="stop-address" title="${escapeHtml(stop.address)}">
          ${escapeHtml(stop.address)}
        </div>
        <div style="font-size: 0.72rem; color: var(--accent-amber); display: flex; align-items: center; gap: 4px;">
          <i class="fa-regular fa-note-sticky"></i>
          <span>${escapeHtml(stop.notes || "Sem notas")}</span>
        </div>
      </div>

      <div class="stop-card-actions">
        <!-- Navegar Waze -->
        <button class="icon-action-btn btn-waze" title="Abrir no Waze" onclick="openWaze(${stop.lat}, ${stop.lng})">
          <i class="fa-brands fa-waze"></i>
        </button>
        <!-- Navegar Google Maps -->
        <button class="icon-action-btn btn-gmaps" title="Abrir no Google Maps" onclick="openGoogleMaps(${stop.lat}, ${stop.lng})">
          <i class="fa-solid fa-location-arrow"></i>
        </button>
        <!-- Mover para Cima -->
        <button class="icon-action-btn" title="Subir prioridade" onclick="moveStop(${index}, -1)" ${index === 0 ? "disabled" : ""}>
          <i class="fa-solid fa-chevron-up"></i>
        </button>
        <!-- Mover para Baixo -->
        <button class="icon-action-btn" title="Descer prioridade" onclick="moveStop(${index}, 1)" ${index === state.stops.length - 1 ? "disabled" : ""}>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <!-- Excluir Parada -->
        <button class="icon-action-btn" title="Remover" onclick="deleteStop('${stop.id}')" style="color: var(--accent-red);">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    // Clique no card centraliza o mapa e seleciona a parada
    card.addEventListener("click", (e) => {
      if (e.target.closest(".icon-action-btn")) return;
      selectStop(index);
    });

    container.appendChild(card);
  });
}

function renderDriverHUD() {
  const activeStop = getActiveStop();
  const hudElement = document.getElementById("driverHud");
  const btnNavigate = document.getElementById("btnHudNavigate");
  const btnComplete = document.getElementById("btnHudComplete");

  if (!activeStop) {
    document.getElementById("hudRecipient").innerText = "Todas as Entregas Concluídas! 🎉";
    document.getElementById("hudAddress").innerText = "Excelente trabalho. Rota finalizada com sucesso.";
    document.getElementById("hudNotesText").innerText = "Retorne ao centro de distribuição.";
    document.getElementById("hudEta").innerText = "Finalizado";
    btnNavigate.style.display = "none";
    btnComplete.style.display = "none";
    return;
  }

  btnNavigate.style.display = "flex";
  btnComplete.style.display = "flex";

  const index = state.stops.findIndex(s => s.id === activeStop.id);
  document.getElementById("hudRecipient").innerText = activeStop.recipient;
  document.getElementById("hudAddress").innerText = activeStop.address;
  document.getElementById("hudNotesText").innerText = activeStop.notes || "Sem observações adicionais";
  document.getElementById("hudEta").innerText = `Parada #${index + 1} de ${state.stops.length}`;

  btnNavigate.onclick = () => {
    openWaze(activeStop.lat, activeStop.lng);
  };

  btnComplete.onclick = () => {
    openPODModal(activeStop.id);
  };
}

function updateRouteMetrics() {
  const totalStops = state.stops.length;
  const deliveredStops = state.stops.filter(s => s.status === 'delivered').length;
  const progressPercent = totalStops > 0 ? Math.round((deliveredStops / totalStops) * 100) : 0;

  // Atualiza pílula no header
  document.getElementById("statStopsCount").innerText = totalStops;
  
  const distanceKm = calculateTotalDistance(state.stops);
  document.getElementById("statDistance").innerText = `${distanceKm.toFixed(1)} km`;

  // Tempo estimado: 30 km/h velocidade média + 6 min por entrega
  const driveMinutes = (distanceKm / 30) * 60;
  const stopMinutes = totalStops * 6;
  const totalMinutes = Math.round(driveMinutes + stopMinutes);
  document.getElementById("statTime").innerText = `${totalMinutes} min`;

  // Progresso
  document.getElementById("progressPercentText").innerText = `${deliveredStops} de ${totalStops} (${progressPercent}%)`;
  document.getElementById("progressFill").style.width = `${progressPercent}%`;
}

// Retorna a próxima parada pendente
function getActiveStop() {
  return state.stops.find(s => s.status === 'pending') || null;
}

function selectStop(index) {
  const stop = state.stops[index];
  if (!stop) return;

  state.map.flyTo([stop.lat, stop.lng], 16, { duration: 0.8 });

  // Abre popup do marcador
  const marker = state.markers[index + 1]; // +1 por conta do hub
  if (marker) {
    marker.openPopup();
  }
}

// ============================================================================
// Algoritmo de Otimização de Rotas (TSP - Travelling Salesperson Problem)
// Heurística de Construção (Nearest Neighbor) + Refinamento Local (2-Opt)
// ============================================================================
function optimizeRoute() {
  if (state.stops.length < 2) {
    showToast("Adicione pelo menos 2 paradas para otimizar.");
    return;
  }

  const originalDistance = calculateTotalDistance(state.stops);
  
  // 1. Fase Construtiva: Nearest Neighbor
  let unvisited = [...state.stops];
  let currentPoint = { lat: state.hub.lat, lng: state.hub.lng };
  let optimizedSequence = [];

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineDistance(currentPoint.lat, currentPoint.lng, unvisited[i].lat, unvisited[i].lng);
      if (d < minDistance) {
        minDistance = d;
        nearestIndex = i;
      }
    }

    const nextStop = unvisited.splice(nearestIndex, 1)[0];
    optimizedSequence.push(nextStop);
    currentPoint = { lat: nextStop.lat, lng: nextStop.lng };
  }

  // 2. Fase de Melhoria: Heurística 2-Opt (Desfaz cruzamentos de trajeto)
  let improved = true;
  let iterations = 0;
  const maxIterations = 50;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < optimizedSequence.length - 1; i++) {
      for (let j = i + 1; j < optimizedSequence.length; j++) {
        const currentDist = calculateTotalDistance(optimizedSequence);
        
        // Inverte sub-rota entre i e j
        const candidate = twoOptSwap(optimizedSequence, i, j);
        const newDist = calculateTotalDistance(candidate);

        if (newDist < currentDist - 0.01) {
          optimizedSequence = candidate;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  const optimizedDistance = calculateTotalDistance(optimizedSequence);
  const savingsKm = Math.max(0, originalDistance - optimizedDistance);
  const savingsPercent = originalDistance > 0 ? Math.round((savingsKm / originalDistance) * 100) : 0;

  // Armazena a sequência calculada para confirmação no modal
  state.pendingOptimizedSequence = optimizedSequence;

  // Atualiza modal com comparativo de ganhos
  document.getElementById("optOriginalDistance").innerText = `${originalDistance.toFixed(1)} km`;
  document.getElementById("optOptimizedDistance").innerText = `${optimizedDistance.toFixed(1)} km`;
  document.getElementById("optSavingsSummary").innerText = savingsPercent > 0 
    ? `Economia de ${savingsKm.toFixed(1)} km (-${savingsPercent}%)` 
    : "Rota já se encontrava na melhor sequência!";

  // Abre modal
  openModal("modalOptimize");
}

function twoOptSwap(route, i, j) {
  const newRoute = [];
  // 1. Adiciona de 0 até i-1
  for (let c = 0; c < i; c++) {
    newRoute.push(route[c]);
  }
  // 2. Adiciona invertido de i até j
  for (let c = j; c >= i; c--) {
    newRoute.push(route[c]);
  }
  // 3. Adiciona de j+1 até o fim
  for (let c = j + 1; c < route.length; c++) {
    newRoute.push(route[c]);
  }
  return newRoute;
}

// Aplica a otimização confirmada
function applyOptimizedRoute() {
  if (state.pendingOptimizedSequence) {
    state.stops = state.pendingOptimizedSequence;
    state.pendingOptimizedSequence = null;
    
    // Atualiza tag de economia no header
    document.getElementById("statSavings").innerText = document.getElementById("optSavingsSummary").innerText;

    closeModal("modalOptimize");
    updateUI();
    showToast("✓ Rota otimizada com sucesso! Sequência atualizada.");
  }
}

// Cálculo da Distância Total percorrendo Hub -> Stop1 -> Stop2 ...
function calculateTotalDistance(stopsList) {
  if (!stopsList || stopsList.length === 0) return 0;
  
  let total = 0;
  let current = { lat: state.hub.lat, lng: state.hub.lng };

  for (const stop of stopsList) {
    total += haversineDistance(current.lat, current.lng, stop.lat, stop.lng);
    current = { lat: stop.lat, lng: stop.lng };
  }

  return total;
}

// Fórmula de Haversine (Distância geodésica em km)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// ============================================================================
// Handoff de Navegação (Waze & Google Maps)
// ============================================================================
function openWaze(lat, lng) {
  const wazeUrl = `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  window.open(wazeUrl, "_blank");
  showToast("Iniciando navegação no Waze...");
}

function openGoogleMaps(lat, lng) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(mapsUrl, "_blank");
  showToast("Iniciando navegação no Google Maps...");
}

// ============================================================================
// Manipulação de Paradas (Mover, Deletar, Adicionar)
// ============================================================================
function moveStop(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= state.stops.length) return;

  const temp = state.stops[index];
  state.stops[index] = state.stops[targetIndex];
  state.stops[targetIndex] = temp;

  updateUI();
}

function deleteStop(id) {
  state.stops = state.stops.filter(s => s.id !== id);
  updateUI();
  showToast("Parada removida da rota.");
}

function loadDemoRoute() {
  state.stops = JSON.parse(JSON.stringify(demoStops));
  updateUI();
  showToast("Rota de demonstração de São Paulo carregada!");
}

// ============================================================================
// Autocomplete de Endereços com OpenStreetMap Nominatim
// ============================================================================
let searchDebounceTimeout = null;

function setupSearchAutocomplete() {
  const input = document.getElementById("stopSearchInput");
  const dropdown = document.getElementById("autocompleteDropdown");

  input.addEventListener("input", () => {
    clearTimeout(searchDebounceTimeout);
    const query = input.value.trim();

    if (query.length < 3) {
      dropdown.classList.remove("active");
      dropdown.innerHTML = "";
      return;
    }

    searchDebounceTimeout = setTimeout(() => {
      fetchNominatim(query);
    }, 400);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-input-group")) {
      dropdown.classList.remove("active");
    }
  });
}

async function fetchNominatim(query) {
  const dropdown = document.getElementById("autocompleteDropdown");
  
  try {
    dropdown.innerHTML = `
      <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
        <i class="fa-solid fa-spinner fa-spin"></i> Buscando endereços no Brasil...
      </div>
    `;
    dropdown.classList.add("active");

    const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=5`;
    const response = await fetch(endpoint);
    const results = await response.json();

    dropdown.innerHTML = "";

    if (!results || results.length === 0) {
      dropdown.innerHTML = `
        <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
          Nenhum endereço encontrado para "${escapeHtml(query)}"
        </div>
      `;
      return;
    }

    results.forEach(item => {
      const el = document.createElement("div");
      el.className = "autocomplete-item";
      el.innerHTML = `
        <i class="fa-solid fa-location-dot" style="color: var(--accent-cyan);"></i>
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(item.display_name)}
        </div>
      `;

      el.addEventListener("click", () => {
        addStopFromGeocode(item);
        dropdown.classList.remove("active");
        document.getElementById("stopSearchInput").value = "";
      });

      dropdown.appendChild(el);
    });

  } catch (err) {
    console.error("Erro na busca de geocodificação:", err);
    dropdown.innerHTML = `
      <div style="padding: 12px; text-align: center; color: var(--accent-red); font-size: 0.8rem;">
        Falha na conexão de busca.
      </div>
    `;
  }
}

function addStopFromGeocode(item) {
  const newStop = {
    id: `stop-${Date.now()}`,
    recipient: `Destinatário #${state.stops.length + 1}`,
    address: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    notes: "Entrega cadastrada via busca",
    timeWindow: "Comercial",
    status: "pending",
    signature: null
  };

  state.stops.push(newStop);
  updateUI();
  showToast("Nova parada adicionada à rota!");
}

// ============================================================================
// Canvas de Assinatura Digital (Proof of Delivery - POD)
// ============================================================================
let signatureCanvas, signatureCtx, isDrawing = false;

function setupSignatureCanvas() {
  signatureCanvas = document.getElementById("signatureCanvas");
  signatureCtx = signatureCanvas.getContext("2d");

  // Ajusta resolução do canvas
  function resizeCanvas() {
    const rect = signatureCanvas.getBoundingClientRect();
    signatureCanvas.width = rect.width * 2;
    signatureCanvas.height = rect.height * 2;
    signatureCtx.scale(2, 2);
    signatureCtx.strokeStyle = "#0f172a";
    signatureCtx.lineWidth = 2.5;
    signatureCtx.lineCap = "round";
    signatureCtx.lineJoin = "round";
  }

  window.addEventListener("resize", resizeCanvas);
  setTimeout(resizeCanvas, 300);

  // Eventos de Mouse e Touch
  function getCoordinates(e) {
    const rect = signatureCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    const coords = getCoordinates(e);
    signatureCtx.beginPath();
    signatureCtx.moveTo(coords.x, coords.y);
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    signatureCtx.lineTo(coords.x, coords.y);
    signatureCtx.stroke();
  }

  function stopDrawing() {
    isDrawing = false;
  }

  signatureCanvas.addEventListener("mousedown", startDrawing);
  signatureCanvas.addEventListener("mousemove", draw);
  signatureCanvas.addEventListener("mouseup", stopDrawing);

  signatureCanvas.addEventListener("touchstart", startDrawing, { passive: false });
  signatureCanvas.addEventListener("touchmove", draw, { passive: false });
  signatureCanvas.addEventListener("touchend", stopDrawing);

  document.getElementById("btnClearSignature").addEventListener("click", clearSignatureCanvas);
}

function clearSignatureCanvas() {
  if (!signatureCtx || !signatureCanvas) return;
  signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
}

function openPODModal(stopId) {
  state.activeModalStopId = stopId;
  const stop = state.stops.find(s => s.id === stopId);
  if (!stop) return;

  document.getElementById("podStopTitle").innerText = stop.recipient;
  document.getElementById("podStopAddress").innerText = stop.address;
  document.getElementById("podReceiverName").value = stop.recipient;

  clearSignatureCanvas();
  openModal("modalPOD");
}

function savePOD() {
  const stopId = state.activeModalStopId;
  const stop = state.stops.find(s => s.id === stopId);
  if (!stop) return;

  const receiverName = document.getElementById("podReceiverName").value.trim() || stop.recipient;
  const deliveryType = document.getElementById("podDeliveryType").value;

  stop.status = "delivered";
  stop.receiverName = receiverName;
  stop.deliveryType = deliveryType;
  stop.completedAt = new Date().toLocaleTimeString('pt-BR');

  closeModal("modalPOD");
  updateUI();
  showToast(`✓ Entrega concluída para ${receiverName}!`);
}

// ============================================================================
// Modais e Utilitários
// ============================================================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function showToast(message) {
  const toast = document.getElementById("toastNotification");
  document.getElementById("toastMessage").innerText = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// Event Listeners Gerais
// ============================================================================
function setupEventListeners() {
  // Otimização
  document.getElementById("btnOptimizeRoute").addEventListener("click", optimizeRoute);
  document.getElementById("btnConfirmOptimization").addEventListener("click", applyOptimizedRoute);
  
  // Demo Route
  document.getElementById("btnLoadDemoRoute").addEventListener("click", loadDemoRoute);

  // Recenter Mapa
  document.getElementById("btnRecenter").addEventListener("click", () => {
    if (state.stops.length > 0) {
      const latLngs = [[state.hub.lat, state.hub.lng], ...state.stops.map(s => [s.lat, s.lng])];
      state.map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    } else {
      state.map.setView([state.hub.lat, state.hub.lng], 13);
    }
  });

  // Alternar Tema do Mapa
  document.getElementById("btnToggleLayer").addEventListener("click", () => {
    const nextTheme = state.mapTheme === 'dark' ? 'light' : 'dark';
    setMapTheme(nextTheme);
    showToast(`Mapa alternado para o modo ${nextTheme === 'dark' ? 'escuro' : 'claro'}.`);
  });

  // Importação em Lote
  document.getElementById("btnBatchImport").addEventListener("click", () => {
    openModal("modalBatch");
  });

  document.getElementById("btnProcessBatch").addEventListener("click", () => {
    const text = document.getElementById("batchTextInput").value.trim();
    if (!text) {
      showToast("Insira ao menos um endereço.");
      return;
    }
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    closeModal("modalBatch");
    showToast(`Importando ${lines.length} endereços...`);
    
    // Processa o primeiro como exemplo
    lines.forEach((line, i) => {
      setTimeout(() => {
        state.stops.push({
          id: `stop-batch-${Date.now()}-${i}`,
          recipient: `Cliente #${state.stops.length + 1}`,
          address: line,
          lat: state.hub.lat + (Math.random() - 0.5) * 0.08,
          lng: state.hub.lng + (Math.random() - 0.5) * 0.08,
          notes: "Importado em lote",
          timeWindow: "Comercial",
          status: "pending",
          signature: null
        });
        updateUI();
      }, i * 150);
    });
  });

  // Salvar POD
  document.getElementById("btnSavePOD").addEventListener("click", savePOD);

  // Fechamento de Modais pelos botões data-close
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close");
      closeModal(modalId);
    });
  });

  // Fechar modal clicando fora
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  });

  // Alternador de Visualização (Desktop vs App Mobile)
  const btnDesktop = document.getElementById("btnViewDesktop");
  const btnMobile = document.getElementById("btnViewMobile");
  const appContainer = document.getElementById("appContainer");
  const deviceWrapper = document.getElementById("deviceWrapper");

  btnDesktop.addEventListener("click", () => {
    btnDesktop.classList.add("active");
    btnMobile.classList.remove("active");
    appContainer.classList.remove("mobile-mode");
    deviceWrapper.style.display = "contents";
    setTimeout(() => state.map.invalidateSize(), 300);
  });

  btnMobile.addEventListener("click", () => {
    btnMobile.classList.add("active");
    btnDesktop.classList.remove("active");
    appContainer.classList.add("mobile-mode");
    deviceWrapper.style.display = "flex";
    setTimeout(() => state.map.invalidateSize(), 300);
    showToast("Visualizando em Modo Celular de Motorista");
  });

  setupSearchAutocomplete();
}
