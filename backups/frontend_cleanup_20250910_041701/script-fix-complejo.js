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

// Función mejorada para cargar complejos con callback
async function cargarComplejos(ciudadId, callback = null) {
    try {
        console.log('🔄 Cargando complejos para ciudad:', ciudadId);
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
            
            console.log('✅ Complejos cargados en DOM:', complejos.length);
            
            // Ejecutar callback si se proporciona
            if (callback && typeof callback === 'function') {
                console.log('🔄 Ejecutando callback después de cargar complejos...');
                setTimeout(callback, 100); // Pequeño delay para asegurar que el DOM se actualice
            }
        }
    } catch (error) {
        console.error('❌ Error cargando complejos:', error);
        if (callback && typeof callback === 'function') {
            callback(); // Ejecutar callback incluso en caso de error
        }
    }
}

// Función para seleccionar complejo de forma segura
function seleccionarComplejo(complejoNombre) {
    console.log('🏢 Intentando seleccionar complejo:', complejoNombre);
    
    const complejoEncontrado = complejos.find(c => c.nombre === complejoNombre);
    if (!complejoEncontrado) {
        console.log('❌ Complejo no encontrado:', complejoNombre);
        console.log('📋 Complejos disponibles:', complejos.map(c => c.nombre));
        return false;
    }
    
    const complejoSelect = document.getElementById('complejoSelect');
    if (!complejoSelect) {
        console.log('❌ Elemento complejoSelect no encontrado');
        return false;
    }
    
    // Verificar que el select tenga opciones
    if (complejoSelect.options.length <= 1) {
        console.log('❌ Select de complejo no tiene opciones cargadas');
        return false;
    }
    
    // Seleccionar el complejo
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
    
    console.log('✅ Complejo seleccionado:', complejoNombre, 'ID:', complejoEncontrado.id);
    return true;
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
                
                // Cargar complejos y luego seleccionar el complejo
                if (complejo) {
                    console.log('🔄 Cargando complejos y seleccionando:', complejo);
                    
                    // Cargar complejos con callback para seleccionar el complejo
                    await cargarComplejos(ciudadEncontrada.id, () => {
                        console.log('🔄 Callback ejecutado, seleccionando complejo...');
                        seleccionarComplejo(complejo);
                    });
                } else {
                    // Solo cargar complejos sin seleccionar
                    await cargarComplejos(ciudadEncontrada.id);
                }
            }
        }
    }
    
    console.log('✅ Pre-rellenado completado');
}

// Función para cargar ciudades
async function cargarCiudades() {
    try {
        console.log('🔄 Cargando ciudades...');
        const response = await fetch(`${API_BASE}/ciudades');
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
    console.log('=== INICIALIZACIÓN CON FIX DE COMPLEJO ===');
    console.log('🚀 VERSIÓN CORREGIDA - ' + new Date().toISOString());
    
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
window.cargarComplejos = cargarComplejos;
