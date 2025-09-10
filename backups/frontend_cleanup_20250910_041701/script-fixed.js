// Variables globales
let ciudades = [];
let complejos = [];
let canchas = [];
let complejoSeleccionado = null;
let tipoCanchaSeleccionado = null;
let canchaSeleccionada = null;

// API Base URL
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : `${window.location.protocol}//${window.location.host}/api`;

// Función simple para leer parámetros URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        ciudad: params.get('ciudad'),
        complejo: params.get('complejo')
    };
}

// Función para cargar ciudades
async function loadCities() {
    try {
        const response = await fetch(`${API_BASE}/ciudades`);
        ciudades = await response.json();
        
        const select = document.getElementById('ciudadSelect');
        if (select) {
            select.innerHTML = '<option value="">Selecciona una ciudad...</option>';
            ciudades.forEach(ciudad => {
                const option = document.createElement('option');
                option.value = ciudad.id;
                option.textContent = ciudad.nombre;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando ciudades:', error);
    }
}

// Función para cargar complejos
async function loadComplexes(ciudadId) {
    try {
        const response = await fetch(`${API_BASE}/complejos/${ciudadId}`);
        complejos = await response.json();
        
        const select = document.getElementById('complejoSelect');
        if (select) {
            select.innerHTML = '<option value="">Selecciona un complejo...</option>';
            complejos.forEach(complejo => {
                const option = document.createElement('option');
                option.value = complejo.id;
                option.textContent = complejo.nombre;
                select.appendChild(option);
            });
        }
        return complejos;
    } catch (error) {
        console.error('Error cargando complejos:', error);
        return [];
    }
}

// Función para cargar canchas de un complejo
async function loadCourts(complejoId, tipo) {
    try {
        const response = await fetch(`${API_BASE}/canchas/${complejoId}/${tipo}`);
        canchas = await response.json();
        console.log('Canchas cargadas:', canchas);
        return canchas;
    } catch (error) {
        console.error('Error cargando canchas:', error);
        return [];
    }
}

// Función para filtrar tipos de cancha disponibles
async function filterAvailableCourtTypes(complejoId) {
    try {
        // Obtener todos los tipos de cancha disponibles para este complejo
        const response = await fetch(`${API_BASE}/tipos-canchas/${complejoId}`);
        const tiposDisponibles = await response.json();
        
        console.log('Tipos disponibles para complejo:', complejoId, tiposDisponibles);
        
        // Ocultar/mostrar opciones según disponibilidad
        const futbolRadio = document.getElementById('futbol');
        const padelRadio = document.getElementById('padel');
        
        if (futbolRadio && padelRadio) {
            const futbolDiv = futbolRadio.closest('.col-md-6');
            const padelDiv = padelRadio.closest('.col-md-6');
            
            // Mostrar solo los tipos disponibles
            if (tiposDisponibles.includes('futbol')) {
                futbolDiv.style.display = 'block';
            } else {
                futbolDiv.style.display = 'none';
            }
            
            if (tiposDisponibles.includes('padel')) {
                padelDiv.style.display = 'block';
            } else {
                padelDiv.style.display = 'none';
            }
        }
        
        return tiposDisponibles;
    } catch (error) {
        console.error('Error filtrando tipos de cancha:', error);
        return ['futbol', 'padel']; // Fallback a mostrar ambos
    }
}

// Función para mostrar pasos
function showStep(stepNumber) {
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`step${i}`);
        if (step) {
            step.style.display = i <= stepNumber ? 'block' : 'none';
        }
    }
}

// Función para mostrar sección de disponibilidad
function showAvailabilitySection() {
    const section = document.getElementById('disponibilidad');
    if (section) {
        section.style.display = 'block';
        section.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// Función para cargar horarios
function loadHours() {
    const horaSelect = document.getElementById('horaSelect');
    if (horaSelect) {
        horaSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
        
        // Horarios típicos de canchas deportivas
        const horarios = [
            '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00',
            '18:00', '19:00', '20:00', '21:00', '22:00'
        ];
        
        horarios.forEach(hora => {
            const option = document.createElement('option');
            option.value = hora;
            option.textContent = hora;
            horaSelect.appendChild(option);
        });
    }
}

// Función para renderizar canchas
function renderCourts() {
    const canchasGrid = document.getElementById('canchasGrid');
    if (!canchasGrid || !canchas.length) {
        console.log('No hay canchas para renderizar');
        return;
    }
    
    canchasGrid.innerHTML = '';
    
    canchas.forEach(cancha => {
        const canchaCard = document.createElement('div');
        canchaCard.className = 'col-md-6 col-lg-4 mb-4';
        canchaCard.innerHTML = `
            <div class="card cancha-card" data-cancha-id="${cancha.id}">
                <div class="card-body text-center">
                    <h5 class="card-title">${cancha.nombre}</h5>
                    <p class="card-text">
                        <i class="fas fa-futbol me-2"></i>
                        ${cancha.tipo.charAt(0).toUpperCase() + cancha.tipo.slice(1)}
                    </p>
                    <p class="card-text">
                        <strong>$${cancha.precio_hora.toLocaleString()}/hora</strong>
                    </p>
                    <div class="estado-disponibilidad mb-3">
                        <span class="badge bg-secondary">Verificando...</span>
                    </div>
                    <button class="btn btn-primary btn-reservar" disabled>
                        <i class="fas fa-calendar-plus me-2"></i>
                        Reservar
                    </button>
                </div>
            </div>
        `;
        canchasGrid.appendChild(canchaCard);
    });
}

// Función para verificar disponibilidad
async function checkAvailability() {
    const fecha = document.getElementById('fechaSelect').value;
    const hora = document.getElementById('horaSelect').value;
    
    if (!fecha || !hora || !canchas.length) {
        console.log('Faltan datos para verificar disponibilidad');
        return;
    }
    
    console.log('Verificando disponibilidad para:', fecha, hora);
    
    // Verificar disponibilidad de cada cancha
    for (const cancha of canchas) {
        try {
            const response = await fetch(`${API_BASE}/disponibilidad/${cancha.id}/${fecha}`);
            const reservas = await response.json();
            
            const estaDisponible = !reservas.some(reserva => reserva.hora_inicio === hora);
            
            const canchaCard = document.querySelector(`[data-cancha-id="${cancha.id}"]`);
            if (canchaCard) {
                const estadoBadge = canchaCard.querySelector('.estado-disponibilidad .badge');
                const btnReservar = canchaCard.querySelector('.btn-reservar');
                
                if (estaDisponible) {
                    estadoBadge.className = 'badge bg-success';
                    estadoBadge.textContent = 'Disponible';
                    btnReservar.disabled = false;
                    canchaCard.style.opacity = '1';
                } else {
                    estadoBadge.className = 'badge bg-danger';
                    estadoBadge.textContent = 'Ocupada';
                    btnReservar.disabled = true;
                    canchaCard.style.opacity = '0.6';
                }
            }
        } catch (error) {
            console.error('Error verificando disponibilidad de cancha:', cancha.id, error);
        }
    }
}

// Función principal para pre-rellenar desde URL
async function prefillFromUrl() {
    const { ciudad, complejo } = getUrlParams();
    
    if (!ciudad) return;
    
    console.log('Pre-rellenando:', { ciudad, complejo });
    
    // Buscar y seleccionar ciudad
    const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
    if (!ciudadEncontrada) {
        console.log('Ciudad no encontrada:', ciudad);
        return;
    }
    
    const ciudadSelect = document.getElementById('ciudadSelect');
    if (ciudadSelect) {
        ciudadSelect.value = ciudadEncontrada.id;
        showStep(2);
        
        // Cargar complejos
        await loadComplexes(ciudadEncontrada.id);
        
        // Si hay complejo, seleccionarlo
        if (complejo) {
            const complejoEncontrado = complejos.find(c => c.nombre === complejo);
            if (complejoEncontrado) {
                const complejoSelect = document.getElementById('complejoSelect');
                if (complejoSelect) {
                    complejoSelect.value = complejoEncontrado.id;
                    complejoSeleccionado = complejoEncontrado;
                    showStep(3);
                    
                    // Filtrar tipos de cancha disponibles
                    await filterAvailableCourtTypes(complejoEncontrado.id);
                }
            }
        }
        
        // Mostrar paso 4 y hacer scroll
        showStep(4);
        
        // Scroll suave después de un pequeño delay
        setTimeout(() => {
            const reservarSection = document.getElementById('reservar');
            if (reservarSection) {
                reservarSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 500);
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Ciudad
    const ciudadSelect = document.getElementById('ciudadSelect');
    if (ciudadSelect) {
        ciudadSelect.addEventListener('change', function() {
            if (this.value) {
                showStep(2);
                loadComplexes(this.value);
            } else {
                showStep(1);
            }
        });
    }
    
    // Complejo
    const complejoSelect = document.getElementById('complejoSelect');
    if (complejoSelect) {
        complejoSelect.addEventListener('change', function() {
            if (this.value) {
                const complejo = complejos.find(c => c.id == this.value);
                complejoSeleccionado = complejo;
                showStep(3);
                
                // Filtrar tipos de cancha disponibles
                filterAvailableCourtTypes(this.value);
            } else {
                showStep(2);
            }
        });
    }
    
    // Tipo de cancha
    const tipoRadios = document.querySelectorAll('input[name="tipoCancha"]');
    tipoRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                tipoCanchaSeleccionado = this.value;
                showStep(4);
            }
        });
    });
    
    // Botón Ver Disponibilidad
    const verDisponibilidadBtn = document.getElementById('verDisponibilidad');
    if (verDisponibilidadBtn) {
        verDisponibilidadBtn.addEventListener('click', async function() {
            if (complejoSeleccionado && tipoCanchaSeleccionado) {
                // Cargar canchas
                await loadCourts(complejoSeleccionado.id, tipoCanchaSeleccionado);
                
                // Renderizar canchas
                renderCourts();
                
                // Mostrar sección de disponibilidad
                showAvailabilitySection();
            } else {
                alert('Por favor selecciona un complejo y tipo de cancha');
            }
        });
    }
    
    // Fecha y hora
    const fechaSelect = document.getElementById('fechaSelect');
    const horaSelect = document.getElementById('horaSelect');
    
    if (fechaSelect) {
        fechaSelect.addEventListener('change', checkAvailability);
    }
    
    if (horaSelect) {
        horaSelect.addEventListener('change', checkAvailability);
    }
    
    // Botón Reservar Ahora
    const reservarBtn = document.getElementById('reservarAhoraBtn');
    if (reservarBtn) {
        reservarBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const reservarSection = document.getElementById('reservar');
            if (reservarSection) {
                reservarSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        });
    }
}

// Configurar fecha mínima
function setupDateMin() {
    const fechaInput = document.getElementById('fechaSelect');
    if (fechaInput) {
        const hoy = new Date().toISOString().split('T')[0];
        fechaInput.min = hoy;
        fechaInput.value = hoy;
    }
}

// Inicialización principal
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== INICIALIZACIÓN FIXED ===');
    
    try {
        // Cargar ciudades
        await loadCities();
        
        // Configurar event listeners
        setupEventListeners();
        setupDateMin();
        loadHours();
        
        // Pre-rellenar si hay parámetros URL
        const { ciudad, complejo } = getUrlParams();
        if (ciudad || complejo) {
            await prefillFromUrl();
        }
        
    } catch (error) {
        console.error('Error en inicialización:', error);
    }
    
    console.log('=== FIN INICIALIZACIÓN ===');
});

// Funciones globales para compatibilidad
window.scrollToReservar = function() {
    const reservarSection = document.getElementById('reservar');
    if (reservarSection) {
        reservarSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
};
window.scrollToStep4 = window.scrollToReservar;
window.mostrarPaso = showStep;
window.cargarComplejos = loadComplexes;
