// ========================================
// DISEÑO COMPLETO NUEVO - COMPLEJO DEMO 3
// ========================================

// Variable global para el deporte seleccionado
let deporteSeleccionado = null;

// Función para aplicar colores según deporte seleccionado
function aplicarColoresPorDeporte() {
    console.log('🎨 Aplicando colores por deporte seleccionado:', deporteSeleccionado);
    
    const futbolIzquierda = document.querySelector('.demo3-futbol-izquierda');
    const futbolDerecha = document.querySelector('.demo3-futbol-derecha');
    const padelSuperior = document.querySelector('.demo3-padel-superior');
    const cancha3Horizontal = document.querySelector('.demo3-cancha-horizontal');
    
    // Verificar si hay un deporte seleccionado
    if (!deporteSeleccionado) {
        console.log('⚪ No hay deporte seleccionado, ocultando complejo');
        ocultarComplejoDemo3();
        return;
    }
    
    // Mostrar el complejo cuando hay un deporte seleccionado
    mostrarComplejoDemo3();
    
    if (deporteSeleccionado === 'futbol') {
        // FÚTBOL SELECCIONADO: Canchas de fútbol verdes, pádel gris
        console.log('⚽ Aplicando colores para FÚTBOL seleccionado');
        
        // Canchas de fútbol - Verdes (disponibles)
        [futbolIzquierda, futbolDerecha, cancha3Horizontal].forEach(cancha => {
            if (cancha) {
                cancha.style.setProperty('background', 'linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%)', 'important');
                cancha.style.setProperty('border-color', '#28a745', 'important');
                cancha.style.setProperty('cursor', 'pointer', 'important');
                cancha.style.setProperty('opacity', '1', 'important');
                console.log('✅ Aplicando verde a cancha:', cancha.className);
            }
        });
        
        // Cancha de pádel - Gris (no seleccionable)
        if (padelSuperior) {
            padelSuperior.style.setProperty('background', '#f8f9fa', 'important');
            padelSuperior.style.setProperty('border-color', '#6c757d', 'important');
            padelSuperior.style.setProperty('cursor', 'not-allowed', 'important');
            padelSuperior.style.setProperty('opacity', '0.6', 'important');
            console.log('✅ Aplicando gris a cancha pádel');
        }
        
    } else if (deporteSeleccionado === 'padel') {
        // PÁDEL SELECCIONADO: Cancha de pádel azul, fútbol gris
        console.log('🏓 Aplicando colores para PÁDEL seleccionado');
        
        // Cancha de pádel - Azul (disponible)
        if (padelSuperior) {
            padelSuperior.style.setProperty('background', 'linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)', 'important');
            padelSuperior.style.setProperty('border-color', '#17a2b8', 'important');
            padelSuperior.style.setProperty('cursor', 'pointer', 'important');
            padelSuperior.style.setProperty('opacity', '1', 'important');
            console.log('✅ Aplicando azul a cancha pádel');
        }
        
        // Canchas de fútbol - Gris (no seleccionables)
        [futbolIzquierda, futbolDerecha, cancha3Horizontal].forEach(cancha => {
            if (cancha) {
                cancha.style.setProperty('background', '#f8f9fa', 'important');
                cancha.style.setProperty('border-color', '#6c757d', 'important');
                cancha.style.setProperty('cursor', 'not-allowed', 'important');
                cancha.style.setProperty('opacity', '0.6', 'important');
                console.log('✅ Aplicando gris a cancha fútbol:', cancha.className);
            }
        });
        
    } else {
        // NINGÚN DEPORTE SELECCIONADO: Colores normales
        console.log('⚪ Aplicando colores normales (sin deporte seleccionado)');
        
        // Restaurar colores originales
        [futbolIzquierda, futbolDerecha, padelSuperior, cancha3Horizontal].forEach(cancha => {
            if (cancha) {
                cancha.style.background = '#f8f9fa';
                cancha.style.borderColor = cancha === padelSuperior ? '#6c757d' : '#28a745';
                cancha.style.cursor = 'pointer';
                cancha.style.opacity = '1';
            }
        });
    }
}

// Función para detectar cambios en la selección de deporte
function detectarCambioDeporte() {
    const radioButtons = document.querySelectorAll('input[name="tipoCancha"]');
    
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            deporteSeleccionado = this.value;
            console.log('🎯 Deporte seleccionado cambiado a:', deporteSeleccionado);
            aplicarColoresPorDeporte();
        });
    });
    
    // También detectar si ya hay un deporte seleccionado al cargar
    const deporteSeleccionadoInicial = document.querySelector('input[name="tipoCancha"]:checked');
    if (deporteSeleccionadoInicial) {
        deporteSeleccionado = deporteSeleccionadoInicial.value;
        console.log('🎯 Deporte ya seleccionado al cargar:', deporteSeleccionado);
        aplicarColoresPorDeporte();
    }
    
    // Detectar cuando se resetea la selección (cambio de complejo)
    const complejoSelect = document.getElementById('complejoSelect');
    if (complejoSelect) {
        complejoSelect.addEventListener('change', function() {
            console.log('🔄 Complejo cambiado, reseteando deporte seleccionado');
            deporteSeleccionado = null;
            aplicarColoresPorDeporte();
        });
    }
    
    // Detectar cuando se selecciona horario
    const horaSelect = document.getElementById('horaSelect');
    if (horaSelect) {
        horaSelect.addEventListener('change', function() {
            console.log('🕐 Hora seleccionada, re-aplicando estilos del complejo');
            setTimeout(() => {
                reaplicarEstilosComplejo();
            }, 100);
        });
    }
    
    // Detectar cuando se selecciona fecha
    const fechaSelect = document.getElementById('fechaSelect');
    if (fechaSelect) {
        fechaSelect.addEventListener('change', function() {
            console.log('📅 Fecha seleccionada, re-aplicando estilos del complejo');
            setTimeout(() => {
                reaplicarEstilosComplejo();
            }, 100);
        });
    }
}

// Función para ocultar el complejo demo 3 cuando se cambia de deporte
function ocultarComplejoDemo3() {
    const demo3Container = document.querySelector('.demo3-container');
    const canchasHorizontales = document.querySelector('.canchas-horizontales');
    
    if (demo3Container) {
        demo3Container.style.display = 'none';
        console.log('🚫 Complejo Demo 3 ocultado');
    }
    
    if (canchasHorizontales) {
        canchasHorizontales.style.display = 'none';
        console.log('🚫 Canchas horizontales ocultadas');
    }
}

// Función para mostrar el complejo demo 3 cuando se selecciona deporte
function mostrarComplejoDemo3() {
    const demo3Container = document.querySelector('.demo3-container');
    const canchasHorizontales = document.querySelector('.canchas-horizontales');
    
    if (demo3Container) {
        demo3Container.style.display = 'flex';
        console.log('✅ Complejo Demo 3 mostrado');
    }
    
    if (canchasHorizontales) {
        canchasHorizontales.style.display = 'flex';
        console.log('✅ Canchas horizontales mostradas');
    }
}

// Función para re-aplicar estilos cuando se selecciona horario
function reaplicarEstilosComplejo() {
    console.log('🔄 Re-aplicando estilos del complejo...');
    
    // Re-aplicar diseño limpio
    aplicarDiseñoLimpioDemo3();
    
    // Re-aplicar colores por deporte
    aplicarColoresPorDeporte();
    
    console.log('✅ Estilos del complejo re-aplicados');
}

function aplicarDiseñoLimpioDemo3() {
    console.log('🎨 === APLICANDO DISEÑO LIMPIO DEMO 3 ===');
    
    // Buscar el contenedor demo3
    const demo3Container = document.querySelector('.demo3-container');
    if (!demo3Container) {
        console.log('❌ No se encontró demo3-container');
        return;
    }
    
    // Buscar el contenedor padre
    const canchasHorizontales = demo3Container.closest('.canchas-horizontales');
    if (!canchasHorizontales) {
        console.log('❌ No se encontró canchas-horizontales');
        return;
    }
    
    // Aplicar estilos al contenedor principal
    demo3Container.style.cssText = `
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 20px !important;
        width: 100% !important;
        min-width: 100% !important;        /* ← FORZAR ancho mínimo */
        max-width: none !important;        /* ← Sin límite máximo */
        margin: 0 !important;              /* ← Sin márgenes */
        padding: 0 !important;             /* ← Sin padding */
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        box-sizing: border-box !important; /* ← Cálculo correcto */
    `;
    
    // Aplicar estilos al contenedor padre
    canchasHorizontales.style.cssText = `
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        width: 100% !important;
        max-width: none !important;
        min-height: 320px !important;
        padding: 20px !important;
        margin: 0 !important;
        background: transparent !important;
        overflow: visible !important;
    `;
    
    // Aplicar estilos a las canchas individuales
    const futbolIzquierda = demo3Container.querySelector('.demo3-futbol-izquierda');
    const futbolDerecha = demo3Container.querySelector('.demo3-futbol-derecha');
    const padelCancha = demo3Container.querySelector('.demo3-padel-superior');
    
    // Estilos para canchas de fútbol
    [futbolIzquierda, futbolDerecha].forEach((cancha, index) => {
        if (cancha) {
            cancha.style.cssText = `
                width: 250px !important;
                height: 400px !important;
                flex-shrink: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                align-items: center !important;
                background: #f8f9fa !important;
                border: 2px solid #28a745 !important;
                border-radius: 12px !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
                transition: transform 0.2s ease !important;
                margin: 0 !important;
                padding: 20px !important;
                gap: 12px !important;
                overflow: hidden !important;
                position: relative !important;
                box-sizing: border-box !important;
            `;
            
            // Agregar hover effect
            cancha.addEventListener('mouseenter', () => {
                cancha.style.transform = 'translateY(-2px)';
                cancha.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
            });
            
            cancha.addEventListener('mouseleave', () => {
                cancha.style.transform = 'translateY(0)';
                cancha.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            });
            
            // Ajustar iconos y contenido de fútbol
            const futbolIconContainer = cancha.querySelector('.cancha-icon');
            if (futbolIconContainer) {
                futbolIconContainer.style.flexShrink = '0';
                futbolIconContainer.style.marginTop = '30px';
            }
            
            const futbolIcon = cancha.querySelector('.fas');
            if (futbolIcon) {
                futbolIcon.style.fontSize = '40px';
                futbolIcon.style.color = '#28a745';
            }
            
            const futbolInfo = cancha.querySelector('.cancha-info');
            if (futbolInfo) {
                futbolInfo.style.flex = '0';
                futbolInfo.style.textAlign = 'center';
                futbolInfo.style.width = '100%';
            }
            
            // Asegurar que el texto de jugadores se vea
            const jugadoresText = cancha.querySelector('.text-info.small');
            if (jugadoresText) {
                jugadoresText.style.display = 'block';
                jugadoresText.style.visibility = 'visible';
                jugadoresText.style.opacity = '1';
                jugadoresText.style.color = '#17a2b8';
                jugadoresText.style.fontSize = '0.85rem';
                jugadoresText.style.margin = '1px 0';
                jugadoresText.style.lineHeight = '1.2';
                jugadoresText.style.position = 'relative';
                jugadoresText.style.zIndex = '10';
                jugadoresText.style.whiteSpace = 'normal';
                jugadoresText.style.fontWeight = '600';
                jugadoresText.style.textAlign = 'center';
                jugadoresText.style.width = '100%';
                jugadoresText.style.maxWidth = '100%';
                jugadoresText.style.overflow = 'visible';
                jugadoresText.style.textOverflow = 'unset';
                jugadoresText.style.padding = '0';
                jugadoresText.style.background = 'transparent';
                jugadoresText.style.borderRadius = '0';
                console.log('✅ Texto de jugadores encontrado en fútbol:', jugadoresText.textContent);
            } else {
                console.log('❌ No se encontró texto de jugadores en fútbol');
            }
            
            console.log(`✅ Cancha fútbol ${index + 1} estilizada`);
        }
    });
    
    // Estilos para cancha de padel
    if (padelCancha) {
        padelCancha.style.cssText = `
            width: 210px !important;
            min-width: 210px !important;
            max-width: 210px !important;
            height: 400px !important;
            flex: 0 0 210px !important;
            flex-shrink: 0 !important;
            flex-grow: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            background: #f8f9fa !important;
            border: 2px solid #6c757d !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
            transition: transform 0.2s ease !important;
            margin: 0 !important;
            padding: 20px !important;
            gap: 12px !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            position: relative !important;
        `;
        
        // Forzar el ancho también en el elemento padre si existe
        const padelParent = padelCancha.parentElement;
        if (padelParent) {
            padelParent.style.width = '210px';
            padelParent.style.minWidth = '210px';
            padelParent.style.maxWidth = '210px';
        }
        
        // Agregar hover effect
        padelCancha.addEventListener('mouseenter', () => {
            padelCancha.style.transform = 'translateY(-2px)';
            padelCancha.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
        });
        
        padelCancha.addEventListener('mouseleave', () => {
            padelCancha.style.transform = 'translateY(0)';
            padelCancha.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        });
        
        // Ajustar iconos y contenido de padel
        const padelIconContainer = padelCancha.querySelector('.cancha-icon');
        if (padelIconContainer) {
            padelIconContainer.style.flexShrink = '0';
            padelIconContainer.style.marginTop = '30px';
        }
        
        const padelIcon = padelCancha.querySelector('.fas');
        if (padelIcon) {
            padelIcon.style.fontSize = '40px';
            padelIcon.style.color = '#6c757d';
        }
        
        const padelInfo = padelCancha.querySelector('.cancha-info');
        if (padelInfo) {
            padelInfo.style.flex = '0';
            padelInfo.style.textAlign = 'center';
            padelInfo.style.width = '100%';
        }
        
        // Asegurar que el texto de jugadores se vea en padel
        const padelJugadoresText = padelCancha.querySelector('.text-info.small');
        if (padelJugadoresText) {
            padelJugadoresText.style.display = 'block';
            padelJugadoresText.style.visibility = 'visible';
            padelJugadoresText.style.opacity = '1';
            padelJugadoresText.style.color = '#17a2b8';
            padelJugadoresText.style.fontSize = '0.85rem';
            padelJugadoresText.style.margin = '1px 0';
            padelJugadoresText.style.lineHeight = '1.2';
            padelJugadoresText.style.position = 'relative';
            padelJugadoresText.style.zIndex = '10';
            padelJugadoresText.style.whiteSpace = 'normal';
            padelJugadoresText.style.fontWeight = '600';
            padelJugadoresText.style.textAlign = 'center';
            padelJugadoresText.style.width = '100%';
            padelJugadoresText.style.maxWidth = '100%';
            padelJugadoresText.style.overflow = 'visible';
            padelJugadoresText.style.textOverflow = 'unset';
            padelJugadoresText.style.padding = '0';
            padelJugadoresText.style.background = 'transparent';
            padelJugadoresText.style.borderRadius = '0';
            console.log('✅ Texto de jugadores encontrado en padel:', padelJugadoresText.textContent);
        } else {
            console.log('❌ No se encontró texto de jugadores en padel');
        }
        
        console.log('✅ Cancha padel estilizada');
    }
    
    // Limpiar cualquier estilo conflictivo de cancha-card
    const canchaCards = demo3Container.querySelectorAll('.cancha-card');
    canchaCards.forEach(card => {
        card.style.cssText = `
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
        `;
    });
    
    // Estilos para contenedor de Cancha 3 - Ancho exacto desde borde izquierdo cancha 1 hasta borde derecho cancha 2
    const contenedorCancha3 = demo3Container.querySelector('.demo3-contenedor-cancha3');
    if (contenedorCancha3) {
        contenedorCancha3.style.cssText = `
            width: 520px !important; /* ← Ancho exacto: 250px (cancha 1) + 20px (gap) + 250px (cancha 2) */
            min-width: 520px !important;
            max-width: 520px !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            justify-content: center !important;
            box-sizing: border-box !important;
        `;
    }

    // Estilos para Cancha 3 horizontal - Solución definitiva
    const canchaHorizontal = demo3Container.querySelector('.demo3-cancha-horizontal');
    if (canchaHorizontal) {
        canchaHorizontal.style.cssText = `
            width: 100% !important;               /* ← Ancho completo del contenedor */
            min-width: 100% !important;          /* ← Forzar ancho mínimo */
            max-width: 100% !important;          /* ← Limitar ancho máximo */
            min-height: 250px !important;
            max-height: 300px !important;
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-around !important;
            align-items: center !important;
            padding: 20px 15px !important;        /* ← REDUCIDO: De 30px a 15px */
            gap: 30px !important;
            background: white !important;
            border: 3px solid #2E7D32 !important;
            border-radius: 16px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
            box-sizing: border-box !important;   /* ← Cálculo correcto */
            margin: 0 !important;                /* ← Sin márgenes */
        `;
        
        // Estilizar sección izquierda
        const canchaIzquierda = canchaHorizontal.querySelector('.cancha-izquierda');
        if (canchaIzquierda) {
            canchaIzquierda.style.cssText = `
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 10px !important;
            `;
        }
        
        // Estilizar badge
        const canchaBadge = canchaHorizontal.querySelector('.cancha-badge');
        if (canchaBadge) {
            canchaBadge.style.cssText = `
                background: #333 !important;
                color: white !important;
                padding: 6px 16px !important;
                border-radius: 20px !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                white-space: nowrap !important;
            `;
        }
        
        // Estilizar ícono grande - Usar mismo ícono de fútbol que canchas 1 y 2
        const canchaIconoGrande = canchaHorizontal.querySelector('.cancha-icono-grande');
        if (canchaIconoGrande) {
            canchaIconoGrande.style.cssText = `
                font-size: 50px !important;
                color: #28a745 !important; /* ← Mismo color verde que canchas de fútbol */
            `;
            
            // Cambiar el ícono a pelota de fútbol (si no lo es ya)
            const iconElement = canchaIconoGrande.querySelector('i');
            if (iconElement) {
                iconElement.className = 'fas fa-futbol'; // ← Ícono de pelota de fútbol
                iconElement.style.color = '#28a745';
            } else {
                // Si no hay elemento i, crear uno
                canchaIconoGrande.innerHTML = '<i class="fas fa-futbol" style="color: #28a745;"></i>';
            }
        }
        
        // Estilizar sección centro
        const canchaCentro = canchaHorizontal.querySelector('.cancha-centro');
        if (canchaCentro) {
            canchaCentro.style.cssText = `
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 8px !important;
                flex: 1 !important;
            `;
        }
        
        // Estilizar nombre
        const canchaNombre = canchaHorizontal.querySelector('.cancha-nombre');
        if (canchaNombre) {
            canchaNombre.style.cssText = `
                font-size: 28px !important;
                font-weight: 700 !important;
                color: #555 !important;
                margin: 0 !important;
            `;
        }
        
        // Estilizar precio
        const canchaPrecio = canchaHorizontal.querySelector('.cancha-precio');
        if (canchaPrecio) {
            canchaPrecio.style.cssText = `
                font-size: 18px !important;
                color: #666 !important;
                margin: 0 !important;
            `;
        }
        
        // Estilizar jugadores
        const canchaJugadores = canchaHorizontal.querySelector('.cancha-jugadores');
        if (canchaJugadores) {
            canchaJugadores.style.cssText = `
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                color: #17a2b8 !important; /* ← Mismo color que canchas 1 y 2 */
                font-weight: 600 !important;
            `;
            
            // Estilizar el ícono de personas para que sea igual a las canchas 1 y 2
            const iconoPersonas = canchaJugadores.querySelector('.fas.fa-users');
            if (iconoPersonas) {
                iconoPersonas.style.cssText = `
                    color: #17a2b8 !important; /* ← Mismo color que canchas 1 y 2 */
                    font-size: 2.3rem !important; /* ← Tamaño perfecto y muy visible */
                    margin-right: 8px !important; /* ← Margen ajustado para ícono grande */
                `;
            }
        }
        
        // Estilizar botón
        const canchaBoton = canchaHorizontal.querySelector('.cancha-boton');
        if (canchaBoton) {
            canchaBoton.style.cssText = `
                padding: 12px 24px !important;
                background: #2E7D32 !important;
                color: white !important;
                border: none !important;
                border-radius: 8px !important;
                font-weight: 700 !important;
                font-size: 16px !important;
                cursor: pointer !important;
                transition: background 0.2s ease !important;
            `;
            
            // Agregar hover effect
            canchaBoton.addEventListener('mouseenter', () => {
                canchaBoton.style.background = '#1B5E20';
            });
            
            canchaBoton.addEventListener('mouseleave', () => {
                canchaBoton.style.background = '#2E7D32';
            });
        }
        
        console.log('✅ Cancha 3 horizontal estilizada con solución definitiva');
    }
    
    // Configurar detección de cambios de deporte
    detectarCambioDeporte();
    
    console.log('🎨 === DISEÑO LIMPIO APLICADO EXITOSAMENTE ===');
}

// Función para ejecutar cuando se detecte el demo3-container
function ejecutarCuandoEsteListo() {
    const demo3Container = document.querySelector('.demo3-container');
    if (demo3Container) {
        console.log('🎨 demo3-container encontrado, aplicando diseño limpio...');
        aplicarDiseñoLimpioDemo3();
    } else {
        // Si no está listo, intentar de nuevo en 500ms
        setTimeout(ejecutarCuandoEsteListo, 500);
    }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ejecutarCuandoEsteListo);
} else {
    ejecutarCuandoEsteListo();
}

// También ejecutar después de delays adicionales para asegurar que se aplique
setTimeout(ejecutarCuandoEsteListo, 2000);
setTimeout(ejecutarCuandoEsteListo, 3000);

// Configurar detección de deporte después de un delay adicional
setTimeout(() => {
    detectarCambioDeporte();
    aplicarColoresPorDeporte();
    console.log('🔄 Detección de deporte configurada con delay');
}, 1000);

// Forzar aplicación de colores después de un delay más largo
setTimeout(() => {
    console.log('🔄 Forzando aplicación de colores por deporte...');
    aplicarColoresPorDeporte();
}, 4000);

// Configurar detección de cambios después de un delay adicional
setTimeout(() => {
    console.log('🔄 Configurando detección de cambios de deporte...');
    detectarCambioDeporte();
}, 5000);

// Re-aplicar estilos de padel específicamente después de un delay adicional
setTimeout(() => {
    const padelCancha = document.querySelector('.demo3-padel-superior');
    if (padelCancha) {
        padelCancha.style.width = '210px';
        padelCancha.style.minWidth = '210px';
        padelCancha.style.maxWidth = '210px';
        padelCancha.style.flex = '0 0 210px';
        console.log('🔄 Estilos de padel re-aplicados con delay (210px)');
    }
}, 1000);

// Re-aplicar estilos de texto de jugadores después de un delay
setTimeout(() => {
    console.log('🔍 Buscando elementos de texto de jugadores...');
    
    // Buscar todos los elementos text-info.small en las canchas demo3
    const allTextInfo = document.querySelectorAll('.text-info.small');
    console.log('🔍 Total elementos .text-info.small encontrados:', allTextInfo.length);
    
    // Buscar específicamente en las canchas demo3
    const jugadoresTexts = document.querySelectorAll('.demo3-futbol-izquierda .text-info.small, .demo3-futbol-derecha .text-info.small, .demo3-padel-superior .text-info.small');
    console.log('🔍 Elementos .text-info.small en canchas demo3:', jugadoresTexts.length);
    
    // También buscar en cancha-info
    const canchaInfoTexts = document.querySelectorAll('.demo3-futbol-izquierda .cancha-info .text-info.small, .demo3-futbol-derecha .cancha-info .text-info.small, .demo3-padel-superior .cancha-info .text-info.small');
    console.log('🔍 Elementos .text-info.small en .cancha-info:', canchaInfoTexts.length);
    
    // Aplicar estilos a todos los elementos encontrados
    const allJugadoresTexts = [...jugadoresTexts, ...canchaInfoTexts];
    allJugadoresTexts.forEach(text => {
        text.style.display = 'block';
        text.style.visibility = 'visible';
        text.style.opacity = '1';
        text.style.color = '#17a2b8';
        text.style.fontSize = '0.85rem';
        text.style.margin = '1px 0';
        text.style.lineHeight = '1.2';
        text.style.position = 'relative';
        text.style.zIndex = '10';
        text.style.whiteSpace = 'normal';
        text.style.fontWeight = '600';
        text.style.textAlign = 'center';
        text.style.width = '100%';
        text.style.maxWidth = '100%';
        text.style.overflow = 'visible';
        text.style.textOverflow = 'unset';
        text.style.padding = '0';
        text.style.background = 'transparent';
        text.style.borderRadius = '0';
        console.log('🔄 Texto encontrado:', text.textContent);
    });
    console.log('🔄 Texto de jugadores re-aplicado:', allJugadoresTexts.length, 'elementos');
    
    // Re-aplicar estilos del ícono de personas en cancha 3
    const iconoPersonasCancha3 = document.querySelector('.demo3-cancha-horizontal .cancha-jugadores .fas.fa-users');
    if (iconoPersonasCancha3) {
        iconoPersonasCancha3.style.color = '#17a2b8';
        iconoPersonasCancha3.style.fontSize = '2.3rem'; /* ← Tamaño perfecto y muy visible */
        iconoPersonasCancha3.style.marginRight = '8px';
        console.log('🔄 Ícono de personas en cancha 3 re-aplicado');
    }
    
    // Re-aplicar colores por deporte después del delay
    aplicarColoresPorDeporte();
}, 2000);
