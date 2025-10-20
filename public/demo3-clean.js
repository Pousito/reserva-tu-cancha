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

    // IMPORTANTE: SOLO aplicar estilos de DESKTOP cuando la pantalla es > 768px
    const demo3ContainerInner = demo3Container.querySelector('.demo3-container-inner');
    if (demo3ContainerInner && window.innerWidth > 768) {
        demo3ContainerInner.style.cssText = `
            display: grid !important;
            grid-template-areas: "futbol-sup padel" "cancha3 cancha3" !important;
            grid-template-columns: 2fr 1fr !important;
            grid-template-rows: auto auto !important;
            gap: 20px !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 auto !important;
            padding: 20px !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
        `;
        console.log('✅ Estilos de DESKTOP aplicados al contenedor inner');
    } else if (demo3ContainerInner) {
        console.log('📱 MÓVIL detectado - NO aplicando estilos de desktop grid');
    }
    
    // SOLO aplicar estilos de desktop si window.innerWidth > 768
    if (window.innerWidth > 768) {
        // Aplicar estilos al contenedor padre - SOLO EN DESKTOP
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

        // Aplicar estilos a los contenedores de canchas
        const futbolSuperiores = demo3Container.querySelector('.demo3-futbol-superiores');
        const futbolIzquierda = demo3Container.querySelector('.demo3-futbol-izquierda');
        const futbolDerecha = demo3Container.querySelector('.demo3-futbol-derecha');
        const padelCancha = demo3Container.querySelector('.demo3-padel-superior');

        // Estilos para contenedor de canchas de fútbol superiores
        if (futbolSuperiores) {
            futbolSuperiores.style.cssText = `
                grid-area: futbol-sup !important;
                display: flex !important;
                gap: 20px !important;
                justify-content: space-between !important;
                align-items: stretch !important;
            `;
        }

        // Estilos para canchas de fútbol individuales - SOLO DESKTOP
        [futbolIzquierda, futbolDerecha].forEach((cancha, index) => {
            if (cancha) {
                cancha.style.cssText = `
                    flex: 1 !important;
                    min-width: 0 !important;
                    height: 400px !important;
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

        // Estilos para cancha de pádel (altura similar a canchas de fútbol) - SOLO DESKTOP
        if (padelCancha) {
            padelCancha.style.cssText = `
                grid-area: padel !important;
                width: 100% !important;
                height: 400px !important;
                min-height: 400px !important;
                max-height: 400px !important;
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

        // Limpiar cualquier estilo conflictivo de cancha-card - SOLO DESKTOP
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

        // Estilos para contenedor de Cancha 3 - Ocupa toda el área del grid - SOLO DESKTOP
        const contenedorCancha3 = demo3Container.querySelector('.demo3-contenedor-cancha3');
        if (contenedorCancha3) {
            contenedorCancha3.style.cssText = `
                grid-area: cancha3 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                display: flex !important;
                justify-content: stretch !important;
                align-items: stretch !important;
                box-sizing: border-box !important;
            `;
        }

        // Estilos para Cancha 3 horizontal - Ocupará todo el ancho disponible - SOLO DESKTOP
        const canchaHorizontal = demo3Container.querySelector('.demo3-cancha-horizontal');
        if (canchaHorizontal) {
            canchaHorizontal.style.cssText = `
                width: 100% !important;
                min-width: 100% !important;
                max-width: 100% !important;
                height: 250px !important;
                display: flex !important;
                flex-direction: row !important;
                justify-content: space-around !important;
                align-items: center !important;
                padding: 20px !important;
                gap: 30px !important;
                background: white !important;
                border: 3px solid #2E7D32 !important;
                border-radius: 16px !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
                box-sizing: border-box !important;
                margin: 0 !important;
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

        console.log('🎨 === ESTILOS DE DESKTOP APLICADOS EXITOSAMENTE ===');
    } // FIN if (window.innerWidth > 768)
    
    // Configurar detección de cambios de deporte
    detectarCambioDeporte();
    
    console.log('🎨 === DISEÑO LIMPIO APLICADO EXITOSAMENTE ===');
}

// DESHABILITADO COMPLETAMENTE - Dejar que CSS maneje todo
// function ejecutarCuandoEsteListo() {
//     const demo3Container = document.querySelector('.demo3-container');
//     if (demo3Container) {
//         console.log('🎨 demo3-container encontrado, aplicando diseño limpio...');
//         aplicarDiseñoLimpioDemo3();
//     } else {
//         // Si no está listo, intentar de nuevo en 500ms
//         setTimeout(ejecutarCuandoEsteListo, 500);
//     }
// }

// Ejecutar cuando el DOM esté listo
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', ejecutarCuandoEsteListo);
// } else {
//     ejecutarCuandoEsteListo();
// }

// También ejecutar después de delays adicionales para asegurar que se aplique
// setTimeout(ejecutarCuandoEsteListo, 2000);
// setTimeout(ejecutarCuandoEsteListo, 3000);

console.log('📱 demo3-clean.js: TODO EL JAVASCRIPT DESHABILITADO - Solo CSS activo');

// TODOS LOS TIMEOUTS DESHABILITADOS - Solo CSS
// setTimeout(() => {
//     detectarCambioDeporte();
//     aplicarColoresPorDeporte();
//     console.log('🔄 Detección de deporte configurada con delay');
// }, 1000);

// Función para layout móvil - GRID 2x2 SIMPLE
function forzarLayoutVerticalMovil() {
    const demo3ContainerInner = document.querySelector('.demo3-container-inner');
    if (demo3ContainerInner && window.innerWidth <= 768) {
        console.log('📱 ========== LAYOUT MÓVIL: GRID 2x2 ==========');
        console.log('📱 Ancho de ventana:', window.innerWidth);

        const altura = window.innerWidth <= 480 ? '120px' : '140px';
        const gap = window.innerWidth <= 480 ? '6px' : '8px';

        // Layout: Grid 2x2 simple
        demo3ContainerInner.style.setProperty('display', 'grid', 'important');
        demo3ContainerInner.style.setProperty('grid-template-columns', '1fr 1fr', 'important');
        demo3ContainerInner.style.setProperty('grid-template-rows', 'auto auto', 'important');
        demo3ContainerInner.style.setProperty('gap', gap, 'important');
        demo3ContainerInner.style.setProperty('width', '100%', 'important');
        demo3ContainerInner.style.setProperty('padding', '0', 'important');
        console.log('✅ Contenedor inner: Grid 2x2 configurado');

        // Ocultar wrapper de canchas fútbol superiores
        const futbolSuperiores = document.querySelector('.demo3-canchas-futbol-superiores');
        if (futbolSuperiores) {
            futbolSuperiores.style.setProperty('display', 'contents', 'important');
            console.log('✅ Wrapper futbol-superiores: display contents');
        }

        // Posicionar cada cancha en el grid
        const futbolIzquierda = document.querySelector('.demo3-futbol-izquierda');
        const futbolDerecha = document.querySelector('.demo3-futbol-derecha');
        const padelCancha = document.querySelector('.demo3-padel-superior');
        const cancha3 = document.querySelector('.demo3-cancha-horizontal');

        if (futbolIzquierda) {
            futbolIzquierda.style.setProperty('grid-column', '1', 'important');
            futbolIzquierda.style.setProperty('grid-row', '1', 'important');
            futbolIzquierda.style.setProperty('height', altura, 'important');
            console.log(`✅ Cancha 1 Fútbol: posición (1,1) - ${altura}`);
        }

        if (futbolDerecha) {
            futbolDerecha.style.setProperty('grid-column', '2', 'important');
            futbolDerecha.style.setProperty('grid-row', '1', 'important');
            futbolDerecha.style.setProperty('height', altura, 'important');
            console.log(`✅ Cancha 2 Fútbol: posición (2,1) - ${altura}`);
        }

        if (padelCancha) {
            padelCancha.style.setProperty('grid-column', '1', 'important');
            padelCancha.style.setProperty('grid-row', '2', 'important');
            padelCancha.style.setProperty('height', altura, 'important');
            console.log(`✅ Cancha Pádel: posición (1,2) - ${altura}`);
        }

        // Ocultar wrapper de cancha 3
        const contenedorCancha3 = document.querySelector('.demo3-contenedor-cancha3');
        if (contenedorCancha3) {
            contenedorCancha3.style.setProperty('display', 'contents', 'important');
        }

        if (cancha3) {
            cancha3.style.setProperty('grid-column', '2', 'important');
            cancha3.style.setProperty('grid-row', '2', 'important');
            cancha3.style.setProperty('height', altura, 'important');
            cancha3.style.setProperty('width', '100%', 'important');
            console.log(`✅ Cancha 3: posición (2,2) - ${altura}`);
        }

        // Contenedor principal - SIN borde azul, transparente
        const demo3Container = document.querySelector('.demo3-container');
        if (demo3Container) {
            demo3Container.style.setProperty('width', '100%', 'important');
            demo3Container.style.setProperty('max-width', '100%', 'important');
            demo3Container.style.setProperty('overflow', 'visible', 'important');
            demo3Container.style.setProperty('border', 'none', 'important');
            demo3Container.style.setProperty('background', 'transparent', 'important');
            demo3Container.style.setProperty('padding', '0', 'important');
            demo3Container.style.setProperty('margin', '0', 'important');
            console.log('✅ Contenedor: transparente, sin borde');
        }

        console.log('📊 RESUMEN GRID 2x2:');
        console.log(`   ┌─────────┬─────────┐`);
        console.log(`   │ Fútbol1 │ Fútbol2 │`);
        console.log(`   ├─────────┼─────────┤`);
        console.log(`   │  Pádel  │ Cancha3 │`);
        console.log(`   └─────────┴─────────┘`);
        console.log(`   Altura: ${altura}, Gap: ${gap}`);
        console.log('📱 ==========================================');
    }
}

// DESHABILITADO: Dejar que CSS maneje el layout móvil completamente
// setTimeout(forzarLayoutVerticalMovil, 1000);
// setTimeout(forzarLayoutVerticalMovil, 3000);

// Ejecutar al cambiar tamaño de ventana
// window.addEventListener('resize', forzarLayoutVerticalMovil);
