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

// Función SIMPLIFICADA para pre-rellenar campos desde URL
async function preRellenarDesdeURL() {
    console.log('🔍 Iniciando preRellenarDesdeURL SIMPLIFICADO...');
    const { ciudad, complejo } = leerParametrosURL();
    
    if (!ciudad && !complejo) {
        console.log('🔍 No hay parámetros URL, saltando pre-rellenado');
        return;
    }
    
    console.log('📋 Parámetros URL:', { ciudad, complejo });
    
    // 1. Seleccionar ciudad
    if (ciudad) {
        const ciudadEncontrada = ciudades.find(c => c.nombre === ciudad);
        if (ciudadEncontrada) {
            const ciudadSelect = document.getElementById('ciudadSelect');
            if (ciudadSelect) {
                ciudadSelect.value = ciudadEncontrada.id;
                mostrarPaso(2);
                console.log('✅ Ciudad seleccionada:', ciudad);
                
                // 2. Cargar complejos
                await cargarComplejos(ciudadEncontrada.id);
                
                // 3. Seleccionar complejo si existe
                if (complejo) {
                    setTimeout(() => {
                        const complejoEncontrado = complejos.find(c => c.nombre === complejo);
                        if (complejoEncontrado) {
                            const complejoSelect = document.getElementById('complejoSelect');
                            if (complejoSelect) {
                                complejoSelect.value = complejoEncontrado.id;
                                complejoSeleccionado = complejoEncontrado;
                                mostrarPaso(3);
                                console.log('✅ Complejo seleccionado:', complejo);
                                
                                // 4. Si es MagnaSports, seleccionar fútbol automáticamente
                                if (complejoEncontrado.nombre === 'MagnaSports') {
                                    document.getElementById('futbol').checked = true;
                                    tipoCanchaSeleccionado = 'futbol';
                                    
                                    // Ocultar opción de padel
                                    document.getElementById('padel').parentElement.style.display = 'none';
                                    document.getElementById('futbol').parentElement.style.display = 'block';
                                    
                                    mostrarPaso(4);
                                    console.log('✅ MagnaSports configurado - solo fútbol');
                                }
                                
                                // 5. Hacer scroll
                                setTimeout(() => {
                                    scrollToStep4();
                                    console.log('✅ Scroll realizado');
                                }, 1000);
                            }
                        }
                    }, 1500); // Esperar 1.5 segundos para cargar complejos
                }
            }
        }
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
        complejoSelect.addEventListener('change', async function() {
            const complejoId = this.value;
            if (complejoId) {
                complejoSeleccionado = complejos.find(c => c.id == complejoId);
                await cargarHorariosComplejo(complejoSeleccionado);
                
                // Si es MagnaSports, automáticamente seleccionar fútbol y ocultar opciones de padel
                if (complejoSeleccionado.nombre === 'MagnaSports') {
                    // Seleccionar automáticamente fútbol
                    document.getElementById('futbol').checked = true;
                    tipoCanchaSeleccionado = 'futbol';
                    
                    // Ocultar opción de padel
                    document.getElementById('padel').parentElement.style.display = 'none';
                    document.getElementById('futbol').parentElement.style.display = 'block';
                    
                    // Centrar la opción de fútbol
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
                        futbolLabel.style.justifyContent = 'center';
                        futbolLabel.style.gap = '10px';
                    }
                } else {
                    // Mostrar ambas opciones para otros complejos
                    document.getElementById('padel').parentElement.style.display = 'block';
                    document.getElementById('futbol').parentElement.style.display = 'block';
                    
                    // Restaurar layout normal
                    const step3CardBody = document.getElementById('step3').querySelector('.card-body');
                    step3CardBody.style.display = '';
                    step3CardBody.style.justifyContent = '';
                    step3CardBody.style.alignItems = '';
                    step3CardBody.style.textAlign = '';
                }
                
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
                tipoCanchaSeleccionado = this.value;
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
    
    // Botón ver disponibilidad
    document.getElementById('verDisponibilidad').addEventListener('click', function() {
        if (complejoSeleccionado && tipoCanchaSeleccionado) {
            mostrarSeccionDisponibilidad();
        }
    });
    
    // Event listeners para fecha y hora
    document.getElementById('fechaSelect').addEventListener('change', function() {
        actualizarDisponibilidad();
    });
    document.getElementById('horaSelect').addEventListener('change', function() {
        actualizarDisponibilidad();
        // Cargar canchas cuando se selecciona una hora
        if (complejoSeleccionado && tipoCanchaSeleccionado && this.value) {
            cargarCanchas(complejoSeleccionado.id, tipoCanchaSeleccionado);
        }
    });
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

// Cargar horarios específicos según el complejo
async function cargarHorariosComplejo(complejo) {
    const horaSelect = document.getElementById('horaSelect');
    horaSelect.innerHTML = '<option value="">Selecciona una hora...</option>';
    
    let horarios = [];
    
    // Definir horarios según el complejo
    if (complejo.nombre === 'MagnaSports') {
        // MagnaSports: 16:00-23:00 entre semana, 12:00-23:00 fines de semana
        const fecha = document.getElementById('fechaSelect').value;
        if (fecha) {
            const fechaObj = new Date(fecha + 'T00:00:00');
            const diaSemana = fechaObj.getDay(); // 0 = domingo, 6 = sábado
            
            if (diaSemana === 0 || diaSemana === 6) {
                // Fines de semana: 12:00-23:00
                horarios = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
            } else {
                // Entre semana: 16:00-23:00
                horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
            }
        } else {
            // Si no hay fecha, cargar horarios de entre semana por defecto
            horarios = ['16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
        }
    } else {
        // Otros complejos: horarios estándar
        horarios = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
    }
    
    horarios.forEach(hora => {
        const option = document.createElement('option');
        option.value = hora;
        option.textContent = hora;
        horaSelect.appendChild(option);
    });
}

// Función para mostrar sección de disponibilidad
function mostrarSeccionDisponibilidad() {
    document.getElementById('disponibilidad').style.display = 'block';
    document.getElementById('disponibilidad').scrollIntoView({ behavior: 'smooth' });
}

// Función para cargar canchas
async function cargarCanchas(complejoId, tipo) {
    try {
        const response = await fetch(`${API_BASE}/canchas/${complejoId}/${tipo}`);
        canchas = await response.json();
        renderizarCanchas();
    } catch (error) {
        console.error('Error cargando canchas:', error);
    }
}

// Renderizar canchas
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
        
        canchas.forEach(cancha => {
            const canchaCard = document.createElement('div');
            canchaCard.className = 'cancha-card magnasports';
            canchaCard.innerHTML = `
                <div class="cancha-icon">
                    <i class="fas fa-futbol"></i>
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
    } else {
        // Otros complejos: diseño estándar
        canchas.forEach(cancha => {
            const canchaCard = document.createElement('div');
            canchaCard.className = 'cancha-card';
            
            const iconClass = cancha.tipo === 'futbol' ? 'fa-futbol' : 'fa-table-tennis';
            
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

// Función para seleccionar cancha
function seleccionarCancha(cancha) {
    canchaSeleccionada = cancha;
    console.log('Cancha seleccionada:', cancha);
    
    // Aquí puedes agregar lógica adicional para la selección
    // Por ejemplo, abrir un modal de reserva
}

// Función para actualizar disponibilidad
function actualizarDisponibilidad() {
    // Implementar lógica de disponibilidad
    console.log('Actualizando disponibilidad...');
}

// Inicialización principal
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== INICIALIZACIÓN URL SIMPLE ===');
    
    try {
        // Cargar ciudades
        await cargarCiudades();
        
        // Configurar event listeners
        configurarEventListeners();
        configurarFechaMinima();
        
        // Pre-rellenar si hay parámetros URL
        const { ciudad, complejo } = leerParametrosURL();
        if (ciudad || complejo) {
            await preRellenarDesdeURL();
        }
        
    } catch (error) {
        console.error('Error en inicialización:', error);
    }
    
    console.log('=== FIN INICIALIZACIÓN ===');
});

// Funciones globales para compatibilidad
window.scrollToReservar = scrollToStep4;
window.scrollToStep4 = scrollToStep4;
window.mostrarPaso = mostrarPaso;
window.cargarComplejos = cargarComplejos;
