// Variables globales
let ciudades = [];
let complejos = [];
let canchas = [];
let complejoSeleccionado = null;
let tipoCanchaSeleccionado = null;
let canchaSeleccionada = null;

// API Base URL - Detecta automáticamente el entorno
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'  // Desarrollo local
  : `${window.location.protocol}//${window.location.host}/api`;  // Producción (Render)

// Función simple para leer parámetros URL
function leerParametrosURL() {
    let ciudad = null;
    let complejo = null;
    
    try {
        if (window.URLSearchParams) {
            const urlParams = new URLSearchParams(window.location.search);
            ciudad = urlParams.get('ciudad');
            complejo = urlParams.get('complejo');
        }
    } catch (error) {
        console.error('Error leyendo parámetros URL:', error);
    }
    
    return { ciudad, complejo };
}

// Función para cargar ciudades
async function cargarCiudades() {
    try {
        const response = await fetch(`${API_BASE}/ciudades`);
        ciudades = await response.json();
        
        const ciudadSelect = document.getElementById('ciudadSelect');
        if (ciudadSelect) {
            ciudadSelect.innerHTML = '<option value="">Selecciona una ciudad...</option>';
            ciudades.forEach(ciudad => {
                const option = document.createElement('option');
                option.value = ciudad.id;
                option.textContent = ciudad.nombre;
                ciudadSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando ciudades:', error);
    }
}

// Función para cargar complejos
async function cargarComplejos(ciudadId) {
    try {
        const response = await fetch(`${API_BASE}/complejos/${ciudadId}`);
        complejos = await response.json();
        
        const complejoSelect = document.getElementById('complejoSelect');
        if (complejoSelect) {
            complejoSelect.innerHTML = '<option value="">Selecciona un complejo...</option>';
            complejos.forEach(complejo => {
                const option = document.createElement('option');
                option.value = complejo.id;
                option.textContent = complejo.nombre;
                complejoSelect.appendChild(option);
            });
        }
        return complejos;
    } catch (error) {
        console.error('Error cargando complejos:', error);
        return [];
    }
}

// Función para seleccionar ciudad
function seleccionarCiudad(ciudadNombre) {
    const ciudadEncontrada = ciudades.find(c => c.nombre === ciudadNombre);
    if (!ciudadEncontrada) {
        console.log('Ciudad no encontrada:', ciudadNombre);
        return false;
    }
    
    const ciudadSelect = document.getElementById('ciudadSelect');
    if (ciudadSelect) {
        ciudadSelect.value = ciudadEncontrada.id;
        ciudadSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Ciudad seleccionada:', ciudadNombre);
        return true;
    }
    return false;
}

// Función para seleccionar complejo
function seleccionarComplejo(complejoNombre) {
    const complejoEncontrado = complejos.find(c => c.nombre === complejoNombre);
    if (!complejoEncontrado) {
        console.log('Complejo no encontrado:', complejoNombre);
        return false;
    }
    
    const complejoSelect = document.getElementById('complejoSelect');
    if (complejoSelect) {
        complejoSelect.value = complejoEncontrado.id;
        complejoSelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Complejo seleccionado:', complejoNombre);
        return true;
    }
    return false;
}

// Función principal para pre-rellenar desde URL
async function preRellenarDesdeURL() {
    const { ciudad, complejo } = leerParametrosURL();
    
    if (!ciudad && !complejo) {
        return;
    }
    
    console.log('Pre-rellenando desde URL:', { ciudad, complejo });
    
    // Si hay ciudad, seleccionarla
    if (ciudad) {
        if (seleccionarCiudad(ciudad)) {
            // Cargar complejos para la ciudad seleccionada
            const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
            if (ciudadEncontrada) {
                await cargarComplejos(ciudadEncontrada.id);
                
                // Si hay complejo, seleccionarlo después de cargar
                if (complejo) {
                    // Pequeño delay para asegurar que el DOM se actualice
                    setTimeout(() => {
                        seleccionarComplejo(complejo);
                    }, 200);
                }
            }
        }
    }
}

// Función para mostrar pasos
function mostrarPaso(numero) {
    for (let i = 1; i <= 4; i++) {
        const paso = document.getElementById(`step${i}`);
        if (i <= numero) {
            paso.style.display = 'block';
        } else {
            paso.style.display = 'none';
        }
    }
}

// Función para scroll
function scrollToStep4() {
    const reservarSection = document.getElementById('reservar');
    if (reservarSection) {
        reservarSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }
}

// Función para configurar event listeners
function configurarEventListeners() {
    // Event listener para ciudad
    const ciudadSelect = document.getElementById('ciudadSelect');
    if (ciudadSelect) {
        ciudadSelect.addEventListener('change', function() {
            if (this.value) {
                mostrarPaso(2);
                cargarComplejos(this.value);
            } else {
                mostrarPaso(1);
            }
        });
    }
    
    // Event listener para complejo
    const complejoSelect = document.getElementById('complejoSelect');
    if (complejoSelect) {
        complejoSelect.addEventListener('change', function() {
            if (this.value) {
                mostrarPaso(3);
            } else {
                mostrarPaso(2);
            }
        });
    }
    
    // Event listener para tipo de cancha
    const tipoCanchaRadios = document.querySelectorAll('input[name="tipoCancha"]');
    tipoCanchaRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                mostrarPaso(4);
            }
        });
    });
    
    // Event listener para botón "Reservar Ahora"
    const reservarAhoraBtn = document.getElementById('reservarAhoraBtn');
    if (reservarAhoraBtn) {
        reservarAhoraBtn.addEventListener('click', function(e) {
            e.preventDefault();
            scrollToStep4();
        });
    }
}

// Función para configurar fecha mínima
function configurarFechaMinima() {
    const fechaSelect = document.getElementById('fechaSelect');
    if (fechaSelect) {
        const hoy = new Date();
        const fechaMinima = hoy.toISOString().split('T')[0];
        fechaSelect.min = fechaMinima;
        fechaSelect.value = fechaMinima;
    }
}

// Inicialización principal
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== INICIALIZACIÓN LIMPIA ===');
    
    try {
        // Cargar ciudades
        await cargarCiudades();
        
        // Configurar event listeners
        configurarEventListeners();
        configurarFechaMinima();
        
        // Verificar parámetros URL
        const { ciudad, complejo } = leerParametrosURL();
        
        if (ciudad || complejo) {
            console.log('Parámetros URL detectados, pre-rellenando...');
            
            // Pre-rellenar campos
            await preRellenarDesdeURL();
            
            // Mostrar paso 4 y hacer scroll
            mostrarPaso(4);
            
            // Scroll con delay
            setTimeout(() => {
                scrollToStep4();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Error en inicialización:', error);
    }
    
    console.log('=== FIN INICIALIZACIÓN ===');
});

// Función alias para el botón "Reservar Ahora"
function scrollToReservar() {
    scrollToStep4();
}

// Exportar funciones para compatibilidad
window.scrollToReservar = scrollToReservar;
window.scrollToStep4 = scrollToStep4;
window.mostrarPaso = mostrarPaso;
window.cargarComplejos = cargarComplejos;
