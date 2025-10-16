#!/usr/bin/env node

/**
 * SCRIPT SÚPER SIMPLE PARA MODIFICACIONES RÁPIDAS
 * Uso: node scripts/quick-db.js [comando] [parámetros]
 */

// Configurar entorno ANTES de importar
process.env.NODE_ENV = 'development';
require('dotenv').config({ path: './env.postgresql' });

const DatabaseManager = require('../src/config/database');

class QuickDB {
    constructor() {
        this.db = new DatabaseManager();
    }

    async connect() {
        await this.db.connect();
    }

    async disconnect() {
        await this.db.close();
    }

    // Ver todos los complejos
    async showComplexes() {
        const complejos = await this.db.all(`
            SELECT c.id, c.nombre, ci.nombre as ciudad_nombre
            FROM complejos c
            JOIN ciudades ci ON c.ciudad_id = ci.id
            ORDER BY c.id
        `);
        
        console.log('🏢 COMPLEJOS:');
        complejos.forEach(c => console.log(`   ${c.id} | ${c.nombre} | ${c.ciudad_nombre}`));
        return complejos;
    }

    // Ver todas las canchas
    async showCourts() {
        const canchas = await this.db.all(`
            SELECT ca.id, ca.nombre, ca.tipo, ca.precio_hora, c.nombre as complejo_nombre
            FROM canchas ca
            JOIN complejos c ON ca.complejo_id = c.id
            ORDER BY ca.id
        `);
        
        console.log('⚽ CANCHAS:');
        canchas.forEach(c => console.log(`   ${c.id} | ${c.nombre} | ${c.tipo} | $${c.precio_hora} | ${c.complejo_nombre}`));
        return canchas;
    }

    // Cambiar nombre de complejo
    async updateComplexName(id, newName) {
        await this.db.run('UPDATE complejos SET nombre = $1 WHERE id = $2', [newName, id]);
        console.log(`✅ Complejo ${id} actualizado a: ${newName}`);
    }

    // Cambiar precio de cancha
    async updateCourtPrice(id, newPrice) {
        await this.db.run('UPDATE canchas SET precio_hora = $1 WHERE id = $2', [newPrice, id]);
        console.log(`✅ Cancha ${id} precio actualizado a: $${newPrice}`);
    }

    // Ver reservas recientes
    async showRecentReservations(limit = 5) {
        const reservas = await this.db.all(`
            SELECT r.codigo_reserva, r.nombre_cliente, r.fecha, r.hora_inicio, 
                   c.nombre as cancha_nombre, co.nombre as complejo_nombre
            FROM reservas r
            JOIN canchas c ON r.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
            ORDER BY r.created_at DESC
            LIMIT $1
        `, [limit]);
        
        console.log(`📅 ÚLTIMAS ${limit} RESERVAS:`);
        reservas.forEach(r => console.log(`   ${r.codigo_reserva} | ${r.nombre_cliente} | ${r.fecha} ${r.hora_inicio} | ${r.cancha_nombre}`));
        return reservas;
    }
}

// Función principal
async function main() {
    const command = process.argv[2];
    const quickDB = new QuickDB();
    
    try {
        await quickDB.connect();
        
        switch (command) {
            case 'complexes':
                await quickDB.showComplexes();
                break;
                
            case 'courts':
                await quickDB.showCourts();
                break;
                
            case 'reservations':
                const limit = parseInt(process.argv[3]) || 5;
                await quickDB.showRecentReservations(limit);
                break;
                
            case 'update-complex':
                const complexId = parseInt(process.argv[3]);
                const newName = process.argv[4];
                if (!complexId || !newName) {
                    console.log('❌ Uso: node scripts/quick-db.js update-complex [ID] [NUEVO_NOMBRE]');
                    return;
                }
                await quickDB.updateComplexName(complexId, newName);
                break;
                
            case 'update-price':
                const courtId = parseInt(process.argv[3]);
                const newPrice = parseInt(process.argv[4]);
                if (!courtId || !newPrice) {
                    console.log('❌ Uso: node scripts/quick-db.js update-price [ID] [NUEVO_PRECIO]');
                    return;
                }
                await quickDB.updateCourtPrice(courtId, newPrice);
                break;
                
            default:
                console.log('🚀 COMANDOS RÁPIDOS:');
                console.log('   complexes                    - Ver todos los complejos');
                console.log('   courts                       - Ver todas las canchas');
                console.log('   reservations [limit]         - Ver reservas recientes');
                console.log('   update-complex [id] [nombre] - Cambiar nombre de complejo');
                console.log('   update-price [id] [precio]   - Cambiar precio de cancha');
                console.log('');
                console.log('📝 EJEMPLOS:');
                console.log('   node scripts/quick-db.js complexes');
                console.log('   node scripts/quick-db.js update-complex 3 "Nuevo Nombre"');
                console.log('   node scripts/quick-db.js update-price 10 50000');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await quickDB.disconnect();
    }
}

if (require.main === module) {
    main();
}

module.exports = QuickDB;
