#!/usr/bin/env node

/**
 * 🔍 VERIFICACIÓN DE TODAS LAS RESERVAS EN RENDER
 * 
 * Este script muestra todas las reservas que están realmente
 * en la base de datos de Render para verificar qué está pasando.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificacionTodasReservasRender {
    constructor() {
        this.pool = null;
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
        console.log('\n🔍 VERIFICANDO TODAS LAS RESERVAS EN RENDER...');
        console.log('=' .repeat(60));
        
        try {
            const reservasQuery = `
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
                    comp.nombre as complejo_nombre,
                    comp.email as complejo_email
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                ORDER BY r.created_at DESC
                LIMIT 20;
            `;
            
            const reservas = await this.pool.query(reservasQuery);
            
            console.log(`📊 TOTAL DE RESERVAS EN RENDER: ${reservas.rows.length} (mostrando las 20 más recientes)`);
            
            if (reservas.rows.length === 0) {
                console.log('❌ NO HAY RESERVAS EN LA BASE DE DATOS DE RENDER');
                return;
            }
            
            console.log('\n📋 LISTADO DE RESERVAS:');
            console.log('-'.repeat(80));
            
            reservas.rows.forEach((reserva, index) => {
                console.log(`\n${index + 1}. ${reserva.codigo_reserva}:`);
                console.log(`   • ID: ${reserva.id}`);
                console.log(`   • Estado: ${reserva.estado}`);
                console.log(`   • Precio: $${reserva.precio_total || 0}`);
                console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`   • Tipo: ${reserva.tipo_reserva}`);
                console.log(`   • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`   • Cancha: ${reserva.cancha_nombre}`);
                console.log(`   • Complejo: [${reserva.complejo_id}] ${reserva.complejo_nombre}`);
                console.log(`   • Email complejo: ${reserva.complejo_email}`);
                console.log(`   • Creada: ${reserva.created_at}`);
            });
            
        } catch (error) {
            console.error('❌ Error verificando reservas:', error.message);
        }
    }

    async verificarReservasPorComplejo() {
        console.log('\n🏢 VERIFICANDO RESERVAS POR COMPLEJO...');
        console.log('=' .repeat(50));
        
        try {
            const complejosQuery = `
                SELECT 
                    c.id,
                    c.nombre,
                    c.email,
                    COUNT(r.id) as total_reservas,
                    COUNT(CASE WHEN r.estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
                    COUNT(CASE WHEN r.estado = 'cancelada' THEN 1 END) as reservas_canceladas,
                    COUNT(CASE WHEN r.estado = 'pendiente' THEN 1 END) as reservas_pendientes
                FROM complejos c
                LEFT JOIN canchas ch ON c.id = ch.complejo_id
                LEFT JOIN reservas r ON ch.id = r.cancha_id
                GROUP BY c.id, c.nombre, c.email
                ORDER BY total_reservas DESC;
            `;
            
            const complejos = await this.pool.query(complejosQuery);
            
            console.log(`📊 COMPLEJOS Y SUS RESERVAS:`);
            
            complejos.rows.forEach(complejo => {
                console.log(`\n🏟️ [${complejo.id}] ${complejo.nombre}:`);
                console.log(`   Email: ${complejo.email}`);
                console.log(`   Total reservas: ${complejo.total_reservas}`);
                console.log(`   Confirmadas: ${complejo.reservas_confirmadas}`);
                console.log(`   Canceladas: ${complejo.reservas_canceladas}`);
                console.log(`   Pendientes: ${complejo.reservas_pendientes}`);
            });
            
        } catch (error) {
            console.error('❌ Error verificando reservas por complejo:', error.message);
        }
    }

    async buscarReservasRecientes() {
        console.log('\n🕐 BUSCANDO RESERVAS RECIENTES (ÚLTIMAS 24 HORAS)...');
        console.log('=' .repeat(60));
        
        try {
            const reservasRecientesQuery = `
                SELECT 
                    r.codigo_reserva,
                    r.estado,
                    r.precio_total,
                    r.created_at,
                    c.nombre as cancha_nombre,
                    comp.nombre as complejo_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE r.created_at >= NOW() - INTERVAL '24 hours'
                ORDER BY r.created_at DESC;
            `;
            
            const reservasRecientes = await this.pool.query(reservasRecientesQuery);
            
            if (reservasRecientes.rows.length === 0) {
                console.log('❌ No hay reservas creadas en las últimas 24 horas');
            } else {
                console.log(`📊 RESERVAS RECIENTES: ${reservasRecientes.rows.length}`);
                reservasRecientes.rows.forEach(reserva => {
                    console.log(`   • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                    console.log(`     ${reserva.complejo_nombre} - ${reserva.cancha_nombre}`);
                    console.log(`     Creada: ${reserva.created_at}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error buscando reservas recientes:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICACIÓN DE TODAS LAS RESERVAS EN RENDER');
        console.log('=' .repeat(60));
        
        await this.conectar();
        await this.verificarTodasLasReservas();
        await this.verificarReservasPorComplejo();
        await this.buscarReservasRecientes();
        
        console.log('\n🎯 CONCLUSIÓN:');
        console.log('=' .repeat(30));
        console.log('Si las reservas BQNI8W, IJRGBH y 1XJAKD no aparecen aquí,');
        console.log('pero las ves en la interfaz web, entonces:');
        console.log('1. Puede ser un problema de caché del navegador');
        console.log('2. O estás viendo datos de desarrollo local');
        console.log('3. O hay un problema de sincronización');
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificacionTodasReservasRender();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificacionTodasReservasRender;

/**
 * 🔍 VERIFICACIÓN DE TODAS LAS RESERVAS EN RENDER
 * 
 * Este script muestra todas las reservas que están realmente
 * en la base de datos de Render para verificar qué está pasando.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificacionTodasReservasRender {
    constructor() {
        this.pool = null;
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
        console.log('\n🔍 VERIFICANDO TODAS LAS RESERVAS EN RENDER...');
        console.log('=' .repeat(60));
        
        try {
            const reservasQuery = `
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
                    comp.nombre as complejo_nombre,
                    comp.email as complejo_email
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                ORDER BY r.created_at DESC
                LIMIT 20;
            `;
            
            const reservas = await this.pool.query(reservasQuery);
            
            console.log(`📊 TOTAL DE RESERVAS EN RENDER: ${reservas.rows.length} (mostrando las 20 más recientes)`);
            
            if (reservas.rows.length === 0) {
                console.log('❌ NO HAY RESERVAS EN LA BASE DE DATOS DE RENDER');
                return;
            }
            
            console.log('\n📋 LISTADO DE RESERVAS:');
            console.log('-'.repeat(80));
            
            reservas.rows.forEach((reserva, index) => {
                console.log(`\n${index + 1}. ${reserva.codigo_reserva}:`);
                console.log(`   • ID: ${reserva.id}`);
                console.log(`   • Estado: ${reserva.estado}`);
                console.log(`   • Precio: $${reserva.precio_total || 0}`);
                console.log(`   • Comisión: $${reserva.comision_aplicada || 0}`);
                console.log(`   • Tipo: ${reserva.tipo_reserva}`);
                console.log(`   • Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                console.log(`   • Cancha: ${reserva.cancha_nombre}`);
                console.log(`   • Complejo: [${reserva.complejo_id}] ${reserva.complejo_nombre}`);
                console.log(`   • Email complejo: ${reserva.complejo_email}`);
                console.log(`   • Creada: ${reserva.created_at}`);
            });
            
        } catch (error) {
            console.error('❌ Error verificando reservas:', error.message);
        }
    }

    async verificarReservasPorComplejo() {
        console.log('\n🏢 VERIFICANDO RESERVAS POR COMPLEJO...');
        console.log('=' .repeat(50));
        
        try {
            const complejosQuery = `
                SELECT 
                    c.id,
                    c.nombre,
                    c.email,
                    COUNT(r.id) as total_reservas,
                    COUNT(CASE WHEN r.estado = 'confirmada' THEN 1 END) as reservas_confirmadas,
                    COUNT(CASE WHEN r.estado = 'cancelada' THEN 1 END) as reservas_canceladas,
                    COUNT(CASE WHEN r.estado = 'pendiente' THEN 1 END) as reservas_pendientes
                FROM complejos c
                LEFT JOIN canchas ch ON c.id = ch.complejo_id
                LEFT JOIN reservas r ON ch.id = r.cancha_id
                GROUP BY c.id, c.nombre, c.email
                ORDER BY total_reservas DESC;
            `;
            
            const complejos = await this.pool.query(complejosQuery);
            
            console.log(`📊 COMPLEJOS Y SUS RESERVAS:`);
            
            complejos.rows.forEach(complejo => {
                console.log(`\n🏟️ [${complejo.id}] ${complejo.nombre}:`);
                console.log(`   Email: ${complejo.email}`);
                console.log(`   Total reservas: ${complejo.total_reservas}`);
                console.log(`   Confirmadas: ${complejo.reservas_confirmadas}`);
                console.log(`   Canceladas: ${complejo.reservas_canceladas}`);
                console.log(`   Pendientes: ${complejo.reservas_pendientes}`);
            });
            
        } catch (error) {
            console.error('❌ Error verificando reservas por complejo:', error.message);
        }
    }

    async buscarReservasRecientes() {
        console.log('\n🕐 BUSCANDO RESERVAS RECIENTES (ÚLTIMAS 24 HORAS)...');
        console.log('=' .repeat(60));
        
        try {
            const reservasRecientesQuery = `
                SELECT 
                    r.codigo_reserva,
                    r.estado,
                    r.precio_total,
                    r.created_at,
                    c.nombre as cancha_nombre,
                    comp.nombre as complejo_nombre
                FROM reservas r
                LEFT JOIN canchas c ON r.cancha_id = c.id
                LEFT JOIN complejos comp ON c.complejo_id = comp.id
                WHERE r.created_at >= NOW() - INTERVAL '24 hours'
                ORDER BY r.created_at DESC;
            `;
            
            const reservasRecientes = await this.pool.query(reservasRecientesQuery);
            
            if (reservasRecientes.rows.length === 0) {
                console.log('❌ No hay reservas creadas en las últimas 24 horas');
            } else {
                console.log(`📊 RESERVAS RECIENTES: ${reservasRecientes.rows.length}`);
                reservasRecientes.rows.forEach(reserva => {
                    console.log(`   • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                    console.log(`     ${reserva.complejo_nombre} - ${reserva.cancha_nombre}`);
                    console.log(`     Creada: ${reserva.created_at}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error buscando reservas recientes:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICACIÓN DE TODAS LAS RESERVAS EN RENDER');
        console.log('=' .repeat(60));
        
        await this.conectar();
        await this.verificarTodasLasReservas();
        await this.verificarReservasPorComplejo();
        await this.buscarReservasRecientes();
        
        console.log('\n🎯 CONCLUSIÓN:');
        console.log('=' .repeat(30));
        console.log('Si las reservas BQNI8W, IJRGBH y 1XJAKD no aparecen aquí,');
        console.log('pero las ves en la interfaz web, entonces:');
        console.log('1. Puede ser un problema de caché del navegador');
        console.log('2. O estás viendo datos de desarrollo local');
        console.log('3. O hay un problema de sincronización');
        
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificacionTodasReservasRender();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificacionTodasReservasRender;


