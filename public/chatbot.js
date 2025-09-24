/**
 * Asistente Virtual para Reserva Tu Cancha
 * Chatbot simple con respuestas predefinidas
 */

class Chatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.init();
    }

    init() {
        this.createChatbotHTML();
        this.bindEvents();
        this.addWelcomeMessage();
    }

    createChatbotHTML() {
        // Crear contenedor del chatbot
        const chatbotContainer = document.createElement('div');
        chatbotContainer.id = 'chatbot-container';
        chatbotContainer.innerHTML = `
            <div id="chatbot-widget" class="chatbot-widget">
                <div id="chatbot-header" class="chatbot-header">
                    <div class="chatbot-title">
                        <div class="chatbot-avatar">
                            <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&crop=face&auto=format&q=80" alt="Carla" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                            <span class="chatbot-initials" style="display:none;">C</span>
                        </div>
                        <div class="chatbot-info">
                            <span class="chatbot-name">Carla</span>
                            <span class="chatbot-status">En línea</span>
                        </div>
                    </div>
                    <button id="chatbot-toggle" class="chatbot-toggle">
                        <span id="chatbot-toggle-icon">−</span>
                    </button>
                </div>
                
                <div id="chatbot-messages" class="chatbot-messages"></div>
                
                <div id="chatbot-input-container" class="chatbot-input-container">
                    <input type="text" id="chatbot-input" placeholder="Escribe tu pregunta aquí..." />
                    <button id="chatbot-send" class="chatbot-send">📤</button>
                </div>
                
                <div id="chatbot-quick-actions" class="chatbot-quick-actions">
                    <button class="quick-action" data-action="precios">💰 Precios</button>
                    <button class="quick-action" data-action="horarios">🕐 Horarios</button>
                    <button class="quick-action" data-action="reservar">📅 Reservar</button>
                    <button class="quick-action" data-action="contacto">📞 Contacto</button>
                </div>
            </div>
            
            <button id="chatbot-launcher" class="chatbot-launcher">
                <span class="chatbot-launcher-icon">💬</span>
                <span class="chatbot-launcher-text">Habla con Carla</span>
            </button>
        `;

        document.body.appendChild(chatbotContainer);
    }

    bindEvents() {
        // Toggle chatbot
        document.getElementById('chatbot-toggle').addEventListener('click', () => {
            this.toggleChatbot();
        });

        // Launcher button
        document.getElementById('chatbot-launcher').addEventListener('click', () => {
            this.openChatbot();
        });

        // Send message
        document.getElementById('chatbot-send').addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key
        document.getElementById('chatbot-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    addWelcomeMessage() {
        this.addMessage('bot', '¡Hola! 👋 Soy Carla, tu asistente personal. ¿En qué puedo ayudarte con tu reserva hoy?');
    }

    toggleChatbot() {
        const widget = document.getElementById('chatbot-widget');
        const launcher = document.getElementById('chatbot-launcher');
        const toggleIcon = document.getElementById('chatbot-toggle-icon');
        
        if (this.isOpen) {
            widget.classList.remove('chatbot-open');
            launcher.classList.remove('chatbot-hidden');
            toggleIcon.textContent = '+';
            this.isOpen = false;
        } else {
            widget.classList.add('chatbot-open');
            launcher.classList.add('chatbot-hidden');
            toggleIcon.textContent = '−';
            this.isOpen = true;
        }
    }

    openChatbot() {
        if (!this.isOpen) {
            this.toggleChatbot();
        }
    }

    sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (message) {
            this.addMessage('user', message);
            input.value = '';
            
            // Simular delay de respuesta
            setTimeout(() => {
                this.handleUserMessage(message);
            }, 1000);
        }
    }

    addMessage(sender, text) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `chatbot-message chatbot-message-${sender}`;
        
        const timestamp = new Date().toLocaleTimeString('es-CL', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageElement.innerHTML = `
            <div class="chatbot-message-content">
                ${text}
            </div>
            <div class="chatbot-message-time">${timestamp}</div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.messages.push({ sender, text, timestamp });
    }

    handleUserMessage(message) {
        const response = this.getResponse(message);
        this.addMessage('bot', response);
    }

    handleQuickAction(action) {
        const responses = {
            precios: '💰 <b>Precios de Canchas:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Cancha Techada 1:</b> $50 por hora<br><br><b>Cancha Techada 2:</b> $50 por hora<br><br>💡 <i>Todos los precios incluyen el uso completo de la cancha.</i>',
            horarios: '🕐 <b>Horarios de Atención:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Lunes a Viernes:</b> 16:00 - 23:00<br><br><b>Sábados y Domingos:</b> 12:00 - 23:00<br><br>📅 <i>Las reservas se pueden hacer hasta con 30 días de anticipación.</i>',
            reservar: '📅 <b>Cómo Reservar:</b><br><br><b>Paso 1:</b> Selecciona tu ciudad (Los Ángeles)<br><br><b>Paso 2:</b> Elige MagnaSports como complejo<br><br><b>Paso 3:</b> Selecciona tipo de cancha (Fútbol)<br><br><b>Paso 4:</b> Elige fecha y horario disponible<br><br><b>Paso 5:</b> Completa tus datos personales<br><br><b>Paso 6:</b> Aplica código de descuento (opcional)<br><br><b>Paso 7:</b> Procede al pago con Webpay Plus<br><br>💡 <i>Recibirás confirmación por email con tu código de reserva.</i>',
            contacto: '📞 <b>Información de Contacto:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Teléfono:</b> +56912345678<br><br><b>Email:</b> naxiin320@gmail.com<br><br><b>Dirección:</b> Monte Perdido 1685, Los Ángeles<br><br>🏢 <b>Soporte General</b><br><br><b>Email:</b> soporte@reservatuscanchas.cl<br><br><b>Horario:</b> Lunes a Viernes 9:00-18:00'
        };
        
        this.addMessage('bot', responses[action]);
    }

    // Función para detectar intenciones con múltiples palabras clave
    detectIntent(message, keywords) {
        return keywords.some(keyword => message.includes(keyword.toLowerCase()));
    }

    getResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Sistema de respuestas inteligente
        const responses = {
            // Saludos
            'hola': '¡Hola! 👋 Soy Carla, tu asistente personal. ¿En qué puedo ayudarte hoy?',
            'buenos días': '¡Buenos días! ☀️ Soy Carla, ¿cómo puedo asistirte con tu reserva?',
            'buenas tardes': '¡Buenas tardes! 🌅 Soy Carla, ¿en qué te ayudo?',
            'buenas noches': '¡Buenas noches! 🌙 Soy Carla, ¿necesitas alguna información sobre reservas?',
            
            // Precios
            'precio': '💰 <b>Precios de Canchas:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Cancha Techada 1:</b> $50 por hora<br><br><b>Cancha Techada 2:</b> $50 por hora<br><br>💳 <i>Aceptamos Webpay Plus y códigos de descuento.</i>',
            'cuanto cuesta': '💰 <b>Precios por hora:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Canchas Techadas de Fútbol:</b> $50<br><br>💡 <i>Todos los precios incluyen el uso completo de la cancha.</i>',
            'costos': '💰 <b>Costos de reserva:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Precio:</b> $50 por hora<br><br>💳 <i>Aceptamos Webpay Plus y códigos de descuento.</i>',
            
            // Horarios
            'horario': '🕐 <b>Horarios de Atención:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Lunes a Viernes:</b> 16:00 - 23:00<br><br><b>Sábados y Domingos:</b> 12:00 - 23:00<br><br>📅 <i>Las reservas se pueden hacer hasta con 30 días de anticipación.</i>',
            'cuando abren': '🕐 <b>Horarios de Atención:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Lunes a Viernes:</b> 16:00 - 23:00<br><br><b>Sábados y Domingos:</b> 12:00 - 23:00<br><br>💡 <i>Estamos disponibles todos los días de la semana.</i>',
            'disponibilidad': '📅 <b>Disponibilidad:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Reservas:</b> hasta 30 días adelante<br><br><b>Horarios:</b> 16:00-23:00 (L-V), 12:00-23:00 (S-D)<br><br><b>Canchas:</b> techadas disponibles todo el año',
            
            // Reservas
            'reservar': '📅 <b>Cómo Reservar:</b><br><br><b>Paso 1:</b> Selecciona tu ciudad (Los Ángeles)<br><br><b>Paso 2:</b> Elige MagnaSports como complejo<br><br><b>Paso 3:</b> Selecciona tipo de cancha (Fútbol)<br><br><b>Paso 4:</b> Elige fecha y horario disponible<br><br><b>Paso 5:</b> Completa tus datos personales<br><br><b>Paso 6:</b> Aplica código de descuento (opcional)<br><br><b>Paso 7:</b> Procede al pago con Webpay Plus<br><br>💡 <i>Recibirás confirmación por email con tu código de reserva.</i>',
            'como reservo': '📅 <b>Proceso de Reserva:</b><br><br><b>Paso 1:</b> Elige Los Ángeles como ciudad<br><br><b>Paso 2:</b> Selecciona MagnaSports<br><br><b>Paso 3:</b> Escoge cancha techada de fútbol<br><br><b>Paso 4:</b> Selecciona fecha y horario<br><br><b>Paso 5:</b> Completa formulario de datos<br><br><b>Paso 6:</b> Aplica código descuento (opcional)<br><br><b>Paso 7:</b> Realiza pago seguro<br><br>¿Necesitas ayuda con algún paso?',
            'hacer reserva': '📅 <b>Reserva Rápida:</b><br><br><b>Paso 1:</b> Selecciona Los Ángeles<br><br><b>Paso 2:</b> Elige MagnaSports<br><br><b>Paso 3:</b> Escoge cancha y horario<br><br><b>Paso 4:</b> Completa datos personales<br><br><b>Paso 5:</b> Paga online con Webpay Plus<br><br>✅ <i>Confirmación inmediata por email</i>',
            
            // Descuentos
            'descuento': '🎫 <b>Códigos de Descuento Disponibles:</b><br><br><b>RESERVATUSCANCHAS20:</b> 20% de descuento<br><br><b>BIENVENIDA15:</b> 15% de descuento<br><br><b>FIDELIDAD10:</b> 10% de descuento<br><br>💡 <i>Aplica el código al hacer tu reserva.</i>',
            'codigo': '🎫 <b>Códigos Activos:</b><br><br><b>RESERVATUSCANCHAS20:</b> 20% descuento<br><br><b>BIENVENIDA15:</b> 15% descuento<br><br><b>FIDELIDAD10:</b> 10% descuento<br><br>¿Quieres aplicar alguno?',
            'promocion': '🎫 <b>Promociones Disponibles:</b><br><br><b>RESERVATUSCANCHAS20:</b> 20% descuento<br><br><b>BIENVENIDA15:</b> 15% descuento<br><br><b>FIDELIDAD10:</b> 10% descuento<br><br>💡 <i>Válidos hasta agotar stock</i>',
            
            // Contacto
            'contacto': '📞 <b>Información de Contacto:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Teléfono:</b> +56912345678<br><br><b>Email:</b> naxiin320@gmail.com<br><br><b>Dirección:</b> Monte Perdido 1685, Los Ángeles<br><br>🏢 <b>Soporte General</b><br><br><b>Email:</b> soporte@reservatuscanchas.cl<br><br><b>Horario:</b> Lunes a Viernes 9:00-18:00',
            'telefono': '📞 <b>Teléfonos de Contacto:</b><br><br>🏟️ <b>MagnaSports:</b> +56912345678<br><br>🏢 <b>Soporte:</b> +56912345678<br><br>🕐 <i>Horario de atención: Lunes a Viernes 9:00-18:00</i>',
            'email': '📧 <b>Emails de Contacto:</b><br><br>🏟️ <b>MagnaSports:</b> naxiin320@gmail.com<br><br>🏢 <b>Soporte General:</b> soporte@reservatuscanchas.cl<br><br>💡 <i>Te respondemos en menos de 24 horas</i>',
            
            // Problemas técnicos
            'no funciona': '🔧 <b>Soporte Técnico:</b><br><br><b>Paso 1:</b> Refresca la página<br><br><b>Paso 2:</b> Verifica tu conexión<br><br><b>Paso 3:</b> Contacta: soporte@reservatuscanchas.cl<br><br>¿Qué problema específico tienes?',
            'error': '🔧 <b>Si hay un Error:</b><br><br><b>Paso 1:</b> Refresca la página<br><br><b>Paso 2:</b> Verifica conexión<br><br><b>Paso 3:</b> Contacta soporte<br><br>📧 <i>soporte@reservatuscanchas.cl</i>',
            'problema': '🔧 <b>Para Problemas:</b><br><br><b>Paso 1:</b> Refresca la página<br><br><b>Paso 2:</b> Verifica conexión<br><br><b>Paso 3:</b> Contacta soporte técnico<br><br>¿Puedes describir el problema?',
            
            // Pagos
            'pago': '💳 <b>Métodos de Pago:</b><br><br><b>Webpay Plus:</b> tarjetas de crédito y débito<br><br><b>Visa y Mastercard:</b> aceptadas<br><br><b>Débito y Crédito:</b> disponibles<br><br>✅ <i>Pagos 100% seguros</i>',
            'webpay': '💳 <b>Webpay Plus:</b><br><br><b>Acepta:</b> todas las tarjetas<br><br><b>Pago:</b> seguro y confiable<br><br><b>Confirmación:</b> inmediata<br><br>✅ <i>Procesado por Transbank</i>',
            
            // Ubicación
            'ubicacion': '📍 <b>Ubicación:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Dirección:</b> Monte Perdido 1685, Los Ángeles<br><br><b>Estacionamiento:</b> disponible<br><br>🗺️ <i>Fácil acceso en transporte público</i>',
            'direccion': '📍 <b>Dirección:</b><br><br>🏟️ <b>MagnaSports</b><br><br><b>Dirección:</b> Monte Perdido 1685, Los Ángeles<br><br>🚗 <i>Estacionamiento disponible</i>',
            
            // Deportes
            'padel': '🏓 <b>Pádel:</b><br><br><b>Disponible en:</b> MagnaSports (Los Ángeles)<br><br><b>Precio:</b> $50 por hora<br><br><b>Incluye:</b> raquetas y pelotas<br><br><b>Horarios:</b> 16:00-23:00 (L-V), 12:00-23:00 (S-D)',
            'futbol': '⚽ <b>Fútbol:</b><br><br><b>Canchas:</b> techadas en MagnaSports (Los Ángeles)<br><br><b>Precio:</b> $50 por hora<br><br><b>Incluye:</b> balones y vestidores<br><br><b>Horarios:</b> 16:00-23:00 (L-V), 12:00-23:00 (S-D)',
            
            // MagnaSports específico
            'magnasports': '🏟️ <b>MagnaSports (Los Ángeles):</b><br><br><b>Canchas:</b> 2 canchas techadas de fútbol<br><br><b>Precio:</b> $50 por hora<br><br><b>Horarios:</b> L-V 16:00-23:00, S-D 12:00-23:00<br><br><b>Dirección:</b> Monte Perdido 1685, Los Ángeles<br><br><b>Teléfono:</b> +56912345678<br><br><b>Email:</b> naxiin320@gmail.com',
            'los angeles': '🏟️ <b>MagnaSports en Los Ángeles:</b><br><br><b>Canchas:</b> 2 canchas techadas de fútbol<br><br><b>Precio:</b> $50 por hora<br><br><b>Horarios:</b> L-V 16:00-23:00, S-D 12:00-23:00<br><br><b>Dirección:</b> Monte Perdido 1685<br><br><b>Contacto:</b> naxiin320@gmail.com',
            'canchas techadas': '🏟️ <b>Canchas Techadas:</b><br><br><b>MagnaSports (Los Ángeles):</b> 2 canchas techadas<br><br><b>Ventaja:</b> perfectas para jugar sin importar el clima<br><br><b>Precio:</b> $50 por hora<br><br><b>Horarios:</b> L-V 16:00-23:00, S-D 12:00-23:00<br><br><b>Ideal para:</b> fútbol 7 vs 7',
            
            // Ciudades
            'santiago': '🏢 <b>Santiago:</b><br><br><b>Estado:</b> Próximamente disponible<br><br><b>Mantente atento:</b> a nuestras redes sociales<br><br><b>Para más información:</b> soporte@reservatuscanchas.cl',
            'valparaiso': '🏖️ <b>Valparaíso:</b><br><br><b>Estado:</b> Próximamente disponible<br><br><b>Mantente atento:</b> a nuestras redes sociales<br><br><b>Para más información:</b> soporte@reservatuscanchas.cl',
            'concepcion': '🏙️ <b>Concepción:</b><br><br><b>Estado:</b> Próximamente disponible<br><br><b>Mantente atento:</b> a nuestras redes sociales<br><br><b>Para más información:</b> soporte@reservatuscanchas.cl'
        };
        
        // Buscar respuesta exacta
        if (responses[lowerMessage]) {
            return responses[lowerMessage];
        }
        
        // Sistema inteligente de detección de intenciones
        if (this.detectIntent(lowerMessage, ['hola', 'hi', 'buenos días', 'buenas tardes', 'buenas noches'])) {
            return '¡Hola! 👋 Soy Carla, tu asistente personal. ¿En qué puedo ayudarte con tu reserva hoy?';
        }
        
        if (this.detectIntent(lowerMessage, ['reservar', 'reserva', 'quiero reservar', 'me gustaría reservar', 'hacer reserva', 'hacer una reserva'])) {
            return '📅 <b>¡Perfecto! Te ayudo a reservar:</b><br><br><b>Paso 1:</b> Selecciona tu ciudad (Los Ángeles)<br><br><b>Paso 2:</b> Elige MagnaSports como complejo<br><br><b>Paso 3:</b> Selecciona tipo de cancha (Fútbol)<br><br><b>Paso 4:</b> Elige fecha y horario disponible<br><br><b>Paso 5:</b> Completa tus datos personales<br><br><b>Paso 6:</b> Aplica código de descuento (opcional)<br><br><b>Paso 7:</b> Procede al pago con Webpay Plus<br><br>💡 <i>¿Necesitas ayuda con algún paso específico?</i>';
        }
        
        if (this.detectIntent(lowerMessage, ['precio', 'precios', 'cuesta', 'cuanto cuesta', 'valor', 'costos'])) {
            return '💰 <b>Precios de Canchas:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Cancha Techada 1:</b> $50 por hora<br><br><b>Cancha Techada 2:</b> $50 por hora<br><br>💳 <i>Aceptamos Webpay Plus y códigos de descuento.</i>';
        }
        
        if (this.detectIntent(lowerMessage, ['horario', 'horarios', 'abierto', 'cuando abren', 'disponibilidad'])) {
            return '🕐 <b>Horarios de Atención:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Lunes a Viernes:</b> 16:00 - 23:00<br><br><b>Sábados y Domingos:</b> 12:00 - 23:00<br><br>📅 <i>Las reservas se pueden hacer hasta con 30 días de anticipación.</i>';
        }
        
        if (this.detectIntent(lowerMessage, ['contacto', 'teléfono', 'email', 'dirección', 'ubicación'])) {
            return '📞 <b>Información de Contacto:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br><br><b>Teléfono:</b> +56912345678<br><br><b>Email:</b> naxiin320@gmail.com<br><br><b>Dirección:</b> Monte Perdido 1685, Los Ángeles<br><br>🏢 <b>Soporte General</b><br><br><b>Email:</b> soporte@reservatuscanchas.cl<br><br><b>Horario:</b> Lunes a Viernes 9:00-18:00';
        }
        
        if (this.detectIntent(lowerMessage, ['descuento', 'código', 'promoción', 'oferta'])) {
            return '🎫 <b>Códigos de Descuento Disponibles:</b><br><br><b>RESERVATUSCANCHAS20:</b> 20% de descuento<br><br><b>BIENVENIDA15:</b> 15% de descuento<br><br><b>FIDELIDAD10:</b> 10% de descuento<br><br>💡 <i>Aplica el código al hacer tu reserva.</i>';
        }
        
        // Buscar por palabras clave en el objeto responses
        for (const [keyword, response] of Object.entries(responses)) {
            if (lowerMessage.includes(keyword)) {
                return response;
            }
        }
        
        // Respuesta por defecto
        return '🤔 No estoy seguro de entender tu pregunta. ¿Podrías ser más específico?<br><br>💡 <b>Puedo ayudarte con:</b><br>• Precios de MagnaSports ($50/hora)<br>• Horarios (16:00-23:00 L-V, 12:00-23:00 S-D)<br>• Cómo hacer reservas paso a paso<br>• Códigos de descuento (RESERVATUSCANCHAS20, BIENVENIDA15, FIDELIDAD10)<br>• Información de contacto<br>• Ubicación en Los Ángeles<br>• Problemas técnicos<br><br>📞 <i>Para ayuda personalizada: soporte@reservatuscanchas.cl</i><br>🏟️ <i>Para MagnaSports: naxiin320@gmail.com</i>';
    }
}

// Inicializar chatbot cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('🤖 Inicializando chatbot...');
    try {
        new Chatbot();
        console.log('✅ Chatbot inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando chatbot:', error);
    }
});
