#!/usr/bin/env node

/**
 * 🔍 VERIFICAR CANCHAS Y RESERVAS DEL COMPLEJO DEMO 3
 */

const { Pool } = require('pg');

process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificarCanchasDemo3 {
    constructor() {
        this.pool = null;
        this.complejoId = 8;
    }

    async conectar() {
        try {
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
            console.log('✅ Conectado a PRODUCCIÓN');
        } catch (error) {
            console.error('❌ Error conectando:', error.message);
            process.exit(1);
        }
    }

    async verificarCanchas() {
        console.log('\n🔍 VERIFICANDO CANCHAS DEL COMPLEJO DEMO 3...');
        
        try {
            const query = `
                SELECT 
                    c.id,
                    c.nombre,
                    c.tipo,
                    c.precio_hora,
                    c.activa,
                    c.complejo_id
                FROM canchas c
                WHERE c.complejo_id = $1
                ORDER BY c.id;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ NO HAY CANCHAS PARA ESTE COMPLEJO');
                return false;
            }
            
            console.log(`📊 CANCHAS ENCONTRADAS: ${result.rows.length}`);
            result.rows.forEach(cancha => {
                console.log(`   • ID: ${cancha.id} | Nombre: ${cancha.nombre}`);
                console.log(`     Tipo: ${cancha.tipo} | Precio: $${cancha.precio_hora} | Activa: ${cancha.activa}`);
            });
            
            return result.rows;
            
        } catch (error) {
            console.error('❌ Error verificando canchas:', error.message);
            return false;
        }
    }

    async verificarReservasPorCancha(canchas) {
        console.log('\n🔍 VERIFICANDO RESERVAS POR CANCHA...');
        
        for (const cancha of canchas) {
            console.log(`\n📋 Cancha: ${cancha.nombre} (ID: ${cancha.id})`);
            
            try {
                const query = `
                    SELECT 
                        r.id,
                        r.codigo_reserva,
                        r.estado,
                        r.precio_total,
                        r.comision_aplicada,
                        r.fecha,
                        r.hora_inicio,
                        r.hora_fin,
                        r.created_at
                    FROM reservas r
                    WHERE r.cancha_id = $1
                    ORDER BY r.created_at DESC
                    LIMIT 5;
                `;
                
                const result = await this.pool.query(query, [cancha.id]);
                
                if (result.rows.length === 0) {
                    console.log('   ❌ No hay reservas para esta cancha');
                } else {
                    console.log(`   📊 Reservas encontradas: ${result.rows.length}`);
                    result.rows.forEach(reserva => {
                        console.log(`      • #${reserva.codigo_reserva} - Estado: ${reserva.estado}`);
                        console.log(`        Precio: $${reserva.precio_total} | Comisión: $${reserva.comision_aplicada}`);
                        console.log(`        Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error verificando reservas de cancha ${cancha.id}:`, error.message);
            }
        }
    }

    async buscarReservasPorCodigo() {
        console.log('\n🔍 BUSCANDO RESERVAS POR CÓDIGO EN TODO EL SISTEMA...');
        
        try {
            // Buscar reservas que mencionaste (como la #5IR2JE)
            const codigosReserva = ['5IR2JE', '8Y5T7X', 'YZQX9Z'];
            
            for (const codigo of codigosReserva) {
                const query = `
                    SELECT 
                        r.id,
                        r.codigo_reserva,
                        r.estado,
                        r.precio_total,
                        r.comision_aplicada,
                        r.cancha_id,
                        c.nombre as cancha_nombre,
                        c.complejo_id,
                        comp.nombre as complejo_nombre
                    FROM reservas r
                    LEFT JOIN canchas c ON r.cancha_id = c.id
                    LEFT JOIN complejos comp ON c.complejo_id = comp.id
                    WHERE r.codigo_reserva = $1;
                `;
                
                const result = await this.pool.query(query, [codigo]);
                
                if (result.rows.length === 0) {
                    console.log(`   ❌ Reserva #${codigo} no encontrada`);
                } else {
                    const reserva = result.rows[0];
                    console.log(`   ✅ Reserva #${codigo} encontrada:`);
                    console.log(`      • Estado: ${reserva.estado}`);
                    console.log(`      • Precio: $${reserva.precio_total}`);
                    console.log(`      • Cancha: ${reserva.cancha_nombre} (ID: ${reserva.cancha_id})`);
                    console.log(`      • Complejo: ${reserva.complejo_nombre} (ID: ${reserva.complejo_id})`);
                    
                    if (reserva.complejo_id === this.complejoId) {
                        console.log(`      ✅ Esta reserva SÍ pertenece al Complejo Demo 3`);
                    } else {
                        console.log(`      ❌ Esta reserva NO pertenece al Complejo Demo 3`);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Error buscando reservas por código:', error.message);
        }
    }

    async verificarTodasLasReservas() {
        console.log('\n🔍 VERIFICANDO TODAS LAS RESERVAS DEL SISTEMA...');
        
        try {
            const query = `
                SELECT 
                    r.codigo_reserva,
                    r.estado,
                    r.precio_total,
                    r.comision_aplicada,
                    c.nombre as cancha_nombre,
                    c.complejo_id,
                    comp.nombre as complejo_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE r.created_at >= NOW() - INTERVAL '7 days'
                ORDER BY r.created_at DESC;
            `;
            
            const result = await this.pool.query(query);
            
            console.log(`📊 RESERVAS DE LOS ÚLTIMOS 7 DÍAS: ${result.rows.length}`);
            
            const reservasPorComplejo = {};
            result.rows.forEach(reserva => {
                const complejoNombre = reserva.complejo_nombre || 'Sin complejo';
                if (!reservasPorComplejo[complejoNombre]) {
                    reservasPorComplejo[complejoNombre] = [];
                }
                reservasPorComplejo[complejoNombre].push(reserva);
            });
            
            Object.keys(reservasPorComplejo).forEach(complejo => {
                console.log(`\n   📍 ${complejo}: ${reservasPorComplejo[complejo].length} reservas`);
                reservasPorComplejo[complejo].forEach(reserva => {
                    console.log(`      • #${reserva.codigo_reserva} - $${reserva.precio_total} - ${reserva.cancha_nombre}`);
                });
            });
            
        } catch (error) {
            console.error('❌ Error verificando todas las reservas:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async diagnosticar() {
        console.log('🔍 VERIFICACIÓN COMPLETA - COMPLEJO DEMO 3');
        console.log('=' .repeat(60));
        
        await this.conectar();
        
        const canchas = await this.verificarCanchas();
        if (canchas) {
            await this.verificarReservasPorCancha(canchas);
        }
        
        await this.buscarReservasPorCodigo();
        await this.verificarTodasLasReservas();
        
        await this.cerrar();
    }
}

if (require.main === module) {
    const verificador = new VerificarCanchasDemo3();
    verificador.diagnosticar().catch(console.error);
}

module.exports = VerificarCanchasDemo3;


