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

// Función para mostrar pasos
function showStep(stepNumber) {
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`step${i}`);
        if (step) {
            step.style.display = i <= stepNumber ? 'block' : 'none';
        }
    }
}

// Función para scroll suave
function smoothScrollToReservation() {
    const section = document.getElementById('reservar');
    if (section) {
        section.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
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
                    // Selección simple y directa
                    complejoSelect.value = complejoEncontrado.id;
                    showStep(3);
                }
            }
        }
        
        // Mostrar paso 4 y hacer scroll
        showStep(4);
        
        // Scroll suave después de un pequeño delay
        setTimeout(() => {
            smoothScrollToReservation();
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
                showStep(3);
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
                showStep(4);
            }
        });
    });
    
    // Botón Reservar Ahora
    const reservarBtn = document.getElementById('reservarAhoraBtn');
    if (reservarBtn) {
        reservarBtn.addEventListener('click', function(e) {
            e.preventDefault();
            smoothScrollToReservation();
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
    console.log('=== INICIALIZACIÓN SIMPLE ===');
    
    try {
        // Cargar ciudades
        await loadCities();
        
        // Configurar event listeners
        setupEventListeners();
        setupDateMin();
        
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
window.scrollToReservar = smoothScrollToReservation;
window.scrollToStep4 = smoothScrollToReservation;
window.mostrarPaso = showStep;
window.cargarComplejos = loadComplexes;
