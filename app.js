// Coordenadas fijas por defecto para el centro del barrio (González Catán)
const NEIGHBORHOOD_CENTER = [-34.7642, -58.6211];

// 👑 TU NÚMERO DE ADMINISTRADOR (Reemplazá por tu celular real de 10 dígitos, sin 0 y sin 15)
const ADMIN_PHONE = "1168139081"; 

// 🔑 CONFIGURACIÓN DE SUPABASE (Pegá acá tus credenciales de supabase.com)
const SUPABASE_URL = "https://tiesybvhvjyknksvyabr.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZXN5YnZodmp5a25rc3Z5YWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMjY5MjMsImV4cCI6MjEwNzcwMjkyM30.dHleKZMS5RciUgcu-ErF3lTywaPBrcTxN3jUiAcJaQ4";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let incidents = [];
let currentUser = null;
let pendingUser = null;
let generatedCode = null;
let currentAnnouncement = "⚠️ Cargando avisos oficiales del barrio...";

let map, markersLayer;
let currentCategoryFilter = 'all';

document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadDataFromCloud();
    setupRealtimeSubscription();
});

// Inicializar Mapa centrado en el barrio
function initMap() {
    map = L.map('map').setView(NEIGHBORHOOD_CENTER, 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

// CARGAR DATOS DESDE SUPABASE (Nube)
async function loadDataFromCloud() {
    try {
        // Cargar alertas
        const { data: cloudIncidents, error: incError } = await supabaseClient
            .from('incidents')
            .select('*')
            .order('id', { ascending: false });

        if (incError) console.error("Error cargando alertas:", incError);
        else incidents = cloudIncidents || [];

        // Cargar anuncio oficial
        const { data: cloudSettings, error: setلError } = await supabaseClient
            .from('app_settings')
            .select('*')
            .eq('key', 'announcement')
            .single();

        if (!setلError && cloudSettings) {
            currentAnnouncement = cloudSettings.value;
        }

        renderIncidents();
        renderAnnouncement();
    } catch (err) {
        console.error("Error de conexión con Supabase:", err);
    }
}

// SINCRONIZACIÓN EN TIEMPO REAL (Realtime WebSockets)
function setupRealtimeSubscription() {
    supabaseClient
        .channel('public:incidents')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, payload => {
            loadDataFromCloud(); // Recarga automática al haber cambios en la nube
        })
        .subscribe();

    supabaseClient
        .channel('public:app_settings')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, payload => {
            loadDataFromCloud();
        })
        .subscribe();
}

// Control de Sesión
function switchAuthTab(tab) {
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    const otpSection = document.getElementById('otp-section');
    const loginBtn = document.getElementById('tab-btn-login');
    const regBtn = document.getElementById('tab-btn-register');

    if (otpSection) otpSection.classList.add('hidden');

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
    const phoneInput = document.getElementById('login-phone').value.trim();
    const cleanPhone = phoneInput.replace(/\D/g, '');

    if (!cleanPhone) return;

    currentUser = { username: cleanPhone === ADMIN_PHONE ? "Administrador" : `Vecino_${cleanPhone.slice(-4)}`, phone: cleanPhone };
    document.getElementById('user-status-label').innerText = currentUser.username;
    document.getElementById('auth-screen').classList.add('hidden');
    updateAdminControls();
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-fullname').value.trim();
    const rawPhone = document.getElementById('reg-phone').value.trim();
    const street = document.getElementById('reg-street').value.trim();

    const cleanPhone = rawPhone.replace(/\D/g, '');
    const phoneRegex = /^[1-9][0-9]{9}$/;

    if (!phoneRegex.test(cleanPhone)) {
        alert("⚠️ Número de celular inválido.\n\nDebe tener exactamente 10 dígitos (código de área sin 0 y número sin 15).\nEjemplo correcto: 1123456789");
        return;
    }

    if (cleanPhone.substring(2, 4) === '15') {
        alert("⚠️ Por favor ingresá el número SIN el '15'.\nEjemplo: Si tu celular es 11 15-2345-6789, ingresá 1123456789.");
        return;
    }

    generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
    const finalName = cleanPhone === ADMIN_PHONE ? "Administrador" : name;
    pendingUser = { username: finalName, phone: cleanPhone, street: street };

    document.getElementById('form-register').classList.add('hidden');
    if (document.getElementById('auth-tabs')) document.getElementById('auth-tabs').classList.add('hidden');
    if (document.getElementById('auth-divider')) document.getElementById('auth-divider').classList.add('hidden');
    if (document.getElementById('btn-guest')) document.getElementById('btn-guest').classList.add('hidden');
    document.getElementById('otp-section').classList.remove('hidden');

    alert(`📲 [ALERTA BARRIAL] Código de verificación enviado al ${cleanPhone}:\n\nTu código es: ${generatedCode}`);
}

function verifyOTP() {
    const inputCode = document.getElementById('otp-input').value.trim();

    if (inputCode === generatedCode) {
        currentUser = pendingUser;
        alert(`¡Celular verificado con éxito! Bienvenido/a ${currentUser.username}.`);
        document.getElementById('user-status-label').innerText = currentUser.username;
        document.getElementById('auth-screen').classList.add('hidden');
        updateAdminControls();
    } else {
        alert("❌ El código ingresado es incorrecto. Verificalo e intentá de nuevo.");
    }
}

function cancelOTP() {
    document.getElementById('otp-section').classList.add('hidden');
    document.getElementById('form-register').classList.remove('hidden');
    if (document.getElementById('auth-tabs')) document.getElementById('auth-tabs').classList.remove('hidden');
    if (document.getElementById('auth-divider')) document.getElementById('auth-divider').classList.remove('hidden');
    if (document.getElementById('btn-guest')) document.getElementById('btn-guest').classList.remove('hidden');
    document.getElementById('otp-input').value = '';
}

function loginAsGuest() {
    currentUser = null;
    document.getElementById('user-status-label').innerText = 'Invitado';
    document.getElementById('auth-screen').classList.add('hidden');
    updateAdminControls();
}

function logout() {
    currentUser = null;
    document.getElementById('auth-screen').classList.remove('hidden');
    cancelOTP();
    updateAdminControls();
}

function updateAdminControls() {
    const btnAnnounce = document.getElementById('btn-admin-announcement');
    const btnDeleteBanner = document.getElementById('btn-delete-banner');
    const isAdmin = currentUser && currentUser.phone === ADMIN_PHONE;

    if (isAdmin) {
        if (btnAnnounce) {
            btnAnnounce.classList.remove('hidden');
            btnAnnounce.classList.add('flex');
        }
        if (btnDeleteBanner) btnDeleteBanner.classList.remove('hidden');
    } else {
        if (btnAnnounce) {
            btnAnnounce.classList.add('hidden');
            btnAnnounce.classList.remove('flex');
        }
        if (btnDeleteBanner) btnDeleteBanner.classList.add('hidden');
    }
}

function openModal(id) {
    if (id === 'alert-modal' && !currentUser) {
        alert('Tenés que ingresar o registrarte con celular verificado para publicar una alerta vecinal.');
        document.getElementById('auth-screen').classList.remove('hidden');
        return;
    }
    if (id === 'announcement-modal' && (!currentUser || currentUser.phone !== ADMIN_PHONE)) {
        alert('Acceso restringido solo al Administrador del sistema.');
        return;
    }
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.add('flex');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).classList.remove('flex');
}

// GESTIÓN DE AVISO OFICIAL (Guardado en Supabase)
function renderAnnouncement() {
    const banner = document.getElementById('admin-banner');
    const bannerText = document.getElementById('banner-text');

    if (currentAnnouncement && currentAnnouncement.trim() !== '') {
        bannerText.innerText = currentAnnouncement;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

async function submitAdminAnnouncement(e) {
    e.preventDefault();
    if (!currentUser || currentUser.phone !== ADMIN_PHONE) return;

    const text = document.getElementById('announcement-text').value.trim();
    if (!text) return;

    const { error } = await supabaseClient
        .from('app_settings')
        update({ value: text })
        .eq('key', 'announcement');

    if (error) {
        alert("Error al actualizar el aviso en la nube.");
        console.error(error);
    } else {
        currentAnnouncement = text;
        renderAnnouncement();
        closeModal('announcement-modal');
        document.getElementById('announcement-text').value = '';
        alert("📢 Aviso oficial actualizado y sincronizado para todo el barrio.");
    }
}

async function deleteAdminAnnouncement() {
    if (!currentUser || currentUser.phone !== ADMIN_PHONE) return;

    if (confirm("¿Querés quitar el aviso oficial de la app?")) {
        const { error } = await supabaseClient
            .from('app_settings')
            .update({ value: "" })
            .eq('key', 'announcement');

        if (!error) {
            currentAnnouncement = "";
            renderAnnouncement();
        }
    }
}

function submitFeedback(e) {
    e.preventDefault();
    alert("¡Muchas gracias por tu sugerencia! La recibimos correctamente.");
    closeModal('feedback-modal');
    document.getElementById('feedback-text').value = '';
}

// PUBLICAR ALERTA EN SUPABASE (Nube en Tiempo Real)
async function submitAlert(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    
    const tipo = document.getElementById('alert-tipo').value;
    const direccionInput = document.getElementById('alert-direccion').value.trim();
    const desc = document.getElementById('alert-desc').value.trim();

    submitBtn.innerText = "Verificando calle en el mapa...";
    submitBtn.disabled = true;

    try {
        const query = encodeURIComponent(`${direccionInput}, González Catán, Buenos Aires, Argentina`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
        const data = await response.json();

        if (!data || data.length === 0) {
            alert(`⚠️ La dirección "${direccionInput}" no existe o no fue encontrada en González Catán.\n\nPor favor verificá cómo está escrita (ejemplo: "Simoni y Cepeda" o "Av. José Equiza 1200").`);
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
            return;
        }

        const realLat = parseFloat(data[0].lat);
        const realLng = parseFloat(data[0].lon);

        let category = 'robo';
        if (tipo.includes('Sospechosa') || tipo.includes('Vehículo')) category = 'sospecha';
        if (tipo.includes('Acoso') || tipo.includes('Oscura')) category = 'acoso';

        const newAlert = {
            id: Date.now(),
            category,
            tipo,
            direccion: direccionInput,
            lat: realLat,
            lng: realLng,
            desc,
            fecha: new Date().toISOString().replace('T', ' ').substring(0, 16),
            autor: currentUser ? currentUser.username : 'Vecino'
        };

        // Guardar en Supabase
        const { error } = await supabaseClient.from('incidents').insert([newAlert]);

        if (error) {
            console.error("Error guardando en Supabase:", error);
            alert("No se pudo guardar la alerta en la base de datos.");
        } else {
            closeModal('alert-modal');
            document.getElementById('alert-form').reset();
            map.setView([realLat, realLng], 17, { animate: true });
            alert("✅ ¡Alerta publicada y sincronizada con el mapa de todo el barrio!");
        }

    } catch (error) {
        console.error("Error al validar dirección:", error);
        alert("Ocurrió un error al verificar la calle. Por favor intentá nuevamente.");
    } finally {
        submitBtn.innerText = originalBtnText;
        submitBtn.disabled = false;
    }
}

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

        let deleteBtn = '';
        const isAdmin = currentUser && currentUser.phone === ADMIN_PHONE;
        if (isAdmin) {
            deleteBtn = `<button onclick="event.stopPropagation(); deleteIncident(${inc.id})" class="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded text-[10px] transition"><i class="fa-solid fa-trash"></i> Borrar</button>`;
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
                <div class="text-[9px] text-slate-500 pt-1 border-t border-slate-800 flex justify-between items-center">
                    <span>Publicado por: ${inc.autor}</span>
                    <div class="flex items-center gap-2">
                        ${deleteBtn}
                        <span class="text-amber-400">Ver &rarr;</span>
                    </div>
                </div>
            </div>
        `;
    });
}

// BORRAR ALERTA DE SUPABASE (Nube)
async function deleteIncident(id) {
    if (confirm("¿Estás seguro de que querés eliminar esta alerta de la base de datos?")) {
        const { error } = await supabaseClient.from('incidents').delete().eq('id', id);

        if (error) {
            alert("No se pudo eliminar la alerta.");
            console.error(error);
        } else {
            alert("Alerta eliminada con éxito.");
        }
    }
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
