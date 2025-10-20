#!/usr/bin/env node

/**
 * 🔍 INVESTIGACIÓN DE RESERVAS DEL USUARIO DEMO 3
 * 
 * Este script busca las reservas específicas que el usuario menciona:
 * BQNI8W, IJRGBH y 1XJAKD
 * Usando las credenciales: owner@complejodemo3.cl
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class InvestigacionReservasUsuarioDemo3 {
    constructor() {
        this.pool = null;
        this.reservasEspecificas = ['BQNI8W', 'IJRGBH', '1XJAKD'];
        this.emailUsuario = 'owner@complejodemo3.cl';
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

    async buscarUsuario() {
        console.log('\n👤 BUSCANDO USUARIO...');
        console.log('=' .repeat(40));
        
        try {
            const usuarioQuery = `
                SELECT 
                    id, email, nombre, rol, activo
                FROM usuarios
                WHERE email = $1;
            `;
            
            const usuario = await this.pool.query(usuarioQuery, [this.emailUsuario]);
            
            if (usuario.rows.length === 0) {
                console.log(`❌ Usuario no encontrado: ${this.emailUsuario}`);
                return null;
            }
            
            const user = usuario.rows[0];
            console.log(`✅ Usuario encontrado:`);
            console.log(`   • ID: ${user.id}`);
            console.log(`   • Email: ${user.email}`);
            console.log(`   • Nombre: ${user.nombre}`);
            console.log(`   • Rol: ${user.rol}`);
            console.log(`   • Activo: ${user.activo}`);
            
            return user;
            
        } catch (error) {
            console.error('❌ Error buscando usuario:', error.message);
            return null;
        }
    }

    async buscarComplejosDelUsuario(usuario) {
        console.log('\n🏢 BUSCANDO COMPLEJOS DEL USUARIO...');
        console.log('=' .repeat(50));
        
        try {
            const complejosQuery = `
                SELECT 
                    c.id, c.nombre, c.direccion, c.telefono, c.email
                FROM complejos c
                WHERE c.email = $1
                ORDER BY c.id;
            `;
            
            const complejos = await this.pool.query(complejosQuery, [this.emailUsuario]);
            
            console.log(`📊 Complejos encontrados: ${complejos.rows.length}`);
            complejos.rows.forEach(complejo => {
                console.log(`   • [${complejo.id}] ${complejo.nombre}`);
                console.log(`     Dirección: ${complejo.direccion}`);
                console.log(`     Email: ${complejo.email}`);
            });
            
            return complejos.rows;
            
        } catch (error) {
            console.error('❌ Error buscando complejos:', error.message);
            return [];
        }
    }

    async buscarReservasEspecificas(complejos) {
        console.log('\n🔍 BUSCANDO RESERVAS ESPECÍFICAS...');
        console.log('=' .repeat(50));
        
        const reservasEncontradas = [];
        
        for (const complejo of complejos) {
            console.log(`\n📋 Buscando en complejo [${complejo.id}] ${complejo.nombre}:`);
            
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
                        comp.nombre as complejo_nombre
                    FROM reservas r
                    LEFT JOIN canchas c ON r.cancha_id = c.id
                    LEFT JOIN complejos comp ON c.complejo_id = comp.id
                    WHERE c.complejo_id = $1
                    AND r.codigo_reserva = ANY($2)
                    ORDER BY r.created_at DESC;
                `;
                
                const reservas = await this.pool.query(reservasQuery, [complejo.id, this.reservasEspecificas]);
                
                if (reservas.rows.length > 0) {
                    console.log(`   ✅ Encontradas: ${reservas.rows.length} reservas`);
                    reservas.rows.forEach(reserva => {
                        console.log(`      • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                        console.log(`        Cancha: ${reserva.cancha_nombre}`);
                        console.log(`        Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                        console.log(`        Creada: ${reserva.created_at}`);
                        
                        reservasEncontradas.push(reserva);
                    });
                } else {
                    console.log(`   ❌ No se encontraron las reservas específicas`);
                }
                
            } catch (error) {
                console.error(`❌ Error buscando reservas en complejo ${complejo.id}:`, error.message);
            }
        }
        
        return reservasEncontradas;
    }

    async verificarMovimientosFinancieros(reservas) {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS FINANCIEROS...');
        console.log('=' .repeat(50));
        
        for (const reserva of reservas) {
            console.log(`\n📋 Reserva ${reserva.codigo_reserva}:`);
            
            try {
                const movimientosQuery = `
                    SELECT 
                        gi.id,
                        gi.tipo,
                        gi.monto,
                        gi.fecha,
                        gi.descripcion,
                        gi.creado_en,
                        cg.nombre as categoria_nombre
                    FROM gastos_ingresos gi
                    LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                    WHERE gi.descripcion LIKE $1
                    ORDER BY gi.tipo, gi.creado_en;
                `;
                
                const movimientos = await this.pool.query(movimientosQuery, [`%${reserva.codigo_reserva}%`]);
                
                if (movimientos.rows.length === 0) {
                    console.log(`   ❌ SIN movimientos financieros`);
                    
                    // Verificar si debería tener movimientos
                    if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                        console.log(`   ⚠️ PROBLEMA: Reserva confirmada sin movimientos financieros`);
                        console.log(`   💡 Debería tener:`);
                        console.log(`      - Ingreso: $${reserva.precio_total}`);
                        if (reserva.comision_aplicada > 0) {
                            console.log(`      - Gasto (comisión): $${reserva.comision_aplicada}`);
                        }
                    }
                } else {
                    console.log(`   ✅ CON movimientos: ${movimientos.rows.length}`);
                    movimientos.rows.forEach(mov => {
                        console.log(`      • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                        console.log(`        Descripción: ${mov.descripcion}`);
                        console.log(`        Creado: ${mov.creado_en}`);
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error verificando movimientos de ${reserva.codigo_reserva}:`, error.message);
            }
        }
    }

    async crearMovimientosFaltantes(reservas) {
        console.log('\n🔧 CREANDO MOVIMIENTOS FALTANTES...');
        console.log('=' .repeat(50));
        
        for (const reserva of reservas) {
            if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                console.log(`\n🔧 Procesando reserva ${reserva.codigo_reserva}...`);
                
                try {
                    // Buscar categorías del complejo
                    const categoriasQuery = `
                        SELECT id, tipo, nombre
                        FROM categorias_gastos
                        WHERE complejo_id = $1
                        AND ((tipo = 'ingreso' AND nombre = 'Reservas Web')
                             OR (tipo = 'gasto' AND nombre = 'Comisión Plataforma'));
                    `;
                    
                    const categorias = await this.pool.query(categoriasQuery, [reserva.complejo_id]);
                    
                    if (categorias.rows.length < 2) {
                        console.log(`   ❌ Faltan categorías necesarias para el complejo ${reserva.complejo_id}`);
                        continue;
                    }
                    
                    const categoriaIngreso = categorias.rows.find(c => c.tipo === 'ingreso');
                    const categoriaGasto = categorias.rows.find(c => c.tipo === 'gasto');
                    
                    // Crear ingreso
                    const insertIngresoQuery = `
                        INSERT INTO gastos_ingresos (
                            complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                        ) VALUES ($1, $2, 'ingreso', $3, $4, $5, 'automatico')
                        RETURNING id;
                    `;
                    
                    const descripcionIngreso = `Reserva #${reserva.codigo_reserva} - ${reserva.cancha_nombre}`;
                    
                    const ingresoResult = await this.pool.query(insertIngresoQuery, [
                        reserva.complejo_id,
                        categoriaIngreso.id,
                        reserva.precio_total,
                        reserva.fecha,
                        descripcionIngreso
                    ]);
                    
                    console.log(`   ✅ Ingreso creado: $${reserva.precio_total} (ID: ${ingresoResult.rows[0].id})`);
                    
                    // Crear gasto de comisión si existe
                    if (reserva.comision_aplicada > 0) {
                        const tipoReservaTexto = reserva.tipo_reserva === 'directa' ? 
                            'Web (3.5% + IVA)' : 'Admin (1.75% + IVA)';
                        
                        const insertGastoQuery = `
                            INSERT INTO gastos_ingresos (
                                complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                            ) VALUES ($1, $2, 'gasto', $3, $4, $5, 'automatico')
                            RETURNING id;
                        `;
                        
                        const descripcionGasto = `Comisión Reserva #${reserva.codigo_reserva} - ${tipoReservaTexto}`;
                        
                        const gastoResult = await this.pool.query(insertGastoQuery, [
                            reserva.complejo_id,
                            categoriaGasto.id,
                            reserva.comision_aplicada,
                            reserva.fecha,
                            descripcionGasto
                        ]);
                        
                        console.log(`   ✅ Comisión creada: $${reserva.comision_aplicada} (ID: ${gastoResult.rows[0].id})`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error creando movimientos para ${reserva.codigo_reserva}:`, error.message);
                }
            }
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async investigar() {
        console.log('🔍 INVESTIGACIÓN DE RESERVAS DEL USUARIO DEMO 3');
        console.log('=' .repeat(60));
        console.log(`👤 Usuario: ${this.emailUsuario}`);
        console.log(`📋 Reservas a buscar: ${this.reservasEspecificas.join(', ')}`);
        
        await this.conectar();
        
        // 1. Buscar usuario
        const usuario = await this.buscarUsuario();
        if (!usuario) return;
        
        // 2. Buscar complejos del usuario
        const complejos = await this.buscarComplejosDelUsuario(usuario);
        if (complejos.length === 0) return;
        
        // 3. Buscar reservas específicas
        const reservas = await this.buscarReservasEspecificas(complejos);
        
        if (reservas.length === 0) {
            console.log('\n❌ No se encontraron las reservas específicas en ningún complejo del usuario');
            return;
        }
        
        // 4. Verificar movimientos financieros
        await this.verificarMovimientosFinancieros(reservas);
        
        // 5. Crear movimientos faltantes
        await this.crearMovimientosFaltantes(reservas);
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log(`✅ Reservas encontradas: ${reservas.length}`);
        console.log('✅ Movimientos financieros verificados/creados');
        console.log('🔄 Refresca la página del panel de administración');
        
        await this.cerrar();
    }
}

// Ejecutar investigación
if (require.main === module) {
    const investigacion = new InvestigacionReservasUsuarioDemo3();
    investigacion.investigar().catch(console.error);
}

module.exports = InvestigacionReservasUsuarioDemo3;

/**
 * 🔍 INVESTIGACIÓN DE RESERVAS DEL USUARIO DEMO 3
 * 
 * Este script busca las reservas específicas que el usuario menciona:
 * BQNI8W, IJRGBH y 1XJAKD
 * Usando las credenciales: owner@complejodemo3.cl
 */

const { Pool } = require('pg');

// Configurar para producción
process.env.NODE_ENV = 'production';
require('dotenv').config();

class InvestigacionReservasUsuarioDemo3 {
    constructor() {
        this.pool = null;
        this.reservasEspecificas = ['BQNI8W', 'IJRGBH', '1XJAKD'];
        this.emailUsuario = 'owner@complejodemo3.cl';
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

    async buscarUsuario() {
        console.log('\n👤 BUSCANDO USUARIO...');
        console.log('=' .repeat(40));
        
        try {
            const usuarioQuery = `
                SELECT 
                    id, email, nombre, rol, activo
                FROM usuarios
                WHERE email = $1;
            `;
            
            const usuario = await this.pool.query(usuarioQuery, [this.emailUsuario]);
            
            if (usuario.rows.length === 0) {
                console.log(`❌ Usuario no encontrado: ${this.emailUsuario}`);
                return null;
            }
            
            const user = usuario.rows[0];
            console.log(`✅ Usuario encontrado:`);
            console.log(`   • ID: ${user.id}`);
            console.log(`   • Email: ${user.email}`);
            console.log(`   • Nombre: ${user.nombre}`);
            console.log(`   • Rol: ${user.rol}`);
            console.log(`   • Activo: ${user.activo}`);
            
            return user;
            
        } catch (error) {
            console.error('❌ Error buscando usuario:', error.message);
            return null;
        }
    }

    async buscarComplejosDelUsuario(usuario) {
        console.log('\n🏢 BUSCANDO COMPLEJOS DEL USUARIO...');
        console.log('=' .repeat(50));
        
        try {
            const complejosQuery = `
                SELECT 
                    c.id, c.nombre, c.direccion, c.telefono, c.email
                FROM complejos c
                WHERE c.email = $1
                ORDER BY c.id;
            `;
            
            const complejos = await this.pool.query(complejosQuery, [this.emailUsuario]);
            
            console.log(`📊 Complejos encontrados: ${complejos.rows.length}`);
            complejos.rows.forEach(complejo => {
                console.log(`   • [${complejo.id}] ${complejo.nombre}`);
                console.log(`     Dirección: ${complejo.direccion}`);
                console.log(`     Email: ${complejo.email}`);
            });
            
            return complejos.rows;
            
        } catch (error) {
            console.error('❌ Error buscando complejos:', error.message);
            return [];
        }
    }

    async buscarReservasEspecificas(complejos) {
        console.log('\n🔍 BUSCANDO RESERVAS ESPECÍFICAS...');
        console.log('=' .repeat(50));
        
        const reservasEncontradas = [];
        
        for (const complejo of complejos) {
            console.log(`\n📋 Buscando en complejo [${complejo.id}] ${complejo.nombre}:`);
            
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
                        comp.nombre as complejo_nombre
                    FROM reservas r
                    LEFT JOIN canchas c ON r.cancha_id = c.id
                    LEFT JOIN complejos comp ON c.complejo_id = comp.id
                    WHERE c.complejo_id = $1
                    AND r.codigo_reserva = ANY($2)
                    ORDER BY r.created_at DESC;
                `;
                
                const reservas = await this.pool.query(reservasQuery, [complejo.id, this.reservasEspecificas]);
                
                if (reservas.rows.length > 0) {
                    console.log(`   ✅ Encontradas: ${reservas.rows.length} reservas`);
                    reservas.rows.forEach(reserva => {
                        console.log(`      • ${reserva.codigo_reserva} - ${reserva.estado} - $${reserva.precio_total || 0}`);
                        console.log(`        Cancha: ${reserva.cancha_nombre}`);
                        console.log(`        Fecha: ${reserva.fecha} ${reserva.hora_inicio}-${reserva.hora_fin}`);
                        console.log(`        Creada: ${reserva.created_at}`);
                        
                        reservasEncontradas.push(reserva);
                    });
                } else {
                    console.log(`   ❌ No se encontraron las reservas específicas`);
                }
                
            } catch (error) {
                console.error(`❌ Error buscando reservas en complejo ${complejo.id}:`, error.message);
            }
        }
        
        return reservasEncontradas;
    }

    async verificarMovimientosFinancieros(reservas) {
        console.log('\n💰 VERIFICANDO MOVIMIENTOS FINANCIEROS...');
        console.log('=' .repeat(50));
        
        for (const reserva of reservas) {
            console.log(`\n📋 Reserva ${reserva.codigo_reserva}:`);
            
            try {
                const movimientosQuery = `
                    SELECT 
                        gi.id,
                        gi.tipo,
                        gi.monto,
                        gi.fecha,
                        gi.descripcion,
                        gi.creado_en,
                        cg.nombre as categoria_nombre
                    FROM gastos_ingresos gi
                    LEFT JOIN categorias_gastos cg ON gi.categoria_id = cg.id
                    WHERE gi.descripcion LIKE $1
                    ORDER BY gi.tipo, gi.creado_en;
                `;
                
                const movimientos = await this.pool.query(movimientosQuery, [`%${reserva.codigo_reserva}%`]);
                
                if (movimientos.rows.length === 0) {
                    console.log(`   ❌ SIN movimientos financieros`);
                    
                    // Verificar si debería tener movimientos
                    if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                        console.log(`   ⚠️ PROBLEMA: Reserva confirmada sin movimientos financieros`);
                        console.log(`   💡 Debería tener:`);
                        console.log(`      - Ingreso: $${reserva.precio_total}`);
                        if (reserva.comision_aplicada > 0) {
                            console.log(`      - Gasto (comisión): $${reserva.comision_aplicada}`);
                        }
                    }
                } else {
                    console.log(`   ✅ CON movimientos: ${movimientos.rows.length}`);
                    movimientos.rows.forEach(mov => {
                        console.log(`      • ${mov.tipo.toUpperCase()}: $${mov.monto} - ${mov.categoria_nombre}`);
                        console.log(`        Descripción: ${mov.descripcion}`);
                        console.log(`        Creado: ${mov.creado_en}`);
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error verificando movimientos de ${reserva.codigo_reserva}:`, error.message);
            }
        }
    }

    async crearMovimientosFaltantes(reservas) {
        console.log('\n🔧 CREANDO MOVIMIENTOS FALTANTES...');
        console.log('=' .repeat(50));
        
        for (const reserva of reservas) {
            if (reserva.estado === 'confirmada' && reserva.precio_total > 0) {
                console.log(`\n🔧 Procesando reserva ${reserva.codigo_reserva}...`);
                
                try {
                    // Buscar categorías del complejo
                    const categoriasQuery = `
                        SELECT id, tipo, nombre
                        FROM categorias_gastos
                        WHERE complejo_id = $1
                        AND ((tipo = 'ingreso' AND nombre = 'Reservas Web')
                             OR (tipo = 'gasto' AND nombre = 'Comisión Plataforma'));
                    `;
                    
                    const categorias = await this.pool.query(categoriasQuery, [reserva.complejo_id]);
                    
                    if (categorias.rows.length < 2) {
                        console.log(`   ❌ Faltan categorías necesarias para el complejo ${reserva.complejo_id}`);
                        continue;
                    }
                    
                    const categoriaIngreso = categorias.rows.find(c => c.tipo === 'ingreso');
                    const categoriaGasto = categorias.rows.find(c => c.tipo === 'gasto');
                    
                    // Crear ingreso
                    const insertIngresoQuery = `
                        INSERT INTO gastos_ingresos (
                            complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                        ) VALUES ($1, $2, 'ingreso', $3, $4, $5, 'automatico')
                        RETURNING id;
                    `;
                    
                    const descripcionIngreso = `Reserva #${reserva.codigo_reserva} - ${reserva.cancha_nombre}`;
                    
                    const ingresoResult = await this.pool.query(insertIngresoQuery, [
                        reserva.complejo_id,
                        categoriaIngreso.id,
                        reserva.precio_total,
                        reserva.fecha,
                        descripcionIngreso
                    ]);
                    
                    console.log(`   ✅ Ingreso creado: $${reserva.precio_total} (ID: ${ingresoResult.rows[0].id})`);
                    
                    // Crear gasto de comisión si existe
                    if (reserva.comision_aplicada > 0) {
                        const tipoReservaTexto = reserva.tipo_reserva === 'directa' ? 
                            'Web (3.5% + IVA)' : 'Admin (1.75% + IVA)';
                        
                        const insertGastoQuery = `
                            INSERT INTO gastos_ingresos (
                                complejo_id, categoria_id, tipo, monto, fecha, descripcion, metodo_pago
                            ) VALUES ($1, $2, 'gasto', $3, $4, $5, 'automatico')
                            RETURNING id;
                        `;
                        
                        const descripcionGasto = `Comisión Reserva #${reserva.codigo_reserva} - ${tipoReservaTexto}`;
                        
                        const gastoResult = await this.pool.query(insertGastoQuery, [
                            reserva.complejo_id,
                            categoriaGasto.id,
                            reserva.comision_aplicada,
                            reserva.fecha,
                            descripcionGasto
                        ]);
                        
                        console.log(`   ✅ Comisión creada: $${reserva.comision_aplicada} (ID: ${gastoResult.rows[0].id})`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error creando movimientos para ${reserva.codigo_reserva}:`, error.message);
                }
            }
        }
    }

    async cerrar() {
        if (this.pool) {
            await this.pool.end();
            console.log('\n✅ Conexión cerrada');
        }
    }

    async investigar() {
        console.log('🔍 INVESTIGACIÓN DE RESERVAS DEL USUARIO DEMO 3');
        console.log('=' .repeat(60));
        console.log(`👤 Usuario: ${this.emailUsuario}`);
        console.log(`📋 Reservas a buscar: ${this.reservasEspecificas.join(', ')}`);
        
        await this.conectar();
        
        // 1. Buscar usuario
        const usuario = await this.buscarUsuario();
        if (!usuario) return;
        
        // 2. Buscar complejos del usuario
        const complejos = await this.buscarComplejosDelUsuario(usuario);
        if (complejos.length === 0) return;
        
        // 3. Buscar reservas específicas
        const reservas = await this.buscarReservasEspecificas(complejos);
        
        if (reservas.length === 0) {
            console.log('\n❌ No se encontraron las reservas específicas en ningún complejo del usuario');
            return;
        }
        
        // 4. Verificar movimientos financieros
        await this.verificarMovimientosFinancieros(reservas);
        
        // 5. Crear movimientos faltantes
        await this.crearMovimientosFaltantes(reservas);
        
        console.log('\n🎯 RESUMEN:');
        console.log('=' .repeat(30));
        console.log(`✅ Reservas encontradas: ${reservas.length}`);
        console.log('✅ Movimientos financieros verificados/creados');
        console.log('🔄 Refresca la página del panel de administración');
        
        await this.cerrar();
    }
}

// Ejecutar investigación
if (require.main === module) {
    const investigacion = new InvestigacionReservasUsuarioDemo3();
    investigacion.investigar().catch(console.error);
}

module.exports = InvestigacionReservasUsuarioDemo3;
