#!/usr/bin/env node

/**
 * 🔍 VERIFICACIÓN COMPLETA DE RESERVAS DEMO 3
 * 
 * Este script verifica todas las reservas del complejo Demo 3
 * para entender por qué algunas no generan movimientos financieros.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificacionCompletaReservasDemo3 {
    constructor() {
        this.pool = null;
        this.complejoId = 8; // Complejo Demo 3
    }

    async conectar() {
        try {
            console.log('🔗 Conectando a PRODUCCIÓN...');
            
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });

            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as server_time');
            client.release();
            
            console.log('✅ Conectado a PRODUCCIÓN');
            console.log(`🕐 Hora del servidor: ${result.rows[0].server_time}`);
            
        } catch (error) {
            console.error('❌ Error conectando a producción:', error.message);
            process.exit(1);
        }
    }

    async verificarTodasLasReservas() {
        console.log('\n🔍 VERIFICANDO TODAS LAS RESERVAS DEL COMPLEJO DEMO 3...');
        console.log('=' .repeat(70));
        
        try {
            const query = `
                SELECT 
                    r.id,
                    r.codigo_reserva,
                    r.estado,
                    r.precio_total,
                    r.comision_aplicada,
                    r.tipo_reserva,
                    r.fecha,
                    r.hora_inicio,
                    r.hora_fin,
                    r.created_at,
                    c.nombre as cancha_nombre,
                    c.complejo_id,
                    comp.nombre as complejo_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE c.complejo_id = $1
                ORDER BY r.created_at DESC;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ NO HAY RESERVAS PARA EL COMPLEJO DEMO 3');
                return;
            }
            
            console.log(`📊 TOTAL DE RESERVAS ENCONTRADAS: ${result.rows.length}`);
            console.log('\n📋 LISTADO DE RESERVAS:');
            console.log('-'.repeat(70));
            
            let reservasConfirmadas = 0;
            let reservasConMovimientos = 0;
            let reservasSinMovimientos = 0;
            
            for (const reserva of result.rows) {
                console.log(`\n${reserva.codigo_reserva}:`);
                console.log(`   • Estado: ${reserva.estado}`);
                console.log(`   • Precio: $${reserva.precio_total || 0}`);
                console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`   • Cancha: ${reserva.cancha_nombre}`);
                console.log(`   • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`   • Creada: ${reserva.created_at}`);
                
                if (reserva.estado === 'confirmada') {
                    reservasConfirmadas++;
                    
                    // Verificar si tiene movimientos
                    const movimientos = await this.verificarMovimientosReserva(reserva.codigo_reserva);
                    if (movimientos > 0) {
                        reservasConMovimientos++;
                        console.log(`   ✅ Tiene ${movimientos} movimientos financieros`);
                    } else {
                        reservasSinMovimientos++;
                        console.log(`   ❌ SIN movimientos financieros`);
                    }
                }
            }
            
            // Resumen
            console.log('\n📊 RESUMEN:');
            console.log('=' .repeat(40));
            console.log(`Total reservas: ${result.rows.length}`);
            console.log(`Reservas confirmadas: ${reservasConfirmadas}`);
            console.log(`Con movimientos: ${reservasConMovimientos}`);
            console.log(`Sin movimientos: ${reservasSinMovimientos}`);
            
            if (reservasSinMovimientos > 0) {
                console.log(`\n⚠️ PROBLEMA: ${reservasSinMovimientos} reservas confirmadas no tienen movimientos financieros`);
            }
            
        } catch (error) {
            console.error('❌ Error verificando reservas:', error.message);
        }
    }

    async verificarMovimientosReserva(codigoReserva) {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM gastos_ingresos
                WHERE descripcion LIKE $1;
            `;
            
            const result = await this.pool.query(query, [`%${codigoReserva}%`]);
            return parseInt(result.rows[0].count);
            
        } catch (error) {
            console.error(`❌ Error verificando movimientos de ${codigoReserva}:`, error.message);
            return 0;
        }
    }

    async buscarReservasPorPatron() {
        console.log('\n🔍 BUSCANDO RESERVAS POR PATRONES...');
        console.log('=' .repeat(50));
        
        const patrones = ['BQNI8W', 'IJRGBH', 'BQNI', 'IJRG', 'BQ', 'IJ'];
        
        for (const patron of patrones) {
            try {
                const query = `
                    SELECT 
                        r.codigo_reserva,
                        r.estado,
                        r.precio_total,
                        c.nombre as cancha_nombre,
                        comp.nombre as complejo_nombre
                    FROM reservas r
                    LEFT JOIN canchas c ON r.cancha_id = c.id
                    LEFT JOIN complejos comp ON c.complejo_id = comp.id
                    WHERE r.codigo_reserva LIKE $1
                    ORDER BY r.created_at DESC
                    LIMIT 5;
                `;
                
                const result = await this.pool.query(query, [`%${patron}%`]);
                
                if (result.rows.length > 0) {
                    console.log(`\n🔍 Patrón "${patron}": ${result.rows.length} resultados`);
                    result.rows.forEach(reserva => {
                        console.log(`   • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0} - ${reserva.complejo_nombre}`);
                    });
                } else {
                    console.log(`🔍 Patrón "${patron}": Sin resultados`);
                }
                
            } catch (error) {
                console.error(`❌ Error buscando patrón ${patron}:`, error.message);
            }
        }
    }

    async verificarComplejosDisponibles() {
        console.log('\n🏢 VERIFICANDO COMPLEJOS DISPONIBLES...');
        console.log('=' .repeat(50));
        
        try {
            const query = `
                SELECT 
                    id,
                    nombre,
                    direccion,
                    telefono
                FROM complejos
                ORDER BY id;
            `;
            
            const result = await this.pool.query(query);
            
            console.log(`📊 Total de complejos: ${result.rows.length}`);
            result.rows.forEach(complejo => {
                console.log(`   • [${complejo.id}] ${complejo.nombre}`);
                console.log(`     Dirección: ${complejo.direccion}`);
                console.log(`     Teléfono: ${complejo.telefono}`);
            });
            
        } catch (error) {
            console.error('❌ Error verificando complejos:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICACIÓN COMPLETA DE RESERVAS DEMO 3');
        console.log('=' .repeat(70));
        
        await this.conectar();
        
        await this.verificarComplejosDisponibles();
        await this.verificarTodasLasReservas();
        await this.buscarReservasPorPatron();
        
        console.log('\n🎯 CONCLUSIÓN:');
        console.log('=' .repeat(30));
        console.log('Si las reservas BQNI8W e IJRGBH no aparecen aquí,');
        console.log('pero las ves en el calendario, es posible que:');
        console.log('1. Estés viendo el entorno de desarrollo local');
        console.log('2. Haya un problema de caché en el navegador');
        console.log('3. Las reservas estén en una base de datos diferente');
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificacionCompletaReservasDemo3();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificacionCompletaReservasDemo3;

/**
 * 🔍 VERIFICACIÓN COMPLETA DE RESERVAS DEMO 3
 * 
 * Este script verifica todas las reservas del complejo Demo 3
 * para entender por qué algunas no generan movimientos financieros.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificacionCompletaReservasDemo3 {
    constructor() {
        this.pool = null;
        this.complejoId = 8; // Complejo Demo 3
    }

    async conectar() {
        try {
            console.log('🔗 Conectando a PRODUCCIÓN...');
            
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });

            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as server_time');
            client.release();
            
            console.log('✅ Conectado a PRODUCCIÓN');
            console.log(`🕐 Hora del servidor: ${result.rows[0].server_time}`);
            
        } catch (error) {
            console.error('❌ Error conectando a producción:', error.message);
            process.exit(1);
        }
    }

    async verificarTodasLasReservas() {
        console.log('\n🔍 VERIFICANDO TODAS LAS RESERVAS DEL COMPLEJO DEMO 3...');
        console.log('=' .repeat(70));
        
        try {
            const query = `
                SELECT 
                    r.id,
                    r.codigo_reserva,
                    r.estado,
                    r.precio_total,
                    r.comision_aplicada,
                    r.tipo_reserva,
                    r.fecha,
                    r.hora_inicio,
                    r.hora_fin,
                    r.created_at,
                    c.nombre as cancha_nombre,
                    c.complejo_id,
                    comp.nombre as complejo_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE c.complejo_id = $1
                ORDER BY r.created_at DESC;
            `;
            
            const result = await this.pool.query(query, [this.complejoId]);
            
            if (result.rows.length === 0) {
                console.log('❌ NO HAY RESERVAS PARA EL COMPLEJO DEMO 3');
                return;
            }
            
            console.log(`📊 TOTAL DE RESERVAS ENCONTRADAS: ${result.rows.length}`);
            console.log('\n📋 LISTADO DE RESERVAS:');
            console.log('-'.repeat(70));
            
            let reservasConfirmadas = 0;
            let reservasConMovimientos = 0;
            let reservasSinMovimientos = 0;
            
            for (const reserva of result.rows) {
                console.log(`\n${reserva.codigo_reserva}:`);
                console.log(`   • Estado: ${reserva.estado}`);
                console.log(`   • Precio: $${reserva.precio_total || 0}`);
                console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`   • Cancha: ${reserva.cancha_nombre}`);
                console.log(`   • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`   • Creada: ${reserva.created_at}`);
                
                if (reserva.estado === 'confirmada') {
                    reservasConfirmadas++;
                    
                    // Verificar si tiene movimientos
                    const movimientos = await this.verificarMovimientosReserva(reserva.codigo_reserva);
                    if (movimientos > 0) {
                        reservasConMovimientos++;
                        console.log(`   ✅ Tiene ${movimientos} movimientos financieros`);
                    } else {
                        reservasSinMovimientos++;
                        console.log(`   ❌ SIN movimientos financieros`);
                    }
                }
            }
            
            // Resumen
            console.log('\n📊 RESUMEN:');
            console.log('=' .repeat(40));
            console.log(`Total reservas: ${result.rows.length}`);
            console.log(`Reservas confirmadas: ${reservasConfirmadas}`);
            console.log(`Con movimientos: ${reservasConMovimientos}`);
            console.log(`Sin movimientos: ${reservasSinMovimientos}`);
            
            if (reservasSinMovimientos > 0) {
                console.log(`\n⚠️ PROBLEMA: ${reservasSinMovimientos} reservas confirmadas no tienen movimientos financieros`);
            }
            
        } catch (error) {
            console.error('❌ Error verificando reservas:', error.message);
        }
    }

    async verificarMovimientosReserva(codigoReserva) {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM gastos_ingresos
                WHERE descripcion LIKE $1;
            `;
            
            const result = await this.pool.query(query, [`%${codigoReserva}%`]);
            return parseInt(result.rows[0].count);
            
        } catch (error) {
            console.error(`❌ Error verificando movimientos de ${codigoReserva}:`, error.message);
            return 0;
        }
    }

    async buscarReservasPorPatron() {
        console.log('\n🔍 BUSCANDO RESERVAS POR PATRONES...');
        console.log('=' .repeat(50));
        
        const patrones = ['BQNI8W', 'IJRGBH', 'BQNI', 'IJRG', 'BQ', 'IJ'];
        
        for (const patron of patrones) {
            try {
                const query = `
                    SELECT 
                        r.codigo_reserva,
                        r.estado,
                        r.precio_total,
                        c.nombre as cancha_nombre,
                        comp.nombre as complejo_nombre
                    FROM reservas r
                    LEFT JOIN canchas c ON r.cancha_id = c.id
                    LEFT JOIN complejos comp ON c.complejo_id = comp.id
                    WHERE r.codigo_reserva LIKE $1
                    ORDER BY r.created_at DESC
                    LIMIT 5;
                `;
                
                const result = await this.pool.query(query, [`%${patron}%`]);
                
                if (result.rows.length > 0) {
                    console.log(`\n🔍 Patrón "${patron}": ${result.rows.length} resultados`);
                    result.rows.forEach(reserva => {
                        console.log(`   • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0} - ${reserva.complejo_nombre}`);
                    });
                } else {
                    console.log(`🔍 Patrón "${patron}": Sin resultados`);
                }
                
            } catch (error) {
                console.error(`❌ Error buscando patrón ${patron}:`, error.message);
            }
        }
    }

    async verificarComplejosDisponibles() {
        console.log('\n🏢 VERIFICANDO COMPLEJOS DISPONIBLES...');
        console.log('=' .repeat(50));
        
        try {
            const query = `
                SELECT 
                    id,
                    nombre,
                    direccion,
                    telefono
                FROM complejos
                ORDER BY id;
            `;
            
            const result = await this.pool.query(query);
            
            console.log(`📊 Total de complejos: ${result.rows.length}`);
            result.rows.forEach(complejo => {
                console.log(`   • [${complejo.id}] ${complejo.nombre}`);
                console.log(`     Dirección: ${complejo.direccion}`);
                console.log(`     Teléfono: ${complejo.telefono}`);
            });
            
        } catch (error) {
            console.error('❌ Error verificando complejos:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICACIÓN COMPLETA DE RESERVAS DEMO 3');
        console.log('=' .repeat(70));
        
        await this.conectar();
        
        await this.verificarComplejosDisponibles();
        await this.verificarTodasLasReservas();
        await this.buscarReservasPorPatron();
        
        console.log('\n🎯 CONCLUSIÓN:');
        console.log('=' .repeat(30));
        console.log('Si las reservas BQNI8W e IJRGBH no aparecen aquí,');
        console.log('pero las ves en el calendario, es posible que:');
        console.log('1. Estés viendo el entorno de desarrollo local');
        console.log('2. Haya un problema de caché en el navegador');
        console.log('3. Las reservas estén en una base de datos diferente');
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificacionCompletaReservasDemo3();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificacionCompletaReservasDemo3;


