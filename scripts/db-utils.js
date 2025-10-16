#!/usr/bin/env node

/**
 * Utilidades de base de datos para modificaciones rápidas
 * Uso: node scripts/db-utils.js [comando]
 */

const DatabaseHelper = require('./db-helper');

class DatabaseUtils {
    constructor() {
        this.db = new DatabaseHelper();
    }

    async showComplexes() {
        console.log('🏢 COMPLEJOS DISPONIBLES');
        console.log('========================');
        const complejos = await this.db.getComplexes();
        complejos.forEach(complejo => {
            console.log(`ID: ${complejo.id} | ${complejo.nombre} | ${complejo.ciudad_nombre}`);
        });
        return complejos;
    }

    async showCourts() {
        console.log('⚽ CANCHAS DISPONIBLES');
        console.log('=====================');
        const canchas = await this.db.getCourts();
        canchas.forEach(cancha => {
            console.log(`ID: ${cancha.id} | ${cancha.nombre} | ${cancha.tipo} | $${cancha.precio_hora} | ${cancha.complejo_nombre}`);
        });
        return canchas;
    }

    async showRecentReservations(limit = 5) {
        console.log(`📅 ÚLTIMAS ${limit} RESERVAS`);
        console.log('============================');
        const reservas = await this.db.getReservations(limit);
        reservas.forEach(reserva => {
            console.log(`Código: ${reserva.codigo_reserva} | ${reserva.nombre_cliente} | ${reserva.fecha} ${reserva.hora_inicio} | ${reserva.cancha_nombre}`);
        });
        return reservas;
    }

    async updateComplexName(id, newName) {
        console.log(`🔄 Actualizando complejo ID ${id} a "${newName}"`);
        const result = await this.db.updateComplexName(id, newName);
        console.log('✅ Actualizado exitosamente');
        return result;
    }

    async updateCourtPrice(id, newPrice) {
        console.log(`💰 Actualizando precio de cancha ID ${id} a $${newPrice}`);
        const result = await this.db.updateCourtPrice(id, newPrice);
        console.log('✅ Precio actualizado exitosamente');
        return result;
    }

    async disconnect() {
        await this.db.disconnect();
    }
}

// Función principal
async function main() {
    const command = process.argv[2];
    const utils = new DatabaseUtils();
    
    try {
        // Configurar entorno de desarrollo
        process.env.NODE_ENV = 'development';
        require('dotenv').config({ path: './env.postgresql' });
        
        switch (command) {
            case 'complexes':
                await utils.showComplexes();
                break;
            case 'courts':
                await utils.showCourts();
                break;
            case 'reservations':
                const limit = parseInt(process.argv[3]) || 5;
                await utils.showRecentReservations(limit);
                break;
            case 'update-complex':
                const complexId = parseInt(process.argv[3]);
                const newName = process.argv[4];
                if (!complexId || !newName) {
                    console.log('❌ Uso: node scripts/db-utils.js update-complex [ID] [NUEVO_NOMBRE]');
                    return;
                }
                await utils.updateComplexName(complexId, newName);
                break;
            case 'update-price':
                const courtId = parseInt(process.argv[3]);
                const newPrice = parseInt(process.argv[4]);
                if (!courtId || !newPrice) {
                    console.log('❌ Uso: node scripts/db-utils.js update-price [ID] [NUEVO_PRECIO]');
                    return;
                }
                await utils.updateCourtPrice(courtId, newPrice);
                break;
            default:
                console.log('🔧 UTILIDADES DE BASE DE DATOS');
                console.log('==============================');
                console.log('Comandos disponibles:');
                console.log('  complexes              - Mostrar todos los complejos');
                console.log('  courts                 - Mostrar todas las canchas');
                console.log('  reservations [limit]   - Mostrar reservas recientes');
                console.log('  update-complex [id] [nombre] - Actualizar nombre de complejo');
                console.log('  update-price [id] [precio]   - Actualizar precio de cancha');
                console.log('');
                console.log('Ejemplos:');
                console.log('  node scripts/db-utils.js complexes');
                console.log('  node scripts/db-utils.js update-complex 3 "Complejo Demo 1"');
                console.log('  node scripts/db-utils.js update-price 10 50000');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await utils.disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = DatabaseUtils;
