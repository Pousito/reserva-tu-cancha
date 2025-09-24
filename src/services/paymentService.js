const { WebpayPlus, Environment, IntegrationApiKeys } = require('transbank-sdk');

class PaymentService {
    constructor() {
        this.environment = process.env.TRANSBANK_ENVIRONMENT || 'integration';
        this.commerceCode = process.env.TRANSBANK_COMMERCE_CODE;
        this.apiKey = process.env.TRANSBANK_API_KEY;
        this.returnUrl = process.env.TRANSBANK_RETURN_URL;
        this.finalUrl = process.env.TRANSBANK_FINAL_URL;
        this.transaction = null;
    }

    initializeTransbank() {
        if (this.transaction) {
            console.log('🔄 Transbank ya está inicializado');
            return; // Ya está inicializado
        }
        
        try {
            console.log('🔧 Inicializando Transbank...', {
                environment: this.environment,
                commerceCode: this.commerceCode ? 'Configurado' : 'No configurado',
                apiKey: this.apiKey ? 'Configurado' : 'No configurado'
            });
            
            if (this.environment === 'production') {
                this.transaction = WebpayPlus.Transaction.buildForProduction(this.commerceCode, this.apiKey);
                console.log('✅ Transbank configurado para PRODUCCIÓN');
            } else {
                this.transaction = WebpayPlus.Transaction.buildForIntegration(this.commerceCode, this.apiKey);
                console.log('✅ Transbank configurado para INTEGRACIÓN');
            }
            console.log('✅ Transbank configurado correctamente');
        } catch (error) {
            console.error('❌ Error configurando Transbank:', error);
            console.error('🔧 Detalles del error:', {
                message: error.message,
                stack: error.stack,
                environment: this.environment,
                commerceCode: this.commerceCode,
                apiKey: this.apiKey
            });
            throw error;
        }
    }

    /**
     * Crear una nueva transacción de pago
     * @param {Object} paymentData - Datos del pago
     * @param {string} paymentData.orderId - ID único de la orden
     * @param {number} paymentData.amount - Monto a pagar
     * @param {string} paymentData.sessionId - ID de sesión del usuario
     * @returns {Promise<Object>} - Respuesta de Transbank
     */
    async createTransaction(paymentData) {
        try {
            this.initializeTransbank(); // Inicializar si es necesario
            
            const { orderId, amount, sessionId } = paymentData;
            
            const transaction = await this.transaction.create(
                orderId,
                sessionId,
                amount,
                this.returnUrl
            );

            console.log('✅ Transacción creada:', {
                orderId,
                amount,
                token: transaction.token
            });

            return {
                success: true,
                token: transaction.token,
                url: transaction.url,
                orderId,
                amount
            };
        } catch (error) {
            console.error('❌ Error creando transacción:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Confirmar una transacción
     * @param {string} token - Token de la transacción
     * @returns {Promise<Object>} - Estado de la transacción
     */
    async confirmTransaction(token) {
        try {
            this.initializeTransbank(); // Asegurar que Transbank esté inicializado
            
            if (!this.transaction) {
                throw new Error('Transbank no está inicializado correctamente');
            }
            
            const response = await this.transaction.commit(token);
            
            console.log('✅ Transacción confirmada:', {
                token,
                status: response.status,
                amount: response.amount,
                orderId: response.buy_order
            });

            return {
                success: true,
                status: response.status,
                amount: response.amount,
                orderId: response.buy_order,
                authorizationCode: response.authorization_code,
                paymentTypeCode: response.payment_type_code,
                responseCode: response.response_code,
                installmentsNumber: response.installments_number,
                transactionDate: response.transaction_date
            };
        } catch (error) {
            console.error('❌ Error confirmando transacción:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Consultar el estado de una transacción
     * @param {string} token - Token de la transacción
     * @returns {Promise<Object>} - Estado de la transacción
     */
    async getTransactionStatus(token) {
        try {
            this.initializeTransbank(); // Asegurar que Transbank esté inicializado
            
            if (!this.transaction) {
                throw new Error('Transbank no está inicializado correctamente');
            }
            
            const response = await this.transaction.status(token);
            
            if (!response) {
                throw new Error('Respuesta vacía de Transbank');
            }
            
            return {
                success: true,
                status: response.status,
                amount: response.amount,
                orderId: response.buy_order,
                authorizationCode: response.authorization_code,
                paymentTypeCode: response.payment_type_code,
                responseCode: response.response_code,
                installmentsNumber: response.installments_number,
                transactionDate: response.transaction_date
            };
        } catch (error) {
            console.error('❌ Error consultando transacción:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Reembolsar una transacción
     * @param {string} token - Token de la transacción
     * @param {number} amount - Monto a reembolsar
     * @returns {Promise<Object>} - Resultado del reembolso
     */
    async refundTransaction(token, amount) {
        try {
            const response = await this.transaction.refund(token, amount);
            
            console.log('✅ Transacción reembolsada:', {
                token,
                amount,
                type: response.type,
                authorizationCode: response.authorization_code
            });

            return {
                success: true,
                type: response.type,
                authorizationCode: response.authorization_code,
                responseCode: response.response_code,
                amount: response.amount
            };
        } catch (error) {
            console.error('❌ Error reembolsando transacción:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generar ID único para la orden
     * @param {string} reservationCode - Código de la reserva
     * @returns {string} - ID único de la orden
     */
    generateOrderId(reservationCode) {
        // Transbank requiere que el buyOrder sea máximo 26 caracteres
        // Usar solo los últimos 8 dígitos del timestamp para mantener el orden único
        const timestamp = Date.now().toString().slice(-8);
        return `ORD${timestamp}`;
    }

    /**
     * Validar configuración de Transbank
     * @returns {boolean} - True si está configurado correctamente
     */
    isConfigured() {
        return !!(this.commerceCode && this.apiKey && this.returnUrl);
    }
}

module.exports = PaymentService;
