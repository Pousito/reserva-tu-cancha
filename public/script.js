// Variables globales
let ciudades = [];
let complejos = [];
let canchas = [];
let complejoSeleccionado = null;
let tipoCanchaSeleccionado = null;
let canchaSeleccionada = null;
let bloqueoTemporal = null;
let sessionId = null;

// Función para formatear moneda chilena (punto como separador de miles)
function formatCurrencyChile(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '0';
    }
    return amount.toLocaleString('es-CL', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

// Función para verificar si una hora está disponible según la hora actual
function esHoraDisponibleParaReserva(hora, fecha) {
    const ahora = new Date();
    const fechaReserva = new Date(fecha + 'T' + hora + ':00');
    
    // Agregar 1 hora de margen (no se puede reservar en la próxima hora)
    const horaMinima = new Date(ahora.getTime() + (60 * 60 * 1000)); // +1 hora
    
    // Si es el mismo día, verificar que la hora sea al menos 1 hora en el futuro
    if (fechaReserva.toDateString() === ahora.toDateString()) {
        return fechaReserva >= horaMinima;
    }
    
    // Si es un día futuro, siempre está disponible
    return fechaReserva > ahora;
}

// Función para obtener la hora mínima disponible para reserva hoy
function obtenerHoraMinimaDisponible() {
    const ahora = new Date();
    const horaMinima = new Date(ahora.getTime() + (60 * 60 * 1000)); // +1 hora
    const horaMinimaStr = horaMinima.getHours().toString().padStart(2, '0') + ':' + 
                         horaMinima.getMinutes().toString().padStart(2, '0');
    
    // Redondear a la hora siguiente si hay minutos
    const horaRedondeada = Math.ceil(horaMinima.getHours()) + (horaMinima.getMinutes() > 0 ? 1 : 0);
    return horaRedondeada.toString().padStart(2, '0') + ':00';
}

// Función auxiliar para convertir tiempo a minutos (igual que en el servidor)
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const m = parseInt(minutes);
    
    // Convertir directamente a minutos sin lógica especial para 00:00
    return h * 60 + m;
}

// Sistema de logs visibles para debugging móvil
function crearLogVisible() {
    const logContainer = document.createElement('div');
    logContainer.id = 'debug-logs';
    logContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        width: 300px;
        max-height: 400px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-size: 12px;
        z-index: 9999;
        overflow-y: auto;
        font-family: monospace;
        display: none;
    `;
    document.body.appendChild(logContainer);
    return logContainer;
}

function logVisible(message) {
    const logContainer = document.getElementById('debug-logs') || crearLogVisible();
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.style.cssText = 'margin: 2px 0; padding: 2px; border-bottom: 1px solid #333;';
    logEntry.textContent = `[${timestamp}] ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
    logContainer.style.display = 'block';
    
    // Limpiar logs antiguos (mantener solo los últimos 20)
    const logs = logContainer.children;
    if (logs.length > 20) {
        logContainer.removeChild(logs[0]);
    }
    
    // También loggear en consola
    console.log(`📱 DEBUG: ${message}`);
}

// Crear botón para mostrar/ocultar logs
function crearBotonLogs() {
    const boton = document.createElement('button');
    boton.id = 'debug-toggle';
    boton.textContent = 'DEBUG';
    boton.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #007bff;
        color: white;
        border: none;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        z-index: 10000;
        cursor: pointer;
    `;
    
    boton.addEventListener('click', () => {
        const logContainer = document.getElementById('debug-logs');
        if (logContainer) {
            logContainer.style.display = logContainer.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    document.body.appendChild(boton);
}

// Usar la variable API_BASE global definida en url-config.js
// No definir aquí para evitar conflictos

// Función para leer parámetros URL - Ultra compatible con móviles
function leerParametrosURL() {
    let ciudad = null;
    let complejo = null;
    
    console.log('🔍 Iniciando lectura de parámetros URL...');
    console.log('📱 User Agent:', navigator.userAgent);
    console.log('📱 Es móvil:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    console.log('🔗 URL completa:', window.location.href);
    console.log('🔗 Search params:', window.location.search);
    console.log('🌍 Hostname:', window.location.hostname);
    console.log('🌍 Entorno:', window.location.hostname === 'localhost' ? 'LOCAL' : 'PRODUCCIÓN');
    
    try {
        // Método 1: URLSearchParams moderno
        if (window.URLSearchParams) {
            console.log('📱 Usando URLSearchParams moderno');
            const urlParams = new URLSearchParams(window.location.search);
            ciudad = urlParams.get('ciudad');
            complejo = urlParams.get('complejo');
            
            // Decodificar parámetros URL
            if (ciudad) {
                const ciudadOriginal = ciudad;
                ciudad = decodeURIComponent(ciudad);
                console.log('📱 Ciudad decodificada:', ciudadOriginal, '→', ciudad);
            }
            if (complejo) {
                const complejoOriginal = complejo;
                complejo = decodeURIComponent(complejo);
                console.log('📱 Complejo decodificado:', complejoOriginal, '→', complejo);
            }
            
            console.log('📱 URLSearchParams resultado:', { ciudad, complejo });
        }
        
        // Método 2: Fallback manual si URLSearchParams falla o no encuentra nada
        if (!ciudad && !complejo) {
            console.log('📱 URLSearchParams no encontró nada, usando fallback manual');
            const queryString = window.location.search.substring(1);
            console.log('📱 Query string:', queryString);
            const params = queryString.split('&');
            console.log('📱 Params array:', params);
            
            for (let i = 0; i < params.length; i++) {
                const pair = params[i].split('=');
                if (pair.length === 2) {
                    const key = decodeURIComponent(pair[0]);
                    const value = decodeURIComponent(pair[1]);
                    console.log('📱 Par procesado:', { key, value });
                    
                    if (key === 'ciudad') ciudad = value;
                    if (key === 'complejo') complejo = value;
                }
            }
        }
        
        // Método 3: Regex como último recurso
        if (!ciudad && !complejo) {
            console.log('📱 Fallback manual no encontró nada, usando regex');
            const url = window.location.href;
            const ciudadMatch = url.match(/[?&]ciudad=([^&]+)/);
            const complejoMatch = url.match(/[?&]complejo=([^&]+)/);
            
            if (ciudadMatch) {
                ciudad = decodeURIComponent(ciudadMatch[1]);
                console.log('📱 Regex encontró ciudad:', ciudad);
            }
            if (complejoMatch) {
                complejo = decodeURIComponent(complejoMatch[1]);
                console.log('📱 Regex encontró complejo:', complejo);
            }
        }
        
    } catch (error) {
        console.error('❌ Error leyendo parámetros URL:', error);
    }
    
    console.log('🔍 Parámetros URL finales:', { ciudad, complejo });
    
    return { ciudad, complejo };
}

// Función específica para móviles - Pre-rellenado ultra agresivo
function preRellenarMovil(ciudad, complejo) {
    console.log('📱 === PRE-RELLENADO MÓVIL INICIADO ===');
    console.log('📱 Parámetros recibidos:', { ciudad, complejo });
    console.log('🌍 Entorno:', window.location.hostname === 'localhost' ? 'LOCAL' : 'PRODUCCIÓN');
    console.log('🌍 Hostname:', window.location.hostname);
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('📱 Es móvil confirmado:', isMobile);
    console.log('📱 User Agent:', navigator.userAgent);
    
    if (!isMobile) {
        console.log('📱 No es móvil, saltando pre-rellenado móvil');
        return;
    }
    
    // Pre-rellenar ciudad de forma ultra agresiva
    if (ciudad) {
        console.log('📱 Pre-rellenando ciudad en móvil:', ciudad);
        
        // Método 1: Buscar en ciudades cargadas
        const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
        console.log('📱 Ciudad encontrada en array:', ciudadEncontrada);
        
        if (ciudadEncontrada) {
            const ciudadSelect = document.getElementById('ciudadSelect');
            console.log('📱 Elemento ciudad select:', ciudadSelect);
            
            if (ciudadSelect) {
                // Forzar valor múltiples veces
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                        ciudadSelect.value = ciudadEncontrada.id;
                        ciudadSelect.setAttribute('value', ciudadEncontrada.id);
                        console.log('📱 Intento', i + 1, 'ciudad value:', ciudadSelect.value);
                        
                        // Disparar eventos múltiples
                        ciudadSelect.dispatchEvent(new Event('change', { bubbles: true }));
                        ciudadSelect.dispatchEvent(new Event('input', { bubbles: true }));
                        ciudadSelect.dispatchEvent(new Event('blur', { bubbles: true }));
                        
                        // Indicador visual
                        ciudadSelect.style.backgroundColor = '#e8f5e8';
                        ciudadSelect.style.border = '2px solid #28a745';
                        
                        setTimeout(() => {
                            ciudadSelect.style.backgroundColor = '';
                            ciudadSelect.style.border = '';
                        }, 1000);
                        
                        // Método adicional para producción - Forzar re-render
                        if (window.location.hostname !== 'localhost') {
                            console.log('📱 PRODUCCIÓN: Forzando re-render del select');
                            ciudadSelect.style.display = 'none';
                            setTimeout(() => {
                                ciudadSelect.style.display = '';
                                ciudadSelect.value = ciudadEncontrada.id;
                                ciudadSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            }, 50);
                        }
                        
                    }, i * 200);
                }
                
                // Llamar cargarComplejos después de un delay
                setTimeout(() => {
                    console.log('📱 Llamando cargarComplejos para móvil...');
                    if (typeof cargarComplejos === 'function') {
                        cargarComplejos(ciudadEncontrada.id);
                    }
                }, 1000);
            }
        }
    }
    
    // Pre-rellenar complejo de forma ultra agresiva
    if (complejo) {
        console.log('📱 Pre-rellenando complejo en móvil:', complejo);
        
        // Esperar un poco para que los complejos se carguen
        setTimeout(() => {
            const complejoEncontrado = complejos.find(c => c.nombre === complejo);
            console.log('📱 Complejo encontrado en array:', complejoEncontrado);
            
            if (complejoEncontrado) {
                const complejoSelect = document.getElementById('complejoSelect');
                console.log('📱 Elemento complejo select:', complejoSelect);
                
                if (complejoSelect) {
                    // Forzar valor múltiples veces
                    for (let i = 0; i < 5; i++) {
                        setTimeout(() => {
                            complejoSelect.value = complejoEncontrado.id;
                            complejoSelect.setAttribute('value', complejoEncontrado.id);
                            console.log('📱 Intento', i + 1, 'complejo value:', complejoSelect.value);
                            
                            // Disparar eventos múltiples
                            complejoSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            complejoSelect.dispatchEvent(new Event('input', { bubbles: true }));
                            complejoSelect.dispatchEvent(new Event('blur', { bubbles: true }));
                            
                            // Indicador visual
                            complejoSelect.style.backgroundColor = '#e8f5e8';
                            complejoSelect.style.border = '2px solid #28a745';
                            
                            setTimeout(() => {
                                complejoSelect.style.backgroundColor = '';
                                complejoSelect.style.border = '';
                            }, 1000);
                            
                            // Método adicional para producción - Forzar re-render
                            if (window.location.hostname !== 'localhost') {
                                console.log('📱 PRODUCCIÓN: Forzando re-render del select complejo');
                                complejoSelect.style.display = 'none';
                                setTimeout(() => {
                                    complejoSelect.style.display = '';
                                    complejoSelect.value = complejoEncontrado.id;
                                    complejoSelect.dispatchEvent(new Event('change', { bubbles: true }));
                                }, 50);
                            }
                            setTimeout(() => {
                                complejoSelect.style.backgroundColor = '';
                                complejoSelect.style.border = '';
                            }, 1000);
                            
                        }, i * 200);
                    }
                }
            } else {
                console.log('📱 Complejo no encontrado, reintentando en 2 segundos...');
                setTimeout(() => {
                    preRellenarMovil(ciudad, complejo);
                }, 2000);
            }
        }, 1500);
    }
    
    // Método adicional específico para producción - Ultra agresivo
    if (window.location.hostname !== 'localhost') {
        console.log('📱 PRODUCCIÓN: Iniciando método adicional ultra agresivo');
        
        setTimeout(() => {
            console.log('📱 PRODUCCIÓN: Método adicional - Verificando elementos');
            const ciudadSelect = document.getElementById('ciudadSelect');
            const complejoSelect = document.getElementById('complejoSelect');
            
            if (ciudad && ciudadSelect) {
                const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
                if (ciudadEncontrada) {
                    console.log('📱 PRODUCCIÓN: Método adicional - Asignando ciudad');
                    ciudadSelect.value = ciudadEncontrada.id;
                    ciudadSelect.selectedIndex = Array.from(ciudadSelect.options).findIndex(option => option.value == ciudadEncontrada.id);
                    ciudadSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            
            if (complejo && complejoSelect) {
                const complejoEncontrado = complejos.find(c => c.nombre === complejo);
                if (complejoEncontrado) {
                    console.log('📱 PRODUCCIÓN: Método adicional - Asignando complejo');
                    complejoSelect.value = complejoEncontrado.id;
                    complejoSelect.selectedIndex = Array.from(complejoSelect.options).findIndex(option => option.value == complejoEncontrado.id);
                    complejoSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }, 3000);
    }
    
    console.log('📱 === PRE-RELLENADO MÓVIL COMPLETADO ===');
}

// Función específica para PC - Pre-rellenado optimizado
function preRellenarPC(ciudad, complejo) {
    console.log('💻 === PRE-RELLENADO PC INICIADO ===');
    console.log('💻 Parámetros recibidos:', { ciudad, complejo });
    
    // Pre-rellenar ciudad
    if (ciudad) {
        console.log('💻 Pre-rellenando ciudad en PC:', ciudad);
        
        const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
        console.log('💻 Ciudad encontrada en array:', ciudadEncontrada);
        
        if (ciudadEncontrada) {
            const ciudadSelect = document.getElementById('ciudadSelect');
            console.log('💻 Elemento ciudad select:', ciudadSelect);
            
            if (ciudadSelect) {
                // Asignar valor
                ciudadSelect.value = ciudadEncontrada.id;
                ciudadSelect.setAttribute('value', ciudadEncontrada.id);
                console.log('💻 Ciudad value asignado:', ciudadSelect.value);
                
                // Disparar eventos
                ciudadSelect.dispatchEvent(new Event('change', { bubbles: true }));
                ciudadSelect.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Indicador visual
                ciudadSelect.style.backgroundColor = '#e8f5e8';
                ciudadSelect.style.border = '2px solid #28a745';
                setTimeout(() => {
                    ciudadSelect.style.backgroundColor = '';
                    ciudadSelect.style.border = '';
                }, 2000);
                
                // Llamar cargarComplejos
                setTimeout(() => {
                    console.log('💻 Llamando cargarComplejos para PC...');
                    if (typeof cargarComplejos === 'function') {
                        cargarComplejos(ciudadEncontrada.id);
                    }
                }, 500);
                
                console.log('✅ Ciudad pre-rellenada en PC:', ciudad, 'ID:', ciudadEncontrada.id);
            }
        }
    }
    
    // Pre-rellenar complejo con espera más larga
    if (complejo) {
        console.log('💻 Pre-rellenando complejo en PC:', complejo);
        
        // Esperar más tiempo para que los complejos se carguen
        setTimeout(() => {
            const complejoEncontrado = complejos.find(c => c.nombre === complejo);
            console.log('💻 Complejo encontrado en array:', complejoEncontrado);
            console.log('💻 Complejos disponibles:', complejos.length);
            
            if (complejoEncontrado) {
                const complejoSelect = document.getElementById('complejoSelect');
                console.log('💻 Elemento complejo select:', complejoSelect);
                
                if (complejoSelect) {
                    // Asignar valor
                    complejoSelect.value = complejoEncontrado.id;
                    complejoSelect.setAttribute('value', complejoEncontrado.id);
                    console.log('💻 Complejo value asignado:', complejoSelect.value);
                    
                    // Disparar eventos
                    complejoSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    complejoSelect.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    // Indicador visual
                    complejoSelect.style.backgroundColor = '#e8f5e8';
                    complejoSelect.style.border = '2px solid #28a745';
                    setTimeout(() => {
                        complejoSelect.style.backgroundColor = '';
                        complejoSelect.style.border = '';
                    }, 2000);
                    
                    console.log('✅ Complejo pre-rellenado en PC:', complejo, 'ID:', complejoEncontrado.id);
                }
            } else {
                console.log('💻 Complejo no encontrado, reintentando en 3 segundos...');
                setTimeout(() => {
                    preRellenarPC(ciudad, complejo);
                }, 3000);
            }
        }, 2000); // Esperar 2 segundos para que se carguen los complejos
    }
    
    console.log('💻 === PRE-RELLENADO PC COMPLETADO ===');
}

// SISTEMA INTELIGENTE: Detección automática del estado de datos
function detectarEstadoDatos() {
    const estado = {
        ciudadesCargadas: ciudades && ciudades.length > 0,
        complejosCargados: complejos && complejos.length > 0,
        ciudadSelectDisponible: !!document.getElementById('ciudadSelect'),
        complejoSelectDisponible: !!document.getElementById('complejoSelect'),
        timestamp: Date.now()
    };
    
    console.log('🔍 Estado de datos detectado:', estado);
    return estado;
}

// SISTEMA INTELIGENTE: Pre-rellenado adaptativo
function preRellenarInteligente(ciudad, complejo) {
    console.log('🧠 PRE-RELLENADO INTELIGENTE INICIADO');
    
    const estado = detectarEstadoDatos();
    
    // Estrategia 1: Si todo está listo, proceder inmediatamente
    if (estado.ciudadesCargadas && estado.ciudadSelectDisponible) {
        console.log('✅ Estrategia 1: Datos listos, procediendo inmediatamente');
        preRellenarInmediato(ciudad, complejo);
        return;
    }
    
    // Estrategia 2: Si faltan datos, esperar y reintentar
    console.log('⏳ Estrategia 2: Esperando datos...');
    let intentos = 0;
    const maxIntentos = 20; // 10 segundos máximo
    
    const verificarYProceder = () => {
        intentos++;
        const nuevoEstado = detectarEstadoDatos();
        
        if (nuevoEstado.ciudadesCargadas && nuevoEstado.ciudadSelectDisponible) {
            console.log(`✅ Datos listos en intento ${intentos}, procediendo`);
            preRellenarInmediato(ciudad, complejo);
        } else if (intentos < maxIntentos) {
            console.log(`⏳ Intento ${intentos}/${maxIntentos}, reintentando en 500ms`);
            setTimeout(verificarYProceder, 500);
        } else {
            console.log('❌ Timeout: Datos no disponibles después de 10 segundos');
            // Último recurso: forzar carga
            preRellenarForzado(ciudad, complejo);
        }
    };
    
    verificarYProceder();
}

// FUNCIÓN: Pre-rellenado inmediato cuando datos están listos
function preRellenarInmediato(ciudad, complejo) {
    console.log('⚡ PRE-RELLENADO INMEDIATO');
    
    if (ciudad) {
        const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
        if (ciudadEncontrada) {
            const ciudadSelect = document.getElementById('ciudadSelect');
            if (ciudadSelect) {
                console.log('🏙️ Asignando ciudad:', ciudad, 'ID:', ciudadEncontrada.id);
                
                // Múltiples métodos de asignación
                ciudadSelect.value = ciudadEncontrada.id;
                ciudadSelect.selectedIndex = Array.from(ciudadSelect.options).findIndex(option => option.value == ciudadEncontrada.id);
                
                // Forzar re-render
                ciudadSelect.style.display = 'none';
                ciudadSelect.offsetHeight; // Forzar reflow
                ciudadSelect.style.display = '';
                
                // Eventos múltiples
                ['change', 'input', 'blur'].forEach(eventType => {
                    ciudadSelect.dispatchEvent(new Event(eventType, { bubbles: true }));
                });
                
                console.log('✅ Ciudad asignada:', ciudadSelect.value);
                
                // Cargar complejos si es necesario
                if (complejo && (!complejos || complejos.length === 0)) {
                    console.log('🔄 Cargando complejos...');
                    cargarComplejos(ciudadEncontrada.id);
                }
                
                // Asignar complejo después de un breve delay
                setTimeout(() => {
                    if (complejo) {
                        const complejoEncontrado = complejos.find(c => c.nombre === complejo);
                        if (complejoEncontrado) {
                            const complejoSelect = document.getElementById('complejoSelect');
                            if (complejoSelect) {
                                console.log('🏢 Asignando complejo:', complejo, 'ID:', complejoEncontrado.id);
                                
                                // Múltiples métodos de asignación
                                complejoSelect.value = complejoEncontrado.id;
                                complejoSelect.selectedIndex = Array.from(complejoSelect.options).findIndex(option => option.value == complejoEncontrado.id);
                                
                                // Forzar re-render
                                complejoSelect.style.display = 'none';
                                complejoSelect.offsetHeight; // Forzar reflow
                                complejoSelect.style.display = '';
                                
                                // Eventos múltiples
                                ['change', 'input', 'blur'].forEach(eventType => {
                                    complejoSelect.dispatchEvent(new Event(eventType, { bubbles: true }));
                                });
                                
                                console.log('✅ Complejo asignado:', complejoSelect.value);
                            }
                        }
                    }
                }, 100);
            }
        }
    }
}

// FUNCIÓN: Pre-rellenado forzado como último recurso
function preRellenarForzado(ciudad, complejo) {
    console.log('🚨 PRE-RELLENADO FORZADO - ÚLTIMO RECURSO');
    
    // Forzar recarga de datos
    if (typeof cargarCiudades === 'function') {
        cargarCiudades();
    }
    
    // Intentar asignación directa
    setTimeout(() => {
        preRellenarInmediato(ciudad, complejo);
    }, 1000);
}

// SOLUCIÓN MÓVIL: Función ultra agresiva específica para móvil
function preRellenarMovilAgresivo(ciudad, complejo) {
    console.log('📱 PRE-RELLENADO MÓVIL AGRESIVO INICIADO');
    
    // Pre-rellenar ciudad con múltiples métodos
    if (ciudad) {
        const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
        if (ciudadEncontrada) {
            const ciudadSelect = document.getElementById('ciudadSelect');
            if (ciudadSelect) {
                console.log('📱 Asignando ciudad en móvil:', ciudad, 'ID:', ciudadEncontrada.id);
                
                // Método 1: Asignación directa
                ciudadSelect.value = ciudadEncontrada.id;
                ciudadSelect.selectedIndex = Array.from(ciudadSelect.options).findIndex(option => option.value == ciudadEncontrada.id);
                
                // Método 2: Forzar re-render
                ciudadSelect.style.display = 'none';
                setTimeout(() => {
                    ciudadSelect.style.display = '';
                    ciudadSelect.value = ciudadEncontrada.id;
                    ciudadSelect.selectedIndex = Array.from(ciudadSelect.options).findIndex(option => option.value == ciudadEncontrada.id);
                }, 10);
                
                // Método 3: Eventos múltiples
                ciudadSelect.dispatchEvent(new Event('change', { bubbles: true }));
                ciudadSelect.dispatchEvent(new Event('input', { bubbles: true }));
                ciudadSelect.dispatchEvent(new Event('blur', { bubbles: true }));
                
                console.log('📱 Ciudad asignada en móvil:', ciudadSelect.value);
                
                // Cargar complejos después de seleccionar ciudad (timing ultra rápido para móvil)
                setTimeout(() => {
                    if (complejo) {
                        const complejoEncontrado = complejos.find(c => c.nombre === complejo);
                        if (complejoEncontrado) {
                            const complejoSelect = document.getElementById('complejoSelect');
                            if (complejoSelect) {
                                console.log('📱 Asignando complejo en móvil:', complejo, 'ID:', complejoEncontrado.id);
                                
                                // Método 1: Asignación directa
                                complejoSelect.value = complejoEncontrado.id;
                                complejoSelect.selectedIndex = Array.from(complejoSelect.options).findIndex(option => option.value == complejoEncontrado.id);
                                
                                // Método 2: Forzar re-render
                                complejoSelect.style.display = 'none';
                                setTimeout(() => {
                                    complejoSelect.style.display = '';
                                    complejoSelect.value = complejoEncontrado.id;
                                    complejoSelect.selectedIndex = Array.from(complejoSelect.options).findIndex(option => option.value == complejoEncontrado.id);
                                }, 10);
                                
                                // Método 3: Eventos múltiples
                                complejoSelect.dispatchEvent(new Event('change', { bubbles: true }));
                                complejoSelect.dispatchEvent(new Event('input', { bubbles: true }));
                                complejoSelect.dispatchEvent(new Event('blur', { bubbles: true }));
                                
                                console.log('📱 Complejo asignado en móvil:', complejoSelect.value);
                            }
                        }
                    }
                }, 200); // Timing ultra rápido para móvil
            }
        }
    }
    
    console.log('📱 PRE-RELLENADO MÓVIL AGRESIVO COMPLETADO');
}

// SOLUCIÓN INGENIOSA: Función simple y robusta
function preRellenarSimple(ciudad, complejo) {
    console.log('🚀 PRE-RELLENADO SIMPLE INICIADO');
    
    // Detectar si es móvil para optimizar timing
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const delay = isMobile ? 300 : 1000; // Móvil más rápido
    console.log('📱 Timing optimizado para móvil:', isMobile, 'Delay:', delay);
    
    // Pre-rellenar ciudad
    if (ciudad) {
        const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
        if (ciudadEncontrada) {
            const ciudadSelect = document.getElementById('ciudadSelect');
            if (ciudadSelect) {
                ciudadSelect.value = ciudadEncontrada.id;
                ciudadSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('✅ Ciudad asignada:', ciudad, 'ID:', ciudadEncontrada.id);
                
                // Cargar complejos después de seleccionar ciudad (timing optimizado)
                setTimeout(() => {
                    if (complejo) {
                        const complejoEncontrado = complejos.find(c => c.nombre === complejo);
                        if (complejoEncontrado) {
                            const complejoSelect = document.getElementById('complejoSelect');
                            if (complejoSelect) {
                                complejoSelect.value = complejoEncontrado.id;
                                complejoSelect.dispatchEvent(new Event('change', { bubbles: true }));
                                console.log('✅ Complejo asignado:', complejo, 'ID:', complejoEncontrado.id);
                            }
                        }
                    }
                }, delay);
            }
        }
    }
    
    console.log('🚀 PRE-RELLENADO SIMPLE COMPLETADO');
}

// SOLUCIÓN INGENIOSA: Función ultra agresiva como último recurso
function preRellenarUltraAgresivo(ciudad, complejo) {
    console.log('🚀 PRE-RELLENADO ULTRA AGRESIVO INICIADO');
    
    // Forzar re-render de todos los selects
    const ciudadSelect = document.getElementById('ciudadSelect');
    const complejoSelect = document.getElementById('complejoSelect');
    
    if (ciudad && ciudadSelect) {
        const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
        if (ciudadEncontrada) {
            // Método ultra agresivo: toggle display
            ciudadSelect.style.display = 'none';
            setTimeout(() => {
                ciudadSelect.style.display = '';
                ciudadSelect.value = ciudadEncontrada.id;
                ciudadSelect.selectedIndex = Array.from(ciudadSelect.options).findIndex(option => option.value == ciudadEncontrada.id);
                ciudadSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('🚀 Ciudad ULTRA AGRESIVO:', ciudad, 'ID:', ciudadEncontrada.id);
            }, 100);
        }
    }
    
    if (complejo && complejoSelect) {
        const complejoEncontrado = complejos.find(c => c.nombre === complejo);
        if (complejoEncontrado) {
            // Método ultra agresivo: toggle display
            complejoSelect.style.display = 'none';
            setTimeout(() => {
                complejoSelect.style.display = '';
                complejoSelect.value = complejoEncontrado.id;
                complejoSelect.selectedIndex = Array.from(complejoSelect.options).findIndex(option => option.value == complejoEncontrado.id);
                complejoSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('🚀 Complejo ULTRA AGRESIVO:', complejo, 'ID:', complejoEncontrado.id);
            }, 100);
        }
    }
    
    console.log('🚀 PRE-RELLENADO ULTRA AGRESIVO COMPLETADO');
}

// Variable global para evitar múltiples ejecuciones
let preRellenadoEjecutado = false;

// Función para pre-rellenar campos desde URL
async function preRellenarDesdeURL() {
    console.log('🔍 Iniciando preRellenarDesdeURL...');
    
    // Evitar múltiples ejecuciones
    if (preRellenadoEjecutado) {
        console.log('⚠️ Pre-rellenado ya ejecutado, saltando...');
        return;
    }
    
    const { ciudad, complejo } = leerParametrosURL();
    
    if (!ciudad && !complejo) {
        console.log('🔍 No hay parámetros URL, saltando pre-rellenado');
        return;
    }
    
    // Marcar como ejecutado INMEDIATAMENTE para evitar duplicaciones
    preRellenadoEjecutado = true;
    
    console.log('🚀 Usando función MEJORADA de pre-rellenado');
    
    // Usar SOLO la función mejorada que funciona correctamente
    await preRellenarDesdeURLMejorado();
    
    console.log('✅ Pre-rellenado completado exitosamente');
}

// Función MEJORADA que mantiene el complejo seleccionado
async function mantenerComplejoSeleccionado() {
    // Verificar periódicamente que el complejo siga seleccionado
    const complejoSelect = document.getElementById('complejoSelect');
    if (!complejoSelect || !complejoSelect.value) return;
    
    const valorOriginal = complejoSelect.value;
    
    // Monitorear cambios cada 500ms durante 10 segundos
    let intentos = 0;
    const maxIntentos = 20;
    
    const intervalo = setInterval(() => {
        intentos++;
        
        if (intentos >= maxIntentos) {
            clearInterval(intervalo);
            console.log('✅ Monitoreo de complejo completado');
            return;
        }
        
        // Si el valor cambió a vacío, restaurarlo
        if (complejoSelect.value === '' && valorOriginal !== '') {
            console.log('🔄 Restaurando complejo seleccionado:', valorOriginal);
            complejoSelect.value = valorOriginal;
            
            // Resaltar visualmente
            complejoSelect.style.backgroundColor = '#fff3cd';
            complejoSelect.style.border = '2px solid #ffc107';
            
            setTimeout(() => {
                complejoSelect.style.backgroundColor = '';
                complejoSelect.style.border = '';
            }, 1000);
        }
    }, 500);
}

// CÓDIGO ANTIGUO DESACTIVADO - Se mantiene para referencia pero no se ejecuta
function preRellenarDesdeURLLegacy_DESACTIVADO() {
    const { ciudad, complejo } = leerParametrosURL();
    
    if (ciudad) {
        console.log('🏙️ Pre-rellenando ciudad (LEGACY - DESACTIVADO):', ciudad);
        console.log('📊 Ciudades disponibles:', ciudades);
        
        // Este código ya no se ejecuta - función desactivada
        return;
    }
    // Resto del código legacy omitido
}

// NUEVA FUNCIÓN MEJORADA: Pre-rellenado con Promise y eventos
async function preRellenarDesdeURLMejorado() {
    console.log('🚀 === PRE-RELLENADO MEJORADO INICIADO ===');
    // logVisible('🚀 PRE-RELLENADO MEJORADO INICIADO');
    const { ciudad, complejo } = leerParametrosURL();
    
    if (!ciudad && !complejo) {
        console.log('🔍 No hay parámetros URL, saltando pre-rellenado');
        // logVisible('🔍 No hay parámetros URL, saltando pre-rellenado');
        return;
    }
    
    console.log('🔍 Parámetros URL detectados:', { ciudad, complejo });
    // logVisible(`🔍 Parámetros: ciudad=${ciudad}, complejo=${complejo}`);
    
    try {
        // 1. Preseleccionar ciudad
        if (ciudad) {
            console.log('🏙️ Preseleccionando ciudad:', ciudad);
            // logVisible(`🏙️ Preseleccionando ciudad: ${ciudad}`);
            const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
            
            if (ciudadEncontrada) {
                const ciudadSelect = document.getElementById('ciudadSelect');
                if (ciudadSelect) {
                    ciudadSelect.value = ciudadEncontrada.id;
                    ciudadSelect.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('✅ Ciudad preseleccionada:', ciudad, 'ID:', ciudadEncontrada.id);
                    // logVisible(`✅ Ciudad preseleccionada: ${ciudad} (ID: ${ciudadEncontrada.id})`);
                    
                    // 2. Cargar complejos y esperar a que terminen
                    if (complejo) {
                        console.log('🏢 Cargando complejos para preseleccionar:', complejo);
                        // logVisible(`🏢 Cargando complejos para: ${complejo}`);
                        
                        // Usar Promise para esperar a que se carguen los complejos
                        await cargarComplejos(ciudadEncontrada.id);
                        // logVisible(`🏢 Complejos cargados: ${complejos.length} encontrados`);
                        
                        // 3. Preseleccionar complejo después de que se carguen
                        console.log('🏢 Preseleccionando complejo:', complejo);
                        // logVisible(`🏢 Preseleccionando complejo: ${complejo}`);
                        const complejoEncontrado = complejos.find(c => c.nombre === complejo);
                        
                        if (complejoEncontrado) {
                            const complejoSelect = document.getElementById('complejoSelect');
                            if (complejoSelect) {
                                complejoSelect.value = complejoEncontrado.id;
                                
                                // IMPORTANTE: Asignar complejoSeleccionado antes de disparar eventos
                                complejoSeleccionado = complejoEncontrado;
                                
                                complejoSelect.dispatchEvent(new Event('change', { bubbles: true }));
                                
                                // Indicador visual
                                complejoSelect.style.backgroundColor = '#e8f5e8';
                                complejoSelect.style.border = '2px solid #28a745';
                                setTimeout(() => {
                                    complejoSelect.style.backgroundColor = '';
                                    complejoSelect.style.border = '';
                                }, 2000);
                                
                                console.log('✅ Complejo preseleccionado:', complejo, 'ID:', complejoEncontrado.id);
                                // logVisible(`✅ Complejo preseleccionado: ${complejo} (ID: ${complejoEncontrado.id})`);
                                
                                // IMPORTANTE: Mantener el complejo seleccionado visualmente
                                mantenerComplejoSeleccionado();
                                
                                // 4. Si es Complejo En Desarrollo, Fundación Gunnen, Espacio Deportivo Borde Río o Complejo Demo 1, seleccionar fútbol automáticamente
                                if (complejoEncontrado.nombre === 'Complejo En Desarrollo' || complejoEncontrado.nombre === 'Fundación Gunnen' || complejoEncontrado.nombre === 'Espacio Deportivo Borde Río' || complejoEncontrado.nombre === 'Complejo Demo 1') {
                                    console.log(`⚽ ${complejoEncontrado.nombre} detectado, seleccionando fútbol automáticamente`);
                                    const futbolRadio = document.getElementById('futbol');
                                    if (futbolRadio) {
                                        futbolRadio.checked = true;
                                        tipoCanchaSeleccionado = 'futbol';
                                        
                                        // Ocultar opción de padel para Complejo En Desarrollo
                                        const padelRadio = document.getElementById('padel');
                                        if (padelRadio) {
                                            padelRadio.parentElement.style.display = 'none';
                                        }
                                        
                                        // Mostrar opción de fútbol
                                        document.getElementById('futbol').parentElement.style.display = 'block';
                                        
                                        // Centrar la opción de fútbol (igual que en el event listener)
                                        const step3CardBody = document.getElementById('step3').querySelector('.card-body');
                                        step3CardBody.style.display = 'flex';
                                        step3CardBody.style.justifyContent = 'center';
                                        step3CardBody.style.alignItems = 'center';
                                        step3CardBody.style.textAlign = 'center';
                                        
                                        // Asegurar que el radio button y el label estén alineados
                                        const futbolLabel = document.querySelector('label[for="futbol"]');
                                        if (futbolLabel) {
                                            futbolLabel.style.display = 'flex';
                                            futbolLabel.style.alignItems = 'center';
                                            futbolLabel.style.justifyContent = 'flex-start';
                                            futbolLabel.style.gap = '15px';
                                            futbolLabel.style.margin = '0 auto';
                                            futbolLabel.style.width = 'fit-content';
                                        }
                                        
                                        // Mostrar paso 3
                                        mostrarPaso(3);
                                        
                                        // Esperar un momento antes de disparar el evento change
                                        await new Promise(resolve => setTimeout(resolve, 200));
                                        
                                        // Disparar evento change para activar la lógica del paso 4
                                        futbolRadio.dispatchEvent(new Event('change', { bubbles: true }));
                                        console.log('✅ Complejo En Desarrollo configurado - solo fútbol con estilos centrados');
                                        
                                        // 5. Ejecutar automáticamente "Ver Disponibilidad" directamente llamando a la función
                                        // Usar setTimeout para asegurar que se ejecute después de que el evento change se procese
                                        setTimeout(async () => {
                                            console.log('🔍 INICIANDO ejecución automática de "Ver Disponibilidad" desde URL...');
                                            console.log('🔍 complejoSeleccionado:', complejoSeleccionado?.nombre);
                                            console.log('🔍 tipoCanchaSeleccionado:', tipoCanchaSeleccionado);
                                            
                                            if (complejoSeleccionado && tipoCanchaSeleccionado) {
                                                try {
                                                    // Llamar directamente a mostrarSeccionDisponibilidad
                                                    if (typeof mostrarSeccionDisponibilidad === 'function') {
                                                        console.log('✅ Llamando a mostrarSeccionDisponibilidad...');
                                                        await mostrarSeccionDisponibilidad();
                                                        console.log('✅ mostrarSeccionDisponibilidad completado');
                                                        
                                                        // También cargar horarios básicos
                                                        if (typeof cargarHorariosBasicos === 'function') {
                                                            console.log('✅ Llamando a cargarHorariosBasicos...');
                                                            await cargarHorariosBasicos();
                                                            console.log('✅ cargarHorariosBasicos completado');
                                                        }
                                                        
                                                        console.log('✅ "Ver Disponibilidad" ejecutado automáticamente desde URL');
                                                    } else {
                                                        console.error('❌ mostrarSeccionDisponibilidad no está disponible');
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error ejecutando "Ver Disponibilidad":', error);
                                                    console.error('❌ Stack:', error.stack);
                                                }
                                            } else {
                                                console.log('⚠️ No se puede ejecutar "Ver Disponibilidad" - faltan datos');
                                                console.log('⚠️ complejoSeleccionado:', !!complejoSeleccionado);
                                                console.log('⚠️ tipoCanchaSeleccionado:', tipoCanchaSeleccionado);
                                            }
                                        }, 1200); // Esperar 1.2 segundos para que el evento change se procese completamente
                                    }
                                } else {
                                    // Para otros complejos que vienen de URL, preseleccionar fútbol automáticamente
                                    console.log(`⚽ Complejo desde URL detectado: ${complejoEncontrado.nombre}, seleccionando fútbol automáticamente`);
                                    const futbolRadio = document.getElementById('futbol');
                                    if (futbolRadio) {
                                        futbolRadio.checked = true;
                                        tipoCanchaSeleccionado = 'futbol';

                                        // Mostrar paso 3
                                        mostrarPaso(3);

                                        // Esperar un momento antes de disparar el evento change
                                        await new Promise(resolve => setTimeout(resolve, 200));

                                        // Disparar evento change para activar la lógica del paso 4
                                        futbolRadio.dispatchEvent(new Event('change', { bubbles: true }));
                                        console.log('✅ Fútbol seleccionado automáticamente desde URL');

                                        // Esperar a que el evento change se procese y el paso 4 se muestre
                                        await new Promise(resolve => setTimeout(resolve, 500));

                                        // Ejecutar automáticamente "Ver Disponibilidad" directamente llamando a la función
                                        const ejecutarVerDisponibilidadOtros = async () => {
                                            console.log('🔍 Ejecutando automáticamente "Ver Disponibilidad" desde URL (otros complejos)...');
                                            console.log('🔍 complejoSeleccionado:', complejoSeleccionado?.nombre);
                                            console.log('🔍 tipoCanchaSeleccionado:', tipoCanchaSeleccionado);
                                            
                                            if (complejoSeleccionado && tipoCanchaSeleccionado) {
                                                try {
                                                    if (typeof mostrarSeccionDisponibilidad === 'function') {
                                                        console.log('✅ Llamando a mostrarSeccionDisponibilidad...');
                                                        await mostrarSeccionDisponibilidad();
                                                        
                                                        if (typeof cargarHorariosBasicos === 'function') {
                                                            console.log('✅ Llamando a cargarHorariosBasicos...');
                                                            await cargarHorariosBasicos();
                                                        }
                                                        
                                                        console.log('✅ "Ver Disponibilidad" ejecutado automáticamente desde URL');
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error ejecutando "Ver Disponibilidad":', error);
                                                }
                                            }
                                        };
                                        
                                        setTimeout(ejecutarVerDisponibilidadOtros, 800);
                                    }
                                }
                                
                                // 6. Scroll automático a la sección de disponibilidad (movido después del click automático)
                                setTimeout(() => {
                                    const disponibilidadSection = document.getElementById('disponibilidad');
                                    if (disponibilidadSection) {
                                        disponibilidadSection.scrollIntoView({ 
                                            behavior: 'smooth', 
                                            block: 'start' 
                                        });
                                        console.log('📜 Scroll automático a disponibilidad');
                                    }
                                }, 2000);
                                
                            } else {
                                console.error('❌ Elemento complejoSelect no encontrado');
                            }
                        } else {
                            console.error('❌ Complejo no encontrado:', complejo);
                            console.log('📋 Complejos disponibles:', complejos.map(c => c.nombre));
                        }
                    }
                } else {
                    console.error('❌ Elemento ciudadSelect no encontrado');
                }
            } else {
                console.error('❌ Ciudad no encontrada:', ciudad);
                console.log('📋 Ciudades disponibles:', ciudades.map(c => c.nombre));
            }
        }
        
    } catch (error) {
        console.error('❌ Error en preRellenarDesdeURLMejorado:', error);
    }
    
    console.log('✅ === PRE-RELLENADO MEJORADO COMPLETADO ===');
}

// Función de test de conectividad
async function testConnectivity() {
    console.log('🔍 === INICIANDO TEST DE CONECTIVIDAD ===');
    
    try {
        console.log('🔍 Probando conectividad básica...');
        const response = await fetch(`${API_BASE}/ciudades`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Test de conectividad exitoso:', data);
            return true;
        } else {
            console.error('❌ Test de conectividad falló - HTTP:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Test de conectividad falló:', error);
        console.error('🔍 Detalles del error:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // Mostrar notificación al usuario
        mostrarNotificacion(`Error de conexión: ${error.message}`, 'warning');
        return false;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== INICIALIZACIÓN DE LA APLICACIÓN ===');
    console.log('🚀 VERSIÓN CON DEBUGGING MEJORADO Y FIX ENCODING - ' + new Date().toISOString());
    console.log('DOM cargado, inicializando aplicación');
    console.log('🌍 Hostname:', window.location.hostname);
    
    // Verificar configuración de URLs
    console.log('🔧 Verificando configuración de URLs...');
    console.log('🔗 URL_CONFIG disponible:', typeof window.URL_CONFIG !== 'undefined');
    console.log('🔗 API_BASE configurado como:', API_BASE);
    console.log('🔗 Tipo de API_BASE:', typeof API_BASE);
    
    if (!API_BASE || API_BASE === 'undefined') {
        console.error('❌ CRÍTICO: API_BASE no está configurado correctamente!');
        console.error('🔧 Intentando recargar configuración...');
        
        // Intentar recargar la configuración
        if (typeof window.URL_CONFIG !== 'undefined') {
            window.API_BASE = window.URL_CONFIG.API_URL;
            console.log('🔧 API_BASE reconfigurado como:', window.API_BASE);
        } else {
            console.error('❌ URL_CONFIG tampoco está disponible!');
            mostrarNotificacion('Error crítico: Configuración de URLs no disponible', 'danger');
            return;
        }
    }
    
    // Test de conectividad automático
    await testConnectivity();
    
    // Generar session ID único para esta sesión (máximo 6 caracteres)
    sessionId = Math.random().toString(36).substr(2, 6).toUpperCase();
    console.log('🆔 Session ID generado:', sessionId);
    
    // Botón de debug removido para usuarios finales
    // crearBotonLogs();
    // logVisible('🚀 APLICACIÓN INICIADA');
    
    try {
        // Cargar ciudades y esperar a que se completen
        console.log('🔄 Cargando ciudades...');
        await cargarCiudades();
        console.log('✅ Ciudades cargadas, configurando event listeners...');
        
        configurarEventListeners();
        configurarFechaMinima();
        
        // Verificar si hay parámetros URL para pre-rellenado
        const urlParams = new URLSearchParams(window.location.search);
        const ciudadParam = urlParams.get('ciudad');
        const complejoParam = urlParams.get('complejo');
        const paymentParam = urlParams.get('payment');
        const codeParam = urlParams.get('code');
        
        // Manejar redirección después de pago exitoso
        if (paymentParam === 'success' && codeParam) {
            console.log('🎉 Pago exitoso detectado, mostrando confirmación...');
            console.log('🔍 Código de reserva:', codeParam);
            
            // Mostrar confirmación de reserva
            mostrarConfirmacionReserva(codeParam, 'Transbank');
            
            // Limpiar URL para evitar que se muestre en futuras cargas
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            
            // Scroll al inicio para mostrar la confirmación
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            return; // No continuar con el resto de la inicialización
        }
        
        if (ciudadParam || complejoParam) {
            console.log('🔄 Parámetros URL detectados, iniciando pre-rellenado...');
            console.log('🔍 URL actual:', window.location.href);
            console.log('🔍 Parámetros URL:', window.location.search);
            
            // Pre-rellenar campos desde URL después de cargar datos (FUNCIÓN MEJORADA)
            await preRellenarDesdeURLMejorado();
            console.log('✅ Pre-rellenado mejorado completado');
        } else {
            console.log('🔍 No hay parámetros URL, saltando pre-rellenado');
        }
        
        // Scroll automático y mostrar paso 4 si hay parámetros URL
        console.log('🔍 Verificando parámetros URL para scroll...');
        console.log('🔍 Parámetros encontrados para scroll:', { ciudad: ciudadParam, complejo: complejoParam });
        
         if (ciudadParam || complejoParam) {
             console.log('🔄 Haciendo scroll automático al paso 4...');
             
             // Mostrar paso 4 (Ver disponibilidad) inmediatamente
             console.log('🔄 Mostrando paso 4...');
             mostrarPaso(4);
             console.log('✅ Paso 4 mostrado');
             
             // Scroll suave y único
        // Timing adaptativo para móviles
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const scrollDelay = isMobile ? 1200 : 800; // Más tiempo en móviles
        
        setTimeout(() => {
            console.log('🔄 Ejecutando scroll ultra suave al paso 4...');
            console.log('📱 Delay adaptativo:', scrollDelay, 'ms');
            scrollToStep4();
        }, scrollDelay);
            
        } else {
            console.log('🔍 No hay parámetros URL, no se ejecutará scroll automático');
        }
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
    }
    
    // Verificar que la función scrollToReservar esté disponible
    if (typeof scrollToReservar === 'function') {
        console.log('✅ Función scrollToReservar está disponible');
    } else {
        console.error('❌ Función scrollToReservar NO está disponible');
    }
    
    // Verificar que el botón existe
    const btn = document.querySelector('#reservarAhoraBtn');
    if (btn) {
        console.log('✅ Botón RESERVAR AHORA encontrado en el DOM');
        console.log('Botón HTML:', btn.outerHTML);
        
        // Verificar que el onclick está configurado
        console.log('Onclick del botón:', btn.onclick);
        console.log('Atributo onclick:', btn.getAttribute('onclick'));
        
        // Agregar un event listener adicional como respaldo
        btn.addEventListener('click', function(e) {
            console.log('🖱️ Event listener adicional activado');
            e.preventDefault();
            e.stopPropagation();
            scrollToReservar();
        });
        
        // Verificar que el botón es clickeable
        console.log('Botón clickeable:', btn.style.pointerEvents);
        console.log('Cursor del botón:', btn.style.cursor);
        
    } else {
        console.error('❌ Botón RESERVAR AHORA NO encontrado en el DOM');
        
        // Buscar todos los botones en la página
        const allButtons = document.querySelectorAll('button');
        console.log('Botones encontrados en la página:', allButtons.length);
        allButtons.forEach((button, index) => {
            console.log(`Botón ${index}:`, button.textContent.trim(), button.id, button.className);
        });
    }
    
    console.log('=== FIN INICIALIZACIÓN ===');
});

// Verificar disponibilidad de una cancha específica (incluyendo bloqueos temporales)
async function verificarDisponibilidadCancha(canchaId, fecha, hora) {
    try {
        // Agregar timestamp único para evitar cache
        const timestamp = Date.now();
        const response = await fetch(`${API_BASE}/disponibilidad-completa/${canchaId}/${fecha}?t=${timestamp}`);
        const data = await response.json();
        
        const reservas = data.reservas || [];
        const bloqueos = data.bloqueos || [];
        
        // Verificar si hay alguna reserva que se superponga con la hora seleccionada
        const horaInicio = hora;
        const horaFin = calcularHoraFin(hora);
        
        // Verificar conflictos con reservas existentes
        for (const reserva of reservas) {
            if (haySuperposicionHorarios(horaInicio, horaFin, reserva.hora_inicio, reserva.hora_fin)) {
                console.log('🔴 verificarDisponibilidadCancha - Reserva existente detectada:', {
                    reserva: `${reserva.hora_inicio}-${reserva.hora_fin}`,
                    solicitada: `${horaInicio}-${horaFin}`,
                    canchaId: canchaId
                });
                return { disponible: false, tipo: 'reserva_existente', conflicto: reserva };
            }
        }
        
        // Verificar conflictos con bloqueos temporales
        for (const bloqueo of bloqueos) {
            if (haySuperposicionHorarios(horaInicio, horaFin, bloqueo.hora_inicio, bloqueo.hora_fin)) {
                console.log('🔴 verificarDisponibilidadCancha - Bloqueo temporal detectado:', {
                    bloqueo: `${bloqueo.hora_inicio}-${bloqueo.hora_fin}`,
                    solicitada: `${horaInicio}-${horaFin}`,
                    canchaId: canchaId,
                    session_id: bloqueo.session_id
                });
                return { disponible: false, tipo: 'bloqueo_temporal', conflicto: bloqueo };
            }
        }
        
        return { disponible: true };
    } catch (error) {
        console.error('Error verificando disponibilidad:', error);
        return { disponible: false, error: error.message };
    }
}

// Función para verificar superposición de horarios
function haySuperposicionHorarios(inicio1, fin1, inicio2, fin2) {
    const inicio1Min = timeToMinutes(inicio1);
    const fin1Min = timeToMinutes(fin1);
    const inicio2Min = timeToMinutes(inicio2);
    const fin2Min = timeToMinutes(fin2);
    
    // Caso especial: si fin1 es 00:00 (medianoche del día siguiente), 
    // significa que cruza la medianoche, así que usar 24:00 (1440 minutos)
    const fin1MinAjustado = (fin1Min === 0) ? 24 * 60 : fin1Min;
    
    return inicio1Min < fin2Min && fin1MinAjustado > inicio2Min;
}

// ===== FUNCIONES DE BLOQUEO TEMPORAL =====

// Bloquear temporalmente una reserva
async function bloquearReservaTemporal(canchaId, fecha, horaInicio, horaFin) {
    try {
        console.log('🔒 Bloqueando reserva temporal:', { canchaId, fecha, horaInicio, horaFin, sessionId });
        
        const response = await fetch(`${API_BASE}/reservas/bloquear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cancha_id: canchaId,
                fecha: fecha,
                hora_inicio: horaInicio,
                hora_fin: horaFin,
                session_id: sessionId
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            bloqueoTemporal = {
                id: result.bloqueoId,
                cancha_id: canchaId,
                fecha: fecha,
                hora_inicio: horaInicio,
                hora_fin: horaFin,
                expira_en: result.expiraEn
            };
            
            console.log('✅ Bloqueo temporal creado:', bloqueoTemporal);
            
            // Configurar limpieza automática del bloqueo
            configurarLimpiezaBloqueo();
            
            return { success: true, bloqueo: bloqueoTemporal };
        } else {
            console.error('❌ Error bloqueando reserva:', result.error);
            return { success: false, error: result.error, conflicto: result.conflicto };
        }
    } catch (error) {
        console.error('❌ Error en bloqueo temporal:', error);
        return { success: false, error: error.message };
    }
}

// Liberar bloqueo temporal
async function liberarBloqueoTemporal() {
    if (!bloqueoTemporal) return;
    
    try {
        console.log('🔓 Liberando bloqueo temporal:', bloqueoTemporal.id);
        
        const response = await fetch(`${API_BASE}/reservas/bloquear/${bloqueoTemporal.id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            console.log('✅ Bloqueo temporal liberado exitosamente');
        } else {
            console.error('⚠️ Error liberando bloqueo temporal');
        }
    } catch (error) {
        console.error('❌ Error liberando bloqueo temporal:', error);
    } finally {
        bloqueoTemporal = null;
    }
}

// Configurar limpieza automática del bloqueo
function configurarLimpiezaBloqueo() {
    if (!bloqueoTemporal) return;
    
    // Limpiar bloqueo al cerrar la página
    window.addEventListener('beforeunload', liberarBloqueoTemporal);
    
    // Limpiar bloqueo después de 3 minutos (antes de que expire)
    setTimeout(() => {
        if (bloqueoTemporal) {
            console.log('⏰ Limpieza automática del bloqueo temporal');
            liberarBloqueoTemporal();
        }
    }, 3 * 60 * 1000); // 3 minutos
}

// Verificar si hay un bloqueo activo
function tieneBloqueoActivo() {
    return bloqueoTemporal !== null;
}

// Mostrar mensaje de error al usuario
function mostrarError(mensaje) {
    // Crear o actualizar elemento de error
    let errorElement = document.getElementById('error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'error-message';
        errorElement.className = 'alert alert-danger alert-dismissible fade show';
        errorElement.style.position = 'fixed';
        errorElement.style.top = '20px';
        errorElement.style.right = '20px';
        errorElement.style.zIndex = '9999';
        errorElement.style.maxWidth = '400px';
        
        document.body.appendChild(errorElement);
    }
    
    errorElement.innerHTML = `
        <strong>Error:</strong> ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
        if (errorElement && errorElement.parentNode) {
            errorElement.remove();
        }
    }, 5000);
    
    console.error('❌ Error mostrado al usuario:', mensaje);
}

// Actualizar el estado visual de una cancha
function actualizarEstadoCancha(canchaId, disponible) {
    const canchaCard = document.querySelector(`[data-cancha-id="${canchaId}"]`);
    if (canchaCard) {
        if (disponible) {
            canchaCard.classList.remove('ocupada');
            canchaCard.classList.add('disponible');
            canchaCard.style.pointerEvents = 'auto';
            canchaCard.style.opacity = '1';
            
            const estadoBadge = canchaCard.querySelector('.estado-disponibilidad .badge');
            if (estadoBadge) {
                estadoBadge.className = 'badge bg-success';
                estadoBadge.textContent = 'Disponible';
            }
        } else {
            canchaCard.classList.remove('disponible');
            canchaCard.classList.add('ocupada');
            canchaCard.style.pointerEvents = 'none';
            canchaCard.style.opacity = '0.6';
            
            const estadoBadge = canchaCard.querySelector('.estado-disponibilidad .badge');
            if (estadoBadge) {
                estadoBadge.className = 'badge bg-danger';
                estadoBadge.textContent = 'Ocupada';
            }
        }
    }
}

// Variable para evitar consultas repetitivas
let ultimaConsultaDisponibilidad = null;
let consultandoDisponibilidad = false;

// Verificar disponibilidad en tiempo real cuando cambien fecha o hora
async function verificarDisponibilidadTiempoReal() {
    const fecha = document.getElementById('fechaSelect').value;
    const hora = document.getElementById('horaSelect').value;
    
    if (!fecha || !canchas.length) {
        return;
    }
    
    // Evitar consultas repetitivas
    const consultaActual = `${fecha}_${hora || 'todas'}`;
    if (ultimaConsultaDisponibilidad === consultaActual || consultandoDisponibilidad) {
        console.log('⏭️ Saltando consulta duplicada:', consultaActual);
        return;
    }
    
    consultandoDisponibilidad = true;
    ultimaConsultaDisponibilidad = consultaActual;
    
    console.log('Verificando disponibilidad en tiempo real para:', fecha, hora || 'todas las horas');
    
    // Obtener datos de disponibilidad del complejo
    const complejoId = canchas[0]?.complejo_id;
    if (!complejoId) {
        console.error('No se pudo obtener el ID del complejo');
        consultandoDisponibilidad = false;
        return;
    }
    
    try {
        const disponibilidadCompleta = await verificarDisponibilidadCompleta(complejoId, fecha);
        
        // Si hay hora seleccionada, verificar disponibilidad de todas las canchas para esa hora
        if (hora) {
            for (const cancha of canchas) {
                const estaDisponible = verificarDisponibilidadCanchaOptimizada(cancha.id, hora, disponibilidadCompleta);
                actualizarEstadoCancha(cancha.id, estaDisponible);
            }
        }
        
        // SIEMPRE actualizar horarios con disponibilidad para TODAS las horas
        await actualizarHorariosConDisponibilidad();
    } catch (error) {
        console.error('Error verificando disponibilidad en tiempo real:', error);
    } finally {
        consultandoDisponibilidad = false;
    }
}

// Verificar si todas las canchas están ocupadas en un horario específico
async function verificarTodasCanchasOcupadas(fecha, hora) {
    if (!canchas.length) {
        console.log('⚠️ No hay canchas cargadas para verificar disponibilidad');
        return false;
    }
    
    console.log('🔍 Verificando', canchas.length, 'canchas para', fecha, hora);
    let todasOcupadas = true;
    
    for (const cancha of canchas) {
        const estaDisponible = verificarDisponibilidadCanchaOptimizada(cancha.id, hora, disponibilidadCompleta);
        console.log('🏟️ Cancha', cancha.id, '(', cancha.nombre, ') - Disponible:', estaDisponible);
        if (estaDisponible) {
            todasOcupadas = false;
            break;
        }
    }
    
    console.log('🔍 Resultado final - Todas ocupadas:', todasOcupadas);
    return todasOcupadas;
}

// Cache para disponibilidad
const cacheDisponibilidad = new Map();
const CACHE_DURATION = 30000; // 30 segundos

// Función para limpiar cache de disponibilidad
function limpiarCacheDisponibilidad(complejoId, fecha) {
    if (fecha) {
        const cacheKey = `${complejoId}_${fecha}`;
        cacheDisponibilidad.delete(cacheKey);
        console.log(`🗑️ Cache limpiado para: ${cacheKey}`);
    } else if (complejoId) {
        // Limpiar todo el cache de un complejo
        const keysToDelete = [];
        for (const key of cacheDisponibilidad.keys()) {
            if (key.startsWith(`${complejoId}_`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => cacheDisponibilidad.delete(key));
        console.log(`🗑️ Cache limpiado para complejo ${complejoId}: ${keysToDelete.length} entradas`);
    } else {
        // Limpiar todo el cache
        cacheDisponibilidad.clear();
        console.log(`🗑️ Todo el cache de disponibilidad limpiado`);
    }
}

// NUEVA FUNCIÓN OPTIMIZADA: Verificar disponibilidad completa de un complejo
async function verificarDisponibilidadCompleta(complejoId, fecha) {
    const cacheKey = `${complejoId}_${fecha}`;
    const now = Date.now();
    
    // Verificar cache
    if (cacheDisponibilidad.has(cacheKey)) {
        const cached = cacheDisponibilidad.get(cacheKey);
        if (now - cached.timestamp < CACHE_DURATION) {
            console.log('🚀 Usando cache para disponibilidad:', cacheKey);
            return cached.data;
        }
    }
    try {
        console.log('🚀 Verificando disponibilidad completa para complejo:', complejoId, 'fecha:', fecha);
        console.log('🚀 API_BASE:', API_BASE);
        
        // Verificar que API_BASE esté definido
        if (!API_BASE) {
            console.error('❌ API_BASE no está definido en verificarDisponibilidadCompleta!');
            throw new Error('API_BASE no está definido');
        }
        
        const timestamp = Date.now();
        const url = `${API_BASE}/disponibilidad-completa/${complejoId}/${fecha}?t=${timestamp}`;
        console.log('🚀 URL de la petición:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache'
        });
        
        console.log('🚀 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
        }
        
        const disponibilidad = await response.json();
        console.log('✅ Disponibilidad completa obtenida:', Object.keys(disponibilidad).length, 'canchas');
        console.log('🔍 Datos de disponibilidad:', JSON.stringify(disponibilidad, null, 2));
        
        // Log específico para bloqueos permanentes
        Object.keys(disponibilidad).forEach(canchaId => {
            const canchaData = disponibilidad[canchaId];
            if (canchaData.bloqueos_permanentes && canchaData.bloqueos_permanentes.length > 0) {
                console.log(`🚫 Cancha ${canchaId} tiene ${canchaData.bloqueos_permanentes.length} bloqueo(s) permanente(s):`, canchaData.bloqueos_permanentes);
            } else {
                console.log(`ℹ️ Cancha ${canchaId} NO tiene bloqueos permanentes`);
            }
        });
        
        // Guardar en cache
        cacheDisponibilidad.set(cacheKey, {
            data: disponibilidad,
            timestamp: now
        });
        
        return disponibilidad;
    } catch (error) {
        console.error('❌ Error verificando disponibilidad completa:', error);
        // Fallback al método anterior si falla
        console.log('🔄 Usando método de fallback...');
        return await verificarDisponibilidadFallback(complejoId, fecha);
    }
}

// Función de fallback que usa el método anterior
async function verificarDisponibilidadFallback(complejoId, fecha) {
    const resultado = {};
    
    for (const cancha of canchas) {
        try {
            const response = await fetch(`${API_BASE}/disponibilidad/${cancha.id}/${fecha}`);
            const reservas = await response.json();
            
            resultado[cancha.id] = {
                cancha_id: cancha.id,
                cancha_nombre: cancha.nombre,
                cancha_tipo: cancha.tipo,
                reservas: reservas
            };
        } catch (error) {
            console.error(`Error verificando cancha ${cancha.id}:`, error);
            resultado[cancha.id] = {
                cancha_id: cancha.id,
                cancha_nombre: cancha.nombre,
                cancha_tipo: cancha.tipo,
                reservas: []
            };
        }
    }
    
    return resultado;
}

// NUEVA FUNCIÓN: Verificar si una cancha está disponible en un horario específico usando datos precargados
function verificarDisponibilidadCanchaOptimizada(canchaId, hora, disponibilidadData) {
    console.log('🔍 verificarDisponibilidadCanchaOptimizada - Cancha ID:', canchaId, 'Tipo:', typeof canchaId, 'Hora:', hora);
    console.log('🔍 Datos disponibles:', Object.keys(disponibilidadData));
    
    if (!disponibilidadData[canchaId]) {
        console.log('⚠️ No hay datos de disponibilidad para cancha:', canchaId);
        return true; // Asumir disponible si no hay datos
    }
    
    const canchaData = disponibilidadData[canchaId];
    const horaInicio = hora;
    const horaFin = calcularHoraFin(hora);
    
    // Verificar conflictos con reservas existentes
    for (const reserva of canchaData.reservas || []) {
        if (haySuperposicionHorarios(horaInicio, horaFin, reserva.hora_inicio, reserva.hora_fin)) {
            console.log('🔴 Cancha ocupada - Reserva existente:', {
                reserva: `${reserva.hora_inicio}-${reserva.hora_fin}`,
                solicitada: `${horaInicio}-${horaFin}`,
                canchaId: canchaId
            });
            return false;
        }
    }
    
    // Verificar conflictos con bloqueos temporales
    for (const bloqueo of canchaData.bloqueos || []) {
        if (haySuperposicionHorarios(horaInicio, horaFin, bloqueo.hora_inicio, bloqueo.hora_fin)) {
            console.log('🔴 Cancha ocupada - Bloqueo temporal:', {
                bloqueo: `${bloqueo.hora_inicio}-${bloqueo.hora_fin}`,
                solicitada: `${horaInicio}-${horaFin}`,
                canchaId: canchaId,
                session_id: bloqueo.session_id
            });
            return false;
        }
    }
    
    // Verificar bloqueos permanentes
    if (canchaData.bloqueos_permanentes && canchaData.bloqueos_permanentes.length > 0) {
        console.log(`🔍 Verificando ${canchaData.bloqueos_permanentes.length} bloqueo(s) permanente(s) para cancha ${canchaId}, hora ${hora}`);
        for (const bloqueo of canchaData.bloqueos_permanentes) {
            console.log(`  🔍 Bloqueo:`, bloqueo);
            let aplicaHorario = false;
            
            if (bloqueo.tipo_horario === 'todo_el_dia') {
                // Todo el día bloqueado
                aplicaHorario = true;
                console.log(`    ✅ Bloqueo de todo el día aplica`);
            } else if (bloqueo.tipo_horario === 'especifico' && bloqueo.hora_inicio) {
                // Verificar si la hora solicitada coincide con la hora bloqueada
                const horaBloqueo = bloqueo.hora_inicio.substring(0, 5);
                aplicaHorario = horaInicio.substring(0, 5) === horaBloqueo;
                console.log(`    🔍 Comparando hora bloqueo (${horaBloqueo}) con hora solicitada (${horaInicio.substring(0, 5)}): ${aplicaHorario}`);
            } else if (bloqueo.tipo_horario === 'rango' && bloqueo.hora_inicio && bloqueo.hora_fin) {
                // Verificar si hay superposición con el rango bloqueado
                aplicaHorario = haySuperposicionHorarios(horaInicio, horaFin, bloqueo.hora_inicio, bloqueo.hora_fin);
                console.log(`    🔍 Verificando superposición con rango ${bloqueo.hora_inicio}-${bloqueo.hora_fin}: ${aplicaHorario}`);
            }
            
            if (aplicaHorario) {
                console.log('🔴 Cancha ocupada - Bloqueo permanente:', {
                    motivo: bloqueo.motivo,
                    bloqueo: `${bloqueo.hora_inicio}-${bloqueo.hora_fin}`,
                    solicitada: `${horaInicio}-${horaFin}`,
                    canchaId: canchaId,
                    tipo_horario: bloqueo.tipo_horario
                });
                return false;
            }
        }
    } else {
        console.log(`ℹ️ Cancha ${canchaId} NO tiene bloqueos permanentes en canchaData`);
    }
    
    return true;
}

// Validar RUT chileno
function validarRUT(rut) {
    // Limpiar el RUT (quitar puntos, guiones y espacios)
    rut = rut.replace(/[^0-9kK]/g, '');
    
    // Verificar longitud mínima
    if (rut.length < 8) {
        return false;
    }
    
    // Separar número y dígito verificador
    const numero = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();
    
    // Validar que el número sea válido (solo dígitos)
    if (!/^\d+$/.test(numero)) {
        return false;
    }
    
    // Validar que el dígito verificador sea válido
    if (!/^[0-9kK]$/.test(dv)) {
        return false;
    }
    
    // Calcular dígito verificador
    let suma = 0;
    let multiplicador = 2;
    
    // Recorrer el número de derecha a izquierda
    for (let i = numero.length - 1; i >= 0; i--) {
        suma += parseInt(numero[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const resto = suma % 11;
    const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();
    
    return dv === dvCalculado;
}

// Validar nombre completo
function validarNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') {
        return false;
    }
    
    // Limpiar espacios al inicio y final
    nombre = nombre.trim();
    
    // Verificar que no esté vacío
    if (nombre.length === 0) {
        return false;
    }
    
    // Verificar longitud mínima (al menos 2 caracteres)
    if (nombre.length < 2) {
        return false;
    }
    
    // Verificar que contenga al menos un espacio (nombre y apellido)
    if (!nombre.includes(' ')) {
        return false;
    }
    
    // Verificar que no contenga caracteres especiales o números
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
    return regex.test(nombre);
}

// Validar email
function validarEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    // Limpiar espacios al inicio y final
    email = email.trim();
    
    // Verificar que no esté vacío
    if (email.length === 0) {
        return false;
    }
    
    // Expresión regular para validar email
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Validar teléfono chileno
function validarTelefono(telefono) {
    if (!telefono || typeof telefono !== 'string') {
        return false;
    }
    
    telefono = telefono.trim();
    
    // Verificar que no esté vacío
    if (telefono.length === 0) {
        return false;
    }
    
    // Patrones válidos para teléfonos chilenos
    const patrones = [
        /^\+569\d{8}$/, // +56912345678
        /^569\d{8}$/,   // 56912345678
        /^9\d{8}$/,     // 912345678
        /^2\d{8}$/,     // 212345678 (fijo)
        /^3\d{8}$/      // 312345678 (fijo)
    ];
    
    return patrones.some(patron => patron.test(telefono));
}

// Formatear RUT con puntos y guión
function formatearRUT(rut) {
    // Limpiar el RUT
    rut = rut.replace(/[^0-9kK]/g, '');
    
    // Solo formatear si tiene al menos 2 caracteres
    if (rut.length < 2) {
        return rut;
    }
    
    // Si tiene menos de 8 caracteres, solo agregar puntos
    if (rut.length < 8) {
        return rut.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
    
    // Separar número y dígito verificador
    const numero = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();
    
    // Agregar puntos al número
    const numeroFormateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    return `${numeroFormateado}-${dv}`;
}

// Función para hacer scroll suave a la sección de reserva (se define al final del archivo)

// Configurar fecha mínima (hoy) - CORREGIDO PARA ZONA HORARIA DE CHILE
function configurarFechaMinima() {
    const fechaInput = document.getElementById('fechaSelect');
    if (!fechaInput) {
        console.error('❌ No se encontró el elemento fechaSelect');
        return;
    }
    
    // Usar zona horaria de Chile para obtener la fecha correcta
    const hoy = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Santiago'
    });
    
    // Configurar fecha mínima
    fechaInput.min = hoy;
    fechaInput.setAttribute('min', hoy);
    
    // Establecer fecha por defecto si no hay valor
    if (!fechaInput.value) {
        fechaInput.value = hoy;
    }
    
    // Agregar validación adicional para fechas pasadas
    fechaInput.addEventListener('change', function() {
        const fechaSeleccionada = this.value;
        if (fechaSeleccionada && fechaSeleccionada < hoy) {
            console.warn('⚠️ Fecha pasada seleccionada:', fechaSeleccionada, 'Corrigiendo a:', hoy);
            this.value = hoy;
            
            // Mostrar mensaje de error más amigable
            const mensaje = document.createElement('div');
            mensaje.className = 'alert alert-warning alert-dismissible fade show';
            mensaje.innerHTML = `
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>Fecha no válida:</strong> No puedes seleccionar fechas pasadas. Se ha establecido la fecha de hoy.
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            // Insertar el mensaje después del selector de fecha
            const container = this.closest('.date-time-selector');
            if (container) {
                container.appendChild(mensaje);
                
                // Remover el mensaje después de 5 segundos
                setTimeout(() => {
                    if (mensaje.parentNode) {
                        mensaje.remove();
                    }
                }, 5000);
            }
        }
    });
    
    // Validación adicional en tiempo real
    fechaInput.addEventListener('input', function() {
        if (this.value && this.value < hoy) {
            this.classList.add('fecha-invalida');
        } else {
            this.classList.remove('fecha-invalida');
        }
    });
    
    console.log('📅 Fecha mínima configurada:', hoy, 'Zona horaria: America/Santiago');
    console.log('📅 Fecha actual del input:', fechaInput.value);
}

// Función para asegurar que los valores se muestren en móvil
function asegurarValoresVisibles() {
    const fechaSelect = document.getElementById('fechaSelect');
    const horaSelect = document.getElementById('horaSelect');
    
    if (fechaSelect && fechaSelect.value) {
        fechaSelect.style.color = '#155724';
        fechaSelect.style.fontWeight = '700';
        fechaSelect.style.fontSize = '1.4rem';
        fechaSelect.style.backgroundColor = '#e8f5e8';
        fechaSelect.style.borderColor = '#28a745';
        fechaSelect.style.opacity = '1';
        fechaSelect.style.visibility = 'visible';
    }
    
    if (horaSelect && horaSelect.value) {
        horaSelect.style.color = '#155724';
        horaSelect.style.fontWeight = '700';
        horaSelect.style.fontSize = '1.4rem';
        horaSelect.style.backgroundColor = '#e8f5e8';
        horaSelect.style.borderColor = '#28a745';
        horaSelect.style.opacity = '1';
        horaSelect.style.visibility = 'visible';
    }
}

// Configurar event listeners
function configurarEventListeners() {
    // Configurar event listener para el botón RESERVAR AHORA como respaldo
    const reservarBtn = document.getElementById('reservarAhoraBtn');
    if (reservarBtn) {
        reservarBtn.addEventListener('click', function(e) {
            console.log('Event listener del botón RESERVAR AHORA activado');
            e.preventDefault();
            scrollToReservar();
        });
    }
    
    // Event listeners para verificar disponibilidad en tiempo real
    const fechaSelect = document.getElementById('fechaSelect');
    const horaSelect = document.getElementById('horaSelect');
    
    // NOTA: Los event listeners para fechaSelect y horaSelect están definidos más abajo
    // para evitar duplicación y conflictos
    
    // Botón "Hoy" para establecer fecha actual
    const hoyBtn = document.getElementById('hoyBtn');
    if (hoyBtn) {
        hoyBtn.addEventListener('click', function() {
            const fechaInput = document.getElementById('fechaSelect');
            // Usar zona horaria de Chile para obtener la fecha correcta
            const hoy = new Date().toLocaleDateString('en-CA', {
                timeZone: 'America/Santiago'
            });
            fechaInput.value = hoy;
            console.log('📅 Fecha de hoy seleccionada:', hoy, 'Zona horaria: America/Santiago');
            
            // Trigger change event para actualizar disponibilidad
            fechaInput.dispatchEvent(new Event('change'));
            
            // Efecto visual de confirmación
            this.innerHTML = '<i class="fas fa-check"></i>';
            this.classList.add('btn-success');
            this.classList.remove('btn-outline-primary');
            
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-calendar-check"></i>';
                this.classList.remove('btn-success');
                this.classList.add('btn-outline-primary');
            }, 1500);
        });
    }
    
    // Selección de ciudad
    document.getElementById('ciudadSelect').addEventListener('change', function() {
        const ciudadId = this.value;
        if (ciudadId) {
            cargarComplejos(ciudadId);
            mostrarPaso(2);
            
            // Resetear opciones de tipo de cancha
            document.getElementById('padel').parentElement.style.display = 'block';
            document.getElementById('futbol').parentElement.style.display = 'block';
            
            // Resetear el centrado
            const step3CardBody = document.getElementById('step3').querySelector('.card-body');
            step3CardBody.style.display = '';
            step3CardBody.style.justifyContent = '';
            step3CardBody.style.alignItems = '';
            step3CardBody.style.textAlign = '';
            
            // Resetear el label de fútbol
            const futbolLabel = document.querySelector('label[for="futbol"]');
            if (futbolLabel) {
                futbolLabel.style.display = '';
                futbolLabel.style.alignItems = '';
                futbolLabel.style.justifyContent = '';
                futbolLabel.style.gap = '';
                futbolLabel.style.margin = '';
                futbolLabel.style.width = '';
            }
            
            document.querySelectorAll('input[name="tipoCancha"]').forEach(radio => {
                radio.checked = false;
            });
            tipoCanchaSeleccionado = null;
        } else {
            ocultarPaso(2);
            ocultarPaso(3);
            ocultarPaso(4);
        }
    });

    // Selección de complejo
    document.getElementById('complejoSelect').addEventListener('change', async function() {
        console.log('🔄 COMPLEJO SELECT CAMBIADO - Iniciando procesamiento...');
        const complejoId = this.value;
        console.log('🔄 Complejo ID seleccionado:', complejoId);
        
        if (complejoId) {
            complejoSeleccionado = complejos.find(c => c.id == complejoId);
            console.log('🔄 Complejo seleccionado:', complejoSeleccionado);
            
            await cargarHorariosComplejo(complejoSeleccionado);
            console.log('🔄 Horarios cargados para:', complejoSeleccionado.nombre);
            
            // Si es Complejo En Desarrollo, Fundación Gunnen, Espacio Deportivo Borde Río, Complejo Demo 1 o Punto Soccer, automáticamente seleccionar fútbol y ocultar opciones de padel
            if (complejoSeleccionado.nombre === 'Complejo En Desarrollo' || complejoSeleccionado.nombre === 'Fundación Gunnen' || complejoSeleccionado.nombre === 'Espacio Deportivo Borde Río' || complejoSeleccionado.nombre === 'Complejo Demo 1' || complejoSeleccionado.nombre.includes('Punto Soccer')) {
                console.log(`⚽ ${complejoSeleccionado.nombre} detectado - Configurando automáticamente...`);
                
                // Seleccionar automáticamente fútbol
                const futbolRadio = document.getElementById('futbol');
                console.log('⚽ Radio button fútbol encontrado:', futbolRadio);
                
                futbolRadio.checked = true;
                tipoCanchaSeleccionado = 'futbol';
                console.log('⚽ Fútbol seleccionado, tipoCanchaSeleccionado:', tipoCanchaSeleccionado);
                
                // Ocultar opción de padel
                document.getElementById('padel').parentElement.style.display = 'none';
                document.getElementById('futbol').parentElement.style.display = 'block';
                console.log('⚽ Opciones de padel ocultadas, fútbol mostrado');
                
                // Centrar la opción de fútbol
                const step3CardBody = document.getElementById('step3').querySelector('.card-body');
                step3CardBody.style.display = 'flex';
                step3CardBody.style.justifyContent = 'center';
                step3CardBody.style.alignItems = 'center';
                step3CardBody.style.textAlign = 'center';
                console.log('⚽ Paso 3 centrado para fútbol');
                
                // Asegurar que el radio button y el label estén alineados
                console.log('🔍 Buscando label de fútbol...');
                const futbolLabel = document.querySelector('label[for="futbol"]');
                console.log('🔍 Label de fútbol encontrado:', futbolLabel);
                if (futbolLabel) {
                    futbolLabel.style.display = 'flex';
                    futbolLabel.style.alignItems = 'center';
                    futbolLabel.style.justifyContent = 'flex-start';
                    futbolLabel.style.gap = '15px';
                    futbolLabel.style.margin = '0 auto';
                    futbolLabel.style.width = 'fit-content';
                    console.log('⚽ Label de fútbol configurado');
                }
                
                console.log('✅ Llegando a la parte de carga de canchas...');
                
                // NUEVA LÓGICA: Cargar canchas directamente sin depender del event listener
                console.log(`⚽ Cargando canchas directamente para ${complejoSeleccionado.nombre}...`);
                console.log('⚽ DEBUG AUTOMÁTICO - complejoSeleccionado:', complejoSeleccionado);
                console.log('⚽ DEBUG AUTOMÁTICO - tipoCanchaSeleccionado:', tipoCanchaSeleccionado);
                
                // Cargar canchas inmediatamente
                setTimeout(async () => {
                    console.log(`🏟️ Cargando canchas automáticamente para ${complejoSeleccionado.nombre}...`);
                    await cargarCanchas(complejoSeleccionado.id, tipoCanchaSeleccionado, false); // No renderizar visualmente en Fase 4
                    
                    // Verificar disponibilidad si hay fecha
                    const fecha = document.getElementById('fechaSelect').value;
                    if (fecha) {
                        console.log('🕐 Verificando disponibilidad automáticamente...');
                        await actualizarHorariosConDisponibilidad();
                    }
                }, 200);
                
                // IMPORTANTE: Disparar evento change para activar la lógica del paso 4
                console.log('⚽ Disparando evento change en radio button fútbol...');
                futbolRadio.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('⚽ Evento change disparado');
                
                // Verificar si el paso 4 se muestra
                setTimeout(() => {
                    const step4 = document.getElementById('step4');
                    console.log('⚽ Verificando paso 4 después de 100ms:', step4.style.display);
                    if (step4.style.display === 'none') {
                        console.log('⚠️ Paso 4 no se mostró automáticamente, forzando...');
                        mostrarPaso(4);
                    }
                }, 100);
                
                await validarHorariosSegunFecha();
            } else {
                // Para otros complejos, mostrar ambas opciones
                document.getElementById('padel').parentElement.style.display = 'block';
                document.getElementById('futbol').parentElement.style.display = 'block';
                
                // Resetear el centrado para otros complejos
                const step3CardBody = document.getElementById('step3').querySelector('.card-body');
                step3CardBody.style.display = '';
                step3CardBody.style.justifyContent = '';
                step3CardBody.style.alignItems = '';
                step3CardBody.style.textAlign = '';
                
                // Resetear el label de fútbol
                const futbolLabel = document.querySelector('label[for="futbol"]');
                if (futbolLabel) {
                    futbolLabel.style.display = '';
                    futbolLabel.style.alignItems = '';
                    futbolLabel.style.justifyContent = '';
                    futbolLabel.style.gap = '';
                    futbolLabel.style.margin = '';
                    futbolLabel.style.width = '';
                }
                
                // Limpiar selección previa
                document.querySelectorAll('input[name="tipoCancha"]').forEach(radio => {
                    radio.checked = false;
                });
                tipoCanchaSeleccionado = null;
                mostrarPaso(3);
            }
        } else {
            ocultarPaso(3);
            ocultarPaso(4);
        }
    });

    // Función para actualizar colores dinámicos en Demo 3
    function actualizarColoresDinamicosDemo3(tipoSeleccionado) {
        if (complejoSeleccionado && complejoSeleccionado.nombre === 'Complejo Demo 3') {
            const demo3Container = document.querySelector('.demo3-container');
            if (demo3Container) {
                demo3Container.setAttribute('data-tipo-seleccionado', tipoSeleccionado);
                console.log('🎨 Colores dinámicos actualizados para Demo 3:', tipoSeleccionado);
            }
        }
    }

    // Selección de tipo de cancha
    document.querySelectorAll('input[name="tipoCancha"]').forEach(radio => {
        radio.addEventListener('change', function() {
            console.log('🎯 RADIO BUTTON CAMBIADO:', this.value);
            console.log('🎯 Complejo seleccionado:', complejoSeleccionado);
            
            // Solo permitir selección si no es Complejo En Desarrollo, Complejo Demo 1 o Punto Soccer, o si es uno de estos y se selecciona fútbol
            if (complejoSeleccionado && (complejoSeleccionado.nombre === 'Complejo En Desarrollo' || complejoSeleccionado.nombre === 'Complejo Demo 1' || complejoSeleccionado.nombre.includes('Punto Soccer')) && this.value !== 'futbol') {
                console.log('🚫 Padel no permitido para', complejoSeleccionado.nombre);
                return; // No permitir selección de padel para estos complejos
            }
            
            tipoCanchaSeleccionado = this.value;
            console.log('🎯 Tipo de cancha seleccionado:', tipoCanchaSeleccionado);
            
            // Actualizar colores dinámicos para Demo 3
            actualizarColoresDinamicosDemo3(tipoCanchaSeleccionado);
            
            console.log('🎯 Llamando a mostrarPaso(4)...');
            mostrarPaso(4);
            console.log('✅ mostrarPaso(4) completado, continuando...');
            
            // NUEVA LÓGICA: Cargar canchas automáticamente cuando se selecciona tipo de cancha
            console.log('🔍 DEBUG: Verificando condiciones para cargar canchas...');
            console.log('🔍 DEBUG: complejoSeleccionado:', complejoSeleccionado);
            console.log('🔍 DEBUG: tipoCanchaSeleccionado:', tipoCanchaSeleccionado);
            
            if (complejoSeleccionado && tipoCanchaSeleccionado) {
                console.log('⚽ Cargando canchas automáticamente para verificar disponibilidad...');
                setTimeout(async () => {
                    console.log('🚀 Ejecutando cargarCanchas...');
                    await cargarCanchas(complejoSeleccionado.id, tipoCanchaSeleccionado, false); // No renderizar visualmente en Fase 4
                    // Verificar disponibilidad inmediatamente después de cargar canchas
                    const fecha = document.getElementById('fechaSelect').value;
                    if (fecha) {
                        console.log('🕐 Verificando disponibilidad inmediatamente después de cargar canchas...');
                        await actualizarHorariosConDisponibilidad();
                    }
                }, 100);
            } else {
                console.log('❌ No se pueden cargar canchas - condiciones no cumplidas');
                console.log('❌ complejoSeleccionado existe:', !!complejoSeleccionado);
                console.log('❌ tipoCanchaSeleccionado existe:', !!tipoCanchaSeleccionado);
            }
            
            // Verificar que el paso 4 se mostró
            setTimeout(() => {
                const step4 = document.getElementById('step4');
                console.log('🎯 Verificando paso 4 después de 50ms:', step4.style.display);
            }, 50);
        });
    });

    // Botón ver disponibilidad - solo muestra la sección de fecha/hora
    const verDisponibilidadBtn = document.getElementById('verDisponibilidad');
    console.log('🔍 Botón verDisponibilidad encontrado:', verDisponibilidadBtn);
    if (verDisponibilidadBtn) {
        console.log('🔍 Botón verDisponibilidad visible:', verDisponibilidadBtn.style.display);
        console.log('🔍 Botón verDisponibilidad offsetParent:', verDisponibilidadBtn.offsetParent);
    }
    verDisponibilidadBtn.addEventListener('click', async function() {
        console.log('🔍 BOTÓN VER DISPONIBILIDAD CLICKEADO');
        console.log('🔍 Complejo seleccionado:', complejoSeleccionado);
        console.log('🔍 Tipo cancha seleccionado:', tipoCanchaSeleccionado);
        if (complejoSeleccionado && tipoCanchaSeleccionado) {
            console.log('🔍 Llamando a mostrarSeccionDisponibilidad...');
            await mostrarSeccionDisponibilidad();
            
            // CORREGIDO: Solo cargar horarios básicos, NO con disponibilidad inmediata
            // La disponibilidad se verificará cuando se seleccione fecha y hora
            console.log('🚀 Cargando horarios básicos después de mostrar sección...');
            await cargarHorariosBasicos();
        } else {
            console.log('🔍 No se puede mostrar disponibilidad - faltan datos');
        }
    });

    // Filtros de fecha y hora
    document.getElementById('fechaSelect').addEventListener('change', async function() {
        // Limpiar cache de disponibilidad cuando cambia la fecha para forzar nueva consulta
        const nuevaFecha = this.value;
        if (complejoSeleccionado && nuevaFecha) {
            limpiarCacheDisponibilidad(complejoSeleccionado.id, nuevaFecha);
        }
        // Asegurar que la fecha se muestre correctamente en móvil con el nuevo diseño
        if (this.value) {
            this.classList.add('fecha-seleccionada');
            this.style.color = '#155724';
            this.style.fontWeight = '700';
            this.style.backgroundColor = '#e8f5e8';
            this.style.borderColor = '#28a745';
            
            // Actualizar el icono personalizado
            const container = this.closest('.date-time-selector');
            if (container) {
                container.style.setProperty('--icon-bg', '#28a745');
            }
        } else {
            this.classList.remove('fecha-seleccionada');
            this.style.color = '';
            this.style.fontWeight = '';
            this.style.backgroundColor = '';
            this.style.borderColor = '';
            
            // Restaurar el icono por defecto
            const container = this.closest('.date-time-selector');
            if (container) {
                container.style.setProperty('--icon-bg', '#667eea');
            }
        }
        
        // Debounce para evitar llamadas excesivas
        clearTimeout(window.debounceDisponibilidad);
        window.debounceDisponibilidad = setTimeout(() => {
            verificarDisponibilidadTiempoReal();
        }, 500);
        await validarHorariosSegunFecha();
        
        // NUEVA LÓGICA: Cargar canchas automáticamente si hay complejo y tipo seleccionado
        if (complejoSeleccionado && tipoCanchaSeleccionado) {
            console.log('📅 Fecha seleccionada, cargando canchas automáticamente...');
            setTimeout(async () => {
                // Cargar canchas con fecha para obtener precios promocionales (incluso sin hora)
                await cargarCanchas(complejoSeleccionado.id, tipoCanchaSeleccionado, true); // Renderizar visualmente para mostrar precios
                // Verificar disponibilidad inmediatamente después de cargar canchas
                console.log('🕐 Verificando disponibilidad inmediatamente después de seleccionar fecha...');
                await actualizarHorariosConDisponibilidad();
            }, 200);
        } else if (canchas.length > 0) {
            // Si ya hay canchas cargadas, recargar con fecha y hora para actualizar precios
            const fecha = this.value;
            const hora = document.getElementById('horaSelect')?.value;
            if (fecha) {
                try {
                    let url;
                    if (complejoSeleccionado && complejoSeleccionado.nombre === 'Complejo Demo 3') {
                        url = `${API_BASE}/canchas/${complejoSeleccionado.id}?fecha=${fecha}`;
                        if (hora) url += `&hora=${hora}`;
                    } else {
                        url = `${API_BASE}/canchas/${complejoSeleccionado.id}/${tipoCanchaSeleccionado}?fecha=${fecha}`;
                        if (hora) url += `&hora=${hora}`;
                    }
                    const response = await fetch(url);
                    canchas = await response.json();
                    console.log('🔄 Canchas actualizadas con precios promocionales:', canchas);
                } catch (error) {
                    console.error('Error actualizando canchas con promociones:', error);
                }
            }
            await renderizarCanchasConDisponibilidad();
        }
        
        // Cerrar el calendario después de seleccionar una fecha
        setTimeout(() => {
            this.blur();
        }, 100);
    });
    document.getElementById('horaSelect').addEventListener('change', async function() {
        const horaSeleccionada = this.value;
        console.log('🕐 Hora seleccionada:', horaSeleccionada);
        
        // Asegurar que la hora se muestre correctamente en móvil con el nuevo diseño
        if (this.value) {
            this.classList.add('hora-seleccionada');
            this.style.color = '#155724';
            this.style.fontWeight = '700';
            this.style.backgroundColor = '#e8f5e8';
            this.style.borderColor = '#28a745';
            
            // Actualizar el icono personalizado
            const container = this.closest('.date-time-selector');
            if (container) {
                container.style.setProperty('--icon-bg', '#28a745');
            }
        } else {
            this.classList.remove('hora-seleccionada');
            this.style.color = '';
            this.style.fontWeight = '';
            this.style.backgroundColor = '';
            this.style.borderColor = '';
            
            // Restaurar el icono por defecto
            const container = this.closest('.date-time-selector');
            if (container) {
                container.style.setProperty('--icon-bg', '#667eea');
            }
        }
        
        // Debounce para evitar llamadas excesivas
        clearTimeout(window.debounceDisponibilidad);
        window.debounceDisponibilidad = setTimeout(() => {
            verificarDisponibilidadTiempoReal();
        }, 500);
        
        // Recargar canchas con fecha y hora para obtener precios promocionales
        if (complejoSeleccionado && tipoCanchaSeleccionado && this.value) {
            const fecha = document.getElementById('fechaSelect').value;
            if (fecha) {
                try {
                    let url;
                    if (complejoSeleccionado.nombre === 'Complejo Demo 3') {
                        // Para Complejo Demo 3, mantener todas las canchas
                        url = `${API_BASE}/canchas/${complejoSeleccionado.id}?fecha=${fecha}&hora=${horaSeleccionada}`;
                        console.log('🎨 Complejo Demo 3: Recargando TODAS las canchas con precios promocionales');
                    } else {
                        // Para otros complejos, usar filtro por tipo
                        url = `${API_BASE}/canchas/${complejoSeleccionado.id}/${tipoCanchaSeleccionado}?fecha=${fecha}&hora=${horaSeleccionada}`;
                    }
                    console.log('🔄 Recargando canchas con URL:', url);
                    const response = await fetch(url);
                    canchas = await response.json();
                    console.log('🎯 Canchas recargadas con precios promocionales:', canchas);
                    
                    // Log detallado de cada cancha recibida
                    canchas.forEach((cancha, index) => {
                        console.log(`  Cancha ${index + 1}:`, {
                            id: cancha.id,
                            nombre: cancha.nombre,
                            precio_hora: cancha.precio_hora,
                            precio_actual: cancha.precio_actual,
                            precio_original: cancha.precio_original,
                            tiene_promocion: cancha.tiene_promocion,
                            promocion_info: cancha.promocion_info
                        });
                    });
                    
                    // Log de promociones encontradas
                    const canchasConPromocion = canchas.filter(c => c.tiene_promocion);
                    if (canchasConPromocion.length > 0) {
                        console.log('🎉 Promociones aplicadas:', canchasConPromocion.map(c => ({
                            cancha: c.nombre,
                            precioOriginal: c.precio_original,
                            precioPromocional: c.precio_actual,
                            tienePromocion: c.tiene_promocion,
                            promocion: c.promocion_info
                        })));
                    } else {
                        console.log('⚠️ No se encontraron promociones para estas canchas en', fecha, horaSeleccionada);
                        console.log('⚠️ Detalle de canchas:', canchas.map(c => ({
                            nombre: c.nombre,
                            precio_hora: c.precio_hora,
                            precio_actual: c.precio_actual,
                            tiene_promocion: c.tiene_promocion
                        })));
                    }
                    
                    // Renderizar canchas visualmente con precios actualizados
                    await renderizarCanchasConDisponibilidad();
                } catch (error) {
                    console.error('Error recargando canchas con promociones:', error);
                }
            }
        } else if (canchas.length > 0) {
            // Si no hay hora pero hay canchas, renderizar las existentes
            await renderizarCanchasConDisponibilidad();
        } else if (complejoSeleccionado && tipoCanchaSeleccionado && this.value) {
            // Si no hay canchas, cargarlas y renderizar visualmente
            await cargarCanchas(complejoSeleccionado.id, tipoCanchaSeleccionado, true);
        }
    });

    // Búsqueda de reserva
    document.getElementById('buscarReserva').addEventListener('click', buscarReserva);

    // Confirmar reserva
    document.getElementById('confirmarReserva').addEventListener('click', confirmarReserva);
    
    // Event listener para checkbox de pagar 50%
    const pagarMitadCheckbox = document.getElementById('pagarMitad');
    if (pagarMitadCheckbox) {
        pagarMitadCheckbox.addEventListener('change', function() {
            actualizarResumenPrecio();
        });
    }
    
    // Validación de RUT en tiempo real
    const rutInput = document.getElementById('rutCliente');
    if (rutInput) {
        // Variable global para controlar si el usuario ha interactuado con el campo
        window.rutUsuarioHaInteractuado = false;
        
        rutInput.addEventListener('input', function() {
            // Marcar que el usuario ha interactuado
            window.rutUsuarioHaInteractuado = true;
            
            const rut = this.value;
            const rutFormateado = formatearRUT(rut);
            
            // Actualizar el valor con formato
            if (rutFormateado !== rut) {
                this.value = rutFormateado;
            }
            
            // Solo validar si el usuario ha interactuado y el RUT tiene contenido
            if (window.rutUsuarioHaInteractuado && rut.length > 0) {
                if (rut.length >= 8) {
                    const esValido = validarRUT(rut);
                    
                    if (esValido) {
                        this.classList.remove('is-invalid');
                        this.classList.add('is-valid');
                        // Mostrar feedback válido del RUT
                        const rutValidFeedback = this.parentNode.querySelector('.valid-feedback');
                        const rutInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                        if (rutValidFeedback) rutValidFeedback.classList.remove('d-none');
                        if (rutInvalidFeedback) rutInvalidFeedback.classList.add('d-none');
                    } else {
                        this.classList.remove('is-valid');
                        this.classList.add('is-invalid');
                        // Mostrar feedback inválido del RUT
                        const rutValidFeedback = this.parentNode.querySelector('.valid-feedback');
                        const rutInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                        if (rutValidFeedback) rutValidFeedback.classList.add('d-none');
                        if (rutInvalidFeedback) rutInvalidFeedback.classList.remove('d-none');
                    }
                } else {
                    // Si hay contenido pero es muy corto, mostrar como inválido
                    this.classList.remove('is-valid');
                    this.classList.add('is-invalid');
                    // Mostrar feedback inválido del RUT
                    const rutValidFeedback = this.parentNode.querySelector('.valid-feedback');
                    const rutInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                    if (rutValidFeedback) rutValidFeedback.classList.add('d-none');
                    if (rutInvalidFeedback) rutInvalidFeedback.classList.remove('d-none');
                }
            } else if (rut.length === 0) {
                // Si está vacío, limpiar validación
                this.classList.remove('is-valid', 'is-invalid');
                // Ocultar ambos feedbacks del RUT
                const rutValidFeedback = this.parentNode.querySelector('.valid-feedback');
                const rutInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                if (rutValidFeedback) rutValidFeedback.classList.add('d-none');
                if (rutInvalidFeedback) rutInvalidFeedback.classList.add('d-none');
            }
        });
        
        // Validar al perder el foco solo si el usuario ha interactuado
        rutInput.addEventListener('blur', function() {
            if (!window.rutUsuarioHaInteractuado) return;
            
            const rut = this.value;
            if (rut.length >= 8) {
                const esValido = validarRUT(rut);
                if (!esValido) {
                    this.classList.add('is-invalid');
                    this.classList.remove('is-valid');
                    // Mostrar feedback inválido del RUT
                    const rutValidFeedback = this.parentNode.querySelector('.valid-feedback');
                    const rutInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                    if (rutValidFeedback) rutValidFeedback.classList.add('d-none');
                    if (rutInvalidFeedback) rutInvalidFeedback.classList.remove('d-none');
                }
            } else if (rut.length > 0) {
                // Si hay contenido pero es muy corto
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
                // Mostrar feedback inválido del RUT
                const rutValidFeedback = this.parentNode.querySelector('.valid-feedback');
                const rutInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                if (rutValidFeedback) rutValidFeedback.classList.add('d-none');
                if (rutInvalidFeedback) rutInvalidFeedback.classList.remove('d-none');
            } else {
                // Si está vacío, limpiar validación
                this.classList.remove('is-valid', 'is-invalid');
                // Ocultar ambos feedbacks del RUT
                const rutValidFeedback = this.parentNode.querySelector('.valid-feedback');
                const rutInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                if (rutValidFeedback) rutValidFeedback.classList.add('d-none');
                if (rutInvalidFeedback) rutInvalidFeedback.classList.add('d-none');
            }
        });
        
        // Limpiar validación cuando se abre el modal
        rutInput.addEventListener('focus', function() {
            // Solo limpiar si no hay contenido y el usuario no ha interactuado
            if (this.value.length === 0) {
                this.classList.remove('is-valid', 'is-invalid');
            }
        });
    }
    
    // Validación de Email en tiempo real
    const emailInput = document.getElementById('emailCliente');
    if (emailInput) {
        // Variable global para controlar si el usuario ha interactuado con el campo email
        window.emailUsuarioHaInteractuado = false;
        
        emailInput.addEventListener('input', function() {
            // Marcar que el usuario ha interactuado
            window.emailUsuarioHaInteractuado = true;
            
            const email = this.value;
            
            // Solo validar si el usuario ha interactuado y el email tiene contenido
            if (window.emailUsuarioHaInteractuado && email.length > 0) {
                const esValido = validarEmail(email);
                
                if (esValido) {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                    // Mostrar feedback válido
                    const emailValidFeedback = this.parentNode.querySelector('.valid-feedback');
                    const emailInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                    if (emailValidFeedback) emailValidFeedback.classList.remove('d-none');
                    if (emailInvalidFeedback) emailInvalidFeedback.classList.add('d-none');
                } else {
                    this.classList.remove('is-valid');
                    this.classList.add('is-invalid');
                    // Mostrar feedback inválido
                    const emailValidFeedback = this.parentNode.querySelector('.valid-feedback');
                    const emailInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                    if (emailValidFeedback) emailValidFeedback.classList.add('d-none');
                    if (emailInvalidFeedback) emailInvalidFeedback.classList.remove('d-none');
                }
            } else if (email.length === 0) {
                // Si está vacío, limpiar validación
                this.classList.remove('is-valid', 'is-invalid');
                // Ocultar ambos feedbacks
                const emailValidFeedback = this.parentNode.querySelector('.valid-feedback');
                const emailInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                if (emailValidFeedback) emailValidFeedback.classList.add('d-none');
                if (emailInvalidFeedback) emailInvalidFeedback.classList.add('d-none');
            }
        });
        
        // Validar al perder el foco solo si el usuario ha interactuado
        emailInput.addEventListener('blur', function() {
            if (!window.emailUsuarioHaInteractuado) return;
            
            const email = this.value;
            if (email.length > 0) {
                const esValido = validarEmail(email);
                if (!esValido) {
                    this.classList.add('is-invalid');
                    this.classList.remove('is-valid');
                    // Mostrar feedback inválido
                    const emailValidFeedback = this.parentNode.querySelector('.valid-feedback');
                    const emailInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                    if (emailValidFeedback) emailValidFeedback.classList.add('d-none');
                    if (emailInvalidFeedback) emailInvalidFeedback.classList.remove('d-none');
                }
            } else {
                // Si está vacío, limpiar validación
                this.classList.remove('is-valid', 'is-invalid');
                // Ocultar ambos feedbacks
                const emailValidFeedback = this.parentNode.querySelector('.valid-feedback');
                const emailInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                if (emailValidFeedback) emailValidFeedback.classList.add('d-none');
                if (emailInvalidFeedback) emailInvalidFeedback.classList.add('d-none');
            }
        });
        
        // Limpiar validación cuando se abre el modal
        emailInput.addEventListener('focus', function() {
            // Solo limpiar si no hay contenido y el usuario no ha interactuado
            if (this.value.length === 0) {
                this.classList.remove('is-valid', 'is-invalid');
            }
        });
    }
    
    // Validación de Nombre en tiempo real
    const nombreInput = document.getElementById('nombreCliente');
    if (nombreInput) {
        // Variable global para controlar si el usuario ha interactuado con el campo nombre
        window.nombreUsuarioHaInteractuado = false;
        
        nombreInput.addEventListener('input', function() {
            // Marcar que el usuario ha interactuado
            window.nombreUsuarioHaInteractuado = true;
            
            const nombre = this.value;
            
            // Solo validar si el usuario ha interactuado
            if (window.nombreUsuarioHaInteractuado) {
                const esValido = validarNombre(nombre);
                
                if (esValido) {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                    // Mostrar feedback válido
                    const nombreValidFeedback = this.parentNode.querySelector('.valid-feedback');
                    const nombreInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                    if (nombreValidFeedback) nombreValidFeedback.classList.remove('d-none');
                    if (nombreInvalidFeedback) nombreInvalidFeedback.classList.add('d-none');
                } else {
                    this.classList.remove('is-valid');
                    this.classList.add('is-invalid');
                    // Mostrar feedback inválido
                    const nombreValidFeedback = this.parentNode.querySelector('.valid-feedback');
                    const nombreInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                    if (nombreValidFeedback) nombreValidFeedback.classList.add('d-none');
                    if (nombreInvalidFeedback) nombreInvalidFeedback.classList.remove('d-none');
                }
            }
        });
        
        // Validar al perder el foco solo si el usuario ha interactuado
        nombreInput.addEventListener('blur', function() {
            if (!window.nombreUsuarioHaInteractuado) return;
            
            const nombre = this.value;
            const esValido = validarNombre(nombre);
            
            if (esValido) {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
                // Mostrar feedback válido
                const nombreValidFeedback = this.parentNode.querySelector('.valid-feedback');
                const nombreInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                if (nombreValidFeedback) nombreValidFeedback.classList.remove('d-none');
                if (nombreInvalidFeedback) nombreInvalidFeedback.classList.add('d-none');
            } else {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
                // Mostrar feedback inválido
                const nombreValidFeedback = this.parentNode.querySelector('.valid-feedback');
                const nombreInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                if (nombreValidFeedback) nombreValidFeedback.classList.add('d-none');
                if (nombreInvalidFeedback) nombreInvalidFeedback.classList.remove('d-none');
            }
        });
        
        // Limpiar validación cuando se abre el modal
        nombreInput.addEventListener('focus', function() {
            // Solo limpiar si no hay contenido y el usuario no ha interactuado
            if (this.value.length === 0) {
                this.classList.remove('is-valid', 'is-invalid');
            }
        });
    }
    
    // Validación de teléfono en tiempo real
    const telefonoInput = document.getElementById('telefonoCliente');
    if (telefonoInput) {
        // Variable global para controlar si el usuario ha interactuado con el campo teléfono
        window.telefonoUsuarioHaInteractuado = false;
        
        telefonoInput.addEventListener('input', function() {
            // Marcar que el usuario ha interactuado
            window.telefonoUsuarioHaInteractuado = true;
            
            const telefono = this.value;
            
            // Solo validar si el usuario ha interactuado
            if (window.telefonoUsuarioHaInteractuado) {
                const esValido = validarTelefono(telefono);
                
                if (esValido) {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                    // Mostrar feedback válido
                    const telefonoValidFeedback = this.parentNode.querySelector('.valid-feedback');
                    const telefonoInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                    if (telefonoValidFeedback) telefonoValidFeedback.classList.remove('d-none');
                    if (telefonoInvalidFeedback) telefonoInvalidFeedback.classList.add('d-none');
                } else {
                    this.classList.remove('is-valid');
                    this.classList.add('is-invalid');
                    // Mostrar feedback inválido
                    const telefonoValidFeedback = this.parentNode.querySelector('.valid-feedback');
                    const telefonoInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                    if (telefonoValidFeedback) telefonoValidFeedback.classList.add('d-none');
                    if (telefonoInvalidFeedback) telefonoInvalidFeedback.classList.remove('d-none');
                }
            }
        });
        
        // Validar al perder el foco solo si el usuario ha interactuado
        telefonoInput.addEventListener('blur', function() {
            if (!window.telefonoUsuarioHaInteractuado) return;
            
            const telefono = this.value;
            const esValido = validarTelefono(telefono);
            
            if (esValido) {
                this.classList.remove('is-invalid');
                this.classList.add('is-valid');
                // Mostrar feedback válido
                const telefonoValidFeedback = this.parentNode.querySelector('.valid-feedback');
                const telefonoInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                if (telefonoValidFeedback) telefonoValidFeedback.classList.remove('d-none');
                if (telefonoInvalidFeedback) telefonoInvalidFeedback.classList.add('d-none');
            } else {
                this.classList.remove('is-valid');
                this.classList.add('is-invalid');
                // Mostrar feedback inválido
                const telefonoValidFeedback = this.parentNode.querySelector('.valid-feedback');
                const telefonoInvalidFeedback = this.parentNode.querySelector('.invalid-feedback');
                if (telefonoValidFeedback) telefonoValidFeedback.classList.add('d-none');
                if (telefonoInvalidFeedback) telefonoInvalidFeedback.classList.remove('d-none');
            }
        });
        
        // Limpiar validación cuando se abre el modal
        telefonoInput.addEventListener('focus', function() {
            // Solo limpiar si no hay contenido y el usuario no ha interactuado
            if (this.value.length === 0) {
                this.classList.remove('is-valid', 'is-invalid');
            }
        });
    }
}

// Funciones de navegación
function mostrarPaso(numero) {
    console.log(`📋 MOSTRAR PASO ${numero} - Iniciando...`);
    
    // Detectar si es móvil para optimizar
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log(`📋 Es móvil: ${isMobile}`);
    
    for (let i = 1; i <= 4; i++) {
        const paso = document.getElementById(`step${i}`);
        console.log(`📋 Procesando paso ${i}, elemento:`, paso);
        
        if (i <= numero) {
            console.log(`📋 Mostrando paso ${i}`);
            paso.style.display = 'block';
            if (isMobile) {
                // En móvil, mostrar inmediatamente sin animaciones
                paso.style.opacity = '1';
                paso.style.transition = 'none';
                console.log(`📋 Paso ${i} configurado para móvil`);
            } else {
                // En PC, usar animaciones
                paso.classList.add('fade-in');
                console.log(`📋 Paso ${i} configurado para PC con animación`);
            }
        } else {
            console.log(`📋 Ocultando paso ${i}`);
            paso.style.display = 'none';
        }
    }
    
    // Verificar el estado final del paso solicitado
    const pasoFinal = document.getElementById(`step${numero}`);
    console.log(`📋 Estado final del paso ${numero}:`, pasoFinal.style.display);
}

function ocultarPaso(numero) {
    for (let i = numero; i <= 4; i++) {
        const paso = document.getElementById(`step${i}`);
        paso.style.display = 'none';
    }
}

async function mostrarSeccionDisponibilidad() {
    console.log('🔍 Ver disponibilidad - Iniciando validación de horarios...');
    
    // Mostrar la sección de disponibilidad
    document.getElementById('disponibilidad').style.display = 'block';
    
    // Cargar canchas en background para validar disponibilidad (sin mostrarlas visualmente)
    if (complejoSeleccionado && tipoCanchaSeleccionado) {
        console.log('🏢 Cargando canchas en background para validar disponibilidad:', complejoSeleccionado.nombre, 'tipo:', tipoCanchaSeleccionado);
        
        try {
            // Cargar canchas sin renderizarlas visualmente
            const fecha = document.getElementById('fechaSelect').value;
            const hora = document.getElementById('horaSelect').value;
            let url = `${API_BASE}/canchas/${complejoSeleccionado.id}/${tipoCanchaSeleccionado}`;
            if (fecha && hora) {
                url += `?fecha=${fecha}&hora=${hora}`;
            }
            const response = await fetch(url);
            canchas = await response.json();
            console.log('🏢 Canchas cargadas para validación:', canchas.length, 'canchas:', canchas.map(c => c.nombre));
            
            // Validar disponibilidad de todos los horarios
            await actualizarHorariosConDisponibilidad();
            
            console.log('✅ Disponibilidad de horarios validada');
        } catch (error) {
            console.error('❌ Error validando disponibilidad:', error);
        }
    }
    
    // Hacer scroll suave a la sección
    document.getElementById('disponibilidad').scrollIntoView({ behavior: 'smooth' });
}

// Funciones de carga de datos
async function cargarCiudades() {
    const maxIntentos = 3;
    let intento = 0;
    
    while (intento < maxIntentos) {
        try {
            intento++;
            console.log(`🔄 Intento ${intento}/${maxIntentos} - Cargando ciudades desde:`, `${API_BASE}/ciudades`);
            
            const response = await fetch(`${API_BASE}/ciudades`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                // Agregar timeout
                signal: AbortSignal.timeout(10000) // 10 segundos timeout
            });
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const ciudadesData = await response.json();
            console.log('🏙️ Ciudades recibidas:', ciudadesData);
            
            if (!Array.isArray(ciudadesData)) {
                throw new Error('Los datos recibidos no son un array de ciudades');
            }
            
            ciudades = ciudadesData;
            
            const select = document.getElementById('ciudadSelect');
            if (!select) {
                throw new Error('No se encontró el elemento select de ciudades');
            }
            
            // Limpiar opciones existentes
            select.innerHTML = '<option value="">Selecciona una ciudad...</option>';
            
            ciudades.forEach(ciudad => {
                const option = document.createElement('option');
                option.value = ciudad.id;
                option.textContent = ciudad.nombre;
                select.appendChild(option);
            });
            
            console.log(`✅ ${ciudades.length} ciudades cargadas exitosamente`);
            
            // Retornar las ciudades para que la función sea awaitable
            return ciudades;
            
        } catch (error) {
            console.error(`❌ Error en intento ${intento}/${maxIntentos} cargando ciudades:`, error);
            console.error('🔗 URL intentada:', `${API_BASE}/ciudades`);
            console.error('🌍 Hostname actual:', window.location.hostname);
            console.error('🔗 API_BASE configurado:', API_BASE);
            
            if (intento < maxIntentos) {
                console.log(`⏳ Esperando 2 segundos antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                // Mostrar error más específico
                let mensajeError = 'Error al cargar las ciudades';
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    mensajeError = 'Error de conexión: No se pudo conectar al servidor';
                } else if (error.message.includes('HTTP error')) {
                    mensajeError = `Error del servidor: ${error.message}`;
                }
                
                mostrarNotificacion(mensajeError, 'danger');
                
                // Retornar array vacío en caso de error
                return [];
            }
        }
    }
}

async function cargarComplejos(ciudadId) {
    const maxIntentos = 3;
    let intento = 0;
    
    while (intento < maxIntentos) {
        try {
            intento++;
            console.log(`🔄 Intento ${intento}/${maxIntentos} - Cargando complejos para ciudad ID:`, ciudadId);
            // logVisible(`🔄 Intento ${intento}/${maxIntentos} - Cargando complejos para ciudad ID: ${ciudadId}`);
            
            const response = await fetch(`${API_BASE}/complejos/${ciudadId}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                // Agregar timeout
                signal: AbortSignal.timeout(10000) // 10 segundos timeout
            });
            
            console.log('📡 Response status:', response.status);
            // logVisible(`📡 Response status: ${response.status}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            complejos = await response.json();
            console.log('🏢 Complejos recibidos:', complejos);
            // logVisible(`🏢 Complejos recibidos: ${complejos.length} complejos`);
            
            if (!Array.isArray(complejos)) {
                throw new Error('Los datos recibidos no son un array de complejos');
            }
            
            const select = document.getElementById('complejoSelect');
            if (!select) {
                throw new Error('No se encontró el elemento select de complejos');
            }
            
            select.innerHTML = '<option value="">Selecciona un complejo...</option>';
            
            complejos.forEach(complejo => {
                const option = document.createElement('option');
                option.value = complejo.id;
                option.textContent = complejo.nombre;
                select.appendChild(option);
            });
            
            console.log('✅ Complejos cargados exitosamente:', complejos.length, 'complejos');
            console.log('📋 Lista de complejos:', complejos.map(c => `${c.nombre} (ID: ${c.id})`));
            
            // Disparar evento personalizado para notificar que los complejos están listos
            const event = new CustomEvent('complejosCargados', { 
                detail: { ciudadId, complejos } 
            });
            document.dispatchEvent(event);
            
            return complejos;
            
        } catch (error) {
            console.error(`❌ Error en intento ${intento}/${maxIntentos} cargando complejos:`, error);
            console.error('🔗 URL intentada:', `${API_BASE}/complejos/${ciudadId}`);
            console.error('🌍 Hostname actual:', window.location.hostname);
            console.error('🔗 API_BASE configurado:', API_BASE);
            
            if (intento < maxIntentos) {
                console.log(`⏳ Esperando 2 segundos antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                // Mostrar error más específico
                let mensajeError = 'Error al cargar los complejos';
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    mensajeError = 'Error de conexión: No se pudo conectar al servidor';
                } else if (error.message.includes('HTTP error')) {
                    mensajeError = `Error del servidor: ${error.message}`;
                }
                
                mostrarNotificacion(mensajeError, 'danger');
                
                // Retornar array vacío en caso de error
                return [];
            }
        }
    }
}

async function cargarCanchas(complejoId, tipo, renderizarVisual = true) {
    console.log('🏟️ === CARGAR CANCHAS INICIADO ===');
    console.log('🏟️ Complejo ID:', complejoId);
    console.log('🏟️ Tipo:', tipo);
    console.log('🏟️ Renderizar visual:', renderizarVisual);
    console.log('🏟️ API_BASE:', API_BASE);
    
    // Verificar que API_BASE esté definido
    if (!API_BASE) {
        console.error('❌ API_BASE no está definido!');
        mostrarNotificacion('Error de configuración: API_BASE no está definido', 'danger');
        return;
    }
    
    try {
        // Para Complejo Demo 3, cargar TODAS las canchas (fútbol y padel)
        let url;
        if (complejoSeleccionado && complejoSeleccionado.nombre === 'Complejo Demo 3') {
            // Cargar todas las canchas del complejo sin filtrar por tipo
            url = `${API_BASE}/canchas/${complejoId}`;
            console.log('🎨 Complejo Demo 3: Cargando TODAS las canchas (fútbol y padel)');
        } else {
            // Para otros complejos, usar el filtro por tipo
            url = `${API_BASE}/canchas/${complejoId}/${tipo}`;
        }
        
        const fecha = document.getElementById('fechaSelect')?.value;
        const hora = document.getElementById('horaSelect')?.value;
        
        // Si hay fecha seleccionada, agregarla como query parameter para obtener precios promocionales
        if (fecha) {
            url += `?fecha=${fecha}`;
            if (hora) {
                url += `&hora=${hora}`;
            }
            console.log('📅 Fecha seleccionada para verificar promociones:', fecha, hora ? `hora: ${hora}` : '');
        }
        
        console.log('🏟️ URL de la petición:', url);
        
        // Agregar headers y configuración de fetch más robusta
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache'
        });
        
        console.log('🏟️ Response status:', response.status);
        console.log('🏟️ Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
        }
        
        canchas = await response.json();
        console.log('🏟️ Canchas recibidas - Detalle completo:', JSON.stringify(canchas, null, 2));
        if (canchas.length > 0) {
            console.log('🏟️ Primera cancha recibida:', {
                id: canchas[0].id,
                nombre: canchas[0].nombre,
                precio_actual: canchas[0].precio_actual,
                precio_hora: canchas[0].precio_hora,
                precio_original: canchas[0].precio_original,
                tiene_promocion: canchas[0].tiene_promocion,
                promocion_info: canchas[0].promocion_info
            });
        }
        
        // Log promociones encontradas
        const canchasConPromocion = canchas.filter(c => c.tiene_promocion);
        if (canchasConPromocion.length > 0) {
            console.log('🎉 Promociones encontradas:', canchasConPromocion.map(c => ({
                cancha: c.nombre,
                precioOriginal: c.precio_original,
                precioPromocional: c.precio_actual,
                descuento: c.promocion_info?.porcentaje_descuento + '%'
            })));
        }
        
        // Solo renderizar visualmente si se solicita
        if (renderizarVisual) {
            await renderizarCanchasConDisponibilidad();
            console.log('🏟️ Canchas renderizadas con disponibilidad');
        } else {
            console.log('🏟️ Canchas cargadas (sin renderizar visualmente)');
        }
        
        // Actualizar horarios con disponibilidad si hay fecha seleccionada
        const fechaActualizada = document.getElementById('fechaSelect').value;
        if (fechaActualizada && complejoSeleccionado) {
            console.log('🕐 Actualizando horarios con disponibilidad optimizada...');
            await actualizarHorariosConDisponibilidad();
        }
        
        console.log('🏟️ === CARGAR CANCHAS COMPLETADO ===');
    } catch (error) {
        console.error('❌ Error en cargarCanchas:', error);
        mostrarNotificacion('Error al cargar las canchas', 'danger');
    }
}

// Actualizar horarios con información de disponibilidad - VERSIÓN OPTIMIZADA
async function actualizarHorariosConDisponibilidad() {
    if (!complejoSeleccionado || !canchas.length) return;
    
    const horaSelect = document.getElementById('horaSelect');
    let fecha = document.getElementById('fechaSelect').value;
    
    // Si no hay fecha seleccionada, usar fecha actual - CORREGIDO PARA ZONA HORARIA DE CHILE
    if (!fecha) {
        const fechaActual = new Date().toLocaleDateString('en-CA', {
            timeZone: 'America/Santiago'
        });
        fecha = fechaActual;
        console.log('📅 Usando fecha actual por defecto:', fechaActual, 'Zona horaria: America/Santiago');
        console.log('📅 No hay fecha seleccionada, usando fecha actual:', fecha);
    }
    
    // Obtener todas las opciones actuales
    const opcionesActuales = Array.from(horaSelect.options);
    console.log('🕐 Validando disponibilidad para', opcionesActuales.length, 'horarios en fecha:', fecha);
    
    // NUEVA LÓGICA OPTIMIZADA: Obtener disponibilidad completa de una vez
    console.log('🚀 Usando método optimizado para verificar disponibilidad...');
    const disponibilidadCompleta = await verificarDisponibilidadCompleta(complejoSeleccionado.id, fecha);
    
    // Guardar datos en variable global para uso posterior en renderizado
    window.disponibilidadCompleta = disponibilidadCompleta;
    console.log('💾 Datos de disponibilidad guardados en window.disponibilidadCompleta');
    
    for (const option of opcionesActuales) {
        if (option.value && option.value !== '') {
            console.log('🕐 Verificando horario:', option.value);
            
            // Verificar si todas las canchas están ocupadas usando datos precargados
            let todasOcupadas = true;
            for (const cancha of canchas) {
                const estaDisponible = verificarDisponibilidadCanchaOptimizada(cancha.id, option.value, disponibilidadCompleta);
                console.log('🏟️ Cancha', cancha.id, '(', cancha.nombre, ') - Disponible:', estaDisponible);
                if (estaDisponible) {
                    todasOcupadas = false;
                    break;
                }
            }
            
            console.log('🕐 Horario', option.value, '- Todas ocupadas:', todasOcupadas);
            
            if (todasOcupadas) {
                option.textContent = `${option.value} (Todas ocupadas)`;
                option.classList.add('hora-todas-ocupadas');
                option.style.textDecoration = 'line-through';
                option.style.color = '#dc3545';
                console.log('✅ Marcado como ocupado:', option.value);
            } else {
                option.textContent = option.value;
                option.classList.remove('hora-todas-ocupadas');
                option.style.textDecoration = '';
                option.style.color = '';
                console.log('✅ Marcado como disponible:', option.value);
            }
        }
    }
}

// Cargar horarios específicos según el complejo
async function cargarHorariosComplejo(complejo) {
    const horaSelect = document.getElementById('horaSelect');
    horaSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
    
    let horarios = [];

    // Definir horarios según el complejo
    // IMPORTANTE: Borde Río debe estar PRIMERO para tener prioridad sobre "Complejo En Desarrollo"
    const complejoIdNum = parseInt(complejo.id);
    if (complejo.nombre === 'Espacio Deportivo Borde Río' || complejoIdNum === 6 || complejoIdNum === 7) {
        // Espacio Deportivo Borde Río: 10:00-00:00 (medianoche) todos los días
        // Detectar por nombre o por ID (6 en desarrollo, 7 en producción)
        console.log(`🏟️ Espacio Deportivo Borde Río detectado (ID: ${complejo.id}, Nombre: ${complejo.nombre}) - Horarios: 10:00-00:00 todos los días`);
        horarios = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];
    } else if (complejo.nombre === 'Complejo En Desarrollo') {
        // Complejo En Desarrollo: 16:00-23:00 entre semana, 12:00-23:00 fines de semana
        // Verificar la fecha actual para cargar los horarios correctos
        const fecha = document.getElementById('fechaSelect').value;
        if (fecha) {
            // CORREGIDO: Usar fecha local para evitar problemas de zona horaria
            const [año, mes, dia] = fecha.split('-').map(Number);
            const fechaObj = new Date(año, mes - 1, dia);
            const diaSemana = fechaObj.getDay(); // 0 = domingo, 6 = sábado

            console.log('Complejo En Desarrollo - Fecha:', fecha, 'Día de semana:', diaSemana, 'Día nombre:', ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana]);

            if (diaSemana === 0 || diaSemana === 6) {
                // Fines de semana: 12:00-23:00
                console.log('Cargando horarios de fin de semana (12:00-23:00)');
                horarios = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
            } else {
                // Lunes a viernes: 16:00-23:00
                console.log('Cargando horarios de lunes a viernes (16:00-23:00)');
                horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
            }
        } else {
            // Si no hay fecha seleccionada, usar horarios de lunes a viernes por defecto
            console.log('No hay fecha seleccionada, usando horarios de lunes a viernes por defecto');
            horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
        }
    } else if (complejo.nombre === 'Fundación Gunnen') {
        // Fundación Gunnen: 14:00-22:00 entre semana, 10:00-22:00 fines de semana
        const fecha = document.getElementById('fechaSelect').value;
        if (fecha) {
            const [año, mes, dia] = fecha.split('-').map(Number);
            const fechaObj = new Date(año, mes - 1, dia);
            const diaSemana = fechaObj.getDay(); // 0 = domingo, 6 = sábado
            
            console.log('Fundación Gunnen - Fecha:', fecha, 'Día de semana:', diaSemana, 'Día nombre:', ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana]);
            
            if (diaSemana === 0 || diaSemana === 6) {
                // Fines de semana: 10:00-22:00
                console.log('Cargando horarios de fin de semana (10:00-22:00)');
                horarios = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
            } else {
                // Lunes a viernes: 14:00-22:00
                console.log('Cargando horarios de lunes a viernes (14:00-22:00)');
                horarios = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
            }
        } else {
            // Si no hay fecha seleccionada, usar horarios de lunes a viernes por defecto
            console.log('No hay fecha seleccionada, usando horarios de lunes a viernes por defecto');
            horarios = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
        }
    } else if (complejo.nombre === 'Complejo Demo 1') {
        // Complejo Demo 1: 10:00-22:00 todos los días
        console.log('Complejo Demo 1 - Horarios: 10:00-22:00 todos los días');
        horarios = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
    } else if (complejo.nombre === 'Complejo Demo 3') {
        // Complejo Demo 3: 16:00-23:00 todos los días
        console.log('Complejo Demo 3 - Horarios: 16:00-23:00 todos los días');
        horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
    } else {
        // Otros complejos: horario estándar
        horarios = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
    }
    
    // Verificar disponibilidad de cada horario si hay fecha seleccionada
    const fecha = document.getElementById('fechaSelect').value;
    if (fecha) {
        // NUEVA LÓGICA OPTIMIZADA: Obtener disponibilidad completa de una vez
        // Esto funciona incluso si las canchas no están cargadas aún
        console.log('🚀 Cargando horarios con método optimizado (con o sin canchas cargadas)...');
        
        try {
            const disponibilidadCompleta = await verificarDisponibilidadCompleta(complejo.id, fecha);
            console.log('✅ Disponibilidad obtenida para', Object.keys(disponibilidadCompleta).length, 'canchas');
            
            for (const hora of horarios) {
                const option = document.createElement('option');
                option.value = hora;
                
                // Verificar si todas las canchas están ocupadas usando datos precargados
                let todasOcupadas = true;
                let canchasVerificadas = 0;
                
                // Si hay canchas cargadas, usar la lista de canchas
                if (canchas.length > 0) {
                    for (const cancha of canchas) {
                        const estaDisponible = verificarDisponibilidadCanchaOptimizada(cancha.id, hora, disponibilidadCompleta);
                        canchasVerificadas++;
                        if (estaDisponible) {
                            todasOcupadas = false;
                            break;
                        }
                    }
                } else {
                    // Si no hay canchas cargadas, verificar todas las canchas del complejo desde la disponibilidad
                    for (const canchaId in disponibilidadCompleta) {
                        const estaDisponible = verificarDisponibilidadCanchaOptimizada(parseInt(canchaId), hora, disponibilidadCompleta);
                        canchasVerificadas++;
                        if (estaDisponible) {
                            todasOcupadas = false;
                            break;
                        }
                    }
                }
                
                console.log('🕐 Horario', hora, '- Canchas verificadas:', canchasVerificadas, '- Todas ocupadas:', todasOcupadas);
                
                if (todasOcupadas && canchasVerificadas > 0) {
                    option.textContent = `${hora} (Todas ocupadas)`;
                    option.classList.add('hora-todas-ocupadas');
                    option.style.textDecoration = 'line-through';
                    option.style.color = '#dc3545';
                } else {
                    option.textContent = hora;
                }
                
                horaSelect.appendChild(option);
            }
        } catch (error) {
            console.error('❌ Error obteniendo disponibilidad, cargando horarios básicos:', error);
            // Fallback: cargar horarios básicos si hay error
            horarios.forEach(hora => {
                const option = document.createElement('option');
                option.value = hora;
                option.textContent = hora;
                horaSelect.appendChild(option);
            });
        }
    } else {
        // Si no hay fecha, cargar horarios normalmente (sin filtro de tiempo)
        horarios.forEach(hora => {
            const option = document.createElement('option');
            option.value = hora;
            option.textContent = hora;
            horaSelect.appendChild(option);
        });
    }
    
    // Aplicar filtro de tiempo si hay fecha seleccionada
    if (fecha) {
        const opcionesActuales = Array.from(horaSelect.options);
        const opcionesFiltradas = opcionesActuales.filter(option => {
            if (!option.value || option.value === '') return true; // Mantener opción vacía
            
            const esDisponible = esHoraDisponibleParaReserva(option.value, fecha);
            if (!esDisponible) {
                console.log('⏰ cargarHorariosComplejo - Hora filtrada (ya pasó o muy próxima):', option.value);
            }
            return esDisponible;
        });
        
        // Si se filtraron opciones, actualizar el select
        if (opcionesFiltradas.length !== opcionesActuales.length) {
            horaSelect.innerHTML = '';
            opcionesFiltradas.forEach(option => {
                horaSelect.appendChild(option);
            });
            console.log('⏰ cargarHorariosComplejo - Horarios filtrados por hora actual');
        }
    }
}

// NUEVA FUNCIÓN: Cargar horarios básicos sin verificar disponibilidad
async function cargarHorariosBasicos() {
    console.log('🚀 cargarHorariosBasicos - INICIANDO...');
    
    if (!complejoSeleccionado) {
        console.log('❌ cargarHorariosBasicos - No hay complejo seleccionado');
        return;
    }
    
    const horaSelect = document.getElementById('horaSelect');
    if (!horaSelect) {
        console.log('❌ cargarHorariosBasicos - No se encontró horaSelect');
        return;
    }
    
    console.log('🚀 cargarHorariosBasicos - Complejo:', complejoSeleccionado.nombre);
    
    // Determinar horarios según el complejo y día de la semana
    let horarios = [];
    const fecha = document.getElementById('fechaSelect').value;
    
    if (complejoSeleccionado.nombre === 'Complejo En Desarrollo') {
        if (fecha) {
            // CORREGIDO: Usar fecha local para evitar problemas de zona horaria
            const [año, mes, dia] = fecha.split('-').map(Number);
            const fechaObj = new Date(año, mes - 1, dia);
            const diaSemana = fechaObj.getDay(); // 0 = domingo, 6 = sábado
            
            if (diaSemana === 0 || diaSemana === 6) {
                // Fines de semana: 12:00-23:00
                horarios = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
            } else {
                // Lunes a viernes: 16:00-23:00
                horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
            }
        } else {
            // Si no hay fecha, usar horarios de lunes a viernes por defecto
            horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
        }
    } else if (complejoSeleccionado.nombre === 'Fundación Gunnen') {
        if (fecha) {
            const [año, mes, dia] = fecha.split('-').map(Number);
            const fechaObj = new Date(año, mes - 1, dia);
            const diaSemana = fechaObj.getDay(); // 0 = domingo, 6 = sábado
            
            if (diaSemana === 0 || diaSemana === 6) {
                // Fines de semana: 10:00-22:00
                horarios = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
            } else {
                // Lunes a viernes: 14:00-22:00
                horarios = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
            }
        } else {
            // Si no hay fecha, usar horarios de lunes a viernes por defecto
            horarios = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
        }
    } else if (complejoSeleccionado.nombre === 'Complejo Demo 1') {
        // Complejo Demo 1: 10:00-22:00 todos los días
        horarios = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
    } else if (complejoSeleccionado.nombre === 'Complejo Demo 3') {
        // Complejo Demo 3: 16:00-23:00 todos los días
        horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
    } else {
        // Otros complejos: horario estándar
        horarios = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
    }
    
    console.log('🚀 cargarHorariosBasicos - Horarios a cargar:', horarios);
    
    // Filtrar horarios según la hora actual (si es el día de hoy)
    if (fecha) {
        const horariosFiltrados = horarios.filter(hora => {
            const esDisponible = esHoraDisponibleParaReserva(hora, fecha);
            if (!esDisponible) {
                console.log('⏰ Hora filtrada (ya pasó o muy próxima):', hora);
            }
            return esDisponible;
        });
        
        horarios = horariosFiltrados;
        console.log('🚀 cargarHorariosBasicos - Horarios filtrados por hora actual:', horarios);
        
        // Si no hay horarios disponibles, mostrar mensaje
        if (horarios.length === 0) {
            console.log('⚠️ No hay horarios disponibles para hoy');
            horaSelect.innerHTML = '<option value="">No hay horarios disponibles para hoy</option>';
            return;
        }
    }
    
    // Limpiar horarios actuales
    horaSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
    
    // Cargar horarios básicos
    horarios.forEach(hora => {
        const option = document.createElement('option');
        option.value = hora;
        option.textContent = hora;
        horaSelect.appendChild(option);
    });
    
    // Si hay fecha seleccionada, verificar disponibilidad automáticamente
    if (fecha) {
        console.log('🚀 cargarHorariosBasicos - Verificando disponibilidad automáticamente...');
        setTimeout(async () => {
            await actualizarHorariosConDisponibilidad();
        }, 100);
    }
    
    console.log('✅ cargarHorariosBasicos - COMPLETADO exitosamente');
}

// NUEVA FUNCIÓN: Cargar horarios con disponibilidad inmediatamente cuando se muestra el paso 4
async function cargarHorariosConDisponibilidadInmediata() {
    console.log('🚀 cargarHorariosConDisponibilidadInmediata - INICIANDO...');
    
    if (!complejoSeleccionado) {
        console.log('❌ cargarHorariosConDisponibilidadInmediata - No hay complejo seleccionado');
        return;
    }
    
    const fecha = document.getElementById('fechaSelect').value;
    if (!fecha) {
        console.log('❌ cargarHorariosConDisponibilidadInmediata - No hay fecha seleccionada');
        return;
    }
    
    const horaSelect = document.getElementById('horaSelect');
    if (!horaSelect) {
        console.log('❌ cargarHorariosConDisponibilidadInmediata - No se encontró horaSelect');
        return;
    }
    
    console.log('🚀 cargarHorariosConDisponibilidadInmediata - Complejo:', complejoSeleccionado.nombre, 'Fecha:', fecha);
    
    // Determinar horarios según el complejo y día
    // CORREGIDO: Usar fecha local para evitar problemas de zona horaria
    const [año, mes, dia] = fecha.split('-').map(Number);
    const fechaObj = new Date(año, mes - 1, dia);
    const diaSemana = fechaObj.getDay(); // 0 = domingo, 6 = sábado
    let horarios = [];
    
    if (complejoSeleccionado.nombre === 'Complejo En Desarrollo') {
        if (diaSemana === 0 || diaSemana === 6) {
            // Fines de semana: 12:00-23:00
            horarios = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
        } else {
            // Lunes a viernes: 16:00-23:00
            horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
        }
    } else if (complejoSeleccionado.nombre === 'Fundación Gunnen') {
        if (diaSemana === 0 || diaSemana === 6) {
            // Fines de semana: 10:00-22:00
            horarios = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
        } else {
            // Lunes a viernes: 14:00-22:00
            horarios = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
        }
    } else if (complejoSeleccionado.nombre === 'Complejo Demo 1') {
        // Complejo Demo 1: 10:00-22:00 todos los días
        horarios = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
    } else if (complejoSeleccionado.nombre === 'Complejo Demo 3') {
        // Complejo Demo 3: 16:00-23:00 todos los días
        horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
    } else {
        // Otros complejos: horario estándar
        horarios = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
    }
    
    console.log('🚀 cargarHorariosConDisponibilidadInmediata - Horarios a verificar:', horarios);
    
    try {
        // Obtener disponibilidad completa
        console.log('🚀 cargarHorariosConDisponibilidadInmediata - Llamando a verificarDisponibilidadCompleta...');
        const disponibilidadCompleta = await verificarDisponibilidadCompleta(complejoSeleccionado.id, fecha);
        console.log('✅ cargarHorariosConDisponibilidadInmediata - Disponibilidad obtenida para', Object.keys(disponibilidadCompleta).length, 'canchas');
        
        // Guardar datos en variable global para uso posterior en renderizado
        window.disponibilidadCompleta = disponibilidadCompleta;
        console.log('💾 cargarHorariosConDisponibilidadInmediata - Datos guardados en window.disponibilidadCompleta');
        
        // Limpiar horarios actuales
        horaSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
        
        // Cargar cada horario con verificación de disponibilidad
        // USAR LA MISMA LÓGICA QUE actualizarHorariosConDisponibilidad
        for (const hora of horarios) {
            const option = document.createElement('option');
            option.value = hora;
            
            // Verificar si todas las canchas están ocupadas usando datos precargados
            let todasOcupadas = true;
            let canchasVerificadas = 0;
            
            // Verificar todas las canchas del complejo desde la disponibilidad
            for (const canchaId in disponibilidadCompleta) {
                const estaDisponible = verificarDisponibilidadCanchaOptimizada(parseInt(canchaId), hora, disponibilidadCompleta);
                canchasVerificadas++;
                console.log('🏟️ cargarHorariosConDisponibilidadInmediata - Cancha', canchaId, '- Disponible:', estaDisponible);
                if (estaDisponible) {
                    todasOcupadas = false;
                    break;
                }
            }
            
            console.log('🕐 cargarHorariosConDisponibilidadInmediata - Horario', hora, '- Canchas verificadas:', canchasVerificadas, '- Todas ocupadas:', todasOcupadas);
            
            if (todasOcupadas && canchasVerificadas > 0) {
                option.textContent = `${hora} (Todas ocupadas)`;
                option.classList.add('hora-todas-ocupadas');
                option.style.textDecoration = 'line-through';
                option.style.color = '#dc3545';
                console.log('✅ cargarHorariosConDisponibilidadInmediata - Marcado como ocupado:', hora);
            } else {
                option.textContent = hora;
                option.classList.remove('hora-todas-ocupadas');
                option.style.textDecoration = '';
                option.style.color = '';
                console.log('✅ cargarHorariosConDisponibilidadInmediata - Marcado como disponible:', hora);
            }
            
            horaSelect.appendChild(option);
        }
        
        console.log('✅ cargarHorariosConDisponibilidadInmediata - COMPLETADO exitosamente');
        
    } catch (error) {
        console.error('❌ cargarHorariosConDisponibilidadInmediata - Error:', error);
        console.error('❌ cargarHorariosConDisponibilidadInmediata - Error details:', error.message);
        
        // Fallback: cargar horarios básicos con filtro de tiempo
        horaSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
        
        // Filtrar horarios según la hora actual
        const horariosFiltrados = horarios.filter(hora => {
            const esDisponible = esHoraDisponibleParaReserva(hora, fecha);
            if (!esDisponible) {
                console.log('⏰ cargarHorariosConDisponibilidadInmediata - Hora filtrada (ya pasó o muy próxima):', hora);
            }
            return esDisponible;
        });
        
        horariosFiltrados.forEach(hora => {
            const option = document.createElement('option');
            option.value = hora;
            option.textContent = hora;
            horaSelect.appendChild(option);
        });
    }
}

// Validar horarios según la fecha seleccionada
async function validarHorariosSegunFecha() {
    if (!complejoSeleccionado) return;
    
    const fecha = document.getElementById('fechaSelect').value;
    if (!fecha) return;
    
    // CORREGIDO: Usar fecha local para evitar problemas de zona horaria
    const [año, mes, dia] = fecha.split('-').map(Number);
    const fechaObj = new Date(año, mes - 1, dia);
    const diaSemana = fechaObj.getDay(); // 0 = domingo, 6 = sábado
    const horaSelect = document.getElementById('horaSelect');
    const horaSeleccionada = horaSelect.value;
    
    console.log('ValidarHorarios - Fecha:', fecha, 'Día de semana:', diaSemana, 'Día nombre:', ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana]);
    
    // Limpiar selección actual si no es válida
    if (horaSeleccionada) {
        let horariosValidos = [];
        
        if (complejoSeleccionado.nombre === 'Complejo En Desarrollo') {
            if (diaSemana === 0 || diaSemana === 6) {
                // Fines de semana: 12:00-23:00
                horariosValidos = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
            } else {
                // Entre semana: 16:00-23:00
                horariosValidos = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
            }
        } else if (complejoSeleccionado.nombre === 'Complejo Demo 1') {
            // Complejo Demo 1: 10:00-22:00 todos los días
            horariosValidos = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
        } else if (complejoSeleccionado.nombre === 'Complejo Demo 3') {
            // Complejo Demo 3: 16:00-23:00 todos los días
            horariosValidos = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
        } else {
            // Otros complejos: horario estándar
            horariosValidos = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
        }
        
        if (!horariosValidos.includes(horaSeleccionada)) {
            horaSelect.value = '';
            mostrarNotificacion('El horario seleccionado no está disponible para esta fecha', 'warning');
        }
    }
    
    // Actualizar opciones disponibles según el día
    if (complejoSeleccionado.nombre === 'Complejo En Desarrollo') {
        console.log('🚀 validarHorariosSegunFecha - Complejo En Desarrollo detectado, cargando horarios básicos...');
        
        // Cargar horarios básicos primero, la disponibilidad se verificará después
        await cargarHorariosBasicos();
    } else {
        // Otros complejos: cargar horarios estándar
        cargarHorariosComplejo(complejoSeleccionado);
    }
}

// NUEVA FUNCIÓN: Renderizar canchas con disponibilidad correcta
async function renderizarCanchasConDisponibilidad() {
    const grid = document.getElementById('canchasGrid');
    if (!grid) {
        console.error('❌ No se encontró el elemento canchasGrid');
        return;
    }
    grid.innerHTML = '';
    
    const fecha = document.getElementById('fechaSelect').value;
    const hora = document.getElementById('horaSelect').value;
    
    // Si es Complejo En Desarrollo, Fundación Gunnen, Espacio Deportivo Borde Río, Complejo Demo 1, Complejo Demo 3 o Punto Soccer, crear estructura especial horizontal
    console.log('🔍 DEBUG: Verificando renderizado especial para:', complejoSeleccionado?.nombre);
    if (complejoSeleccionado && (complejoSeleccionado.nombre === 'Complejo En Desarrollo' || complejoSeleccionado.nombre === 'Fundación Gunnen' || complejoSeleccionado.nombre === 'Espacio Deportivo Borde Río' || complejoSeleccionado.nombre === 'Complejo Demo 1' || complejoSeleccionado.nombre === 'Complejo Demo 3' || complejoSeleccionado.nombre.includes('Punto Soccer'))) {
        console.log(`🎨 Renderizando ${complejoSeleccionado.nombre} con`, canchas.length, 'canchas');
        
        // Determinar si es techado o al aire libre
        const esTechado = complejoSeleccionado.nombre === 'Complejo En Desarrollo';
        const nombreCalle = complejoSeleccionado.nombre === 'Complejo En Desarrollo' ? 'MONTE PERDIDO' : 
                           complejoSeleccionado.nombre === 'Fundación Gunnen' ? 'DON VICTOR' : 
                           complejoSeleccionado.nombre === 'Complejo Demo 1' ? 'CALLE DEMO' :
                           complejoSeleccionado.nombre === 'Complejo Demo 3' ? 'AV. RICARDO VICUÑA' :
                           complejoSeleccionado.nombre.includes('Punto Soccer') ? 'CAMINO CERRO COLORADO' :
                           'RUTA Q-575';
        
        // Crear contenedor (galpón para Complejo En Desarrollo, complejo-abierto para Fundación Gunnen y Espacio Deportivo Borde Río)
        const galponContainer = document.createElement('div');
        galponContainer.className = esTechado ? 'galpon-container' : 'complejo-abierto-container';
        
        // Agregar nombre del complejo como atributo data para CSS dinámico
        if (!esTechado) {
            // Evitar duplicar la palabra "COMPLEJO" si ya está en el nombre
            const nombreComplejo = complejoSeleccionado.nombre.toUpperCase();
            const tituloComplejo = nombreComplejo.startsWith('COMPLEJO ') ? nombreComplejo : `COMPLEJO ${nombreComplejo}`;
            galponContainer.setAttribute('data-complejo', tituloComplejo);
        }

        // Crear calle (Monte Perdido, Don Victor o Ruta Q-575) - se agregará DESPUÉS del contenedor
        const calle = document.createElement('div');
        calle.className = 'calle-complejo';
        calle.setAttribute('data-calle', nombreCalle);
        // NO agregamos la calle al galponContainer aquí

        // Crear contenedor horizontal para las canchas
        const canchasHorizontales = document.createElement('div');
        canchasHorizontales.className = 'canchas-horizontales';
        
        // Ordenar canchas según el complejo
        let canchasOrdenadas = [...canchas];
        if (complejoSeleccionado.nombre === 'Complejo En Desarrollo' || complejoSeleccionado.nombre === 'Fundación Gunnen' || complejoSeleccionado.nombre === 'Complejo Demo 1') {
            canchasOrdenadas = canchasOrdenadas.sort((a, b) => {
                const numeroA = parseInt(a.nombre.match(/\d+/)[0]);
                const numeroB = parseInt(b.nombre.match(/\d+/)[0]);
                return numeroA - numeroB;
            });
        } else if (complejoSeleccionado.nombre === 'Complejo Demo 3') {
            // Orden especial para Demo 3: Fútbol primero, luego Padel
            canchasOrdenadas = canchasOrdenadas.sort((a, b) => {
                if (a.tipo !== b.tipo) {
                    return a.tipo === 'futbol' ? -1 : 1;
                }
                const numeroA = parseInt(a.nombre.match(/\d+/)[0]);
                const numeroB = parseInt(b.nombre.match(/\d+/)[0]);
                return numeroA - numeroB;
            });
        }
        
        // Renderizado especial para Complejo Demo 3 - NUEVO DISEÑO CON 2 LAYOUTS
        if (complejoSeleccionado.nombre === 'Complejo Demo 3') {
            console.log('🎨 Renderizando Complejo Demo 3 con 2 layouts...');
            console.log('🎨 Total de canchas:', canchasOrdenadas.length);
            console.log('🎨 Canchas disponibles:', canchasOrdenadas);
            
            // Crear contenedor principal
            const demo3Container = document.createElement('div');
            demo3Container.className = 'demo3-container';
            console.log('🎨 Contenedor Demo 3 creado');
            
            // Crear Layout 1: Cancha 1, Cancha 2, Cancha Pádel
            const layout1 = document.createElement('div');
            layout1.className = 'demo3-layout-1';
            
            // Crear Layout 2: Cancha 3
            const layout2 = document.createElement('div');
            layout2.className = 'demo3-layout-2';
            
            // Variables para almacenar las canchas
            let cancha1 = null;
            let cancha2 = null;
            let canchaPadel = null;
            let cancha3 = null;
            
            // Crear canchas y asignar a contenedores específicos
            for (const cancha of canchasOrdenadas) {
                console.log(`🎨 Procesando cancha: ${cancha.nombre} (ID: ${cancha.id}, Tipo: ${cancha.tipo})`);
                console.log(`🔍 Verificando ID ${cancha.id} para Cancha 3:`, cancha.id === 8 || cancha.id === 13);
                
                const canchaCard = await crearCanchaCard(cancha, fecha, hora);
                canchaCard.setAttribute('data-tipo', cancha.tipo); // Para colores dinámicos
                console.log(`🎨 Tarjeta de cancha creada para: ${cancha.nombre}`);
                
                // Determinar si la cancha debe estar en gris (no seleccionada)
                const esTipoSeleccionado = (tipoCanchaSeleccionado === 'futbol' && cancha.tipo === 'futbol') || 
                                         (tipoCanchaSeleccionado === 'padel' && cancha.tipo === 'padel');
                
                if (!esTipoSeleccionado) {
                    canchaCard.classList.add('no-seleccionada');
                    canchaCard.style.pointerEvents = 'none';
                    console.log(`🎨 Cancha ${cancha.nombre} marcada como no seleccionada`);
                }
                
                // Asignar a layout según ID
                // IDs locales: 11, 12, 13, 14, 15
                // IDs producción: 6, 7, 8, 9, 10
                if (cancha.id === 6 || cancha.id === 11) { // Cancha 1 Fútbol
                    cancha1 = canchaCard;
                    console.log(`🎨 Cancha 1 Fútbol asignada`);
                } else if (cancha.id === 7 || cancha.id === 12) { // Cancha 2 Fútbol
                    cancha2 = canchaCard;
                    console.log(`🎨 Cancha 2 Fútbol asignada`);
                } else if (cancha.id === 8 || cancha.id === 13) { // Cancha 3 Fútbol (horizontal)
                    cancha3 = canchaCard;
                    cancha3.classList.add('demo3-cancha-horizontal');
                    console.log(`🎨 Cancha 3 Fútbol asignada`);
                } else if (cancha.id === 9 || cancha.id === 14) { // Cancha 1 Padel
                    canchaPadel = canchaCard;
                    console.log(`🎨 Cancha Pádel asignada`);
                } else if (cancha.id === 10 || cancha.id === 15) { // Cancha 2 Padel - IGNORAR
                    console.log(`🎨 Cancha ${cancha.nombre} (ID: ${cancha.id}) ignorada - solo renderizamos 1 cancha de padel`);
                } else {
                    console.warn(`⚠️ Cancha ${cancha.nombre} (ID: ${cancha.id}) no fue asignada a ningún layout`);
                }
                // Eliminado: Cancha 2 Padel (IDs 10 y 15) - ya no se renderiza
            }
            
            // Agregar canchas a Layout 1: Cancha 1, Cancha 2, Cancha Pádel
            if (cancha1) layout1.appendChild(cancha1);
            if (cancha2) layout1.appendChild(cancha2);
            if (canchaPadel) layout1.appendChild(canchaPadel);
            
            // Agregar Cancha 3 a Layout 2
            if (cancha3) layout2.appendChild(cancha3);
            
            // Agregar layouts al contenedor principal
            demo3Container.appendChild(layout1);
            demo3Container.appendChild(layout2);
            
            // Configurar colores dinámicos
            demo3Container.setAttribute('data-tipo-seleccionado', tipoCanchaSeleccionado || 'futbol');
            
            // Agregar el contenedor principal al DOM
            canchasHorizontales.appendChild(demo3Container);
            console.log('🎨 demo3Container con 2 layouts agregado exitosamente');
        } else if (complejoSeleccionado.nombre && complejoSeleccionado.nombre.includes('Punto Soccer')) {
            // Renderizado especial para Punto Soccer - Estilo Demo 3
            console.log('🎨 Renderizando Punto Soccer estilo Demo 3...');
            console.log('🎨 DEBUG: complejoSeleccionado.nombre =', complejoSeleccionado.nombre);
            console.log('🎨 DEBUG: Comparación includes Punto Soccer:', complejoSeleccionado.nombre.includes('Punto Soccer'));

            const puntoSoccerContainer = document.createElement('div');
            puntoSoccerContainer.className = 'punto-soccer-container';

            // LAYOUT IZQUIERDO: 2 Canchas verticales
            const layoutCanchas = document.createElement('div');
            layoutCanchas.className = 'punto-soccer-layout-canchas';

            // LAYOUT DERECHO: Camarines (arriba) y Quincho (abajo)
            const layoutServicios = document.createElement('div');
            layoutServicios.className = 'punto-soccer-layout-servicios';

            // Crear cuadro de Camarines
            const camarinesBox = document.createElement('div');
            camarinesBox.className = 'punto-soccer-camarines';
            camarinesBox.innerHTML = `
                <div class="servicio-box" style="background: white !important; width: 100px !important; height: 100px !important; border-radius: 15px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important; display: flex !important; align-items: center !important; justify-content: center !important; position: relative !important; border: 3px solid #ff9800 !important; margin-bottom: 10px !important;">
                    <div class="servicio-letter" style="font-size: 3rem !important; font-weight: bold !important; color: #ff9800 !important; margin: 0 !important; padding: 0 !important;">C</div>
                    <div class="servicio-info-icon" onclick="mostrarInfoCamarines()" style="position: absolute !important; bottom: -5px !important; right: -5px !important; background: #4caf50 !important; color: white !important; width: 30px !important; height: 30px !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important; font-size: 0.9rem !important;">
                        <i class="fas fa-info-circle"></i>
                    </div>
                </div>
                <div class="servicio-label" style="font-weight: bold !important; color: #2e7d32 !important; font-size: 0.95rem !important; text-align: center !important; margin: 0 !important;">Camarines</div>
            `;

            // Crear cuadro de Quincho
            const quinchoBox = document.createElement('div');
            quinchoBox.className = 'punto-soccer-quincho';
            quinchoBox.innerHTML = `
                <div class="servicio-box" style="background: white !important; width: 100px !important; height: 100px !important; border-radius: 15px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important; display: flex !important; align-items: center !important; justify-content: center !important; position: relative !important; border: 3px solid #e91e63 !important; margin-bottom: 10px !important;">
                    <div class="servicio-letter" style="font-size: 3rem !important; font-weight: bold !important; color: #e91e63 !important; margin: 0 !important; padding: 0 !important;">Q</div>
                    <div class="servicio-info-icon" onclick="mostrarInfoQuincho()" style="position: absolute !important; bottom: -5px !important; right: -5px !important; background: #4caf50 !important; color: white !important; width: 30px !important; height: 30px !important; border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important; font-size: 0.9rem !important;">
                        <i class="fas fa-info-circle"></i>
                    </div>
                </div>
                <div class="servicio-label" style="font-weight: bold !important; color: #2e7d32 !important; font-size: 0.95rem !important; text-align: center !important; margin: 0 !important;">Quincho</div>
            `;

            // Agregar camarines y quincho al layout servicios
            layoutServicios.appendChild(camarinesBox);
            layoutServicios.appendChild(quinchoBox);

            // Agregar canchas al layout canchas
            for (const cancha of canchasOrdenadas) {
                const canchaCard = await crearCanchaCard(cancha, fecha, hora);

                // Agregar indicador de techada si aplica
                if (cancha.nombre && cancha.nombre.includes('Cancha 2')) {
                    canchaCard.classList.add('punto-soccer-techada');

                    // Agregar badge de TECHADA
                    const badgeTechada = document.createElement('div');
                    badgeTechada.style.cssText = 'position: absolute; top: 10px; right: 10px; background: #2196f3; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3); z-index: 10;';
                    badgeTechada.innerHTML = '<i class="fas fa-warehouse" style="margin-right: 5px;"></i>TECHADA';
                    canchaCard.style.position = 'relative';
                    canchaCard.insertBefore(badgeTechada, canchaCard.firstChild);
                }

                layoutCanchas.appendChild(canchaCard);
            }

            // Agregar layouts al contenedor principal
            puntoSoccerContainer.appendChild(layoutCanchas);
            puntoSoccerContainer.appendChild(layoutServicios);

            // Agregar al contenedor horizontal
            canchasHorizontales.appendChild(puntoSoccerContainer);

            // Crear calle CAMINO CERRO COLORADO específica para Punto Soccer
            const calleCerroColorado = document.createElement('div');
            calleCerroColorado.className = 'calle-cerro-colorado-punto-soccer';
            calleCerroColorado.innerHTML = '<span style="writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg);">CAMINO CERRO COLORADO</span>';
            calleCerroColorado.style.cssText = `
                position: absolute;
                right: -90px;
                top: 0;
                bottom: 0;
                width: 70px;
                background: linear-gradient(90deg, #555 0%, #777 50%, #555 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 0.8rem;
                text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.7);
                box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
                letter-spacing: 2px;
                border: 2px solid #999;
                z-index: 1000;
                pointer-events: none;
            `;

            // Agregar la calle al contenedor padre (galponContainer)
            galponContainer.style.position = 'relative';
            galponContainer.style.overflow = 'visible';
            galponContainer.appendChild(calleCerroColorado);

            console.log('🎨 Punto Soccer renderizado con 2 layouts (canchas + servicios)');
            console.log('🛣️ Calle Cerro Colorado agregada');
            console.log('🔍 DEBUG - Punto Soccer Container:', puntoSoccerContainer);
            console.log('🔍 DEBUG - Layout Canchas:', layoutCanchas);
            console.log('🔍 DEBUG - Layout Servicios:', layoutServicios);
            console.log('🔍 DEBUG - Computed display:', window.getComputedStyle(puntoSoccerContainer).display);
            console.log('🔍 DEBUG - Computed grid-template-columns:', window.getComputedStyle(puntoSoccerContainer).gridTemplateColumns);
        } else {
            // Renderizado normal para otros complejos
            console.log('🎨 DEBUG: Usando renderizado normal para:', complejoSeleccionado?.nombre);
            for (const cancha of canchasOrdenadas) {
                const canchaCard = await crearCanchaCard(cancha, fecha, hora);
                canchasHorizontales.appendChild(canchaCard);
            }
        }
        
        // Función auxiliar para crear tarjetas de cancha
        async function crearCanchaCard(cancha, fecha, hora) {
            const canchaCard = document.createElement('div');
            canchaCard.dataset.canchaId = cancha.id;
            canchaCard.dataset.precio = cancha.precio_actual || cancha.precio_hora;
            
            const iconClass = cancha.tipo === 'futbol' ? 'fa-futbol' : 'fa-table-tennis';
            
            // Verificar disponibilidad si hay fecha y hora
            let estaDisponible = true;
            let estadoBadge = '<span class="badge bg-success">Disponible</span>';
            let cardClass = 'cancha-card disponible';
            
            if (fecha && hora) {
                // PRIMERO: Verificar si la hora está marcada como "Todas ocupadas"
                const horaSelect = document.getElementById('horaSelect');
                const opcionSeleccionada = horaSelect.options[horaSelect.selectedIndex];
                const esHoraTodasOcupadas = opcionSeleccionada && opcionSeleccionada.textContent.includes('(Todas ocupadas)');
                
                if (esHoraTodasOcupadas) {
                    // Si la hora dice "Todas ocupadas", TODAS las canchas deben estar rojas
                    cardClass = 'cancha-card ocupada';
                    estadoBadge = '<span class="badge bg-danger">Ocupada</span>';
                    console.log('🔴 Cancha marcada como ocupada porque la hora está "Todas ocupadas":', cancha.nombre);
                } else {
                    // Si no es "Todas ocupadas", verificar disponibilidad individual
                    try {
                        // Agregar timestamp único para evitar cache
                        const timestamp = Date.now();
                        const response = await fetch(`${API_BASE}/disponibilidad/${cancha.id}/${fecha}?t=${timestamp}`);
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        const reservas = await response.json();
                        
                        estaDisponible = !reservas.reservas.some(r => {
                            const horaFin = calcularHoraFin(hora);
                            const reservaInicioMin = timeToMinutes(r.hora_inicio);
                            const reservaFinMin = timeToMinutes(r.hora_fin);
                            const horaInicioMin = timeToMinutes(hora);
                            const horaFinMin = timeToMinutes(horaFin);
                            
                            return reservaInicioMin < horaFinMin && reservaFinMin > horaInicioMin;
                        });
                    } catch (error) {
                        console.error('❌ Error verificando disponibilidad de cancha:', cancha.id, error);
                        // En caso de error, asumir disponible para no bloquear al usuario
                        estaDisponible = true;
                    }
                    
                    if (estaDisponible) {
                        cardClass = 'cancha-card disponible';
                        estadoBadge = '<span class="badge bg-success">Disponible</span>';
                    } else {
                        cardClass = 'cancha-card ocupada';
                        estadoBadge = '<span class="badge bg-danger">Ocupada</span>';
                    }
                }
            }
            
            canchaCard.className = cardClass;
            
            // Determinar descripción de cancha y jugadores según el complejo
            const descripcionCancha = esTechado ? 'Techada' : 'Al aire libre';
            const jugadoresPorEquipo = complejoSeleccionado.nombre === 'Espacio Deportivo Borde Río' ? '5 jugadores por equipo' : 
                                     complejoSeleccionado.nombre === 'Complejo Demo 3' && cancha.tipo === 'futbol' && cancha.nombre === 'Cancha 3' ? '7 jugadores por equipo' :
                                     complejoSeleccionado.nombre === 'Complejo Demo 3' && cancha.tipo === 'futbol' ? '7 jugadores por equipo' :
                                     complejoSeleccionado.nombre === 'Complejo Demo 3' && cancha.tipo === 'padel' ? '2 jugadores<br>por equipo' :
                                     '7 jugadores por equipo';
            
            // Construir HTML del precio (con promoción si aplica)
            let precioHTML = '';
            if (cancha.tiene_promocion && cancha.precio_actual < cancha.precio_original) {
                precioHTML = `
                    <p class="mb-1">
                        <span class="text-decoration-line-through text-muted small">$${formatCurrencyChile(cancha.precio_original)}</span>
                        <span class="text-success fw-bold ms-2">$${formatCurrencyChile(cancha.precio_actual)}</span>
                        <span class="badge bg-success ms-1">${cancha.promocion_info?.porcentaje_descuento}% OFF</span>
                    </p>
                    <p class="text-muted small mb-0">por hora</p>
                `;
            } else {
                precioHTML = `<p class="text-muted">$${formatCurrencyChile(cancha.precio_actual || cancha.precio_hora)} por hora</p>`;
            }
            
            // Determinar el indicador de tipo
            const tipoIndicator = complejoSeleccionado.nombre === 'Complejo Demo 3' ? 
                `<div class="tipo-indicator">${cancha.tipo === 'futbol' ? 'FÚTBOL' : 'PADEL'}</div>` : '';
            
            // HTML especial para Cancha 3 (horizontal) en Complejo Demo 3
            console.log('🔍 DEBUG: complejoSeleccionado.nombre =', complejoSeleccionado.nombre, 'cancha.nombre =', cancha.nombre);
            if (complejoSeleccionado.nombre === 'Complejo Demo 3' && cancha.nombre === 'Cancha 3') {
                canchaCard.innerHTML = `
                    <!-- Sección izquierda: Badge + Ícono -->
                    <div class="cancha-izquierda">
                        <div class="cancha-badge">FÚTBOL</div>
                        <div class="cancha-icono-grande">⚽</div>
                    </div>
                    
                    <!-- Sección central: Info -->
                    <div class="cancha-centro">
                        <h3 class="cancha-nombre">Cancha 3</h3>
                        <p class="cancha-precio">$15.000 por hora</p>
                        <div class="cancha-jugadores">
                            <i class="fas fa-users me-1"></i>
                            <span>7 jugadores por equipo</span>
                        </div>
                    </div>
                    
                    <!-- Sección derecha: Botón -->
                    <div class="cancha-derecha">
                        <button class="cancha-boton">Disponible</button>
                    </div>
                `;
                // Aplicar clases para Cancha 3 horizontal
                canchaCard.classList.add('demo3-cancha-horizontal');
                
                // FORZAR ACTUALIZACIÓN - CAMBIO v5.0
                console.log('🎯 Cancha 3 HTML actualizado con estructura definitiva:', canchaCard.innerHTML);
            } else {
                // HTML normal para otras canchas
                canchaCard.innerHTML = `
                    ${tipoIndicator}
                    <div class="cancha-icon">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <h5>${cancha.nombre.replace('Cancha Techada', 'Cancha').replace('Cancha 1', cancha.tipo === 'padel' ? 'Cancha Pádel' : 'Cancha 1').replace('Cancha 2', 'Cancha 2').replace('Cancha 3', 'Cancha 3')}</h5>
                    ${precioHTML}
                    ${esTechado ? '<p class="text-info small"><i class="fas fa-home me-1"></i>Techada</p>' : ''}
                    <p class="text-info small"><i class="fas fa-users me-1"></i>${jugadoresPorEquipo}</p>
                    <div class="estado-disponibilidad">
                        ${estadoBadge}
                    </div>
                `;
            }
            
            canchaCard.addEventListener('click', () => {
                // Solo permitir selección si no está en gris
                if (!canchaCard.classList.contains('no-seleccionada')) {
                    seleccionarCancha(cancha);
                }
            });
            
            return canchaCard;
        }
        
        // Agregar estacionamientos solo para Fundación Gunnen (no para Espacio Deportivo Borde Río porque desconocemos)
        if (complejoSeleccionado.nombre === 'Fundación Gunnen') {
            const estacionamientos = document.createElement('div');
            estacionamientos.className = 'estacionamientos';
            estacionamientos.innerHTML = `
                <div class="estacionamiento-icon">
                    E
                </div>
                <div class="estacionamiento-info-icon" onclick="mostrarModalEstacionamiento()">
                    <i class="fas fa-info-circle"></i>
                </div>
            `;
            canchasHorizontales.appendChild(estacionamientos);
        }
        
        galponContainer.appendChild(canchasHorizontales);
        grid.appendChild(galponContainer);

        // Agregar la calle DESPUÉS del contenedor (fuera y abajo)
        // EXCEPTO para Punto Soccer que usa ::after en CSS
        if (!complejoSeleccionado.nombre || !complejoSeleccionado.nombre.includes('Punto Soccer')) {
            grid.appendChild(calle);
        }
    } else {
        // Para otros complejos, usar layout estándar
        for (const cancha of canchas) {
            const canchaCard = document.createElement('div');
            canchaCard.dataset.canchaId = cancha.id;
            canchaCard.dataset.precio = cancha.precio_actual || cancha.precio_hora;
            
            const iconClass = cancha.tipo === 'futbol' ? 'fa-futbol' : 'fa-table-tennis';
            
            // Verificar disponibilidad si hay fecha y hora
            let estaDisponible = true;
            let estadoBadge = '<span class="badge bg-success">Disponible</span>';
            let cardClass = 'cancha-card disponible';
            
            if (fecha && hora) {
                // PRIMERO: Verificar si la hora está marcada como "Todas ocupadas"
                const horaSelect = document.getElementById('horaSelect');
                const opcionSeleccionada = horaSelect.options[horaSelect.selectedIndex];
                const esHoraTodasOcupadas = opcionSeleccionada && opcionSeleccionada.textContent.includes('(Todas ocupadas)');
                
                if (esHoraTodasOcupadas) {
                    // Si la hora dice "Todas ocupadas", TODAS las canchas deben estar rojas
                    cardClass = 'cancha-card ocupada';
                    estadoBadge = '<span class="badge bg-danger">Ocupada</span>';
                    console.log('🔴 Cancha marcada como ocupada porque la hora está "Todas ocupadas":', cancha.nombre);
                } else {
                    // Si no es "Todas ocupadas", verificar disponibilidad individual
                    try {
                        // Agregar timestamp único para evitar cache
                        const timestamp = Date.now();
                        const response = await fetch(`${API_BASE}/disponibilidad/${cancha.id}/${fecha}?t=${timestamp}`);
                        const reservas = await response.json();
                        
                        estaDisponible = !reservas.reservas.some(r => {
                            const horaFin = calcularHoraFin(hora);
                            const reservaInicioMin = timeToMinutes(r.hora_inicio);
                            const reservaFinMin = timeToMinutes(r.hora_fin);
                            const horaInicioMin = timeToMinutes(hora);
                            const horaFinMin = timeToMinutes(horaFin);
                            return reservaInicioMin < horaFinMin && reservaFinMin > horaInicioMin;
                        });
                        
                        if (estaDisponible) {
                            cardClass = 'cancha-card disponible';
                            estadoBadge = '<span class="badge bg-success">Disponible</span>';
                        } else {
                            cardClass = 'cancha-card ocupada';
                            estadoBadge = '<span class="badge bg-danger">Ocupada</span>';
                        }
                    } catch (error) {
                        console.error('Error verificando disponibilidad de cancha:', cancha.id, error);
                        // En caso de error, asumir disponible
                    }
                }
            }
            
            canchaCard.className = cardClass;
            
            // Construir HTML del precio (con promoción si aplica)
            let precioHTML = '';
            if (cancha.tiene_promocion && cancha.precio_actual < cancha.precio_original) {
                precioHTML = `
                    <p class="mb-1">
                        <span class="text-decoration-line-through text-muted small">$${formatCurrencyChile(cancha.precio_original)}</span>
                        <span class="text-success fw-bold ms-2">$${formatCurrencyChile(cancha.precio_actual)}</span>
                        <span class="badge bg-success ms-1">${cancha.promocion_info?.porcentaje_descuento}% OFF</span>
                    </p>
                    <p class="text-muted small mb-0">por hora</p>
                `;
            } else {
                precioHTML = `<p class="text-muted">$${formatCurrencyChile(cancha.precio_actual || cancha.precio_hora)} por hora</p>`;
            }
            
            canchaCard.innerHTML = `
                <div class="cancha-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <h5>${cancha.nombre}</h5>
                ${precioHTML}
                <div class="estado-disponibilidad">
                    ${estadoBadge}
                </div>
            `;
            
            canchaCard.addEventListener('click', () => seleccionarCancha(cancha));
            grid.appendChild(canchaCard);
        }
    }
    
    console.log('🎨 === RENDERIZAR CANCHAS COMPLETADO ===');
    console.log('🎨 Elementos en el grid:', grid.children.length);
}

 // Renderizar canchas (función original mantenida para compatibilidad)
 function renderizarCanchas() {
     const grid = document.getElementById('canchasGrid');
     grid.innerHTML = '';
     
     // Si es Complejo En Desarrollo o Complejo Demo 1, crear estructura especial del galpón
     if (complejoSeleccionado && (complejoSeleccionado.nombre === 'Complejo En Desarrollo' || complejoSeleccionado.nombre === 'Complejo Demo 1')) {
         // Crear contenedor del galpón
         const galponContainer = document.createElement('div');
         galponContainer.className = 'galpon-container';
         
         // Agregar calle Monte Perdido
         const calleMontePerdido = document.createElement('div');
         calleMontePerdido.className = 'calle-monte-perdido';
         galponContainer.appendChild(calleMontePerdido);
         
         // Crear contenedor horizontal para las canchas
         const canchasHorizontales = document.createElement('div');
         canchasHorizontales.className = 'canchas-horizontales';
         
         // Ordenar canchas para Complejo En Desarrollo y Complejo Demo 1: Cancha 1 a la izquierda, Cancha 2 a la derecha
         const canchasOrdenadas = [...canchas].sort((a, b) => {
             const numeroA = parseInt(a.nombre.match(/\d+/)[0]);
             const numeroB = parseInt(b.nombre.match(/\d+/)[0]);
             return numeroA - numeroB;
         });
         
         canchasOrdenadas.forEach(cancha => {
             const canchaCard = document.createElement('div');
             canchaCard.className = 'cancha-card disponible';
             canchaCard.dataset.canchaId = cancha.id;
             canchaCard.dataset.precio = cancha.precio_actual || cancha.precio_hora;
             
             const iconClass = cancha.tipo === 'futbol' ? 'fa-futbol' : 'fa-table-tennis';
             
             canchaCard.innerHTML = `
                 <div class="cancha-icon">
                     <i class="fas ${iconClass}"></i>
                 </div>
                 <h5>${cancha.nombre.replace('Cancha Techada', 'Cancha')}</h5>
                 <p class="text-muted">$${formatCurrencyChile(cancha.precio_hora)} por hora</p>
                 <p class="text-info small"><i class="fas fa-info-circle me-1"></i>Techada</p>
                 <p class="text-info small"><i class="fas fa-users me-1"></i>7 jugadores por equipo</p>
                 <div class="estado-disponibilidad">
                     <span class="badge bg-success">Disponible</span>
                 </div>
             `;
             
             canchaCard.addEventListener('click', () => seleccionarCancha(cancha));
             canchasHorizontales.appendChild(canchaCard);
         });
         
         galponContainer.appendChild(canchasHorizontales);
         grid.appendChild(galponContainer);
         
         // Agregar clase para identificar que es Complejo En Desarrollo
         grid.parentElement.classList.add('complejo-desarrollo');
     } else {
         // Para otros complejos, usar estructura normal
         grid.parentElement.classList.remove('complejo-desarrollo');
         
         canchas.forEach(cancha => {
             const canchaCard = document.createElement('div');
             canchaCard.className = 'cancha-card disponible';
             canchaCard.dataset.canchaId = cancha.id;
             canchaCard.dataset.precio = cancha.precio_actual || cancha.precio_hora;
             
             const iconClass = cancha.tipo === 'futbol' ? 'fa-futbol' : 'fa-table-tennis';
             
             canchaCard.innerHTML = `
                 <div class="cancha-icon">
                     <i class="fas ${iconClass}"></i>
                 </div>
                 <h5>${cancha.nombre}</h5>
                 <p class="text-muted">$${formatCurrencyChile(cancha.precio_hora)} por hora</p>
                 <div class="estado-disponibilidad">
                     <span class="badge bg-success">Disponible</span>
                 </div>
             `;
             
             canchaCard.addEventListener('click', () => seleccionarCancha(cancha));
             grid.appendChild(canchaCard);
         });
     }
 }

// Seleccionar cancha
async function seleccionarCancha(cancha) {
    // Verificar disponibilidad antes de permitir la selección
    const fecha = document.getElementById('fechaSelect').value;
    const hora = document.getElementById('horaSelect').value;
    
    if (!fecha || !hora) {
        mostrarNotificacion('Por favor selecciona fecha y hora antes de elegir una cancha', 'warning');
        return;
    }
    
    // Verificar si la cancha está disponible
    const estaDisponible = await verificarDisponibilidadCancha(cancha.id, fecha, hora);
    
    if (!estaDisponible) {
        mostrarNotificacion('Esta cancha ya no está disponible para la fecha y hora seleccionada', 'danger');
        // Actualizar la visualización de la cancha
        actualizarEstadoCancha(cancha.id, false);
        return;
    }
    
    // SIEMPRE recargar la cancha con precio promocional para asegurar precio correcto
    try {
        console.log('🔄 Recargando cancha con precio promocional para fecha y hora seleccionada...', {
            cancha_id: cancha.id,
            fecha: fecha,
            hora: hora,
            precio_actual_actual: cancha.precio_actual,
            precio_hora_actual: cancha.precio_hora,
            tiene_promocion_actual: cancha.tiene_promocion
        });
        const complejoId = complejoSeleccionado?.id;
        const tipoCancha = tipoCanchaSeleccionado;
        
        if (!complejoId || !tipoCancha) {
            console.error('⚠️ No se puede recargar cancha: falta complejoId o tipoCancha', {
                complejoId: complejoId,
                tipoCancha: tipoCancha
            });
        } else {
            let url;
            if (complejoSeleccionado?.nombre === 'Complejo Demo 3') {
                url = `${API_BASE}/canchas/${complejoId}?fecha=${fecha}&hora=${hora}`;
            } else {
                url = `${API_BASE}/canchas/${complejoId}/${tipoCancha}?fecha=${fecha}&hora=${hora}`;
            }
            
            console.log('🔄 URL para recargar cancha:', url);
            const response = await fetch(url, {
                cache: 'no-cache',  // Forzar bypass de caché para obtener precios promocionales actualizados
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const canchasActualizadas = await response.json();
            const canchaActualizada = canchasActualizadas.find(c => c.id === cancha.id);
            
            if (canchaActualizada) {
                console.log('✅ Cancha recargada con precio promocional:', {
                    id: canchaActualizada.id,
                    precio_actual: canchaActualizada.precio_actual,
                    precio_hora: canchaActualizada.precio_hora,
                    precio_original: canchaActualizada.precio_original,
                    tiene_promocion: canchaActualizada.tiene_promocion,
                    promocion_info: canchaActualizada.promocion_info
                });
                
                // IMPORTANTE: Asegurar que todos los campos estén correctamente establecidos
                // Si el backend no devolvió precio_original, establecerlo como precio_hora
                if (!canchaActualizada.precio_original && canchaActualizada.precio_hora) {
                    canchaActualizada.precio_original = parseFloat(canchaActualizada.precio_hora);
                    console.log('🔧 Corrigiendo precio_original:', canchaActualizada.precio_original);
                }
                
                // Asegurar que precio_actual esté establecido correctamente
                if (!canchaActualizada.precio_actual && canchaActualizada.precio_hora) {
                    canchaActualizada.precio_actual = parseFloat(canchaActualizada.precio_hora);
                    console.log('🔧 Corrigiendo precio_actual:', canchaActualizada.precio_actual);
                }
                
                // Usar la cancha actualizada con precio promocional
                cancha = canchaActualizada;
            } else {
                console.warn('⚠️ No se encontró la cancha recargada en la respuesta:', {
                    cancha_id_buscado: cancha.id,
                    canchas_recibidas: canchasActualizadas.map(c => ({ id: c.id, nombre: c.nombre }))
                });
                
                // Si no se encontró la cancha actualizada, asegurar que tenga precio_original
                if (!cancha.precio_original && cancha.precio_hora) {
                    cancha.precio_original = parseFloat(cancha.precio_hora);
                    console.log('🔧 Aplicando precio_original a cancha original:', cancha.precio_original);
                }
            }
        }
    } catch (error) {
        console.error('⚠️ Error recargando cancha con precio promocional:', error);
        // Si hay error, asegurar que la cancha tenga precio_original establecido
        if (!cancha.precio_original && cancha.precio_hora) {
            cancha.precio_original = parseFloat(cancha.precio_hora);
            console.log('🔧 Aplicando precio_original después de error:', cancha.precio_original);
        }
    }
    
    // IMPORTANTE: Asignar cancha a canchaSeleccionada ANTES de mostrar el modal
    // Asegurar que todos los campos estén correctamente establecidos antes de asignar
    const precioHoraNormal = parseFloat(cancha.precio_hora) || 0;
    
    // Asegurar que precio_original esté establecido (debe ser siempre precio_hora)
    if (!cancha.precio_original || cancha.precio_original === 0 || isNaN(parseFloat(cancha.precio_original))) {
        cancha.precio_original = precioHoraNormal;
        console.log('🔧 Estableciendo precio_original antes de asignar:', cancha.precio_original);
    }
    
    // Asegurar que precio_actual esté establecido
    // IMPORTANTE: Si tiene promoción, NO sobrescribir el precio_actual que viene del backend
    const tienePromocionPreAsignar = cancha.tiene_promocion === true || cancha.tiene_promocion === 'true';
    if (!cancha.precio_actual || cancha.precio_actual === 0 || isNaN(parseFloat(cancha.precio_actual))) {
        if (tienePromocionPreAsignar) {
            // Si tiene promoción pero precio_actual no está, algo está mal
            console.warn('⚠️ ADVERTENCIA: Cancha tiene promoción pero precio_actual no está establecido. Usando precio_hora como fallback.');
        }
        cancha.precio_actual = precioHoraNormal;
        console.log('🔧 Estableciendo precio_actual antes de asignar:', cancha.precio_actual, 'tiene_promocion:', tienePromocionPreAsignar);
    } else if (tienePromocionPreAsignar) {
        console.log('✅ precio_actual establecido correctamente con promoción:', cancha.precio_actual);
    }
    
    canchaSeleccionada = cancha;
    console.log('🔍 DEBUG seleccionarCancha - canchaSeleccionada final:', {
        id: canchaSeleccionada.id,
        nombre: canchaSeleccionada.nombre,
        precio_actual: canchaSeleccionada.precio_actual,
        precio_hora: canchaSeleccionada.precio_hora,
        precio_original: canchaSeleccionada.precio_original,
        tiene_promocion: canchaSeleccionada.tiene_promocion,
        promocion_info: canchaSeleccionada.promocion_info,
        mostrar_promocion: canchaSeleccionada.tiene_promocion && parseFloat(canchaSeleccionada.precio_actual) < parseFloat(canchaSeleccionada.precio_original),
        comparacion_precios: {
            actual: parseFloat(canchaSeleccionada.precio_actual),
            original: parseFloat(canchaSeleccionada.precio_original),
            es_menor: parseFloat(canchaSeleccionada.precio_actual) < parseFloat(canchaSeleccionada.precio_original)
        }
    });
    mostrarModalReserva();
}

// Mostrar modal de reserva
function mostrarModalReserva() {
    // Limpiar completamente el formulario antes de mostrar el modal
    limpiarFormularioReserva();
    
    console.log('🎨 DEBUG mostrarModalReserva - canchaSeleccionada:', {
        id: canchaSeleccionada?.id,
        nombre: canchaSeleccionada?.nombre,
        precio_actual: canchaSeleccionada?.precio_actual,
        precio_hora: canchaSeleccionada?.precio_hora,
        precio_original: canchaSeleccionada?.precio_original,
        tiene_promocion: canchaSeleccionada?.tiene_promocion,
        precio_usado: canchaSeleccionada?.precio_actual || canchaSeleccionada?.precio_hora
    });
    
    const modal = new bootstrap.Modal(document.getElementById('reservaModal'));
    
    // Actualizar resumen
    const resumen = document.getElementById('resumenReserva');
    const fecha = document.getElementById('fechaSelect').value;
    const hora = document.getElementById('horaSelect').value;
    
    // Calcular precio a mostrar y verificar si hay promoción
    // IMPORTANTE: precio_original debe ser siempre precio_hora (el precio normal de la cancha)
    const precioHoraNormal = parseFloat(canchaSeleccionada?.precio_hora) || 0;
    
    // Asegurar que precio_original esté establecido (debe ser siempre precio_hora)
    let precioOriginal = parseFloat(canchaSeleccionada?.precio_original);
    if (!precioOriginal || precioOriginal === 0 || isNaN(precioOriginal)) {
        precioOriginal = precioHoraNormal;
        // Actualizar en el objeto para uso futuro
        if (canchaSeleccionada) {
            canchaSeleccionada.precio_original = precioOriginal;
        }
        console.log('🔧 Corrigiendo precio_original en mostrarModalReserva:', precioOriginal);
    }
    
    // precio_actual puede ser promocional si hay promoción, sino usar precio_hora
    // IMPORTANTE: Si tiene_promocion es true, precio_actual ya debería venir del backend con el precio promocional
    let precioActual = parseFloat(canchaSeleccionada?.precio_actual);
    const tienePromocionFlag = canchaSeleccionada?.tiene_promocion === true || canchaSeleccionada?.tiene_promocion === 'true';
    
    // Solo corregir precio_actual si NO hay promoción o si es inválido
    // Si hay promoción, NO sobrescribir el precio_actual que viene del backend
    if ((!precioActual || precioActual === 0 || isNaN(precioActual)) && !tienePromocionFlag) {
        precioActual = precioHoraNormal;
        // Actualizar en el objeto para uso futuro
        if (canchaSeleccionada) {
            canchaSeleccionada.precio_actual = precioActual;
        }
        console.log('🔧 Corrigiendo precio_actual en mostrarModalReserva (sin promoción):', precioActual);
    } else if (tienePromocionFlag && (!precioActual || precioActual === 0 || isNaN(precioActual))) {
        // Si tiene promoción pero precio_actual no está establecido, usar precio_hora como fallback
        precioActual = precioHoraNormal;
        console.warn('⚠️ Tiene promoción pero precio_actual no está establecido, usando precio_hora como fallback');
    } else {
        console.log('✅ precio_actual correctamente establecido:', precioActual, 'tiene_promocion:', tienePromocionFlag);
    }
    
    // Verificar promoción
    const tienePromocion = canchaSeleccionada?.tiene_promocion === true || canchaSeleccionada?.tiene_promocion === 'true';
    // Verificar si hay promoción: precio_actual debe ser menor que precio_original Y tener flag de promoción
    // IMPORTANTE: Para mostrar promoción, necesitamos:
    // 1. tener el flag tiene_promocion = true
    // 2. precio_actual debe ser diferente y menor que precio_original
    // 3. ambos precios deben ser válidos (> 0)
    const precioMenor = precioActual < precioOriginal && precioActual > 0 && precioOriginal > 0;
    // También verificar que tenga promocion_info si existe
    const tienePromocionInfo = canchaSeleccionada?.promocion_info && 
                                (canchaSeleccionada.promocion_info.porcentaje_descuento || 
                                 canchaSeleccionada.promocion_info.nombre);
    
    console.log('💰 DEBUG mostrarModalReserva - Verificación de promoción:', {
        precio_actual: precioActual,
        precio_original: precioOriginal,
        precio_hora: precioHoraNormal,
        tiene_promocion_flag: canchaSeleccionada?.tiene_promocion,
        tiene_promocion_bool: tienePromocion,
        precio_menor: precioMenor,
        tiene_promocion_info: !!tienePromocionInfo,
        promocion_info: canchaSeleccionada?.promocion_info,
        mostrar_promocion: tienePromocion && precioMenor,
        cancha_completa: canchaSeleccionada
    });
    
    // Determinar si mostrar precio promocional
    // Mostrar promoción si: tiene flag Y (precio actual es menor que original O tiene promocion_info)
    const mostrarPromocion = tienePromocion && (precioMenor || tienePromocionInfo);
    // Siempre usar precioActual (que puede ser promocional si hay promoción)
    const precioAMostrar = precioActual;
    
         resumen.innerHTML = `
         <div class="row">
             <div class="col-6"><strong>Complejo:</strong></div>
             <div class="col-6">${complejoSeleccionado.nombre}</div>
         </div>
         <div class="row">
             <div class="col-6"><strong>Dirección:</strong></div>
             <div class="col-6">${complejoSeleccionado.direccion}</div>
         </div>
         <div class="row">
             <div class="col-6"><strong>Cancha:</strong></div>
             <div class="col-6">${canchaSeleccionada.nombre}</div>
         </div>
         <div class="row">
             <div class="col-6"><strong>Fecha:</strong></div>
             <div class="col-6">${formatearFecha(ajustarFechaParaMedianoche(fecha, hora))}</div>
         </div>
         <div class="row">
             <div class="col-6"><strong>Hora:</strong></div>
             <div class="col-6">${hora}</div>
         </div>
         <div class="row">
             <div class="col-6"><strong>Precio:</strong></div>
             <div class="col-6" id="precioOriginal">
             ${mostrarPromocion
                ? `
                <div>
                    <span class="text-decoration-line-through text-muted small">$${formatCurrencyChile(precioOriginal)}</span>
                    <span class="text-success fw-bold ms-2">$${formatCurrencyChile(precioActual)}</span>
                    <span class="badge bg-success ms-1">${canchaSeleccionada.promocion_info?.porcentaje_descuento || ''}% OFF</span>
                </div>
                `
                : `<span>$${formatCurrencyChile(precioAMostrar)}</span>`
             }
             </div>
         </div>
     `;
    
    modal.show();
    
    // Configurar sugerencia de código de descuento para Espacio Deportivo Borde Río
    // IMPORTANTE: Esperar a que el modal esté completamente visible antes de actualizar elementos
    console.log('🎟️🎟️🎟️ INICIANDO configuración de código descuento - mostrarModalReserva ejecutado - VERSIÓN CON REINTENTOS');
    console.log('🎟️ Complejo seleccionado:', complejoSeleccionado);
    console.log('🎟️ modal.show() ejecutado, ahora configurando código descuento...');
    
    // Intentar múltiples veces con delays incrementales para asegurar que los elementos estén disponibles
    const configurarCodigoDescuento = (intento = 1) => {
        console.log(`🎟️ Intento ${intento} de configuración de código descuento`);
        const codigoDescuentoLabel = document.querySelector('label[for="codigoDescuento"]');
        const codigoDescuentoInput = document.getElementById('codigoDescuento');
        
        console.log('🎟️ DEBUG código descuento - complejoSeleccionado:', {
            id: complejoSeleccionado?.id,
            nombre: complejoSeleccionado?.nombre,
            es_borde_rio: complejoSeleccionado?.id == 7 || complejoSeleccionado?.nombre === 'Espacio Deportivo Borde Río'
        });
        console.log('🎟️ DEBUG código descuento - Elementos DOM:', {
            label_encontrado: !!codigoDescuentoLabel,
            input_encontrado: !!codigoDescuentoInput,
            label_actual: codigoDescuentoLabel?.innerHTML?.substring(0, 50),
            placeholder_actual: codigoDescuentoInput?.placeholder
        });
        
        // Si los elementos no están disponibles y aún no hemos intentado 3 veces, intentar de nuevo
        if ((!codigoDescuentoLabel || !codigoDescuentoInput) && intento < 3) {
            console.log(`🎟️ Elementos no disponibles, reintentando en ${intento * 100}ms...`);
            setTimeout(() => configurarCodigoDescuento(intento + 1), intento * 100);
            return;
        }
        
        if (complejoSeleccionado && (complejoSeleccionado.id == 7 || complejoSeleccionado.nombre === 'Espacio Deportivo Borde Río')) {
            // Mostrar sugerencia del código RESERVABORDERIO10
            console.log('✅ Configurando sugerencia RESERVABORDERIO10 para Borde Río');
            if (codigoDescuentoLabel) {
                codigoDescuentoLabel.innerHTML = `
                    <i class="fas fa-tag me-2"></i>
                    Código de descuento 
                    <span class="text-muted small">(sugerencia: <strong class="text-primary">RESERVABORDERIO10</strong>)</span>
                `;
                console.log('✅ Label actualizado con sugerencia');
            } else {
                console.warn('⚠️ Label de código descuento no encontrado después de', intento, 'intentos');
            }
            if (codigoDescuentoInput) {
                codigoDescuentoInput.placeholder = 'RESERVABORDERIO10 (recomendado)';
                console.log('✅ Placeholder actualizado con sugerencia');
            } else {
                console.warn('⚠️ Input de código descuento no encontrado después de', intento, 'intentos');
            }
        } else {
            // Restaurar texto normal para otros complejos
            console.log('🔄 Restaurando texto normal para otros complejos');
            if (codigoDescuentoLabel) {
                codigoDescuentoLabel.innerHTML = `
                    <i class="fas fa-tag me-2"></i>Código de descuento (opcional)
                `;
            }
            if (codigoDescuentoInput) {
                codigoDescuentoInput.placeholder = 'Ingresa tu código de descuento';
            }
        }
    };
    
    // Iniciar configuración después de un pequeño delay
    setTimeout(() => configurarCodigoDescuento(1), 150);
    
    // Actualizar el resumen de precio inmediatamente para asegurar que use el precio correcto
    actualizarResumenPrecio();
    
    // Limpiar descuento aplicado después de mostrar el modal
    setTimeout(() => {
        limpiarDescuento();
    }, 100);
}

// Función para actualizar el resumen de precio según pago parcial
function actualizarResumenPrecio() {
    if (!canchaSeleccionada) return;
    
    const pagarMitad = document.getElementById('pagarMitad').checked;
    
    // IMPORTANTE: precio_original debe ser siempre precio_hora (el precio normal de la cancha)
    const precioHoraNormal = parseFloat(canchaSeleccionada.precio_hora) || 0;
    
    // Asegurar que precio_original esté establecido (debe ser siempre precio_hora)
    let precioOriginal = parseFloat(canchaSeleccionada.precio_original);
    if (!precioOriginal || precioOriginal === 0 || isNaN(precioOriginal)) {
        precioOriginal = precioHoraNormal;
        // Actualizar en el objeto para uso futuro
        canchaSeleccionada.precio_original = precioOriginal;
        console.log('🔧 Corrigiendo precio_original en actualizarResumenPrecio:', precioOriginal);
    }
    
    // precio_actual puede ser promocional si hay promoción, sino usar precio_hora
    let precioBase = parseFloat(canchaSeleccionada.precio_actual);
    if (!precioBase || precioBase === 0 || isNaN(precioBase)) {
        precioBase = precioHoraNormal;
        // Actualizar en el objeto para uso futuro
        canchaSeleccionada.precio_actual = precioBase;
        console.log('🔧 Corrigiendo precio_actual en actualizarResumenPrecio:', precioBase);
    }

    // Si hay código de descuento aplicado, usar ese precio en lugar del precioBase
    const precioFinal = precioConDescuento || precioBase;
    const precioAPagar = pagarMitad ? Math.round(precioFinal / 2) : precioFinal;
    
    console.log('💰 DEBUG actualizarResumenPrecio - Precios:', {
        precioBase: precioBase,
        precioConDescuento: precioConDescuento,
        precioFinal: precioFinal,
        precioOriginal: precioOriginal,
        precioHoraNormal: precioHoraNormal,
        precioAPagar: precioAPagar,
        tiene_promocion: canchaSeleccionada.tiene_promocion,
        tiene_codigo_descuento: !!precioConDescuento,
        pagarMitad: pagarMitad
    });
    
    // Actualizar el precio en el resumen
    const precioElement = document.getElementById('precioOriginal');
    if (precioElement) {
        // Verificar promoción de manera más robusta
        const tienePromocionBool = canchaSeleccionada.tiene_promocion === true || canchaSeleccionada.tiene_promocion === 'true';
        const precioActualNum = precioBase;
        const precioOriginalNum = precioOriginal;
        // Verificar si hay promoción: precio_actual debe ser menor que precio_original Y tener flag de promoción
        const tienePromocionValida = tienePromocionBool && precioActualNum < precioOriginalNum && precioActualNum > 0;
        
        console.log('💰 DEBUG actualizarResumenPrecio - Verificación:', {
            tiene_promocion: canchaSeleccionada.tiene_promocion,
            tiene_promocion_bool: tienePromocionBool,
            precio_actual_num: precioActualNum,
            precio_original_num: precioOriginalNum,
            tiene_promocion_valida: tienePromocionValida
        });
        
        // Si hay código de descuento aplicado, mostrarlo
        const tieneCodigoDescuento = precioConDescuento && precioConDescuento < precioBase;

        if (tieneCodigoDescuento) {
            // Hay código de descuento aplicado
            if (tienePromocionValida) {
                // Promoción + Código de descuento
                if (pagarMitad) {
                    precioElement.innerHTML = `
                        <div>
                            <div>
                                <span class="text-decoration-line-through text-muted small">$${formatCurrencyChile(precioOriginal)}</span>
                                <span class="text-decoration-line-through text-muted ms-2">$${formatCurrencyChile(precioBase)}</span>
                                <span class="text-success fw-bold ms-2">$${formatCurrencyChile(precioFinal)}</span>
                            </div>
                            <div class="mt-1">
                                <strong class="text-primary">$${formatCurrencyChile(precioAPagar)} (50%)</strong>
                                <small class="text-muted ms-1">Resto en el complejo</small>
                            </div>
                        </div>
                    `;
                } else {
                    precioElement.innerHTML = `
                        <div>
                            <span class="text-decoration-line-through text-muted small">$${formatCurrencyChile(precioOriginal)}</span>
                            <span class="text-decoration-line-through text-muted ms-2">$${formatCurrencyChile(precioBase)}</span>
                            <span class="text-success fw-bold ms-2">$${formatCurrencyChile(precioFinal)}</span>
                        </div>
                    `;
                }
            } else {
                // Solo código de descuento, sin promoción
                if (pagarMitad) {
                    precioElement.innerHTML = `
                        <div>
                            <span class="text-decoration-line-through text-muted">$${formatCurrencyChile(precioBase)}</span>
                            <span class="text-success fw-bold ms-2">$${formatCurrencyChile(precioFinal)}</span>
                            <br>
                            <strong class="text-primary">$${formatCurrencyChile(precioAPagar)} (50%)</strong>
                            <br>
                            <small class="text-muted">Resto en el complejo</small>
                        </div>
                    `;
                } else {
                    precioElement.innerHTML = `
                        <div>
                            <span class="text-decoration-line-through text-muted">$${formatCurrencyChile(precioBase)}</span>
                            <span class="text-success fw-bold ms-2">$${formatCurrencyChile(precioFinal)}</span>
                        </div>
                    `;
                }
            }
        } else if (tienePromocionValida) {
            // Solo promoción, sin código de descuento
            if (pagarMitad) {
                precioElement.innerHTML = `
                    <div>
                        <div>
                            <span class="text-decoration-line-through text-muted small">$${formatCurrencyChile(precioOriginal)}</span>
                            <span class="text-success fw-bold ms-2">$${formatCurrencyChile(precioBase)}</span>
                            <span class="badge bg-success ms-1">${canchaSeleccionada.promocion_info?.porcentaje_descuento || ''}% OFF</span>
                        </div>
                        <div class="mt-1">
                            <strong class="text-primary">$${formatCurrencyChile(precioAPagar)} (50%)</strong>
                            <small class="text-muted ms-1">Resto en el complejo</small>
                        </div>
                    </div>
                `;
            } else {
                precioElement.innerHTML = `
                    <div>
                        <span class="text-decoration-line-through text-muted small">$${formatCurrencyChile(precioOriginal)}</span>
                        <span class="text-success fw-bold ms-2">$${formatCurrencyChile(precioBase)}</span>
                        <span class="badge bg-success ms-1">${canchaSeleccionada.promocion_info?.porcentaje_descuento || ''}% OFF</span>
                    </div>
                `;
            }
        } else {
            // Precio normal sin promoción ni código
            if (pagarMitad) {
                precioElement.innerHTML = `
                    <div>
                        <span style="text-decoration: line-through; color: #999;">$${formatCurrencyChile(precioBase)}</span>
                        <br>
                        <strong class="text-primary">$${formatCurrencyChile(precioAPagar)} (50%)</strong>
                        <br>
                        <small class="text-muted">Resto en el complejo</small>
                    </div>
                `;
            } else {
                precioElement.textContent = `$${formatCurrencyChile(precioBase)}`;
            }
        }
    }
    
    // Si hay descuento aplicado, recalcular
    const descuentoAplicado = window.descuentoActual;
    if (descuentoAplicado) {
        aplicarDescuentoAlPrecio(descuentoAplicado, precioAPagar);
    }
}

function limpiarFormularioReserva() {
    // Limpiar campo Nombre
    const nombreInput = document.getElementById('nombreCliente');
    nombreInput.value = '';
    nombreInput.classList.remove('is-valid', 'is-invalid');
    
    // Limpiar campo RUT
    const rutInput = document.getElementById('rutCliente');
    rutInput.value = '';
    rutInput.classList.remove('is-valid', 'is-invalid');
    
    // Limpiar campo Email
    const emailInput = document.getElementById('emailCliente');
    emailInput.value = '';
    emailInput.classList.remove('is-valid', 'is-invalid');
    
    // Limpiar campo Teléfono
    const telefonoInput = document.getElementById('telefonoCliente');
    telefonoInput.value = '';
    telefonoInput.classList.remove('is-valid', 'is-invalid');
    
    // Limpiar checkbox de políticas
    const aceptarPoliticasCheckbox = document.getElementById('aceptarPoliticas');
    if (aceptarPoliticasCheckbox) {
        aceptarPoliticasCheckbox.checked = false;
        aceptarPoliticasCheckbox.classList.remove('is-valid', 'is-invalid');
    }
    
    // Limpiar checkbox de pagar 50%
    const pagarMitadCheckbox = document.getElementById('pagarMitad');
    if (pagarMitadCheckbox) {
        pagarMitadCheckbox.checked = false;
    }
    
    // Ocultar todos los elementos de feedback (Nombre, RUT, Email, Teléfono y Políticas)
    const allInvalidFeedbacks = document.querySelectorAll('.invalid-feedback');
    const allValidFeedbacks = document.querySelectorAll('.valid-feedback');
    
    allInvalidFeedbacks.forEach(feedback => {
        feedback.classList.add('d-none');
    });
    allValidFeedbacks.forEach(feedback => {
        feedback.classList.add('d-none');
    });
    
    // Resetear el estado de interacción del usuario
    if (window.nombreUsuarioHaInteractuado !== undefined) {
        window.nombreUsuarioHaInteractuado = false;
    }
    if (window.rutUsuarioHaInteractuado !== undefined) {
        window.rutUsuarioHaInteractuado = false;
    }
    if (window.emailUsuarioHaInteractuado !== undefined) {
        window.emailUsuarioHaInteractuado = false;
    }
}

// Función para mostrar el modal de información del estacionamiento
function mostrarModalEstacionamiento() {
    // Crear el modal si no existe
    let modal = document.getElementById('estacionamientoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'estacionamientoModal';
        modal.className = 'estacionamiento-modal';
        modal.innerHTML = `
            <div class="estacionamiento-modal-content">
                <div class="estacionamiento-modal-header">
                    <h3 class="estacionamiento-modal-title">
                        <i class="fas fa-parking"></i>
                        Estacionamiento
                    </h3>
                    <span class="estacionamiento-modal-close" onclick="cerrarModalEstacionamiento()">&times;</span>
                </div>
                <div class="estacionamiento-modal-body">
                    <p>El <span class="highlight">Complejo Fundación Gunnen</span> cuenta con un amplio estacionamiento para tu comodidad.</p>
                    <p>Disponemos de <span class="highlight">aproximadamente 30 espacios</span> para vehículos menores, garantizando que encuentres un lugar para estacionar tu auto o moto.</p>
                    <p><i class="fas fa-shield-alt" style="color: #28a745; margin-right: 8px;"></i>Estacionamiento <strong>gratuito</strong> y <strong>seguro</strong> para todos nuestros clientes.</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Mostrar el modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevenir scroll del body
    
    // Cerrar modal al hacer click fuera del contenido
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModalEstacionamiento();
        }
    });
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            cerrarModalEstacionamiento();
        }
    });
}

// Función para cerrar el modal de información del estacionamiento
function cerrarModalEstacionamiento() {
    const modal = document.getElementById('estacionamientoModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restaurar scroll del body
    }
}

// Confirmar reserva
async function confirmarReserva() {
    // Validar todos los campos del formulario
    const nombreInput = document.getElementById('nombreCliente');
    const rutInput = document.getElementById('rutCliente');
    const emailInput = document.getElementById('emailCliente');
    const telefonoInput = document.getElementById('telefonoCliente');
    
    const nombre = nombreInput.value.trim();
    const rut = rutInput.value.trim();
    const email = emailInput.value.trim();
    const telefono = telefonoInput.value.trim();
    
    // Validar que todos los campos estén completos
    if (!nombre) {
        // Activar feedback visual del nombre
        nombreInput.classList.add('is-invalid');
        nombreInput.classList.remove('is-valid');
        const nombreValidFeedback = nombreInput.parentNode.querySelector('.valid-feedback');
        const nombreInvalidFeedback = nombreInput.parentNode.querySelector('.invalid-feedback');
        if (nombreValidFeedback) nombreValidFeedback.classList.add('d-none');
        if (nombreInvalidFeedback) nombreInvalidFeedback.classList.remove('d-none');
        
        mostrarNotificacion('Por favor completa el campo "Nombre completo"', 'danger');
        nombreInput.focus();
        return;
    }
    
    if (!rut) {
        // Activar feedback visual del RUT
        rutInput.classList.add('is-invalid');
        rutInput.classList.remove('is-valid');
        const rutValidFeedback = rutInput.parentNode.querySelector('.valid-feedback');
        const rutInvalidFeedback = rutInput.parentNode.querySelector('.invalid-feedback');
        if (rutValidFeedback) rutValidFeedback.classList.add('d-none');
        if (rutInvalidFeedback) rutInvalidFeedback.classList.remove('d-none');
        
        mostrarNotificacion('Por favor completa el campo "RUT"', 'danger');
        rutInput.focus();
        return;
    }
    
    if (!email) {
        // Activar feedback visual del Email
        emailInput.classList.add('is-invalid');
        emailInput.classList.remove('is-valid');
        const emailValidFeedback = emailInput.parentNode.querySelector('.valid-feedback');
        const emailInvalidFeedback = emailInput.parentNode.querySelector('.invalid-feedback');
        if (emailValidFeedback) emailValidFeedback.classList.add('d-none');
        if (emailInvalidFeedback) emailInvalidFeedback.classList.remove('d-none');
        
        mostrarNotificacion('Por favor completa el campo "Email"', 'danger');
        emailInput.focus();
        return;
    }
    
    if (!telefono) {
        // Activar feedback visual del Teléfono
        telefonoInput.classList.add('is-invalid');
        telefonoInput.classList.remove('is-valid');
        const telefonoValidFeedback = telefonoInput.parentNode.querySelector('.valid-feedback');
        const telefonoInvalidFeedback = telefonoInput.parentNode.querySelector('.invalid-feedback');
        if (telefonoValidFeedback) telefonoValidFeedback.classList.add('d-none');
        if (telefonoInvalidFeedback) telefonoInvalidFeedback.classList.remove('d-none');
        
        mostrarNotificacion('Por favor completa el campo "Teléfono"', 'danger');
        telefonoInput.focus();
        return;
    }
    
    // Validar que el nombre no esté vacío
    if (!validarNombre(nombre)) {
        nombreInput.classList.add('is-invalid');
        mostrarNotificacion('Por favor completa el campo "Nombre completo"', 'danger');
        nombreInput.focus();
        return;
    }
    
    // Validar formato del RUT
    if (!validarRUT(rut)) {
        rutInput.classList.add('is-invalid');
        mostrarNotificacion('Por favor ingresa un RUT válido', 'danger');
        rutInput.focus();
        return;
    }
    
    // Validar formato del Email
    if (!validarEmail(email)) {
        emailInput.classList.add('is-invalid');
        mostrarNotificacion('Por favor ingresa un email válido', 'danger');
        emailInput.focus();
        return;
    }
    
    // Validar formato del Teléfono
    if (!validarTelefono(telefono)) {
        telefonoInput.classList.add('is-invalid');
        mostrarNotificacion('Por favor ingresa un teléfono válido', 'danger');
        telefonoInput.focus();
        return;
    }
    
    // Validar aceptación de políticas
    const aceptarPoliticasCheckbox = document.getElementById('aceptarPoliticas');
    if (!aceptarPoliticasCheckbox.checked) {
        aceptarPoliticasCheckbox.classList.add('is-invalid');
        const invalidFeedback = aceptarPoliticasCheckbox.parentNode.querySelector('.invalid-feedback');
        if (invalidFeedback) {
            invalidFeedback.classList.remove('d-none');
        }
        mostrarNotificacion('Debes aceptar los términos y condiciones para continuar', 'danger');
        aceptarPoliticasCheckbox.focus();
        return;
    } else {
        aceptarPoliticasCheckbox.classList.remove('is-invalid');
        const invalidFeedback = aceptarPoliticasCheckbox.parentNode.querySelector('.invalid-feedback');
        if (invalidFeedback) {
            invalidFeedback.classList.add('d-none');
        }
    }
    
    // Verificar disponibilidad una vez más antes de procesar el pago
    const fecha = document.getElementById('fechaSelect').value;
    const hora = document.getElementById('horaSelect').value;
    
    const estaDisponible = await verificarDisponibilidadCancha(canchaSeleccionada.id, fecha, hora);
    
    if (!estaDisponible) {
        mostrarNotificacion('Lo sentimos, esta cancha ya no está disponible. Por favor selecciona otra opción.', 'danger');
        // Cerrar el modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('reservaModal'));
        if (modal) {
            modal.hide();
        }
        // Actualizar la visualización
        actualizarEstadoCancha(canchaSeleccionada.id, false);
        return;
    }
    
    // Calcular precio según si paga 50% o 100%
    // IMPORTANTE: precio_original debe ser siempre precio_hora (el precio normal de la cancha)
    const precioHoraNormal = parseFloat(canchaSeleccionada.precio_hora) || 0;
    
    // Asegurar que precio_original esté establecido
    if (!canchaSeleccionada.precio_original || canchaSeleccionada.precio_original === 0 || isNaN(parseFloat(canchaSeleccionada.precio_original))) {
        canchaSeleccionada.precio_original = precioHoraNormal;
        console.log('🔧 Corrigiendo precio_original en confirmarReserva:', canchaSeleccionada.precio_original);
    }
    
    // PRIORIDAD: precio_actual (promocional) > precio_hora (original)
    let precioBaseCancha = parseFloat(canchaSeleccionada.precio_actual);
    if (!precioBaseCancha || precioBaseCancha === 0 || isNaN(precioBaseCancha)) {
        precioBaseCancha = precioHoraNormal;
        console.log('🔧 Corrigiendo precio_actual en confirmarReserva:', precioBaseCancha);
    }
    
    console.log('💰 DEBUG - Precio de cancha ANTES de calcular:', {
        cancha_id: canchaSeleccionada.id,
        cancha_nombre: canchaSeleccionada.nombre,
        precio_actual: canchaSeleccionada.precio_actual,
        precio_hora: canchaSeleccionada.precio_hora,
        precio_original: canchaSeleccionada.precio_original,
        precio_base_usado: precioBaseCancha,
        tiene_promocion: canchaSeleccionada.tiene_promocion,
        promocion_info: canchaSeleccionada.promocion_info
    });
    
    const pagarMitad = document.getElementById('pagarMitad').checked;
    const porcentajePagado = pagarMitad ? 50 : 100;
    const precioTotalCancha = precioBaseCancha; // Precio TOTAL de la cancha (promocional si aplica)
    const precioAPagar = pagarMitad ? Math.round(precioTotalCancha / 2) : precioTotalCancha; // Lo que paga el cliente
    
    console.log('💰 DEBUG - Precio DESPUÉS de calcular:', {
        precioTotalCancha: precioTotalCancha,
        precioAPagar: precioAPagar,
        porcentajePagado: porcentajePagado,
        pagarMitad: pagarMitad
    });
    
    console.log('🔍 DEBUG - Variables antes de formData:');
    console.log('🔍 descuentoAplicado:', descuentoAplicado);
    console.log('🔍 precioTotalCancha:', precioTotalCancha);
    console.log('🔍 precioAPagar:', precioAPagar);
    console.log('🔍 porcentajePagado:', porcentajePagado);
    
    // IMPORTANTE: Asegurar que precio_total use el precio promocional si existe
    const precioTotalFinal = descuentoAplicado ? descuentoAplicado.monto_final : precioTotalCancha;
    const montoPagadoFinal = descuentoAplicado ? Math.round(descuentoAplicado.monto_final * (porcentajePagado / 100)) : precioAPagar;
    
    console.log('💰 DEBUG - Precio FINAL antes de enviar al backend:', {
        precioBaseCancha: precioBaseCancha,
        precioTotalCancha: precioTotalCancha,
        precioTotalFinal: precioTotalFinal,
        precioAPagar: precioAPagar,
        montoPagadoFinal: montoPagadoFinal,
        tiene_promocion: canchaSeleccionada.tiene_promocion,
        precio_actual: canchaSeleccionada.precio_actual,
        precio_hora: canchaSeleccionada.precio_hora,
        descuentoAplicado: !!descuentoAplicado
    });
    
    const formData = {
        cancha_id: canchaSeleccionada.id,
        fecha: document.getElementById('fechaSelect').value,
        hora_inicio: document.getElementById('horaSelect').value,
        hora_fin: calcularHoraFin(document.getElementById('horaSelect').value),
        nombre_cliente: document.getElementById('nombreCliente').value,
        rut_cliente: document.getElementById('rutCliente').value,
        email_cliente: document.getElementById('emailCliente').value,
        telefono_cliente: document.getElementById('telefonoCliente').value,
        precio_total: precioTotalFinal, // SIEMPRE el precio total (promocional si aplica)
        codigo_descuento: descuentoAplicado ? descuentoAplicado.codigo : null,
        porcentaje_pagado: porcentajePagado,
        monto_pagado: montoPagadoFinal // Lo que realmente paga
    };
    
    console.log('📤 DEBUG - formData que se enviará al backend:', {
        ...formData,
        canchaSeleccionada_completa: canchaSeleccionada
    });
    console.log('📤 DEBUG - precio_total en formData:', formData.precio_total);
    console.log('📤 DEBUG - monto_pagado en formData:', formData.monto_pagado);
    
    // Mostrar indicador de procesamiento
    const btnConfirmar = document.getElementById('confirmarReserva');
    const originalText = btnConfirmar.innerHTML;
    btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando pago...';
    btnConfirmar.disabled = true;
    
    try {
        // Procesar pago con WebPay (simulación)
        const paymentData = {
            ...formData,
            complejo: complejoSeleccionado.nombre,
            cancha: canchaSeleccionada.nombre
        };
        
        // Crear bloqueo temporal y proceder al pago
        console.log('🔒 Creando bloqueo temporal y procediendo al pago...');
        console.log('📋 formData completo:', formData);
        console.log('🆔 sessionId:', sessionId);
        
        const datosEnvio = {
            ...formData,
            session_id: sessionId,
            codigo_unico_uso: window.codigoUnicoUso || null // Incluir código de un solo uso si existe
        };
        console.log('📤 Datos que se enviarán:', datosEnvio);
        console.log('🎫 Código de un solo uso:', window.codigoUnicoUso);
        
        const response = await fetch(`${API_BASE}/reservas/bloquear-y-pagar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosEnvio)
        });
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers);
        
        const result = await response.json();
        console.log('📡 Response body:', result);
        
        if (response.ok) {
            console.log('✅ Bloqueo temporal creado, redirigiendo a pago...', result);
            
            // Guardar código de un solo uso en sessionStorage antes de redirigir
            if (window.codigoUnicoUso) {
                sessionStorage.setItem('codigoUnicoUso', window.codigoUnicoUso);
                console.log('💾 Código de un solo uso guardado en sessionStorage:', window.codigoUnicoUso);
            }
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('reservaModal'));
            if (modal) {
                modal.hide();
            }
            
            // Redirigir a la página de pago usando el session_id
            window.location.href = `/payment.html?code=${sessionId}`;
            
        } else {
            throw new Error(result.error || 'Error al crear el bloqueo temporal');
        }
    } catch (error) {
        // Liberar bloqueo en caso de cualquier error
        await liberarBloqueoTemporal();
        mostrarNotificacion(error.message, 'danger');
    } finally {
        // Restaurar botón
        btnConfirmar.innerHTML = originalText;
        btnConfirmar.disabled = false;
    }
}

// Mostrar confirmación de reserva
function mostrarConfirmacionReserva(codigo, transactionId) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show';
    alertDiv.innerHTML = `
        <h4><i class="fas fa-check-circle me-2"></i>¡Reserva Confirmada!</h4>
        <p>Tu código de reserva es: <strong>${codigo}</strong></p>
        <p>ID de transacción: <strong>${transactionId}</strong></p>
        <p>El ticket de pago se ha descargado automáticamente.</p>
        <p>Te hemos enviado un email con los detalles de tu reserva.</p>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
}

// Buscar reserva
async function buscarReserva() {
    const busqueda = document.getElementById('codigoReserva').value.trim();
    if (!busqueda) {
        mostrarNotificacion('Por favor ingresa tu código de reserva o nombre completo', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reservas/${busqueda}`);
        const data = await response.json();
        
        console.log('🔍 Respuesta del servidor:', data);
        console.log('🔍 Response status:', response.status);
        console.log('🔍 Response ok:', response.ok);
        
        if (response.ok) {
            // Manejar diferentes formatos de respuesta
            // Formato 1: { success: true, reserva: {...} }
            // Formato 2: {...} (objeto reserva directamente)
            const reserva = data.reserva || data;
            
            console.log('🔍 Objeto reserva extraído:', reserva);
            console.log('🔍 Tiene codigo_reserva?', reserva?.codigo_reserva);
            console.log('🔍 Campos disponibles:', Object.keys(reserva || {}));
            
            if (reserva && reserva.codigo_reserva) {
                mostrarResultadoReserva(reserva);
            } else {
                console.error('❌ Reserva no válida:', reserva);
                mostrarNotificacion('Reserva no encontrada o datos incompletos', 'danger');
            }
        } else {
            // Si hay información sobre un pago encontrado, mostrarla
            if (data.pago_encontrado) {
                mostrarNotificacion(data.mensaje || 'Se encontró un pago pero la reserva no se creó. Contacta a soporte.', 'warning');
                // Mostrar información del pago si está disponible
                if (data.codigo_autorizacion) {
                    const resultadoDiv = document.getElementById('resultadoReserva');
                    if (resultadoDiv) {
                        resultadoDiv.innerHTML = `
                            <div class="alert alert-warning">
                                <h5>⚠️ Pago Encontrado</h5>
                                <p><strong>Código de Reserva:</strong> ${data.codigo_reserva}</p>
                                <p><strong>Código de Autorización:</strong> ${data.codigo_autorizacion}</p>
                                <p><strong>Monto Pagado:</strong> $${data.monto?.toLocaleString() || 'N/A'}</p>
                                <p><strong>Fecha del Pago:</strong> ${data.fecha_pago || 'N/A'}</p>
                                <hr>
                                <p class="mb-0"><strong>Importante:</strong> Tu pago fue procesado correctamente, pero hubo un problema al crear la reserva. Por favor, contacta a <a href="mailto:soporte@reservatuscanchas.cl">soporte@reservatuscanchas.cl</a> con tu código de reserva para resolverlo.</p>
                            </div>
                        `;
                    }
                }
            } else {
                mostrarNotificacion(data.error || 'Reserva no encontrada', 'danger');
            }
        }
    } catch (error) {
        console.error('Error buscando reserva:', error);
        mostrarNotificacion('Error al buscar la reserva: ' + error.message, 'danger');
    }
}

// Mostrar resultado de búsqueda
function mostrarResultadoReserva(reserva) {
    console.log('📋 Mostrando resultado de reserva:', reserva);
    
    const resultadoDiv = document.getElementById('resultadoReserva');
    
    if (!reserva) {
        console.error('❌ Reserva es null o undefined');
        mostrarNotificacion('Error: Datos de reserva no válidos', 'danger');
        return;
    }
    
    // Corregir nombres de campos y valores undefined
    const complejo = reserva.complejo_nombre || reserva.nombre_complejo || 'No especificado';
    const cancha = reserva.cancha_nombre || reserva.nombre_cancha || 'No especificada';
    const tipo = reserva.tipo === 'futbol' ? 'Fútbol' : (reserva.tipo || 'No especificado');
    const fecha = reserva.fecha ? formatearFecha(ajustarFechaParaMedianoche(reserva.fecha, reserva.hora_inicio)) : 'No especificada';
    const hora = reserva.hora_inicio && reserva.hora_fin ? formatearRangoHoras(reserva.hora_inicio, reserva.hora_fin) : 'No especificado';
    const estado = reserva.estado || 'No especificado';
    const precio = reserva.precio_total ? formatCurrencyChile(reserva.precio_total) : 'No especificado';
    const codigo = reserva.codigo_reserva || 'N/A';
    const cliente = reserva.nombre_cliente || 'No especificado';
    
    console.log('📋 Valores extraídos:', {
        complejo, cancha, tipo, fecha, hora, estado, precio, codigo, cliente
    });
    
    resultadoDiv.innerHTML = `
        <div class="card bg-light">
            <div class="card-body">
                <h5 class="card-title">
                    <i class="fas fa-ticket-alt me-2"></i>
                    Reserva #${codigo}
                </h5>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Complejo:</strong> ${complejo}</p>
                        <p><strong>Cancha:</strong> ${cancha}</p>
                        <p><strong>Tipo:</strong> ${tipo}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Fecha:</strong> ${fecha}</p>
                        <p><strong>Hora:</strong> ${hora}</p>
                        <p><strong>Estado:</strong> 
                            <span class="badge bg-${estado === 'confirmada' ? 'success' : 'warning'}">
                                ${estado}
                            </span>
                        </p>
                    </div>
                </div>
                <div class="mt-3">
                    <p><strong>Cliente:</strong> ${cliente}</p>
                    <p><strong>Precio:</strong> $${precio}</p>
                </div>
            </div>
        </div>
    `;
    resultadoDiv.style.display = 'block';
}

// Actualizar disponibilidad
async function actualizarDisponibilidad() {
    if (!canchas.length) return;
    
    const fecha = document.getElementById('fechaSelect').value;
    const hora = document.getElementById('horaSelect').value;
    
    if (!fecha || !hora) return;
    
    // Verificar disponibilidad para cada cancha
    for (const cancha of canchas) {
        try {
            const response = await fetch(`${API_BASE}/disponibilidad/${cancha.id}/${fecha}`);
            const reservas = await response.json();
            
            const canchaCard = document.querySelector(`[data-cancha-id="${cancha.id}"]`);
            const estaDisponible = !reservas.reservas.some(r => {
                const horaFin = calcularHoraFin(hora);
                const reservaInicioMin = timeToMinutes(r.hora_inicio);
                const reservaFinMin = timeToMinutes(r.hora_fin);
                const horaInicioMin = timeToMinutes(hora);
                const horaFinMin = timeToMinutes(horaFin);
                return reservaInicioMin < horaFinMin && reservaFinMin > horaInicioMin;
            });
            
            if (estaDisponible) {
                canchaCard.className = 'cancha-card disponible';
                canchaCard.querySelector('.estado-disponibilidad').innerHTML = 
                    '<span class="badge bg-success">Disponible</span>';
            } else {
                canchaCard.className = 'cancha-card ocupada';
                canchaCard.querySelector('.estado-disponibilidad').innerHTML = 
                    '<span class="badge bg-danger">Ocupada</span>';
            }
        } catch (error) {
            console.error('Error al verificar disponibilidad:', error);
        }
    }
}

// Funciones auxiliares
function calcularHoraFin(horaInicio) {
    const [hora, minutos] = horaInicio.split(':');
    const horaFin = new Date();
    horaFin.setHours(parseInt(hora) + 1, parseInt(minutos), 0);
    return horaFin.toTimeString().slice(0, 5);
}

/**
 * Ajustar fecha para medianoche (00:00)
 * Cuando la hora es 00:00, la reserva es realmente para el día siguiente
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {string} hora - Hora en formato HH:MM
 * @returns {string} Fecha ajustada en formato YYYY-MM-DD
 */
function ajustarFechaParaMedianoche(fecha, hora) {
    if (!fecha || !hora) return fecha;

    // Si la hora es 00:00 (medianoche), es el día siguiente
    if (hora === '00:00') {
        try {
            const [año, mes, dia] = fecha.split('-').map(Number);
            const fechaObj = new Date(año, mes - 1, dia);
            // Sumar un día
            fechaObj.setDate(fechaObj.getDate() + 1);
            // Retornar en formato YYYY-MM-DD
            const añoAjustado = fechaObj.getFullYear();
            const mesAjustado = String(fechaObj.getMonth() + 1).padStart(2, '0');
            const diaAjustado = String(fechaObj.getDate()).padStart(2, '0');
            return `${añoAjustado}-${mesAjustado}-${diaAjustado}`;
        } catch (error) {
            console.error('Error ajustando fecha para medianoche:', error);
            return fecha;
        }
    }

    return fecha;
}

function formatearFecha(fecha) {
     if (!fecha) {
         return 'No especificada';
     }

     try {
         // Extraer solo la parte de la fecha si viene en formato ISO
         let fechaString = fecha;
         if (fecha.includes('T')) {
             fechaString = fecha.split('T')[0]; // Tomar solo la parte YYYY-MM-DD
         }

         // Evitar problema de zona horaria creando la fecha con componentes específicos
         const [año, mes, dia] = fechaString.split('-').map(Number);

         // Validar que los componentes sean válidos
         if (isNaN(año) || isNaN(mes) || isNaN(dia)) {
             console.error('Componentes de fecha inválidos:', { año, mes, dia, fechaOriginal: fecha });
             return 'Fecha inválida';
         }

         const fechaObj = new Date(año, mes - 1, dia); // mes - 1 porque Date usa 0-11 para meses

         // Verificar que la fecha sea válida
         if (fechaObj.getFullYear() !== año || fechaObj.getMonth() !== (mes - 1) || fechaObj.getDate() !== dia) {
             console.error('Fecha construida inválida:', { fechaOriginal: fecha, fechaString, año, mes, dia });
             return 'Fecha inválida';
         }

         const opciones = {
             weekday: 'long',
             year: 'numeric',
             month: 'long',
             day: 'numeric'
         };

         let fechaFormateada = fechaObj.toLocaleDateString('es-CL', opciones);

         // Capitalizar la primera letra del día de la semana
         fechaFormateada = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);

         return fechaFormateada;
     } catch (error) {
         console.error('Error formateando fecha:', error, 'Fecha original:', fecha);
         return 'Fecha inválida';
     }
 }

// Formatear rango de horas
function formatearRangoHoras(horaInicio, horaFin) {
    if (!horaInicio || !horaFin) {
        return 'No especificado';
    }
    
    // Extraer solo la parte de la hora (HH:MM) si viene con segundos
    const inicio = horaInicio.toString().substring(0, 5);
    const fin = horaFin.toString().substring(0, 5);
    
    return `${inicio} - ${fin}`;
}

function mostrarNotificacion(mensaje, tipo) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.container').firstChild);
    
    // Auto-dismiss después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Función alternativa para scroll suave (compatibilidad con navegadores antiguos)
function scrollSuave(elemento) {
    const targetPosition = elemento.offsetTop;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 1000;
    let start = null;

    function animation(currentTime) {
        if (start === null) start = currentTime;
        const timeElapsed = currentTime - start;
        const run = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function ease(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }

    requestAnimationFrame(animation);
}

// Función específica para hacer scroll suave a la sección "Reserva tu Cancha" - Compatible con móviles
function scrollToStep4() {
    console.log('🚀 SCROLL INTELIGENTE INICIADO');
    
    // Detectar si es móvil para optimizar scroll
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('📱 Scroll optimizado para móvil:', isMobile);
    
    // Función de scroll inteligente con reintentos
    const ejecutarScroll = () => {
        const reservarSection = document.getElementById('reservar');
        if (reservarSection) {
            console.log('🚀 Ejecutando scroll inteligente');
            
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
            return true;
        } else {
            console.log('❌ Elemento reservar no encontrado');
            return false;
        }
    };
    
    // Intentar scroll inmediatamente
    if (!ejecutarScroll()) {
        // Si falla, reintentar con delay
        console.log('⏳ Reintentando scroll en 100ms...');
        setTimeout(() => {
            if (!ejecutarScroll()) {
                console.log('⏳ Último intento de scroll en 500ms...');
                setTimeout(ejecutarScroll, 500);
            }
        }, 100);
    }
}

// Función alias para el botón "Reservar Ahora"
function scrollToReservar() {
    console.log('🚀 SCROLLTORESERVAR LLAMADA');
    scrollToStep4();
}

// ===== SISTEMA DE CÓDIGOS DE DESCUENTO =====

// Variables globales para descuentos
let descuentoAplicado = null;
let precioOriginal = 0;
let precioConDescuento = 0;

// Función para limpiar descuento aplicado
function limpiarDescuento() {
    descuentoAplicado = null;
    precioConDescuento = 0;
    
    // Ocultar sección de descuento
    const resumenDescuento = document.getElementById('resumenDescuento');
    if (resumenDescuento) {
        resumenDescuento.classList.add('d-none');
    }
    
    // Limpiar mensaje
    const mensajeDescuento = document.getElementById('mensajeDescuento');
    if (mensajeDescuento) {
        mensajeDescuento.classList.add('d-none');
        mensajeDescuento.textContent = '';
    }
    
    // Limpiar campo de código
    const codigoInput = document.getElementById('codigoDescuento');
    if (codigoInput) {
        codigoInput.value = '';
    }
}

// Función para validar y aplicar código de descuento
async function validarCodigoDescuento() {
    const codigoInput = document.getElementById('codigoDescuento');
    const mensajeDescuento = document.getElementById('mensajeDescuento');
    const aplicarBtn = document.getElementById('aplicarDescuento');
    
    if (!codigoInput || !codigoInput.value.trim()) {
        mostrarMensajeDescuento('Por favor ingresa un código de descuento', 'error');
        return;
    }
    
    const codigo = codigoInput.value.trim().toUpperCase();
    const emailCliente = document.getElementById('emailCliente').value;
    
    if (!emailCliente) {
        mostrarMensajeDescuento('Por favor ingresa tu email primero', 'error');
        return;
    }
    
    if (!canchaSeleccionada || !canchaSeleccionada.precio_hora) {
        mostrarMensajeDescuento('Por favor selecciona una cancha primero', 'error');
        return;
    }

    // Usar precio_actual si existe (precio con promoción), sino usar precio_hora (precio original)
    const precioBase = canchaSeleccionada.precio_actual || canchaSeleccionada.precio_hora;

    // Mostrar loading
    aplicarBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Validando...';
    aplicarBtn.disabled = true;

    try {
        console.log('🎫 Validando código:', {
            codigo: codigo,
            email: emailCliente,
            precio_original: canchaSeleccionada.precio_hora,
            precio_con_promocion: canchaSeleccionada.precio_actual,
            precio_base_para_descuento: precioBase,
            tiene_promocion: canchaSeleccionada.tiene_promocion
        });

        // PRIMERO: Verificar si es un código de un solo uso
        const apiBase = API_BASE || '/api';
        let esCodigoUnicoUso = false;
        let codigoUnicoUsoData = null;
        
        console.log('🔍 Verificando si es código de un solo uso:', codigo);
        try {
            const verificarUnicoUsoResponse = await fetch(`${apiBase}/codigos-unico-uso/verificar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    codigo: codigo,
                    email_cliente: emailCliente
                })
            });
            
            console.log('📡 Respuesta verificar código único uso:', verificarUnicoUsoResponse.status);
            
            if (verificarUnicoUsoResponse.ok) {
                const unicoUsoData = await verificarUnicoUsoResponse.json();
                console.log('📦 Datos código único uso:', unicoUsoData);
                if (unicoUsoData.success && unicoUsoData.valido) {
                    esCodigoUnicoUso = true;
                    codigoUnicoUsoData = unicoUsoData;
                    console.log('✅ Código de un solo uso detectado:', codigo);
                }
            } else if (verificarUnicoUsoResponse.status === 404) {
                console.log('⚠️ Endpoint de códigos único uso no disponible (404), continuando con validación normal...');
            } else {
                console.log('⚠️ Respuesta inesperada del endpoint de códigos único uso:', verificarUnicoUsoResponse.status);
            }
        } catch (error) {
            console.log('⚠️ Error verificando código único uso (continuando con validación normal):', error.message);
        }
        
        if (esCodigoUnicoUso) {
            // Es un código de un solo uso
            const montoDescuento = codigoUnicoUsoData.monto_descuento;
            const precioBase = canchaSeleccionada.precio_actual || canchaSeleccionada.precio_hora;
            const precioFinal = Math.max(0, precioBase - montoDescuento);
            
            // Guardar código de un solo uso para enviarlo al backend cuando se pague
            window.codigoUnicoUso = codigo;
            
            // Aplicar descuento
            descuentoAplicado = {
                codigo: codigo,
                tipo: 'unico_uso',
                monto_descuento: montoDescuento,
                monto_original: precioBase,
                monto_final: precioFinal
            };
            precioOriginal = precioBase;
            precioConDescuento = precioFinal;
            
            // Mostrar resumen de descuento
            mostrarResumenDescuento({
                codigo: codigo,
                monto_original: precioBase,
                monto_descuento: montoDescuento,
                monto_final: precioFinal,
                porcentaje_descuento: Math.round((montoDescuento / precioBase) * 100)
            });
            
            mostrarMensajeDescuento(`¡Código de compensación aplicado! Descuento de $${montoDescuento.toLocaleString()}`, 'success');
            actualizarResumenPrecio();
            
            aplicarBtn.innerHTML = '<i class="fas fa-check me-1"></i>Aplicar';
            aplicarBtn.disabled = false;
            return;
        }
        
        // Si no es código de un solo uso, continuar con validación normal de descuento
        console.log('🎫 Validando código de descuento normal:', codigo);
        const url = `${apiBase}/discounts/validar`;

        console.log('🔗 URL de validación:', url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                codigo: codigo,
                email_cliente: emailCliente,
                monto_original: precioBase  // Usar precio con promoción si existe
            })
        });
        
        console.log('📡 Respuesta del servidor:', response.status, response.statusText);
        
        const data = await response.json();
        
        if (response.ok && data.valido) {
            // Aplicar descuento
            descuentoAplicado = data;
            precioOriginal = data.monto_original;
            precioConDescuento = data.monto_final;

            // Mostrar resumen de descuento
            mostrarResumenDescuento(data);

            // Mensaje diferente si hay promoción activa
            let mensaje = `¡Descuento aplicado! ${data.porcentaje_descuento}% de descuento`;
            if (canchaSeleccionada.tiene_promocion && canchaSeleccionada.precio_actual < canchaSeleccionada.precio_hora) {
                const descuentoPromo = Math.round(((canchaSeleccionada.precio_hora - canchaSeleccionada.precio_actual) / canchaSeleccionada.precio_hora) * 100);
                mensaje = `¡Descuentos aplicados! ${descuentoPromo}% promoción + ${data.porcentaje_descuento}% código`;
            }
            mostrarMensajeDescuento(mensaje, 'success');

            // IMPORTANTE: Llamar a actualizarResumenPrecio() para que recalcule
            // considerando el código de descuento y el estado del checkbox "Pagar 50%"
            actualizarResumenPrecio();

        } else {
            mostrarMensajeDescuento(data.error || 'Código de descuento no válido', 'error');
            limpiarDescuento();
        }
        
        // Limpiar código de un solo uso si no se aplicó
        if (!esCodigoUnicoUso) {
            window.codigoUnicoUso = null;
        }
        
    } catch (error) {
        console.error('Error validando código de descuento:', error);
        mostrarMensajeDescuento('Error al validar el código. Intenta nuevamente.', 'error');
    } finally {
        // Restaurar botón
        aplicarBtn.innerHTML = '<i class="fas fa-check me-1"></i>Aplicar';
        aplicarBtn.disabled = false;
    }
}

// Función para mostrar mensaje de descuento
function mostrarMensajeDescuento(mensaje, tipo) {
    const mensajeDescuento = document.getElementById('mensajeDescuento');
    if (!mensajeDescuento) return;
    
    mensajeDescuento.textContent = mensaje;
    mensajeDescuento.classList.remove('d-none', 'text-success', 'text-danger');
    
    if (tipo === 'success') {
        mensajeDescuento.classList.add('text-success');
    } else if (tipo === 'error') {
        mensajeDescuento.classList.add('text-danger');
    }
}

// Función para mostrar resumen de descuento
function mostrarResumenDescuento(descuento) {
    const resumenDescuento = document.getElementById('resumenDescuento');
    const montoDescuento = document.getElementById('montoDescuento');
    const totalFinal = document.getElementById('totalFinal');
    
    if (!resumenDescuento || !montoDescuento || !totalFinal) return;
    
    montoDescuento.textContent = `-$${formatCurrencyChile(descuento.monto_descuento)}`;
    totalFinal.textContent = `$${formatCurrencyChile(descuento.monto_final)}`;
    
    resumenDescuento.classList.remove('d-none');
}

// Event listeners para códigos de descuento
document.addEventListener('DOMContentLoaded', function() {
    // Botón aplicar descuento
    const aplicarBtn = document.getElementById('aplicarDescuento');
    if (aplicarBtn) {
        aplicarBtn.addEventListener('click', validarCodigoDescuento);
    }
    
    // Enter en el campo de código
    const codigoInput = document.getElementById('codigoDescuento');
    if (codigoInput) {
        codigoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                validarCodigoDescuento();
            }
        });
    }
});

// Ejecutar función para asegurar valores visibles después de cargar la página
setTimeout(() => {
    asegurarValoresVisibles();
}, 2000);

// ===== FUNCIONES PARA ZOOM Y PAN EN COMPLEJO DEMO 3 =====

/**
 * Inicializa el sistema de zoom y pan para el Complejo Demo 3 en dispositivos móviles
 * @param {HTMLElement} container - El contenedor del complejo Demo 3
 */
function inicializarZoomPanDemo3(container) {
    if (!container) {
        console.error('❌ No se encontró el contenedor para inicializar zoom y pan');
        return;
    }
    
    console.log('📱 Inicializando zoom y pan para Complejo Demo 3...');
    
    // Variables para el control de zoom y pan
    let scale = 0.8; // Escala inicial
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialTranslateX = 0;
    let initialTranslateY = 0;
    
    // Configurar el contenedor para zoom y pan
    container.style.transformOrigin = 'center center';
    container.style.transition = 'transform 0.1s ease-out';
    container.style.cursor = 'grab';
    container.style.userSelect = 'none';
    container.style.webkitUserSelect = 'none';
    container.style.mozUserSelect = 'none';
    container.style.msUserSelect = 'none';
    
    // Función para aplicar transformaciones
    function aplicarTransformacion() {
        container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }
    
    // Función para limitar el pan dentro de límites razonables
    function limitarPan() {
        const maxTranslateX = 100;
        const maxTranslateY = 100;
        
        translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
        translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));
    }
    
    // Eventos de mouse para desktop
    container.addEventListener('mousedown', function(e) {
        if (e.button === 0) { // Solo botón izquierdo
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialTranslateX = translateX;
            initialTranslateY = translateY;
            container.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            translateX = initialTranslateX + deltaX;
            translateY = initialTranslateY + deltaY;
            
            limitarPan();
            aplicarTransformacion();
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            container.style.cursor = 'grab';
        }
    });
    
    // Eventos táctiles para móvil
    container.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            // Un dedo - pan
            isDragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            initialTranslateX = translateX;
            initialTranslateY = translateY;
            e.preventDefault();
        } else if (e.touches.length === 2) {
            // Dos dedos - zoom
            e.preventDefault();
        }
    }, { passive: false });
    
    container.addEventListener('touchmove', function(e) {
        if (e.touches.length === 1 && isDragging) {
            // Un dedo - pan
            const deltaX = e.touches[0].clientX - startX;
            const deltaY = e.touches[0].clientY - startY;
            
            translateX = initialTranslateX + deltaX;
            translateY = initialTranslateY + deltaY;
            
            limitarPan();
            aplicarTransformacion();
            e.preventDefault();
        } else if (e.touches.length === 2) {
            // Dos dedos - zoom
            e.preventDefault();
        }
    }, { passive: false });
    
    container.addEventListener('touchend', function(e) {
        if (e.touches.length === 0) {
            isDragging = false;
        }
    });
    
    // Zoom con rueda del mouse
    container.addEventListener('wheel', function(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.max(0.5, Math.min(1.5, scale + delta));
        
        aplicarTransformacion();
    }, { passive: false });
    
    // Botones de control de zoom (opcional)
    crearControlesZoom(container, scale, aplicarTransformacion);
    
    // Aplicar transformación inicial
    aplicarTransformacion();
    
    console.log('✅ Zoom y pan inicializado correctamente');
}

/**
 * Crea controles de zoom para el complejo Demo 3
 * @param {HTMLElement} container - El contenedor del complejo
 * @param {number} currentScale - La escala actual
 * @param {Function} aplicarTransformacion - Función para aplicar transformaciones
 */
function crearControlesZoom(container, currentScale, aplicarTransformacion) {
    // Solo crear controles en móvil
    if (window.innerWidth > 768) return;
    
    // Crear contenedor de controles
    const controlesContainer = document.createElement('div');
    controlesContainer.className = 'demo3-zoom-controls';
    controlesContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;
    
    // Botón zoom in
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.style.cssText = `
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: none;
        background: #667eea;
        color: white;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.2s ease;
    `;
    
    // Botón zoom out
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '−';
    zoomOutBtn.style.cssText = zoomInBtn.style.cssText;
    
    // Botón reset
    const resetBtn = document.createElement('button');
    resetBtn.innerHTML = '⌂';
    resetBtn.style.cssText = zoomInBtn.style.cssText;
    resetBtn.style.fontSize = '20px';
    
    // Eventos de los botones
    zoomInBtn.addEventListener('click', function() {
        currentScale = Math.min(1.5, currentScale + 0.1);
        aplicarTransformacion();
    });
    
    zoomOutBtn.addEventListener('click', function() {
        currentScale = Math.max(0.5, currentScale - 0.1);
        aplicarTransformacion();
    });
    
    resetBtn.addEventListener('click', function() {
        currentScale = 0.8;
        translateX = 0;
        translateY = 0;
        aplicarTransformacion();
    });
    
    // Agregar botones al contenedor
    controlesContainer.appendChild(zoomInBtn);
    controlesContainer.appendChild(zoomOutBtn);
    controlesContainer.appendChild(resetBtn);
    
    // Agregar al body
    document.body.appendChild(controlesContainer);
    
    // Remover controles cuando se cambie de complejo
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const demo3Container = document.querySelector('.demo3-container');
                if (!demo3Container) {
                    controlesContainer.remove();
                    observer.disconnect();
                }
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Inicializa zoom y pan para el complejo Demo 3 en móvil
 */
function inicializarZoomPanDemo3(container) {
    // Solo en móvil
    if (window.innerWidth > 768) return;
    
    console.log('📱 Inicializando zoom y pan para Demo 3...');
    
    let scale = 0.8;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialTranslateX = 0;
    let initialTranslateY = 0;
    
    // Configurar estilos iniciales
    container.style.transformOrigin = 'center center';
    container.style.transition = 'transform 0.1s ease-out';
    container.style.cursor = 'grab';
    container.style.userSelect = 'none';
    
    function aplicarTransformacion() {
        container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }
    
    function limitarPan() {
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width * scale;
        const containerHeight = rect.height * scale;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        const maxTranslateX = Math.max(0, (containerWidth - viewportWidth) / 2);
        const maxTranslateY = Math.max(0, (containerHeight - viewportHeight) / 2);
        
        translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
        translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));
    }
    
    // Eventos de mouse (desktop)
    container.addEventListener('mousedown', (e) => {
        if (window.innerWidth <= 768) return;
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        container.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || window.innerWidth <= 768) return;
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        limitarPan();
        aplicarTransformacion();
    });
    
    document.addEventListener('mouseup', () => {
        if (window.innerWidth <= 768) return;
        isDragging = false;
        container.style.cursor = 'grab';
    });
    
    // Eventos táctiles (móvil)
    container.addEventListener('touchstart', (e) => {
        if (window.innerWidth > 768) return;
        e.preventDefault();
        
        if (e.touches.length === 1) {
            // Pan con un dedo
            isDragging = true;
            startX = e.touches[0].clientX - translateX;
            startY = e.touches[0].clientY - translateY;
            initialTranslateX = translateX;
            initialTranslateY = translateY;
        } else if (e.touches.length === 2) {
            // Zoom con dos dedos
            isDragging = false;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            container.initialDistance = distance;
            container.initialScale = scale;
        }
    });
    
    container.addEventListener('touchmove', (e) => {
        if (window.innerWidth > 768) return;
        e.preventDefault();
        
        if (e.touches.length === 1 && isDragging) {
            // Pan
            translateX = e.touches[0].clientX - startX;
            translateY = e.touches[0].clientY - startY;
            limitarPan();
            aplicarTransformacion();
        } else if (e.touches.length === 2) {
            // Zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            if (container.initialDistance) {
                const scaleChange = distance / container.initialDistance;
                scale = Math.max(0.5, Math.min(2, container.initialScale * scaleChange));
                limitarPan();
                aplicarTransformacion();
            }
        }
    });
    
    container.addEventListener('touchend', (e) => {
        if (window.innerWidth > 768) return;
        isDragging = false;
        container.initialDistance = null;
    });
    
    // Zoom con rueda del mouse (desktop)
    container.addEventListener('wheel', (e) => {
        if (window.innerWidth <= 768) return;
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        scale = Math.max(0.5, Math.min(2, scale * delta));
        limitarPan();
        aplicarTransformacion();
    });
    
    // Crear controles de zoom
    crearControlesZoom(container, scale, aplicarTransformacion);
    
    // Aplicar transformación inicial
    aplicarTransformacion();
}

/**
 * Crea controles de zoom para el complejo Demo 3
 */
function crearControlesZoom(container, currentScale, aplicarTransformacion) {
    // Solo en móvil
    if (window.innerWidth > 768) return;
    
    // Crear botón de zoom in
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '<i class="fas fa-plus"></i>';
    zoomInBtn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(102, 126, 234, 0.9);
        color: white;
        border: none;
        font-size: 18px;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    // Crear botón de zoom out
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '<i class="fas fa-minus"></i>';
    zoomOutBtn.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(102, 126, 234, 0.9);
        color: white;
        border: none;
        font-size: 18px;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    // Crear botón de reset
    const resetBtn = document.createElement('button');
    resetBtn.innerHTML = '<i class="fas fa-home"></i>';
    resetBtn.style.cssText = `
        position: fixed;
        top: 140px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(156, 39, 176, 0.9);
        color: white;
        border: none;
        font-size: 18px;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    `;
    
    // Event listeners
    zoomInBtn.addEventListener('click', () => {
        currentScale = Math.min(2, currentScale * 1.2);
        aplicarTransformacion();
    });
    
    zoomOutBtn.addEventListener('click', () => {
        currentScale = Math.max(0.5, currentScale * 0.8);
        aplicarTransformacion();
    });
    
    resetBtn.addEventListener('click', () => {
        currentScale = 0.8;
        translateX = 0;
        translateY = 0;
        aplicarTransformacion();
    });
    
    // Agregar al DOM
    document.body.appendChild(zoomInBtn);
    document.body.appendChild(zoomOutBtn);
    document.body.appendChild(resetBtn);
    
    // Remover controles si se cambia de complejo
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const demo3Container = document.querySelector('.demo3-container');
                if (!demo3Container) {
                    zoomInBtn.remove();
                    zoomOutBtn.remove();
                    resetBtn.remove();
                    observer.disconnect();
                }
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Muestra un indicador visual de que se puede hacer zoom en el complejo Demo 3
 */
function mostrarIndicadorZoom() {
    // Solo mostrar en móvil
    if (window.innerWidth > 768) return;
    
    // Crear indicador
    const indicador = document.createElement('div');
    indicador.className = 'demo3-zoom-indicator';
    indicador.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(102, 126, 234, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            z-index: 1001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideInDown 0.5s ease-out;
        ">
            <i class="fas fa-search-plus" style="margin-right: 8px;"></i>
            Toca y arrastra para navegar • Pellizca para hacer zoom
        </div>
    `;
    
    // Agregar al body
    document.body.appendChild(indicador);
    
    // Remover después de 4 segundos
    setTimeout(() => {
        if (indicador && indicador.parentNode) {
            indicador.style.animation = 'slideOutUp 0.5s ease-out';
            setTimeout(() => {
                if (indicador && indicador.parentNode) {
                    indicador.remove();
                }
            }, 500);
        }
    }, 4000);
    
    // Remover si se cambia de complejo
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const demo3Container = document.querySelector('.demo3-container');
                if (!demo3Container && indicador && indicador.parentNode) {
                    indicador.remove();
                    observer.disconnect();
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// ============================================
// FUNCIONES PUNTO SOCCER - Modales de Información
// ============================================

/**
 * Muestra modal de información para Camarines
 */
function mostrarInfoCamarines() {
    Swal.fire({
        title: '<i class="fas fa-shower" style="color: #ff9800; margin-right: 10px;"></i>Camarines',
        html: `
            <div style="text-align: left; padding: 15px;">
                <h5 style="color: #2e7d32; margin-bottom: 15px;">
                    <i class="fas fa-check-circle" style="color: #4caf50; margin-right: 8px;"></i>
                    Instalaciones Disponibles
                </h5>
                <ul style="list-style: none; padding-left: 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-tshirt" style="color: #ff9800; margin-right: 10px;"></i>
                        Vestidores amplios y limpios
                    </li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-shower" style="color: #2196f3; margin-right: 10px;"></i>
                        Duchas con agua caliente
                    </li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-lock" style="color: #9c27b0; margin-right: 10px;"></i>
                        Casilleros con llave
                    </li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-toilet" style="color: #607d8b; margin-right: 10px;"></i>
                        Baños y sanitarios
                    </li>
                    <li style="padding: 8px 0;">
                        <i class="fas fa-users" style="color: #795548; margin-right: 10px;"></i>
                        Capacidad para 20 personas
                    </li>
                </ul>
                <p style="margin-top: 20px; padding: 12px; background: #e8f5e9; border-radius: 8px; font-size: 0.9rem;">
                    <i class="fas fa-info-circle" style="color: #4caf50; margin-right: 8px;"></i>
                    <strong>Incluido</strong> en todas las reservas de canchas
                </p>
            </div>
        `,
        icon: null,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#4caf50',
        width: '500px',
        backdrop: true,
        showCloseButton: true
    });
}

/**
 * Muestra modal de información para Quincho
 */
function mostrarInfoQuincho() {
    Swal.fire({
        title: '<i class="fas fa-utensils" style="color: #e91e63; margin-right: 10px;"></i>Quincho',
        html: `
            <div style="text-align: left; padding: 15px;">
                <h5 style="color: #2e7d32; margin-bottom: 15px;">
                    <i class="fas fa-check-circle" style="color: #4caf50; margin-right: 8px;"></i>
                    Equipamiento Disponible
                </h5>
                <ul style="list-style: none; padding-left: 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-fire" style="color: #f44336; margin-right: 10px;"></i>
                        Parrilla de carbón profesional
                    </li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-chair" style="color: #795548; margin-right: 10px;"></i>
                        Mesas y sillas para 25 personas
                    </li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-umbrella" style="color: #2196f3; margin-right: 10px;"></i>
                        Techado completo
                    </li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-sink" style="color: #00bcd4; margin-right: 10px;"></i>
                        Lavaplatos y mesón
                    </li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                        <i class="fas fa-lightbulb" style="color: #ffc107; margin-right: 10px;"></i>
                        Iluminación LED
                    </li>
                    <li style="padding: 8px 0;">
                        <i class="fas fa-plug" style="color: #ff9800; margin-right: 10px;"></i>
                        Enchufes disponibles
                    </li>
                </ul>
                <div style="margin-top: 20px; padding: 12px; background: #fff3e0; border-radius: 8px; border-left: 4px solid #ff9800;">
                    <p style="margin: 0 0 8px 0; font-weight: 600; color: #e65100;">
                        <i class="fas fa-dollar-sign" style="margin-right: 8px;"></i>
                        Arriendo Separado
                    </p>
                    <p style="margin: 0; font-size: 0.9rem; color: #555;">
                        Disponible por hora o jornada completa. Consulta tarifas especiales para eventos.
                    </p>
                </div>
                <p style="margin-top: 15px; text-align: center; font-size: 0.85rem; color: #666;">
                    <i class="fas fa-phone" style="color: #4caf50; margin-right: 5px;"></i>
                    Contacta al administrador para reservar
                </p>
            </div>
        `,
        icon: null,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#e91e63',
        width: '500px',
        backdrop: true,
        showCloseButton: true
    });
}
