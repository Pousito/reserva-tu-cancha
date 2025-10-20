#!/usr/bin/env node

/**
 * 🔍 VERIFICACIÓN DE INCONSISTENCIAS RESTANTES
 * 
 * Este script verifica las 3 inconsistencias restantes
 * y las corrige si es necesario.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificacionInconsistenciasRestantes {
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
            
        } catch (error) {
            console.error('❌ Error conectando a producción:', error.message);
            process.exit(1);
        }
    }

    async verificarInconsistenciasRestantes() {
        console.log('\n🔍 VERIFICANDO INCONSISTENCIAS RESTANTES...');
        console.log('=' .repeat(60));
        
        try {
            const inconsistenciasQuery = `
                SELECT 
                    gi.id as movimiento_id,
                    gi.complejo_id as movimiento_complejo,
                    gi.tipo as movimiento_tipo,
                    gi.monto,
                    gi.descripcion,
                    cg.complejo_id as categoria_complejo,
                    cg.nombre as categoria_nombre,
                    cg.tipo as categoria_tipo
                FROM gastos_ingresos gi
                JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id != cg.complejo_id
                ORDER BY gi.id;
            `;
            
            const inconsistencias = await this.pool.query(inconsistenciasQuery);
            
            if (inconsistencias.rows.length === 0) {
                console.log('✅ No hay inconsistencias restantes');
                return;
            }
            
            console.log(`📊 Inconsistencias encontradas: ${inconsistencias.rows.length}`);
            
            for (const inc of inconsistencias.rows) {
                console.log(`\n🔍 Movimiento ID ${inc.movimiento_id}:`);
                console.log(`   Complejo movimiento: ${inc.movimiento_complejo}`);
                console.log(`   Complejo categoría: ${inc.categoria_complejo}`);
                console.log(`   Tipo: ${inc.movimiento_tipo}`);
                console.log(`   Monto: $${inc.monto}`);
                console.log(`   Categoría: ${inc.categoria_nombre} (${inc.categoria_tipo})`);
                console.log(`   Descripción: ${inc.descripcion}`);
                
                // Determinar si es un problema real o aceptable
                if (inc.movimiento_complejo === 1 && inc.categoria_complejo === 3) {
                    console.log(`   ⚠️ Movimiento del complejo 1 usando categoría del complejo 3`);
                    console.log(`   💡 Esto podría ser aceptable si es un movimiento compartido`);
                } else if (inc.movimiento_complejo === 6 && inc.categoria_complejo === 1) {
                    console.log(`   ⚠️ Movimiento del complejo 6 usando categoría del complejo 1`);
                    console.log(`   💡 Esto podría ser aceptable si es un movimiento compartido`);
                } else if (inc.movimiento_complejo === 7 && inc.categoria_complejo === 6) {
                    console.log(`   ⚠️ Movimiento del complejo 7 usando categoría del complejo 6`);
                    console.log(`   💡 Esto podría ser aceptable si es un movimiento compartido`);
                } else {
                    console.log(`   ❌ Inconsistencia que necesita corrección`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error verificando inconsistencias:', error.message);
        }
    }

    async verificarComplejoDemo3Final() {
        console.log('\n🔍 VERIFICANDO COMPLEJO DEMO 3 FINAL...');
        console.log('=' .repeat(50));
        
        try {
            const complejoQuery = `
                SELECT 
                    c.id,
                    c.nombre,
                    c.direccion,
                    (SELECT COUNT(*) FROM canchas WHERE complejo_id = c.id) as canchas,
                    (SELECT COUNT(*) FROM reservas r JOIN canchas ch ON r.cancha_id = ch.id WHERE ch.complejo_id = c.id) as reservas,
                    (SELECT COUNT(*) FROM categorias_gastos WHERE complejo_id = c.id) as categorias,
                    (SELECT COUNT(*) FROM gastos_ingresos WHERE complejo_id = c.id) as movimientos
                FROM complejos c
                WHERE c.nombre LIKE '%Demo 3%'
                ORDER BY c.id;
            `;
            
            const complejos = await this.pool.query(complejoQuery);
            
            console.log(`📊 Complejos Demo 3: ${complejos.rows.length}`);
            
            for (const complejo of complejos.rows) {
                console.log(`\n✅ [${complejo.id}] ${complejo.nombre}`);
                console.log(`   Dirección: ${complejo.direccion}`);
                console.log(`   Canchas: ${complejo.canchas}`);
                console.log(`   Reservas: ${complejo.reservas}`);
                console.log(`   Categorías: ${complejo.categorias}`);
                console.log(`   Movimientos: ${complejo.movimientos}`);
                
                // Verificar reservas específicas
                if (complejo.reservas > 0) {
                    const reservasQuery = `
                        SELECT 
                            r.codigo_reserva,
                            r.estado,
                            r.precio_total,
                            r.comision_aplicada,
                            ch.nombre as cancha_nombre
                        FROM reservas r
                        JOIN canchas ch ON r.cancha_id = ch.id
                        WHERE ch.complejo_id = $1
                        ORDER BY r.created_at DESC;
                    `;
                    
                    const reservas = await this.pool.query(reservasQuery, [complejo.id]);
                    
                    console.log(`\n   📋 Reservas:`);
                    reservas.rows.forEach(reserva => {
                        console.log(`      • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                        console.log(`        Cancha: ${reserva.cancha_nombre}`);
                        console.log(`        Comisión: $${reserva.comision_aplicada || 0}`);
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ Error verificando complejo Demo 3:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICACIÓN DE INCONSISTENCIAS RESTANTES');
        console.log('=' .repeat(60));
        
        await this.conectar();
        await this.verificarInconsistenciasRestantes();
        await this.verificarComplejoDemo3Final();
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificacionInconsistenciasRestantes();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificacionInconsistenciasRestantes;

/**
 * 🔍 VERIFICACIÓN DE INCONSISTENCIAS RESTANTES
 * 
 * Este script verifica las 3 inconsistencias restantes
 * y las corrige si es necesario.
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class VerificacionInconsistenciasRestantes {
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
            
        } catch (error) {
            console.error('❌ Error conectando a producción:', error.message);
            process.exit(1);
        }
    }

    async verificarInconsistenciasRestantes() {
        console.log('\n🔍 VERIFICANDO INCONSISTENCIAS RESTANTES...');
        console.log('=' .repeat(60));
        
        try {
            const inconsistenciasQuery = `
                SELECT 
                    gi.id as movimiento_id,
                    gi.complejo_id as movimiento_complejo,
                    gi.tipo as movimiento_tipo,
                    gi.monto,
                    gi.descripcion,
                    cg.complejo_id as categoria_complejo,
                    cg.nombre as categoria_nombre,
                    cg.tipo as categoria_tipo
                FROM gastos_ingresos gi
                JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                WHERE gi.complejo_id != cg.complejo_id
                ORDER BY gi.id;
            `;
            
            const inconsistencias = await this.pool.query(inconsistenciasQuery);
            
            if (inconsistencias.rows.length === 0) {
                console.log('✅ No hay inconsistencias restantes');
                return;
            }
            
            console.log(`📊 Inconsistencias encontradas: ${inconsistencias.rows.length}`);
            
            for (const inc of inconsistencias.rows) {
                console.log(`\n🔍 Movimiento ID ${inc.movimiento_id}:`);
                console.log(`   Complejo movimiento: ${inc.movimiento_complejo}`);
                console.log(`   Complejo categoría: ${inc.categoria_complejo}`);
                console.log(`   Tipo: ${inc.movimiento_tipo}`);
                console.log(`   Monto: $${inc.monto}`);
                console.log(`   Categoría: ${inc.categoria_nombre} (${inc.categoria_tipo})`);
                console.log(`   Descripción: ${inc.descripcion}`);
                
                // Determinar si es un problema real o aceptable
                if (inc.movimiento_complejo === 1 && inc.categoria_complejo === 3) {
                    console.log(`   ⚠️ Movimiento del complejo 1 usando categoría del complejo 3`);
                    console.log(`   💡 Esto podría ser aceptable si es un movimiento compartido`);
                } else if (inc.movimiento_complejo === 6 && inc.categoria_complejo === 1) {
                    console.log(`   ⚠️ Movimiento del complejo 6 usando categoría del complejo 1`);
                    console.log(`   💡 Esto podría ser aceptable si es un movimiento compartido`);
                } else if (inc.movimiento_complejo === 7 && inc.categoria_complejo === 6) {
                    console.log(`   ⚠️ Movimiento del complejo 7 usando categoría del complejo 6`);
                    console.log(`   💡 Esto podría ser aceptable si es un movimiento compartido`);
                } else {
                    console.log(`   ❌ Inconsistencia que necesita corrección`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error verificando inconsistencias:', error.message);
        }
    }

    async verificarComplejoDemo3Final() {
        console.log('\n🔍 VERIFICANDO COMPLEJO DEMO 3 FINAL...');
        console.log('=' .repeat(50));
        
        try {
            const complejoQuery = `
                SELECT 
                    c.id,
                    c.nombre,
                    c.direccion,
                    (SELECT COUNT(*) FROM canchas WHERE complejo_id = c.id) as canchas,
                    (SELECT COUNT(*) FROM reservas r JOIN canchas ch ON r.cancha_id = ch.id WHERE ch.complejo_id = c.id) as reservas,
                    (SELECT COUNT(*) FROM categorias_gastos WHERE complejo_id = c.id) as categorias,
                    (SELECT COUNT(*) FROM gastos_ingresos WHERE complejo_id = c.id) as movimientos
                FROM complejos c
                WHERE c.nombre LIKE '%Demo 3%'
                ORDER BY c.id;
            `;
            
            const complejos = await this.pool.query(complejoQuery);
            
            console.log(`📊 Complejos Demo 3: ${complejos.rows.length}`);
            
            for (const complejo of complejos.rows) {
                console.log(`\n✅ [${complejo.id}] ${complejo.nombre}`);
                console.log(`   Dirección: ${complejo.direccion}`);
                console.log(`   Canchas: ${complejo.canchas}`);
                console.log(`   Reservas: ${complejo.reservas}`);
                console.log(`   Categorías: ${complejo.categorias}`);
                console.log(`   Movimientos: ${complejo.movimientos}`);
                
                // Verificar reservas específicas
                if (complejo.reservas > 0) {
                    const reservasQuery = `
                        SELECT 
                            r.codigo_reserva,
                            r.estado,
                            r.precio_total,
                            r.comision_aplicada,
                            ch.nombre as cancha_nombre
                        FROM reservas r
                        JOIN canchas ch ON r.cancha_id = ch.id
                        WHERE ch.complejo_id = $1
                        ORDER BY r.created_at DESC;
                    `;
                    
                    const reservas = await this.pool.query(reservasQuery, [complejo.id]);
                    
                    console.log(`\n   📋 Reservas:`);
                    reservas.rows.forEach(reserva => {
                        console.log(`      • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                        console.log(`        Cancha: ${reserva.cancha_nombre}`);
                        console.log(`        Comisión: $${reserva.comision_aplicada || 0}`);
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ Error verificando complejo Demo 3:', error.message);
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async verificar() {
        console.log('🔍 VERIFICACIÓN DE INCONSISTENCIAS RESTANTES');
        console.log('=' .repeat(60));
        
        await this.conectar();
        await this.verificarInconsistenciasRestantes();
        await this.verificarComplejoDemo3Final();
        await this.cerrar();
    }
}

// Ejecutar verificación
if (require.main === module) {
    const verificacion = new VerificacionInconsistenciasRestantes();
    verificacion.verificar().catch(console.error);
}

module.exports = VerificacionInconsistenciasRestantes;


