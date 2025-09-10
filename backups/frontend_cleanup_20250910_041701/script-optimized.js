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

// Función optimizada para leer parámetros URL
function leerParametrosURL() {
    let ciudad = null;
    let complejo = null;
    
    console.log('🔍 Leyendo parámetros URL...');
    
    try {
        // Método principal: URLSearchParams
        if (window.URLSearchParams) {
            const urlParams = new URLSearchParams(window.location.search);
            ciudad = urlParams.get('ciudad');
            complejo = urlParams.get('complejo');
        }
        
        // Fallback: parsing manual
        if (!ciudad && !complejo && window.location.search) {
            const queryString = window.location.search.substring(1);
            const params = queryString.split('&');
            
            for (const param of params) {
                const pair = param.split('=');
                if (pair.length === 2) {
                    const key = decodeURIComponent(pair[0]);
                    const value = decodeURIComponent(pair[1]);
                    
                    if (key === 'ciudad') ciudad = value;
                    if (key === 'complejo') complejo = value;
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error leyendo parámetros URL:', error);
    }
    
    console.log('🔍 Parámetros encontrados:', { ciudad, complejo });
    return { ciudad, complejo };
}

// Función optimizada para pre-rellenar campos desde URL
async function preRellenarDesdeURL() {
    console.log('🔍 Iniciando pre-rellenado optimizado...');
    const { ciudad, complejo } = leerParametrosURL();
    
    if (!ciudad && !complejo) {
        console.log('🔍 No hay parámetros URL, saltando pre-rellenado');
        return;
    }
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isProduction = window.location.hostname !== 'localhost';
    
    console.log('📱 Es móvil:', isMobile);
    console.log('🌍 Es producción:', isProduction);
    
    // Pre-rellenar ciudad
    if (ciudad) {
        console.log('🏙️ Pre-rellenando ciudad:', ciudad);
        const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
        
        if (ciudadEncontrada) {
            const ciudadSelect = document.getElementById('ciudadSelect');
            if (ciudadSelect) {
                // Asignar valor
                ciudadSelect.value = ciudadEncontrada.id;
                ciudadSelect.setAttribute('value', ciudadEncontrada.id);
                
                // Disparar evento change
                ciudadSelect.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Indicador visual
                ciudadSelect.style.backgroundColor = '#e8f5e8';
                ciudadSelect.style.border = '2px solid #28a745';
                
                setTimeout(() => {
                    ciudadSelect.style.backgroundColor = '';
                    ciudadSelect.style.border = '';
                }, 2000);
                
                console.log('✅ Ciudad pre-rellenada:', ciudad, 'ID:', ciudadEncontrada.id);
                
                // Cargar complejos para la ciudad seleccionada
                await cargarComplejos(ciudadEncontrada.id);
            }
        }
    }
    
    // Pre-rellenar complejo (con delay para móviles en producción)
    if (complejo) {
        console.log('🏢 Pre-rellenando complejo:', complejo);
        
        // Delay adaptativo: más tiempo en móviles y producción
        const delay = isMobile && isProduction ? 2000 : 1000;
        
        setTimeout(async () => {
            const complejoEncontrado = complejos.find(c => c.nombre === complejo);
            
            if (complejoEncontrado) {
                const complejoSelect = document.getElementById('complejoSelect');
                if (complejoSelect) {
                    // Asignar valor
                    complejoSelect.value = complejoEncontrado.id;
                    complejoSelect.setAttribute('value', complejoEncontrado.id);
                    
                    // Disparar evento change
                    complejoSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Indicador visual
                    complejoSelect.style.backgroundColor = '#e8f5e8';
                    complejoSelect.style.border = '2px solid #28a745';
                    
                    setTimeout(() => {
                        complejoSelect.style.backgroundColor = '';
                        complejoSelect.style.border = '';
                    }, 2000);
                    
                    console.log('✅ Complejo pre-rellenado:', complejo, 'ID:', complejoEncontrado.id);
                }
            } else {
                console.log('❌ Complejo no encontrado:', complejo);
                console.log('📋 Complejos disponibles:', complejos.map(c => c.nombre));
            }
        }, delay);
    }
    
    console.log('✅ Pre-rellenado completado');
}

// Función optimizada para scroll
function scrollToStep4() {
    console.log('🚀 Ejecutando scroll optimizado...');
    
    const reservarSection = document.getElementById('reservar');
    if (reservarSection) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Scroll instantáneo para móvil
            reservarSection.scrollIntoView({ 
                behavior: 'auto', 
                block: 'start' 
            });
        } else {
            // Scroll suave para PC
            reservarSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
        
        console.log('✅ Scroll completado');
    } else {
        console.log('❌ Elemento reservar no encontrado');
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

// Función para cargar ciudades
async function cargarCiudades() {
    try {
        console.log('🔄 Cargando ciudades...');
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
        
        console.log('✅ Ciudades cargadas:', ciudades.length);
    } catch (error) {
        console.error('❌ Error cargando ciudades:', error);
    }
}

// Función para cargar complejos
async function cargarComplejos(ciudadId) {
    try {
        console.log('🔄 Cargando complejos para ciudad:', ciudadId);
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
        
        console.log('✅ Complejos cargados:', complejos.length);
    } catch (error) {
        console.error('❌ Error cargando complejos:', error);
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

// Inicialización optimizada
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== INICIALIZACIÓN OPTIMIZADA ===');
    console.log('🚀 VERSIÓN OPTIMIZADA PARA MÓVILES - ' + new Date().toISOString());
    
    try {
        // Cargar ciudades
        await cargarCiudades();
        
        // Configurar event listeners
        configurarEventListeners();
        configurarFechaMinima();
        
        // Verificar parámetros URL
        const { ciudad, complejo } = leerParametrosURL();
        
        if (ciudad || complejo) {
            console.log('🔄 Parámetros URL detectados, iniciando pre-rellenado...');
            
            // Pre-rellenar campos
            await preRellenarDesdeURL();
            
            // Mostrar paso 4 y hacer scroll
            mostrarPaso(4);
            
            // Scroll con delay adaptativo
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isProduction = window.location.hostname !== 'localhost';
            const scrollDelay = isMobile && isProduction ? 1500 : 800;
            
            setTimeout(() => {
                scrollToStep4();
            }, scrollDelay);
            
        } else {
            console.log('🔍 No hay parámetros URL, saltando pre-rellenado');
        }
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
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
