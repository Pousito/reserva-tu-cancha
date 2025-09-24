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
                        <span class="chatbot-icon">🤖</span>
                        <span>Asistente Virtual</span>
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
                <span class="chatbot-launcher-text">¿Necesitas ayuda?</span>
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
        this.addMessage('bot', '¡Hola! 👋 Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?');
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
            precios: '💰 **Precios de Canchas:**\n\n🏟️ **MagnaSports (Los Ángeles):**\n• Cancha Techada 1: $28,000 por hora\n• Cancha Techada 2: $28,000 por hora\n\n🏢 **Otros Complejos:**\n• Complejo Deportivo Central (Santiago): $25,000/hora\n• Padel Club Premium (Santiago): $30,000/hora\n• Club Deportivo Norte (Santiago): $28,000/hora\n• Centro Deportivo Costero (Valparaíso): $22,000/hora\n\n💡 *Los precios pueden variar según el complejo y tipo de cancha.*',
            horarios: '🕐 **Horarios de Atención:**\n\n🏟️ **MagnaSports (Los Ángeles):**\n• Lunes a Viernes: 16:00 - 23:00\n• Sábados y Domingos: 12:00 - 23:00\n\n🏢 **Otros Complejos:**\n• Lunes a Viernes: 8:00 - 22:00\n• Sábados: 8:00 - 20:00\n• Domingos: 9:00 - 19:00\n\n📅 *Las reservas se pueden hacer hasta con 30 días de anticipación.*',
            reservar: '📅 **Cómo Reservar:**\n\n1. Selecciona tu ciudad (Santiago, Valparaíso, Concepción, Los Ángeles)\n2. Elige el complejo deportivo\n3. Selecciona tipo de cancha (Fútbol o Pádel)\n4. Elige fecha y horario disponible\n5. Completa tus datos personales\n6. Aplica código de descuento (opcional)\n7. Procede al pago con Webpay Plus\n\n💡 *Recibirás confirmación por email con tu código de reserva.*',
            contacto: '📞 **Información de Contacto:**\n\n🏟️ **MagnaSports (Los Ángeles):**\n• Teléfono: +56987654321\n• Email: reservas@magnasports.cl\n• Dirección: Monte Perdido 1685, Los Ángeles\n\n🏢 **Soporte General:**\n• Email: soporte@reservatuscanchas.cl\n• Horario: Lunes a Viernes 9:00-18:00\n\n🕐 *Para otros complejos, consulta la información específica en la página.*'
        };
        
        this.addMessage('bot', responses[action]);
    }

    getResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Respuestas predefinidas
        const responses = {
            // Saludos
            'hola': '¡Hola! 👋 ¿En qué puedo ayudarte hoy?',
            'buenos días': '¡Buenos días! ☀️ ¿Cómo puedo asistirte?',
            'buenas tardes': '¡Buenas tardes! 🌅 ¿En qué te ayudo?',
            'buenas noches': '¡Buenas noches! 🌙 ¿Necesitas alguna información?',
            
            // Precios
            'precio': '💰 **Precios por Complejo:**\n\n🏟️ **MagnaSports (Los Ángeles):** $28,000/hora\n🏢 **Complejo Deportivo Central (Santiago):** $25,000/hora\n🏓 **Padel Club Premium (Santiago):** $30,000/hora\n🏢 **Club Deportivo Norte (Santiago):** $28,000/hora\n🏖️ **Centro Deportivo Costero (Valparaíso):** $22,000/hora\n\n💡 *Los precios varían según el complejo y tipo de cancha.*',
            'cuanto cuesta': '💰 **Precios por hora:**\n\n🏟️ **MagnaSports (Los Ángeles):**\n• Canchas Techadas de Fútbol: $28,000\n\n🏢 **Santiago:**\n• Complejo Deportivo Central: $25,000\n• Padel Club Premium: $30,000\n• Club Deportivo Norte: $28,000\n\n🏖️ **Valparaíso:**\n• Centro Deportivo Costero: $22,000\n\n¿Te interesa algún complejo específico?',
            'costos': '💰 **Costos de reserva:**\n\n🏟️ **MagnaSports (Los Ángeles):** $28,000/hora\n🏢 **Santiago:** $25,000 - $30,000/hora\n🏖️ **Valparaíso:** $22,000/hora\n\n💳 *Aceptamos Webpay Plus y códigos de descuento.*',
            
            // Horarios
            'horario': '🕐 **Horarios por Complejo:**\n\n🏟️ **MagnaSports (Los Ángeles):**\n• Lunes a Viernes: 16:00 - 23:00\n• Sábados y Domingos: 12:00 - 23:00\n\n🏢 **Otros Complejos:**\n• Lunes a Viernes: 8:00 - 22:00\n• Sábados: 8:00 - 20:00\n• Domingos: 9:00 - 19:00',
            'cuando abren': '🕐 **Horarios de atención:**\n\n🏟️ **MagnaSports (Los Ángeles):**\n• Lunes a Viernes: 16:00 - 23:00\n• Sábados y Domingos: 12:00 - 23:00\n\n🏢 **Otros Complejos:**\n• Lunes a Viernes: 8:00 - 22:00\n• Sábados: 8:00 - 20:00\n• Domingos: 9:00 - 19:00',
            'disponibilidad': '📅 **Disponibilidad:**\n• Reservas hasta 30 días adelante\n• Horarios según complejo\n• MagnaSports: 16:00-23:00 (L-V), 12:00-23:00 (S-D)\n• Otros: 8:00-22:00 (L-V), horarios reducidos fines de semana',
            
            // Reservas
            'reservar': '📅 **Para reservar:**\n1. Selecciona cancha y fecha\n2. Completa tus datos\n3. Aplica descuento (opcional)\n4. Paga con Webpay Plus\n\n💡 *Recibirás confirmación por email.*',
            'como reservo': '📅 **Proceso de reserva:**\n1. Elige cancha y horario\n2. Llena formulario\n3. Aplica código descuento\n4. Procede al pago\n\n¿Necesitas ayuda con algún paso?',
            'hacer reserva': '📅 **Reserva fácil:**\n1. Selecciona cancha\n2. Elige fecha/hora\n3. Completa datos\n4. Paga online\n\n✅ *Confirmación inmediata por email*',
            
            // Descuentos
            'descuento': '🎫 **Códigos de descuento disponibles:**\n• RESERVATUSCANCHAS20 (20%)\n• BIENVENIDA15 (15%)\n• FIDELIDAD10 (10%)\n\n💡 *Aplica el código al hacer tu reserva.*',
            'codigo': '🎫 **Códigos activos:**\n• RESERVATUSCANCHAS20: 20% descuento\n• BIENVENIDA15: 15% descuento\n• FIDELIDAD10: 10% descuento\n\n¿Quieres aplicar alguno?',
            'promocion': '🎫 **Promociones disponibles:**\n• RESERVATUSCANCHAS20 (20%)\n• BIENVENIDA15 (15%)\n• FIDELIDAD10 (10%)\n\n💡 *Válidos hasta agotar stock*',
            
            // Contacto
            'contacto': '📞 **Contacto por Complejo:**\n\n🏟️ **MagnaSports (Los Ángeles):**\n• Teléfono: +56987654321\n• Email: reservas@magnasports.cl\n• Dirección: Monte Perdido 1685, Los Ángeles\n\n🏢 **Soporte General:**\n• Email: soporte@reservatuscanchas.cl\n• Horario: Lun-Vie 9:00-18:00',
            'telefono': '📞 **Teléfonos:**\n\n🏟️ **MagnaSports:** +56987654321\n🏢 **Complejo Deportivo Central:** +56912345678\n🏓 **Padel Club Premium:** +56987654321\n\n🕐 *Horario de atención: Lunes a Viernes 9:00-18:00*',
            'email': '📧 **Emails:**\n\n🏟️ **MagnaSports:** reservas@magnasports.cl\n🏢 **Complejo Central:** info@complejocentral.cl\n🏓 **Padel Club:** reservas@padelclub.cl\n🏢 **Soporte General:** soporte@reservatuscanchas.cl\n\n💡 *Te respondemos en menos de 24 horas*',
            
            // Problemas técnicos
            'no funciona': '🔧 **Soporte técnico:**\n• Refresca la página\n• Verifica tu conexión\n• Contacta: soporte@reservatuscanchas.cl\n\n¿Qué problema específico tienes?',
            'error': '🔧 **Si hay un error:**\n1. Refresca la página\n2. Verifica conexión\n3. Contacta soporte\n\n📧 *soporte@reservatuscanchas.cl*',
            'problema': '🔧 **Para problemas:**\n• Refresca la página\n• Verifica conexión\n• Contacta soporte técnico\n\n¿Puedes describir el problema?',
            
            // Pagos
            'pago': '💳 **Métodos de pago:**\n• Webpay Plus (tarjetas)\n• Visa, Mastercard\n• Débito y Crédito\n\n✅ *Pagos 100% seguros*',
            'webpay': '💳 **Webpay Plus:**\n• Acepta todas las tarjetas\n• Pago seguro y confiable\n• Confirmación inmediata\n\n✅ *Procesado por Transbank*',
            
            // Ubicación
            'ubicacion': '📍 **Ubicaciones por Ciudad:**\n\n🏟️ **MagnaSports (Los Ángeles):**\n• Dirección: Monte Perdido 1685, Los Ángeles\n• Estacionamiento disponible\n\n🏢 **Santiago:**\n• Complejo Deportivo Central: Av. Providencia 123\n• Padel Club Premium: Las Condes 456\n• Club Deportivo Norte: Av. Las Condes 5678\n\n🏖️ **Valparaíso:**\n• Centro Deportivo Costero: Av. Argentina 9012\n\n🗺️ *Fácil acceso en transporte público*',
            'direccion': '📍 **Direcciones:**\n\n🏟️ **MagnaSports:** Monte Perdido 1685, Los Ángeles\n🏢 **Complejo Central:** Av. Providencia 123, Santiago\n🏓 **Padel Club:** Las Condes 456, Santiago\n🏖️ **Centro Costero:** Av. Argentina 9012, Valparaíso\n\n🚗 *Estacionamiento disponible en todos los complejos*',
            
            // Deportes
            'padel': '🏓 **Pádel:**\n• Canchas profesionales en Padel Club Premium (Santiago)\n• $30,000 por hora\n• Raquetas disponibles\n• Horarios: 8:00-22:00 (L-V), 8:00-20:00 (S), 9:00-19:00 (D)',
            'futbol': '⚽ **Fútbol:**\n• Canchas techadas en MagnaSports (Los Ángeles): $28,000/hora\n• Canchas abiertas en otros complejos: $22,000-$28,000/hora\n• Balones incluidos\n• Vestidores disponibles\n• Horarios según complejo',
            
            // MagnaSports específico
            'magnasports': '🏟️ **MagnaSports (Los Ángeles):**\n• 2 canchas techadas de fútbol\n• $28,000 por hora\n• Horarios: L-V 16:00-23:00, S-D 12:00-23:00\n• Dirección: Monte Perdido 1685, Los Ángeles\n• Teléfono: +56987654321\n• Email: reservas@magnasports.cl',
            'los angeles': '🏟️ **MagnaSports en Los Ángeles:**\n• 2 canchas techadas de fútbol\n• $28,000 por hora\n• Horarios especiales: L-V 16:00-23:00, S-D 12:00-23:00\n• Dirección: Monte Perdido 1685\n• Contacto: reservas@magnasports.cl',
            'canchas techadas': '🏟️ **Canchas Techadas:**\n• MagnaSports (Los Ángeles) tiene 2 canchas techadas\n• Perfectas para jugar sin importar el clima\n• $28,000 por hora\n• Horarios: L-V 16:00-23:00, S-D 12:00-23:00\n• Ideal para fútbol 7 vs 7',
            
            // Ciudades
            'santiago': '🏢 **Santiago - Complejos Disponibles:**\n• Complejo Deportivo Central: $25,000/hora\n• Padel Club Premium: $30,000/hora\n• Club Deportivo Norte: $28,000/hora\n\n📍 *Ubicaciones en Providencia, Las Condes y norte de Santiago*',
            'valparaiso': '🏖️ **Valparaíso:**\n• Centro Deportivo Costero\n• $22,000 por hora\n• Dirección: Av. Argentina 9012\n• Horarios: 8:00-22:00 (L-V), 8:00-20:00 (S), 9:00-19:00 (D)',
            'concepcion': '🏙️ **Concepción:**\n• Próximamente disponible\n• Mantente atento a nuestras redes sociales\n• Para más información: soporte@reservatuscanchas.cl'
        };
        
        // Buscar respuesta exacta
        if (responses[lowerMessage]) {
            return responses[lowerMessage];
        }
        
        // Buscar palabras clave
        for (const [keyword, response] of Object.entries(responses)) {
            if (lowerMessage.includes(keyword)) {
                return response;
            }
        }
        
        // Respuesta por defecto
        return '🤔 No estoy seguro de entender tu pregunta. ¿Podrías ser más específico?\n\n💡 **Puedo ayudarte con:**\n• Precios por complejo (MagnaSports $28k, Santiago $25k-$30k, Valparaíso $22k)\n• Horarios (MagnaSports: 16:00-23:00 L-V, 12:00-23:00 S-D)\n• Cómo hacer reservas paso a paso\n• Códigos de descuento (RESERVATUSCANCHAS20, BIENVENIDA15, FIDELIDAD10)\n• Información de contacto por complejo\n• Ubicaciones (Los Ángeles, Santiago, Valparaíso)\n• Problemas técnicos\n\n📞 *Para ayuda personalizada: soporte@reservatuscanchas.cl*\n🏟️ *Para MagnaSports: reservas@magnasports.cl*';
    }
}

// Inicializar chatbot cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new Chatbot();
});
