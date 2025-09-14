// Variables globales
let ciudades = [];
let complejos = [];
let canchas = [];
let complejoSeleccionado = null;
let tipoCanchaSeleccionado = null;
let canchaSeleccionada = null;
let bloqueoTemporal = null;
let sessionId = null;

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
    
    // Si la hora es 00:xx, significa que es medianoche del día siguiente (24:xx)
    if (h === 0 && timeStr.includes('00:00')) {
        return 24 * 60 + m; // 1440 + minutos
    }
    
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

// Función para pre-rellenar campos desde URL
async function preRellenarDesdeURL() {
    console.log('🔍 Iniciando preRellenarDesdeURL...');
    const { ciudad, complejo } = leerParametrosURL();
    
    if (!ciudad && !complejo) {
        console.log('🔍 No hay parámetros URL, saltando pre-rellenado');
        return;
    }
    
    // Detectar si es móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('📱 Es móvil:', isMobile);
    
    if (isMobile) {
        console.log('🚀 OPTIMIZACIÓN MÓVIL: Sistema inteligente adaptativo');
        
        // Sistema inteligente que detecta el estado de los datos
        preRellenarInteligente(ciudad, complejo);
        
        // Backup: Sistema agresivo como respaldo
        setTimeout(() => {
            console.log('🚀 Móvil - Backup: Sistema agresivo');
            preRellenarUltraAgresivo(ciudad, complejo);
        }, 3000);
    } else {
        console.log('🚀 OPTIMIZACIÓN PC: Sistema estándar');
        
        // Método 1: Intento rápido y simple
        setTimeout(() => {
            console.log('🚀 PC - Método 1: Intento rápido');
            preRellenarSimple(ciudad, complejo);
        }, 500);
        
        // Método 2: Intento con más tiempo
        setTimeout(() => {
            console.log('🚀 PC - Método 2: Intento con más tiempo');
            preRellenarSimple(ciudad, complejo);
        }, 2000);
        
        // Método 3: Intento final ultra agresivo
        setTimeout(() => {
            console.log('🚀 PC - Método 3: Intento final ultra agresivo');
            preRellenarUltraAgresivo(ciudad, complejo);
        }, 4000);
    }
    
    if (ciudad) {
        console.log('🏙️ Pre-rellenando ciudad:', ciudad);
        console.log('📊 Ciudades disponibles:', ciudades);
        
        // Esperar a que las ciudades se carguen - Mejorado para móviles
        await new Promise(resolve => {
            let attempts = 0;
            const maxAttempts = 50; // 5 segundos máximo
            
            const checkCiudades = () => {
                attempts++;
                console.log('🔍 Verificando ciudades...', ciudades.length, 'Intento:', attempts);
                
                if (ciudades.length > 0) {
                    const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
                    console.log('🔍 Ciudad encontrada:', ciudadEncontrada);
                    
                    if (ciudadEncontrada) {
                        const ciudadSelect = document.getElementById('ciudadSelect');
                        console.log('🔍 Elemento ciudad:', ciudadSelect);
                        
                        if (ciudadSelect) {
                            console.log('🔧 Configurando ciudad en móvil...');
                            
                            // Método 1: Asignación directa
                            ciudadSelect.value = ciudadEncontrada.id;
                            console.log('📱 Valor asignado directamente:', ciudadSelect.value);
                            
                            // Método 2: Forzar actualización del DOM
                            ciudadSelect.setAttribute('value', ciudadEncontrada.id);
                            
                            // Método 3: Disparar eventos múltiples con diferentes métodos
                            try {
                                // Evento change estándar
                                const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                                ciudadSelect.dispatchEvent(changeEvent);
                                
                                // Evento input para móviles
                                const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                                ciudadSelect.dispatchEvent(inputEvent);
                                
                                // Evento personalizado para forzar actualización
                                const customEvent = new CustomEvent('forceUpdate', { 
                                    detail: { value: ciudadEncontrada.id },
                                    bubbles: true 
                                });
                                ciudadSelect.dispatchEvent(customEvent);
                                
                                console.log('📱 Eventos disparados correctamente');
                            } catch (error) {
                                console.error('❌ Error disparando eventos:', error);
                            }
                            
                            // Método 4: Forzar actualización visual y funcional
                            setTimeout(() => {
                                // Verificar que el valor se mantuvo
                                if (ciudadSelect.value !== ciudadEncontrada.id) {
                                    console.log('🔄 Re-asignando valor...');
                                    ciudadSelect.value = ciudadEncontrada.id;
                                }
                                
                                // Indicador visual
                                ciudadSelect.style.backgroundColor = '#e8f5e8';
                                ciudadSelect.style.border = '2px solid #28a745';
                                
                                setTimeout(() => {
                                    ciudadSelect.style.backgroundColor = '';
                                    ciudadSelect.style.border = '';
                                }, 2000);
                                
                                console.log('📱 Valor final ciudad:', ciudadSelect.value);
                            }, 200);
                            
                            // Método 5: Llamar manualmente a la función de cambio si existe
                            setTimeout(() => {
                                if (typeof cargarComplejos === 'function') {
                                    console.log('🔄 Llamando cargarComplejos manualmente...');
                                    cargarComplejos(ciudadEncontrada.id);
                                    
                                    // Esperar un poco más para que los complejos se carguen
                                    setTimeout(() => {
                                        console.log('📊 Complejos cargados después de seleccionar ciudad:', complejos.length);
                                    }, 500);
                                }
                            }, 300);
                            
                            console.log('✅ Ciudad pre-rellenada:', ciudad, 'ID:', ciudadEncontrada.id);
                        } else {
                            console.error('❌ Elemento ciudad no encontrado');
                        }
                    } else {
                        console.error('❌ Ciudad no encontrada:', ciudad);
                    }
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ Timeout esperando ciudades');
                    resolve();
                } else {
                    console.log('⏳ Esperando ciudades...');
                    setTimeout(checkCiudades, 100);
                }
            };
            checkCiudades();
        });
    }
    
    if (complejo) {
        console.log('🏢 Pre-rellenando complejo:', complejo);
        console.log('📊 Complejos disponibles:', complejos);
        
        // Esperar a que los complejos se carguen - Mejorado para móviles
        await new Promise(resolve => {
            let attempts = 0;
            const maxAttempts = 100; // 10 segundos máximo para complejos
            
            const checkComplejos = () => {
                attempts++;
                console.log('🔍 Verificando complejos...', complejos.length, 'Intento:', attempts);
                console.log('📊 Complejos disponibles:', complejos);
                
                if (complejos.length > 0) {
                    const complejoEncontrado = complejos.find(c => c.nombre === complejo);
                    console.log('🔍 Complejo encontrado:', complejoEncontrado);
                    
                    if (complejoEncontrado) {
                        const complejoSelect = document.getElementById('complejoSelect');
                        console.log('🔍 Elemento complejo:', complejoSelect);
                        
                        if (complejoSelect) {
                            console.log('🔧 Configurando complejo...');
                            
                            // Método 1: Asignación directa
                            complejoSelect.value = complejoEncontrado.id;
                            console.log('📱 Valor asignado directamente:', complejoSelect.value);
                            
                            // Método 2: Forzar actualización del DOM
                            complejoSelect.setAttribute('value', complejoEncontrado.id);
                            
                            // Método 3: Disparar eventos múltiples con diferentes métodos
                            try {
                                // Evento change estándar
                                const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                                complejoSelect.dispatchEvent(changeEvent);
                                
                                // Evento input para móviles
                                const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                                complejoSelect.dispatchEvent(inputEvent);
                                
                                // Evento personalizado para forzar actualización
                                const customEvent = new CustomEvent('forceUpdate', { 
                                    detail: { value: complejoEncontrado.id },
                                    bubbles: true 
                                });
                                complejoSelect.dispatchEvent(customEvent);
                                
                                console.log('📱 Eventos disparados correctamente');
                            } catch (error) {
                                console.error('❌ Error disparando eventos:', error);
                            }
                            
                            // Método 4: Forzar actualización visual y funcional
                            setTimeout(() => {
                                // Verificar que el valor se mantuvo
                                if (complejoSelect.value !== complejoEncontrado.id) {
                                    console.log('🔄 Re-asignando valor...');
                                    complejoSelect.value = complejoEncontrado.id;
                                }
                                
                                // Indicador visual
                                complejoSelect.style.backgroundColor = '#e8f5e8';
                                complejoSelect.style.border = '2px solid #28a745';
                                
                                setTimeout(() => {
                                    complejoSelect.style.backgroundColor = '';
                                    complejoSelect.style.border = '';
                                }, 2000);
                                
                                console.log('📱 Valor final complejo:', complejoSelect.value);
                            }, 200);
                            
                            // Método 5: Llamar manualmente a la función de cambio si existe
                            setTimeout(async () => {
                                // Simular el cambio de complejo para cargar horarios
                                if (typeof validarHorariosSegunFecha === 'function') {
                                    console.log('🔄 Llamando validarHorariosSegunFecha manualmente...');
                                    await validarHorariosSegunFecha();
                                }
                            }, 300);
                            
                            // Método 6: Forzar carga de complejos si no se cargaron automáticamente
                            setTimeout(() => {
                                if (complejos.length === 0) {
                                    console.log('🔄 Forzando carga de complejos...');
                                    const ciudadSelect = document.getElementById('ciudadSelect');
                                    if (ciudadSelect && ciudadSelect.value) {
                                        console.log('🔄 Cargando complejos para ciudad:', ciudadSelect.value);
                                        cargarComplejos(ciudadSelect.value);
                                    }
                                }
                            }, 500);
                            
                            console.log('✅ Complejo pre-rellenado:', complejo, 'ID:', complejoEncontrado.id);
                            
                            // NO cargar canchas automáticamente - solo se cargan cuando se selecciona una hora
                            console.log('✅ Complejo pre-rellenado, canchas se cargarán al seleccionar hora');
                        } else {
                            console.error('❌ Elemento complejo no encontrado');
                        }
                    } else {
                        console.error('❌ Complejo no encontrado:', complejo);
                        console.log('📊 Complejos disponibles para comparar:', complejos.map(c => c.nombre));
                    }
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('❌ Timeout esperando complejos después de', maxAttempts, 'intentos');
                    resolve();
                } else {
                    console.log('⏳ Esperando complejos... (intento', attempts, 'de', maxAttempts, ')');
                    setTimeout(checkComplejos, 100);
                }
            };
            checkComplejos();
        });
    }
    
    // Verificación final y forzar actualización en móviles
    setTimeout(() => {
        const ciudadSelect = document.getElementById('ciudadSelect');
        const complejoSelect = document.getElementById('complejoSelect');
        
        console.log('🔍 Verificación final móvil:');
        console.log('📱 Ciudad select value:', ciudadSelect?.value);
        console.log('📱 Complejo select value:', complejoSelect?.value);
        
        // Forzar actualización visual en móviles si es necesario
        if (ciudadSelect && ciudadSelect.value) {
            // Forzar re-render del select
            ciudadSelect.style.display = 'none';
            ciudadSelect.offsetHeight; // Trigger reflow
            ciudadSelect.style.display = '';
            console.log('📱 Ciudad select forzado a re-render');
        }
        
        if (complejoSelect && complejoSelect.value) {
            // Forzar re-render del select
            complejoSelect.style.display = 'none';
            complejoSelect.offsetHeight; // Trigger reflow
            complejoSelect.style.display = '';
            console.log('📱 Complejo select forzado a re-render');
        }
    }, 500);
    
    console.log('✅ preRellenarDesdeURL completado');
    console.log('🔍 Estado final - Ciudad seleccionada:', document.getElementById('ciudadSelect')?.value);
    console.log('🔍 Estado final - Complejo seleccionado:', document.getElementById('complejoSelect')?.value);
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
                                
                                // 4. Si es MagnaSports, seleccionar fútbol automáticamente
                                if (complejoEncontrado.nombre === 'MagnaSports') {
                                    console.log('⚽ MagnaSports detectado, seleccionando fútbol automáticamente');
                                    const futbolRadio = document.getElementById('futbol');
                                    if (futbolRadio) {
                                        futbolRadio.checked = true;
                                        tipoCanchaSeleccionado = 'futbol';
                                        
                                        // Ocultar opción de padel para MagnaSports
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
                                        
                                        // Disparar evento change para activar la lógica del paso 4
                                        futbolRadio.dispatchEvent(new Event('change', { bubbles: true }));
                                        console.log('✅ MagnaSports configurado - solo fútbol con estilos centrados');
                                    }
                                } else {
                                    // Para otros complejos, mostrar paso 3 sin preseleccionar
                                    mostrarPaso(3);
                                }
                                
                                // 6. Scroll automático a la sección de disponibilidad
                                setTimeout(() => {
                                    const disponibilidadSection = document.getElementById('disponibilidad');
                                    if (disponibilidadSection) {
                                        disponibilidadSection.scrollIntoView({ 
                                            behavior: 'smooth', 
                                            block: 'start' 
                                        });
                                        console.log('📜 Scroll automático a disponibilidad');
                                    }
                                }, 500);
                                
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

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== INICIALIZACIÓN DE LA APLICACIÓN ===');
    console.log('🚀 VERSIÓN CON DEBUGGING MEJORADO Y FIX ENCODING - ' + new Date().toISOString());
    console.log('DOM cargado, inicializando aplicación');
    console.log('🌍 Hostname:', window.location.hostname);
    console.log('🔗 API_BASE configurado como:', API_BASE);
    
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
    
    return inicio1Min < fin2Min && fin1Min > inicio2Min;
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

// Verificar disponibilidad en tiempo real cuando cambien fecha o hora
async function verificarDisponibilidadTiempoReal() {
    const fecha = document.getElementById('fechaSelect').value;
    const hora = document.getElementById('horaSelect').value;
    
    if (!fecha || !canchas.length) {
        return;
    }
    
    console.log('Verificando disponibilidad en tiempo real para:', fecha, hora || 'todas las horas');
    
    // Obtener datos de disponibilidad del complejo
    const complejoId = canchas[0]?.complejo_id;
    if (!complejoId) {
        console.error('No se pudo obtener el ID del complejo');
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
        const estaDisponible = await verificarDisponibilidadCancha(cancha.id, fecha, hora);
        console.log('🏟️ Cancha', cancha.id, '(', cancha.nombre, ') - Disponible:', estaDisponible);
        if (estaDisponible) {
            todasOcupadas = false;
            break;
        }
    }
    
    console.log('🔍 Resultado final - Todas ocupadas:', todasOcupadas);
    return todasOcupadas;
}

// NUEVA FUNCIÓN OPTIMIZADA: Verificar disponibilidad completa de un complejo
async function verificarDisponibilidadCompleta(complejoId, fecha) {
    try {
        console.log('🚀 Verificando disponibilidad completa para complejo:', complejoId, 'fecha:', fecha);
        
        const response = await fetch(`${API_BASE}/disponibilidad-completa/${complejoId}/${fecha}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const disponibilidad = await response.json();
        console.log('✅ Disponibilidad completa obtenida:', Object.keys(disponibilidad).length, 'canchas');
        
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
    // Usar zona horaria de Chile para obtener la fecha correcta
    const hoy = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Santiago'
    });
    fechaInput.min = hoy;
    console.log('📅 Fecha mínima configurada:', hoy, 'Zona horaria: America/Santiago');
    fechaInput.value = hoy;
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
            
            // Si es MagnaSports, automáticamente seleccionar fútbol y ocultar opciones de padel
            if (complejoSeleccionado.nombre === 'MagnaSports') {
                console.log('⚽ MagnaSports detectado - Configurando automáticamente...');
                
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
                console.log('⚽ Cargando canchas directamente para MagnaSports...');
                console.log('⚽ DEBUG AUTOMÁTICO - complejoSeleccionado:', complejoSeleccionado);
                console.log('⚽ DEBUG AUTOMÁTICO - tipoCanchaSeleccionado:', tipoCanchaSeleccionado);
                
                // Cargar canchas inmediatamente
                setTimeout(async () => {
                    console.log('🏟️ Cargando canchas automáticamente para MagnaSports...');
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

    // Selección de tipo de cancha
    document.querySelectorAll('input[name="tipoCancha"]').forEach(radio => {
        radio.addEventListener('change', function() {
            console.log('🎯 RADIO BUTTON CAMBIADO:', this.value);
            console.log('🎯 Complejo seleccionado:', complejoSeleccionado);
            
            // Solo permitir selección si no es MagnaSports o si es MagnaSports y se selecciona fútbol
            if (complejoSeleccionado && complejoSeleccionado.nombre === 'MagnaSports' && this.value !== 'futbol') {
                console.log('🚫 Padel no permitido para MagnaSports');
                return; // No permitir selección de padel para MagnaSports
            }
            
            tipoCanchaSeleccionado = this.value;
            console.log('🎯 Tipo de cancha seleccionado:', tipoCanchaSeleccionado);
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
        verificarDisponibilidadTiempoReal();
        await validarHorariosSegunFecha();
        
        // NUEVA LÓGICA: Cargar canchas automáticamente si hay complejo y tipo seleccionado
        if (complejoSeleccionado && tipoCanchaSeleccionado) {
            console.log('📅 Fecha seleccionada, cargando canchas automáticamente...');
            setTimeout(async () => {
                await cargarCanchas(complejoSeleccionado.id, tipoCanchaSeleccionado, false); // No renderizar visualmente en Fase 4
                // Verificar disponibilidad inmediatamente después de cargar canchas
                console.log('🕐 Verificando disponibilidad inmediatamente después de seleccionar fecha...');
                await actualizarHorariosConDisponibilidad();
            }, 200);
        } else if (canchas.length > 0) {
            // Si ya hay canchas cargadas, actualizar su disponibilidad
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
        
        verificarDisponibilidadTiempoReal();
        
        // Si ya hay canchas cargadas, renderizar visualmente
        if (canchas.length > 0) {
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
            const response = await fetch(`${API_BASE}/canchas/${complejoSeleccionado.id}/${tipoCanchaSeleccionado}`);
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
    
    try {
        const url = `${API_BASE}/canchas/${complejoId}/${tipo}`;
        console.log('🏟️ URL de la petición:', url);
        
        const response = await fetch(url);
        console.log('🏟️ Response status:', response.status);
        
        canchas = await response.json();
        console.log('🏟️ Canchas recibidas:', canchas);
        
        // Solo renderizar visualmente si se solicita
        if (renderizarVisual) {
            await renderizarCanchasConDisponibilidad();
            console.log('🏟️ Canchas renderizadas con disponibilidad');
        } else {
            console.log('🏟️ Canchas cargadas (sin renderizar visualmente)');
        }
        
        // Actualizar horarios con disponibilidad si hay fecha seleccionada
        const fecha = document.getElementById('fechaSelect').value;
        if (fecha && complejoSeleccionado) {
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
    if (complejo.nombre === 'MagnaSports') {
        // MagnaSports: 16:00-23:00 entre semana, 12:00-23:00 fines de semana
        // Verificar la fecha actual para cargar los horarios correctos
        const fecha = document.getElementById('fechaSelect').value;
        if (fecha) {
            // CORREGIDO: Usar Date.UTC para evitar problemas de zona horaria
            const [año, mes, dia] = fecha.split('-').map(Number);
            const fechaObj = new Date(Date.UTC(año, mes - 1, dia));
            const diaSemana = fechaObj.getDay(); // 0 = domingo, 6 = sábado
            
            console.log('MagnaSports - Fecha:', fecha, 'Día de semana:', diaSemana, 'Día nombre:', ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana]);
            
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
                        const estaDisponible = verificarDisponibilidadCanchaOptimizada(canchaId, hora, disponibilidadCompleta);
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
    
    if (complejoSeleccionado.nombre === 'MagnaSports') {
        if (fecha) {
            // CORREGIDO: Usar Date.UTC para evitar problemas de zona horaria
            const [año, mes, dia] = fecha.split('-').map(Number);
            const fechaObj = new Date(Date.UTC(año, mes - 1, dia));
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
    const fechaObj = new Date(fecha + 'T00:00:00');
    const diaSemana = fechaObj.getDay();
    let horarios = [];
    
    if (complejoSeleccionado.nombre === 'MagnaSports') {
        if (diaSemana === 0 || diaSemana === 6) {
            // Fines de semana: 12:00-23:00
            horarios = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
        } else {
            // Lunes a viernes: 16:00-23:00
            horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
        }
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
                const estaDisponible = verificarDisponibilidadCanchaOptimizada(canchaId, hora, disponibilidadCompleta);
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
    
    // CORREGIDO: Usar Date.UTC para evitar problemas de zona horaria
    const [año, mes, dia] = fecha.split('-').map(Number);
    const fechaObj = new Date(Date.UTC(año, mes - 1, dia));
    const diaSemana = fechaObj.getDay(); // 0 = domingo, 6 = sábado
    const horaSelect = document.getElementById('horaSelect');
    const horaSeleccionada = horaSelect.value;
    
    console.log('ValidarHorarios - Fecha:', fecha, 'Día de semana:', diaSemana, 'Día nombre:', ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][diaSemana]);
    
    // Limpiar selección actual si no es válida
    if (horaSeleccionada) {
        let horariosValidos = [];
        
        if (complejoSeleccionado.nombre === 'MagnaSports') {
            if (diaSemana === 0 || diaSemana === 6) {
                // Fines de semana: 12:00-23:00
                horariosValidos = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
            } else {
                // Entre semana: 16:00-23:00
                horariosValidos = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
            }
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
    if (complejoSeleccionado.nombre === 'MagnaSports') {
        console.log('🚀 validarHorariosSegunFecha - MagnaSports detectado, cargando horarios básicos...');
        
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
    
    // Si es MagnaSports, crear estructura especial del galpón
    if (complejoSeleccionado && complejoSeleccionado.nombre === 'MagnaSports') {
        console.log('🎨 Renderizando MagnaSports con', canchas.length, 'canchas');
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
        
        // Ordenar canchas para MagnaSports: Cancha 1 a la izquierda, Cancha 2 a la derecha
        const canchasOrdenadas = [...canchas].sort((a, b) => {
            const numeroA = parseInt(a.nombre.match(/\d+/)[0]);
            const numeroB = parseInt(b.nombre.match(/\d+/)[0]);
            return numeroA - numeroB;
        });
        
        // Verificar disponibilidad para cada cancha
        for (const cancha of canchasOrdenadas) {
            const canchaCard = document.createElement('div');
            canchaCard.dataset.canchaId = cancha.id;
            canchaCard.dataset.precio = cancha.precio_hora;
            
            const iconClass = tipoCanchaSeleccionado === 'futbol' ? 'fa-futbol' : 'fa-table-tennis';
            
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
            canchaCard.innerHTML = `
                <div class="cancha-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <h5>${cancha.nombre.replace('Cancha Techada', 'Cancha')}</h5>
                <p class="text-muted">$${cancha.precio_hora.toLocaleString()} por hora</p>
                <p class="text-info small"><i class="fas fa-info-circle me-1"></i>Techada</p>
                <p class="text-info small"><i class="fas fa-users me-1"></i>7 jugadores por equipo</p>
                <div class="estado-disponibilidad">
                    ${estadoBadge}
                </div>
            `;
            
            canchaCard.addEventListener('click', () => seleccionarCancha(cancha));
            canchasHorizontales.appendChild(canchaCard);
        }
        
        galponContainer.appendChild(canchasHorizontales);
        grid.appendChild(galponContainer);
    } else {
        // Para otros complejos, usar layout estándar
        for (const cancha of canchas) {
            const canchaCard = document.createElement('div');
            canchaCard.dataset.canchaId = cancha.id;
            canchaCard.dataset.precio = cancha.precio_hora;
            
            const iconClass = tipoCanchaSeleccionado === 'futbol' ? 'fa-futbol' : 'fa-table-tennis';
            
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
            canchaCard.innerHTML = `
                <div class="cancha-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <h5>${cancha.nombre}</h5>
                <p class="text-muted">$${cancha.precio_hora.toLocaleString()} por hora</p>
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
     
     // Si es MagnaSports, crear estructura especial del galpón
     if (complejoSeleccionado && complejoSeleccionado.nombre === 'MagnaSports') {
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
         
         // Ordenar canchas para MagnaSports: Cancha 1 a la izquierda, Cancha 2 a la derecha
         const canchasOrdenadas = [...canchas].sort((a, b) => {
             const numeroA = parseInt(a.nombre.match(/\d+/)[0]);
             const numeroB = parseInt(b.nombre.match(/\d+/)[0]);
             return numeroA - numeroB;
         });
         
         canchasOrdenadas.forEach(cancha => {
             const canchaCard = document.createElement('div');
             canchaCard.className = 'cancha-card disponible';
             canchaCard.dataset.canchaId = cancha.id;
             canchaCard.dataset.precio = cancha.precio_hora;
             
             const iconClass = tipoCanchaSeleccionado === 'futbol' ? 'fa-futbol' : 'fa-table-tennis';
             
             canchaCard.innerHTML = `
                 <div class="cancha-icon">
                     <i class="fas ${iconClass}"></i>
                 </div>
                 <h5>${cancha.nombre.replace('Cancha Techada', 'Cancha')}</h5>
                 <p class="text-muted">$${cancha.precio_hora.toLocaleString()} por hora</p>
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
         
         // Agregar clase para identificar que es MagnaSports
         grid.parentElement.classList.add('complejo-magnasports');
     } else {
         // Para otros complejos, usar estructura normal
         grid.parentElement.classList.remove('complejo-magnasports');
         
         canchas.forEach(cancha => {
             const canchaCard = document.createElement('div');
             canchaCard.className = 'cancha-card disponible';
             canchaCard.dataset.canchaId = cancha.id;
             canchaCard.dataset.precio = cancha.precio_hora;
             
             const iconClass = tipoCanchaSeleccionado === 'futbol' ? 'fa-futbol' : 'fa-table-tennis';
             
             canchaCard.innerHTML = `
                 <div class="cancha-icon">
                     <i class="fas ${iconClass}"></i>
                 </div>
                 <h5>${cancha.nombre}</h5>
                 <p class="text-muted">$${cancha.precio_hora.toLocaleString()} por hora</p>
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
    
    canchaSeleccionada = cancha;
    mostrarModalReserva();
}

// Mostrar modal de reserva
function mostrarModalReserva() {
    // Limpiar completamente el formulario antes de mostrar el modal
    limpiarFormularioReserva();
    
    const modal = new bootstrap.Modal(document.getElementById('reservaModal'));
    
    // Actualizar resumen
    const resumen = document.getElementById('resumenReserva');
    const fecha = document.getElementById('fechaSelect').value;
    const hora = document.getElementById('horaSelect').value;
    
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
             <div class="col-6">${formatearFecha(fecha)}</div>
         </div>
         <div class="row">
             <div class="col-6"><strong>Hora:</strong></div>
             <div class="col-6">${hora}</div>
         </div>
         <div class="row">
             <div class="col-6"><strong>Precio:</strong></div>
             <div class="col-6">$${canchaSeleccionada.precio_hora.toLocaleString()}</div>
         </div>
     `;
    
    modal.show();
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
    
    const formData = {
        cancha_id: canchaSeleccionada.id,
        fecha: document.getElementById('fechaSelect').value,
        hora_inicio: document.getElementById('horaSelect').value,
        hora_fin: calcularHoraFin(document.getElementById('horaSelect').value),
        nombre_cliente: document.getElementById('nombreCliente').value,
        rut_cliente: document.getElementById('rutCliente').value,
        email_cliente: document.getElementById('emailCliente').value,
        telefono_cliente: document.getElementById('telefonoCliente').value,
        precio_total: canchaSeleccionada.precio_hora
    };
    
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
        const response = await fetch(`${API_BASE}/reservas/bloquear-y-pagar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...formData,
                session_id: sessionId
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Bloqueo temporal creado, redirigiendo a pago...', result);
            
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
        const reserva = await response.json();
        
        if (response.ok) {
            mostrarResultadoReserva(reserva);
        } else {
            mostrarNotificacion('Reserva no encontrada', 'danger');
        }
    } catch (error) {
        mostrarNotificacion('Error al buscar la reserva', 'danger');
    }
}

// Mostrar resultado de búsqueda
function mostrarResultadoReserva(reserva) {
    const resultadoDiv = document.getElementById('resultadoReserva');
    
    // Corregir nombres de campos y valores undefined
    const complejo = reserva.complejo_nombre || reserva.nombre_complejo || 'No especificado';
    const cancha = reserva.cancha_nombre || reserva.nombre_cancha || 'No especificada';
    const tipo = reserva.tipo === 'futbol' ? 'Fútbol' : (reserva.tipo || 'No especificado');
    const fecha = formatearFecha(reserva.fecha);
    const hora = formatearRangoHoras(reserva.hora_inicio, reserva.hora_fin);
    const estado = reserva.estado || 'No especificado';
    const precio = reserva.precio_total ? reserva.precio_total.toLocaleString() : 'No especificado';
    
    resultadoDiv.innerHTML = `
        <div class="card bg-light">
            <div class="card-body">
                <h5 class="card-title">
                    <i class="fas fa-ticket-alt me-2"></i>
                    Reserva #${reserva.codigo_reserva}
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
                    <p><strong>Cliente:</strong> ${reserva.nombre_cliente || 'No especificado'}</p>
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
