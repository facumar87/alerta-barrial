// Coordenadas fijas por defecto para el mapa (González Catán / Zona Barrial)
const NEIGHBORHOOD_CENTER = [-34.778674960671204, -58.62200479284213];

// Alertas de prueba del barrio
let incidents = [
    {
        id: 1,
        category: "robo",
        tipo: "Robo / Arrebato",
        direccion: "Simoni y Cepeda",
        lat: -34.7645,
        lng: -58.6215,
        desc: "Motochorro sin casco arrebató mochila en la esquina. Escapó hacia el fondo.",
        fecha: "2026-10-14 18:10",
        autor: "Facundo"
    },
    {
        id: 2,
        category: "sospecha",
        tipo: "Actitud Sospechosa",
        direccion: "Barros Pazos y Puerto Argentino",
        lat: -34.7620,
        lng: -58.6190,
        desc: "Dos sujetos mirando hacia el interior de las casas estacionadas.",
        fecha: "2026-10-14 16:40",
        autor: "Vecino_Simoni"
    },
    {
        id: 3,
        category: "acoso",
        tipo: "Acoso / Llegué Bien",
        direccion: "Av. José Equiza",
        lat: -34.7660,
        lng: -58.6230,
        desc: "Zona muy oscura por lámparas quemadas. Autos tocando bocina a chicas que caminan.",
        fecha: "2026-10-13 21:00",
        autor: "Laura"
    }
];

let currentUser = null;
let map, markersLayer;
let currentCategoryFilter = 'all';

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    renderIncidents();
});

// Inicializar Mapa centrado en el barrio (100% Libre y Gratuito de OpenStreetMap)
function initMap() {
    map = L.map('map').setView(NEIGHBORHOOD_CENTER, 15);

    // Servidor oficial de OpenStreetMap (Nunca pide API Key)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    updateMapMarkers();
}

// Control de Sesión
function switchAuthTab(tab) {
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const loginBtn = document.getElementById('tab-btn-login');
    const regBtn = document.getElementById('tab-btn-register');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginBtn.className = 'flex-1 pb-2 text-xs font-semibold text-amber-500 border-b-2 border-amber-500';
        regBtn.className = 'flex-1 pb-2 text-xs font-semibold text-slate-400 hover:text-slate-200';
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        regBtn.className = 'flex-1 pb-2 text-xs font-semibold text-amber-500 border-b-2 border-amber-500';
        loginBtn.className = 'flex-1 pb-2 text-xs font-semibold text-slate-400 hover:text-slate-200';
    }
}

function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('login-user').value.trim();
    if (!user) return;

    currentUser = { username: user };
    document.getElementById('user-status-label').innerText = user;
    document.getElementById('auth-screen').classList.add('hidden');
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-fullname').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();

    currentUser = { username: name, phone };
    alert(`¡Bienvenido/a ${name} a Alerta Barrial! Ya podés publicar alertas.`);
    document.getElementById('user-status-label').innerText = name;
    document.getElementById('auth-screen').classList.add('hidden');
}

function loginAsGuest() {
    currentUser = null;
    document.getElementById('user-status-label').innerText = 'Invitado';
    document.getElementById('auth-screen').classList.add('hidden');
}

function logout() {
    currentUser = null;
    document.getElementById('auth-screen').classList.remove('hidden');
}

// Modales
function openModal(id) {
    if (!currentUser) {
        alert('Tenés que ingresar o registrarte para publicar una alerta vecinal.');
        document.getElementById('auth-screen').classList.remove('hidden');
        return;
    }
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('flex');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).classList.remove('flex');
}

// Carga de Alerta
function submitAlert(e) {
    e.preventDefault();
    const tipo = document.getElementById('alert-tipo').value;
    const direccion = document.getElementById('alert-direccion').value;
    const desc = document.getElementById('alert-desc').value;

    let category = 'robo';
    if (tipo.includes('Sospechosa') || tipo.includes('Vehículo')) category = 'sospecha';
    if (tipo.includes('Acoso') || tipo.includes('Oscura')) category = 'acoso';

    const newAlert = {
        id: Date.now(),
        category,
        tipo,
        direccion,
        lat: NEIGHBORHOOD_CENTER[0] + (Math.random() - 0.5) * 0.008,
        lng: NEIGHBORHOOD_CENTER[1] + (Math.random() - 0.5) * 0.008,
        desc,
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
        autor: currentUser ? currentUser.username : 'Vecino'
    };

    incidents.unshift(newAlert);
    closeModal('alert-modal');
    document.getElementById('alert-form').reset();
    renderIncidents();
    map.setView([newAlert.lat, newAlert.lng], 16);
}

// Filtros y Renderizado
function setCategoryFilter(cat) {
    currentCategoryFilter = cat;
    ['all', 'robo', 'sospecha', 'acoso'].forEach(c => {
        const btn = document.getElementById(`tab-${c}`);
        if (!btn) return;
        btn.className = c === cat 
            ? 'bg-amber-500 text-slate-950 font-bold py-1 rounded-lg text-[10px]' 
            : 'bg-slate-800 text-slate-400 py-1 rounded-lg text-[10px]';
    });
    filterIncidents();
}

function filterIncidents() {
    const search = document.getElementById('search-input').value.toLowerCase();

    const filtered = incidents.filter(inc => {
        const matchCat = currentCategoryFilter === 'all' || inc.category === currentCategoryFilter;
        const matchSearch = !search || inc.direccion.toLowerCase().includes(search) || inc.desc.toLowerCase().includes(search) || inc.tipo.toLowerCase().includes(search);
        return matchCat && matchSearch;
    });

    renderIncidentsList(filtered);
    updateMapMarkers(filtered);
}

function renderIncidents() { filterIncidents(); }

function renderIncidentsList(list) {
    const container = document.getElementById('incidents-list');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-500 text-xs">Sin alertas registradas en esta categoría.</div>`;
        return;
    }

    list.forEach(inc => {
        let badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        let icon = 'fa-triangle-exclamation text-rose-500';

        if (inc.category === 'sospecha') {
            badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            icon = 'fa-eye text-amber-400';
        } else if (inc.category === 'acoso') {
            badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            icon = 'fa-person-walking-arrow-right text-purple-400';
        }

        container.innerHTML += `
            <div onclick="focusOnIncident(${inc.lat}, ${inc.lng})" class="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 cursor-pointer transition space-y-1.5 shadow-sm">
                <div class="flex justify-between items-start">
                    <span class="text-[10px] px-2 py-0.5 rounded-full border font-medium ${badgeColor}">
                        <i class="fa-solid ${icon}"></i> ${inc.tipo}
                    </span>
                    <span class="text-[10px] text-slate-500">${inc.fecha}</span>
                </div>
                <p class="text-xs font-bold text-white"><i class="fa-solid fa-location-dot text-amber-500 mr-1"></i>${inc.direccion}</p>
                <p class="text-[11px] text-slate-300 leading-relaxed">${inc.desc}</p>
                <div class="text-[9px] text-slate-500 pt-1 border-t border-slate-800 flex justify-between">
                    <span>Publicado por: ${inc.autor}</span>
                    <span class="text-amber-400">Ver en mapa &rarr;</span>
                </div>
            </div>
        `;
    });
}

function updateMapMarkers(list = incidents) {
    markersLayer.clearLayers();

    list.forEach(inc => {
        let color = '#f43f5e';
        let iconName = 'fa-triangle-exclamation';

        if (inc.category === 'sospecha') {
            color = '#f59e0b';
            iconName = 'fa-eye';
        } else if (inc.category === 'acoso') {
            color = '#9333ea';
            iconName = 'fa-user-shield';
        }

        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 0 10px ${color}; font-size: 12px;"><i class="fa-solid ${iconName}"></i></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const popupContent = `
            <div style="font-size: 12px; min-width: 180px;">
                <b style="color: ${color};">${inc.tipo}</b><br>
                <b>Esquina:</b> ${inc.direccion}<br>
                <p style="margin: 4px 0; color: #cbd5e1;">${inc.desc}</p>
                <span style="font-size: 10px; color: #64748b;">Aviso: ${inc.fecha}</span>
            </div>
        `;

        const marker = L.marker([inc.lat, inc.lng], {icon: customIcon}).bindPopup(popupContent);
        markersLayer.addLayer(marker);
    });
}

function focusOnIncident(lat, lng) {
    map.setView([lat, lng], 17, { animate: true });
}