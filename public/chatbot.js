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
        this.addMessage('bot', '¡Hola! 👋 Soy Carla, tu asistente personal.<br><br>📊 <b>Actualmente tenemos:</b><br>🏙️ 2 ciudades: Los Ángeles y Quilleco<br>🏟️ 3 complejos deportivos<br>⚽ 5 canchas de fútbol<br><br>¿En qué puedo ayudarte hoy?');
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
            precios: '💰 <b>Precios de Canchas:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br>- 2 canchas techadas: $5.000/hora<br><br>🏟️ <b>Fundación Gunnen (Los Ángeles)</b><br>- 2 canchas: $8.000/hora<br><br>🏟️ <b>Borde Río (Quilleco)</b><br>- 1 cancha: $50/hora<br><br>💳 <i>Webpay Plus y códigos de descuento disponibles.</i>',
            horarios: '🕐 <b>Horarios:</b><br><br>🏟️ <b>MagnaSports & Gunnen (Los Ángeles)</b><br>L-V: 16:00-23:00 | S-D: 12:00-23:00<br><br>🏟️ <b>Borde Río (Quilleco)</b><br>Todos los días: 10:00-23:00<br><br>📅 <i>Reservas hasta 30 días adelante.</i>',
            reservar: '📅 <b>Cómo Reservar:</b><br><br><b>Tenemos 3 complejos:</b><br>- MagnaSports (Los Ángeles)<br>- Fundación Gunnen (Los Ángeles)<br>- Borde Río (Quilleco)<br><br><b>Pasos:</b><br>1. Selecciona ciudad y complejo<br>2. Elige fecha y horario<br>3. Completa datos<br>4. Paga con Webpay Plus<br><br>✅ <i>Confirmación por email</i>',
            contacto: '📞 <b>Contacto:</b><br><br>🏟️ <b>MagnaSports</b><br>📱 +56987654321<br>📧 reservas@magnasports.cl<br><br>🏟️ <b>Gunnen</b><br>📱 +56972815810<br>📧 naxiin_320@hotmail.com<br><br>🏟️ <b>Borde Río</b><br>📱 +56999820929<br>📧 admin@borderio.cl'
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
            'precio': '💰 <b>Precios de Canchas:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br>- 2 canchas techadas: $5.000/hora<br><br>🏟️ <b>Fundación Gunnen (Los Ángeles)</b><br>- 2 canchas de fútbol: $8.000/hora<br><br>🏟️ <b>Espacio Deportivo Borde Río (Quilleco)</b><br>- 1 cancha de fútbol: $50/hora<br><br>💳 <i>Aceptamos Webpay Plus y códigos de descuento.</i>',
            'cuanto cuesta': '💰 <b>Precios por hora:</b><br><br>🏟️ <b>MagnaSports:</b> $5.000<br>🏟️ <b>Fundación Gunnen:</b> $8.000<br>🏟️ <b>Borde Río:</b> $50<br><br>💡 <i>Todos los precios incluyen el uso completo de la cancha y promociones disponibles.</i>',
            'costos': '💰 <b>Costos de reserva:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles):</b> $5.000/hora<br>🏟️ <b>Fundación Gunnen (Los Ángeles):</b> $8.000/hora<br>🏟️ <b>Espacio Deportivo Borde Río (Quilleco):</b> $50/hora<br><br>💳 <i>Pagos seguros con Webpay Plus.</i>',
            
            // Horarios
            'horario': '🕐 <b>Horarios de Atención:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br>L-V: 16:00-23:00 | S-D: 12:00-23:00<br><br>🏟️ <b>Fundación Gunnen (Los Ángeles)</b><br>L-V: 16:00-23:00 | S-D: 12:00-23:00<br><br>🏟️ <b>Borde Río (Quilleco)</b><br>Todos los días: 10:00-23:00<br><br>📅 <i>Reservas hasta con 30 días de anticipación.</i>',
            'cuando abren': '🕐 <b>Horarios:</b><br><br>🏟️ <b>MagnaSports:</b> L-V 16:00-23:00, S-D 12:00-23:00<br>🏟️ <b>Gunnen:</b> L-V 16:00-23:00, S-D 12:00-23:00<br>🏟️ <b>Borde Río:</b> Todos los días 10:00-23:00',
            'disponibilidad': '📅 <b>Disponibilidad:</b><br><br><b>Reservas:</b> hasta 30 días adelante<br><br>🏟️ <b>3 complejos disponibles</b> en Los Ángeles y Quilleco<br><br>⚽ <b>5 canchas de fútbol</b> en total<br><br>💡 <i>Consulta horarios en tiempo real en la página.</i>',
            
            // Reservas
            'reservar': '📅 <b>Cómo Reservar:</b><br><br><b>Paso 1:</b> Selecciona tu ciudad (Los Ángeles o Quilleco)<br><br><b>Paso 2:</b> Elige tu complejo favorito<br><br><b>Paso 3:</b> Selecciona tipo de cancha (Fútbol)<br><br><b>Paso 4:</b> Elige fecha y horario disponible<br><br><b>Paso 5:</b> Completa tus datos personales<br><br><b>Paso 6:</b> Aplica código de descuento (opcional)<br><br><b>Paso 7:</b> Procede al pago con Webpay Plus<br><br>💡 <i>Recibirás confirmación por email con tu código de reserva.</i>',
            'como reservo': '📅 <b>Proceso de Reserva:</b><br><br><b>Tenemos 3 complejos disponibles:</b><br>- MagnaSports (Los Ángeles)<br>- Fundación Gunnen (Los Ángeles)<br>- Espacio Deportivo Borde Río (Quilleco)<br><br><b>Pasos:</b><br>1. Elige ciudad y complejo<br>2. Selecciona fecha y hora<br>3. Completa formulario<br>4. Paga con Webpay Plus<br><br>✅ <i>Confirmación inmediata</i>',
            'hacer reserva': '📅 <b>Reserva Rápida:</b><br><br><b>Ciudades disponibles:</b><br>🏙️ Los Ángeles (2 complejos)<br>🏙️ Quilleco (1 complejo)<br><br><b>Total:</b> 3 complejos, 5 canchas<br><br><b>Pasos:</b> Elige ciudad → Complejo → Fecha/Hora → Paga<br><br>✅ <i>Confirmación por email</i>',
            
            // Descuentos
            'descuento': '🎫 <b>Códigos de Descuento Disponibles:</b><br><br><b>RESERVATUSCANCHAS20:</b> 20% de descuento<br><br><b>BIENVENIDA15:</b> 15% de descuento<br><br><b>FIDELIDAD10:</b> 10% de descuento<br><br>💡 <i>Aplica el código al hacer tu reserva.</i>',
            'codigo': '🎫 <b>Códigos Activos:</b><br><br><b>RESERVATUSCANCHAS20:</b> 20% descuento<br><br><b>BIENVENIDA15:</b> 15% descuento<br><br><b>FIDELIDAD10:</b> 10% descuento<br><br>¿Quieres aplicar alguno?',
            'promocion': '🎫 <b>Promociones Disponibles:</b><br><br><b>RESERVATUSCANCHAS20:</b> 20% descuento<br><br><b>BIENVENIDA15:</b> 15% descuento<br><br><b>FIDELIDAD10:</b> 10% descuento<br><br>💡 <i>Válidos hasta agotar stock</i>',
            
            // Contacto
            'contacto': '📞 <b>Información de Contacto:</b><br><br>🏟️ <b>MagnaSports (Los Ángeles)</b><br>📱 +56987654321<br>📧 reservas@magnasports.cl<br>📍 Monte Perdido 1685<br><br>🏟️ <b>Fundación Gunnen (Los Ángeles)</b><br>📱 +56972815810<br>📧 naxiin_320@hotmail.com<br>📍 Calle Don Victor 1310<br><br>🏟️ <b>Borde Río (Quilleco)</b><br>📱 +56999820929<br>📧 admin@borderio.cl<br>📍 Ruta Q-575, Quilleco',
            'telefono': '📞 <b>Teléfonos:</b><br><br>🏟️ <b>MagnaSports:</b> +56987654321<br>🏟️ <b>Gunnen:</b> +56972815810<br>🏟️ <b>Borde Río:</b> +56999820929<br><br>💡 <i>Llama al complejo directamente</i>',
            'email': '📧 <b>Emails:</b><br><br>🏟️ <b>MagnaSports:</b> reservas@magnasports.cl<br>🏟️ <b>Gunnen:</b> naxiin_320@hotmail.com<br>🏟️ <b>Borde Río:</b> admin@borderio.cl<br><br>💡 <i>Respuesta en menos de 24 horas</i>',
            
            // Problemas técnicos
            'no funciona': '🔧 <b>Soporte Técnico:</b><br><br><b>Paso 1:</b> Refresca la página<br><br><b>Paso 2:</b> Verifica tu conexión<br><br><b>Paso 3:</b> Contacta: soporte@reservatuscanchas.cl<br><br>¿Qué problema específico tienes?',
            'error': '🔧 <b>Si hay un Error:</b><br><br><b>Paso 1:</b> Refresca la página<br><br><b>Paso 2:</b> Verifica conexión<br><br><b>Paso 3:</b> Contacta soporte<br><br>📧 <i>soporte@reservatuscanchas.cl</i>',
            'problema': '🔧 <b>Para Problemas:</b><br><br><b>Paso 1:</b> Refresca la página<br><br><b>Paso 2:</b> Verifica conexión<br><br><b>Paso 3:</b> Contacta soporte técnico<br><br>¿Puedes describir el problema?',
            
            // Pagos
            'pago': '💳 <b>Métodos de Pago:</b><br><br><b>Webpay Plus:</b> tarjetas de crédito y débito<br><br><b>Visa y Mastercard:</b> aceptadas<br><br><b>Débito y Crédito:</b> disponibles<br><br>✅ <i>Pagos 100% seguros</i>',
            'webpay': '💳 <b>Webpay Plus:</b><br><br><b>Acepta:</b> todas las tarjetas<br><br><b>Pago:</b> seguro y confiable<br><br><b>Confirmación:</b> inmediata<br><br>✅ <i>Procesado por Transbank</i>',
            
            // Ubicación
            'ubicacion': '📍 <b>Ubicaciones:</b><br><br>🏟️ <b>MagnaSports</b><br>Monte Perdido 1685, Los Ángeles<br><br>🏟️ <b>Fundación Gunnen</b><br>Calle Don Victor 1310, Los Ángeles<br><br>🏟️ <b>Borde Río</b><br>Ruta Q-575, Quilleco, Bio Bio<br><br>🗺️ <i>Fácil acceso en todos los complejos</i>',
            'direccion': '📍 <b>Direcciones:</b><br><br>🏟️ <b>MagnaSports:</b> Monte Perdido 1685, Los Ángeles<br>🏟️ <b>Gunnen:</b> Calle Don Victor 1310, Los Ángeles<br>🏟️ <b>Borde Río:</b> Ruta Q-575, Quilleco<br><br>🚗 <i>Estacionamiento disponible</i>',
            
            // Deportes
            'padel': '🏓 <b>Pádel:</b><br><br><b>Próximamente disponible</b><br><br>💡 <i>Actualmente solo ofrecemos fútbol en nuestros 3 complejos</i>',
            'futbol': '⚽ <b>Fútbol:</b><br><br><b>5 canchas disponibles:</b><br>- MagnaSports: 2 techadas ($5.000/h)<br>- Gunnen: 2 canchas ($8.000/h)<br>- Borde Río: 1 cancha ($50/h)<br><br><b>Ciudades:</b> Los Ángeles y Quilleco',
            
            // MagnaSports específico
            'magnasports': '🏟️ <b>MagnaSports (Los Ángeles):</b><br><br><b>Canchas:</b> 2 canchas techadas<br><b>Precio:</b> $5.000/hora<br><b>Horarios:</b> L-V 16:00-23:00, S-D 12:00-23:00<br><b>Dirección:</b> Monte Perdido 1685<br><b>Teléfono:</b> +56987654321<br><b>Email:</b> reservas@magnasports.cl',
            
            // Gunnen específico
            'gunnen': '🏟️ <b>Fundación Gunnen (Los Ángeles):</b><br><br><b>Canchas:</b> 2 canchas de fútbol<br><b>Precio:</b> $8.000/hora<br><b>Horarios:</b> L-V 16:00-23:00, S-D 12:00-23:00<br><b>Dirección:</b> Calle Don Victor 1310<br><b>Teléfono:</b> +56972815810<br><b>Email:</b> naxiin_320@hotmail.com',
            'fundacion gunnen': '🏟️ <b>Fundación Gunnen:</b><br><br><b>Ubicación:</b> Los Ángeles<br><b>Canchas:</b> 2 de fútbol ($8.000/h)<br><b>Dirección:</b> Calle Don Victor 1310<br><b>Contacto:</b> +56972815810',
            
            // Borde Río específico
            'borde rio': '🏟️ <b>Espacio Deportivo Borde Río (Quilleco):</b><br><br><b>Canchas:</b> 1 cancha de fútbol<br><b>Precio:</b> $50/hora<br><b>Horarios:</b> Todos los días 10:00-23:00<br><b>Dirección:</b> Ruta Q-575, Quilleco<br><b>Teléfono:</b> +56999820929<br><b>Email:</b> admin@borderio.cl',
            'borderio': '🏟️ <b>Borde Río:</b><br><br><b>Ubicación:</b> Quilleco, Bio Bio<br><b>Canchas:</b> 1 de fútbol ($50/h)<br><b>Horarios:</b> 10:00-23:00 (todos los días)<br><b>Contacto:</b> +56999820929',
            'quilleco': '🏙️ <b>Quilleco:</b><br><br><b>Complejo disponible:</b><br>- Espacio Deportivo Borde Río<br><br><b>Canchas:</b> 1 de fútbol ($50/h)<br><b>Horarios:</b> 10:00-23:00 diario<br><b>Contacto:</b> admin@borderio.cl',
            
            'los angeles': '🏙️ <b>Los Ángeles:</b><br><br><b>2 complejos disponibles:</b><br><br>🏟️ <b>MagnaSports</b><br>- 2 canchas techadas: $5.000/h<br>- Monte Perdido 1685<br><br>🏟️ <b>Fundación Gunnen</b><br>- 2 canchas: $8.000/h<br>- Calle Don Victor 1310',
            'canchas techadas': '🏟️ <b>Canchas Techadas:</b><br><br><b>MagnaSports (Los Ángeles):</b> 2 canchas techadas<br><br><b>Ventaja:</b> perfectas para jugar sin importar el clima<br><br><b>Precio:</b> $5.000/hora<br><br><b>Horarios:</b> L-V 16:00-23:00, S-D 12:00-23:00<br><br><b>Ideal para:</b> fútbol 7 vs 7',
            
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
            return '📅 <b>¡Perfecto! Te ayudo a reservar:</b><br><br><b>Tenemos 3 complejos:</b><br>- MagnaSports (Los Ángeles)<br>- Fundación Gunnen (Los Ángeles)<br>- Borde Río (Quilleco)<br><br><b>Pasos:</b><br>1. Selecciona ciudad y complejo<br>2. Elige fecha y horario<br>3. Completa formulario<br>4. Paga con Webpay Plus<br><br>✅ <i>Confirmación inmediata por email</i>';
        }
        
        if (this.detectIntent(lowerMessage, ['precio', 'precios', 'cuesta', 'cuanto cuesta', 'valor', 'costos'])) {
            return '💰 <b>Precios:</b><br><br>🏟️ <b>MagnaSports:</b> $5.000/h<br>🏟️ <b>Gunnen:</b> $8.000/h<br>🏟️ <b>Borde Río:</b> $50/h<br><br>💡 <i>Promociones disponibles según fecha/hora</i>';
        }
        
        if (this.detectIntent(lowerMessage, ['horario', 'horarios', 'abierto', 'cuando abren', 'disponibilidad'])) {
            return '🕐 <b>Horarios:</b><br><br>🏟️ <b>MagnaSports & Gunnen:</b><br>L-V 16:00-23:00 | S-D 12:00-23:00<br><br>🏟️ <b>Borde Río (Quilleco):</b><br>Todos los días 10:00-23:00<br><br>📅 <i>Reservas hasta 30 días adelante</i>';
        }
        
        if (this.detectIntent(lowerMessage, ['contacto', 'teléfono', 'email', 'dirección', 'ubicación'])) {
            return '📞 <b>Contacto:</b><br><br>🏟️ <b>MagnaSports:</b> +56987654321<br>🏟️ <b>Gunnen:</b> +56972815810<br>🏟️ <b>Borde Río:</b> +56999820929<br><br>📧 <i>O escríbenos a soporte@reservatuscanchas.cl</i>';
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
        return '🤔 No estoy seguro de entender tu pregunta. ¿Podrías ser más específico?<br><br>💡 <b>Puedo ayudarte con:</b><br>• Precios (MagnaSports $5.000/h, Gunnen $8.000/h)<br>• Horarios de nuestros 3 complejos<br>• Cómo hacer reservas paso a paso<br>• Códigos de descuento activos<br>• Información de contacto<br>• Ubicaciones en Los Ángeles y Quilleco<br>• Promociones especiales<br><br>📞 <i>Soporte: soporte@reservatuscanchas.cl</i>';
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
