#!/usr/bin/env node

/**
 * Script mejorado para sincronizar las bases de datos de desarrollo y producción
 * 
 * Este script deja ambas bases de datos con:
 * - 1 ciudad: Los Ángeles
 * - 1 complejo: MagnaSports
 * - 2 canchas: Cancha Techada 1 y Cancha Techada 2
 * - Las reservas existentes se mantienen y se reasignan correctamente
 * 
 * Mejoras:
 * - Mejor manejo de errores
 * - Validaciones antes de eliminar datos
 * - Logs más detallados
 * - Rollback en caso de error
 */

const DatabaseManager = require('../../src/config/database');
require('dotenv').config();

class DatabaseSyncManager {
    constructor() {
        this.db = new DatabaseManager();
        this.backupData = null;
        this.isTransaction = false;
    }

    async connect() {
        try {
            await this.db.connect();
            console.log('✅ Conectado a la base de datos');
            
            const dbInfo = this.db.getDatabaseInfo();
            console.log(`📊 Base de datos: ${dbInfo.type}`);
            
            return true;
        } catch (error) {
            console.error('❌ Error conectando a la base de datos:', error.message);
            throw error;
        }
    }

    async createBackup() {
        try {
            console.log('💾 Creando backup de datos críticos...');
            
            this.backupData = {
                reservas: await this.db.query('SELECT * FROM reservas'),
                canchas: await this.db.query('SELECT * FROM canchas'),
                complejos: await this.db.query('SELECT * FROM complejos'),
                ciudades: await this.db.query('SELECT * FROM ciudades')
            };
            
            console.log(`✅ Backup creado: ${this.backupData.reservas.length} reservas, ${this.backupData.canchas.length} canchas, ${this.backupData.complejos.length} complejos, ${this.backupData.ciudades.length} ciudades`);
            
        } catch (error) {
            console.error('❌ Error creando backup:', error.message);
            throw error;
        }
    }

    async validateDataIntegrity() {
        try {
            console.log('🔍 Validando integridad de datos...');
            
            // Verificar que no hay reservas huérfanas
            const reservasHuerfanas = await this.db.query(`
                SELECT r.id, r.cancha_id 
                FROM reservas r 
                LEFT JOIN canchas c ON r.cancha_id = c.id 
                WHERE c.id IS NULL
            `);
            
            if (reservasHuerfanas.length > 0) {
                console.warn(`⚠️ Encontradas ${reservasHuerfanas.length} reservas huérfanas`);
                return false;
            }
            
            // Verificar que no hay canchas huérfanas
            const canchasHuerfanas = await this.db.query(`
                SELECT ca.id, ca.complejo_id 
                FROM canchas ca 
                LEFT JOIN complejos co ON ca.complejo_id = co.id 
                WHERE co.id IS NULL
            `);
            
            if (canchasHuerfanas.length > 0) {
                console.warn(`⚠️ Encontradas ${canchasHuerfanas.length} canchas huérfanas`);
                return false;
            }
            
            console.log('✅ Integridad de datos validada');
            return true;
            
        } catch (error) {
            console.error('❌ Error validando integridad:', error.message);
            return false;
        }
    }

    async startTransaction() {
        try {
            await this.db.run('BEGIN TRANSACTION');
            this.isTransaction = true;
            console.log('🔄 Transacción iniciada');
        } catch (error) {
            console.error('❌ Error iniciando transacción:', error.message);
            throw error;
        }
    }

    async commitTransaction() {
        try {
            if (this.isTransaction) {
                await this.db.run('COMMIT');
                this.isTransaction = false;
                console.log('✅ Transacción confirmada');
            }
        } catch (error) {
            console.error('❌ Error confirmando transacción:', error.message);
            throw error;
        }
    }

    async rollbackTransaction() {
        try {
            if (this.isTransaction) {
                await this.db.run('ROLLBACK');
                this.isTransaction = false;
                console.log('🔄 Transacción revertida');
            }
        } catch (error) {
            console.error('❌ Error revirtiendo transacción:', error.message);
        }
    }

    async cleanExistingData() {
        try {
            console.log('\n🧹 PASO 1: Limpiando datos existentes...');
            
            // 1. Reasignar reservas de canchas que van a ser eliminadas
            console.log('🔄 Reasignando reservas...');
            const reservasReasignadas = await this.db.run(`
                UPDATE reservas 
                SET cancha_id = (
                    SELECT id FROM canchas 
                    WHERE complejo_id = (
                        SELECT id FROM complejos WHERE nombre = 'MagnaSports'
                    ) 
                    AND nombre = 'Cancha Techada 1'
                    LIMIT 1
                )
                WHERE cancha_id IN (
                    SELECT id FROM canchas 
                    WHERE complejo_id NOT IN (
                        SELECT id FROM complejos WHERE nombre = 'MagnaSports'
                    )
                )
            `);
            console.log(`✅ Reservas reasignadas: ${reservasReasignadas.changes || 0}`);
            
            // 2. Eliminar canchas que no sean de MagnaSports
            const canchasEliminadas = await this.db.run(`
                DELETE FROM canchas 
                WHERE complejo_id NOT IN (
                    SELECT id FROM complejos WHERE nombre = 'MagnaSports'
                )
            `);
            console.log(`✅ Canchas eliminadas: ${canchasEliminadas.changes || 0}`);
            
            // 3. Eliminar complejos que no sean MagnaSports
            const complejosEliminados = await this.db.run(`
                DELETE FROM complejos WHERE nombre != 'MagnaSports'
            `);
            console.log(`✅ Complejos eliminados: ${complejosEliminados.changes || 0}`);
            
            // 4. Eliminar ciudades que no sean Los Ángeles
            const ciudadesEliminadas = await this.db.run(`
                DELETE FROM ciudades WHERE nombre != 'Los Ángeles'
            `);
            console.log(`✅ Ciudades eliminadas: ${ciudadesEliminadas.changes || 0}`);
            
        } catch (error) {
            console.error('❌ Error limpiando datos:', error.message);
            throw error;
        }
    }

    async ensureTargetStructure() {
        try {
            console.log('\n🏗️ PASO 2: Asegurando estructura objetivo...');
            
            // 1. Asegurar que existe la ciudad Los Ángeles
            const ciudadExistente = await this.db.query(`
                SELECT id FROM ciudades WHERE nombre = 'Los Ángeles'
            `);
            
            let ciudadId;
            if (ciudadExistente.length === 0) {
                const result = await this.db.run(`
                    INSERT INTO ciudades (nombre, region, pais) 
                    VALUES ('Los Ángeles', 'Región del Biobío', 'Chile')
                `);
                ciudadId = result.lastID;
                console.log(`✅ Ciudad Los Ángeles creada con ID: ${ciudadId}`);
            } else {
                ciudadId = ciudadExistente[0].id;
                console.log(`✅ Ciudad Los Ángeles ya existe con ID: ${ciudadId}`);
            }
            
            // 2. Asegurar que existe el complejo MagnaSports
            const complejoExistente = await this.db.query(`
                SELECT id FROM complejos WHERE nombre = 'MagnaSports'
            `);
            
            let complejoId;
            if (complejoExistente.length === 0) {
                const result = await this.db.run(`
                    INSERT INTO complejos (nombre, direccion, telefono, email, ciudad_id) 
                    VALUES ('MagnaSports', 'Av. Principal 123', '+56912345678', 'info@magnasports.cl', $1)
                `, [ciudadId]);
                complejoId = result.lastID;
                console.log(`✅ Complejo MagnaSports creado con ID: ${complejoId}`);
            } else {
                complejoId = complejoExistente[0].id;
                console.log(`✅ Complejo MagnaSports ya existe con ID: ${complejoId}`);
            }
            
            // 3. Asegurar que existen las canchas techadas
            const canchasExistentes = await this.db.query(`
                SELECT id, nombre FROM canchas WHERE complejo_id = $1
            `, [complejoId]);
            
            const canchasNecesarias = ['Cancha Techada 1', 'Cancha Techada 2'];
            const canchasActuales = canchasExistentes.map(c => c.nombre);
            
            for (const nombreCancha of canchasNecesarias) {
                if (!canchasActuales.includes(nombreCancha)) {
                    const result = await this.db.run(`
                        INSERT INTO canchas (complejo_id, nombre, tipo, precio_hora) 
                        VALUES ($1, $2, 'futbol', 28000)
                    `, [complejoId, nombreCancha]);
                    console.log(`✅ Cancha ${nombreCancha} creada con ID: ${result.lastID}`);
                } else {
                    console.log(`✅ Cancha ${nombreCancha} ya existe`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error asegurando estructura:', error.message);
            throw error;
        }
    }

    async reasignReservations() {
        try {
            console.log('\n🔄 PASO 3: Reasignando reservas...');
            
            // Obtener las canchas correctas
            const canchas = await this.db.query(`
                SELECT id, nombre FROM canchas 
                WHERE complejo_id = (SELECT id FROM complejos WHERE nombre = 'MagnaSports')
                ORDER BY nombre
            `);
            
            if (canchas.length < 2) {
                throw new Error('No hay suficientes canchas para reasignar reservas');
            }
            
            // Reasignar reservas de manera balanceada
            const reservas = await this.db.query('SELECT id, cancha_id FROM reservas ORDER BY id');
            
            for (let i = 0; i < reservas.length; i++) {
                const reserva = reservas[i];
                const canchaIndex = i % 2; // Alternar entre las 2 canchas
                const nuevaCanchaId = canchas[canchaIndex].id;
                
                if (reserva.cancha_id !== nuevaCanchaId) {
                    await this.db.run(`
                        UPDATE reservas SET cancha_id = $1 WHERE id = $2
                    `, [nuevaCanchaId, reserva.id]);
                    console.log(`✅ Reserva ${reserva.id} reasignada a cancha ${canchas[canchaIndex].nombre}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error reasignando reservas:', error.message);
            throw error;
        }
    }

    async verifyFinalState() {
        try {
            console.log('\n✅ PASO 4: Verificando estado final...');
            
            const ciudades = await this.db.query('SELECT COUNT(*) as count FROM ciudades');
            const complejos = await this.db.query('SELECT COUNT(*) as count FROM complejos');
            const canchas = await this.db.query('SELECT COUNT(*) as count FROM canchas');
            const reservas = await this.db.query('SELECT COUNT(*) as count FROM reservas');
            
            console.log(`📊 Estado final:`);
            console.log(`   - Ciudades: ${ciudades[0].count}`);
            console.log(`   - Complejos: ${complejos[0].count}`);
            console.log(`   - Canchas: ${canchas[0].count}`);
            console.log(`   - Reservas: ${reservas[0].count}`);
            
            // Verificar que la estructura es correcta
            if (ciudades[0].count !== 1 || complejos[0].count !== 1 || canchas[0].count !== 2) {
                throw new Error('La estructura final no es la esperada');
            }
            
            console.log('🎉 Sincronización completada exitosamente');
            
        } catch (error) {
            console.error('❌ Error verificando estado final:', error.message);
            throw error;
        }
    }

    async close() {
        try {
            await this.db.close();
            console.log('🔌 Conexión cerrada');
        } catch (error) {
            console.error('❌ Error cerrando conexión:', error.message);
        }
    }

    async sync() {
        try {
            console.log('🔄 Iniciando sincronización mejorada de bases de datos...');
            
            await this.connect();
            await this.createBackup();
            
            if (!(await this.validateDataIntegrity())) {
                throw new Error('La integridad de datos no es válida');
            }
            
            await this.startTransaction();
            await this.cleanExistingData();
            await this.ensureTargetStructure();
            await this.reasignReservations();
            await this.verifyFinalState();
            await this.commitTransaction();
            
            console.log('🎉 Sincronización completada exitosamente');
            
        } catch (error) {
            console.error('❌ Error durante la sincronización:', error.message);
            await this.rollbackTransaction();
            throw error;
        } finally {
            await this.close();
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const syncManager = new DatabaseSyncManager();
    syncManager.sync()
        .then(() => {
            console.log('✅ Script completado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error ejecutando script:', error);
            process.exit(1);
        });
}

module.exports = { DatabaseSyncManager };
