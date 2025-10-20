#!/usr/bin/env node

/**
 * 🔄 SINCRONIZAR COMPLEJOS Y CANCHAS DE PRODUCCIÓN A DESARROLLO
 *
 * Este script sincroniza SOLO la estructura de complejos y canchas desde producción
 * hacia desarrollo, SIN tocar las reservas (datos transaccionales).
 *
 * IMPORTANTE: Las reservas NO se sincronizan para mantener la integridad de los datos
 * de negocio y evitar confusiones entre entornos.
 */

const { Pool } = require('pg');
require('dotenv').config();

class SyncComplejosYCanchas {
    constructor() {
        this.poolProd = null;
        this.poolDev = null;
    }

    async conectar() {
        console.log('🔌 CONECTANDO A LAS BASES DE DATOS...\n');

        try {
            // Conexión a PRODUCCIÓN (Render PostgreSQL)
            const prodUrl = 'postgresql://reserva_user:XoXc9rzUuufU0f5u8x2z0s9xq6Oqt6jB@dpg-d2uhibjuibrs73fm8ec0-a.oregon-postgres.render.com/reserva_tu_cancha';

            this.poolProd = new Pool({
                connectionString: prodUrl,
                ssl: { rejectUnauthorized: false }
            });

            await this.poolProd.query('SELECT NOW()');
            console.log('✅ Conectado a PRODUCCIÓN');

            // Conexión a DESARROLLO
            const devUrl = 'postgresql://postgres:Ignacio1234%2A%23@localhost:5432/reserva_tu_cancha_local?sslmode=disable';

            this.poolDev = new Pool({
                connectionString: devUrl,
                ssl: false
            });

            await this.poolDev.query('SELECT NOW()');
            console.log('✅ Conectado a DESARROLLO\n');

        } catch (error) {
            console.error('❌ Error conectando a las bases de datos:', error.message);
            process.exit(1);
        }
    }

    async obtenerCiudadesProduccion() {
        console.log('📥 OBTENIENDO CIUDADES DE PRODUCCIÓN...');

        try {
            const query = `
                SELECT id, nombre
                FROM ciudades
                ORDER BY id;
            `;

            const result = await this.poolProd.query(query);
            console.log(`✅ ${result.rows.length} ciudades encontradas en producción\n`);

            return result.rows;

        } catch (error) {
            console.error('❌ Error obteniendo ciudades:', error.message);
            return [];
        }
    }

    async obtenerComplejosProduccion() {
        console.log('📥 OBTENIENDO COMPLEJOS DE PRODUCCIÓN...');

        try {
            const query = `
                SELECT
                    id, nombre, ciudad_id, direccion, telefono, email
                FROM complejos
                ORDER BY id;
            `;

            const result = await this.poolProd.query(query);
            console.log(`✅ ${result.rows.length} complejos encontrados en producción\n`);

            return result.rows;

        } catch (error) {
            console.error('❌ Error obteniendo complejos:', error.message);
            return [];
        }
    }

    async obtenerCanchasProduccion() {
        console.log('📥 OBTENIENDO CANCHAS DE PRODUCCIÓN...');

        try {
            const query = `
                SELECT
                    id, nombre, tipo, complejo_id, precio_hora
                FROM canchas
                ORDER BY complejo_id, id;
            `;

            const result = await this.poolProd.query(query);
            console.log(`✅ ${result.rows.length} canchas encontradas en producción\n`);

            return result.rows;

        } catch (error) {
            console.error('❌ Error obteniendo canchas:', error.message);
            return [];
        }
    }

    async limpiarTablas() {
        console.log('🧹 LIMPIANDO TABLAS EN DESARROLLO...');
        console.log('⚠️  IMPORTANTE: Solo se limpian ciudades, complejos y canchas, NO reservas\n');

        try {
            // Deshabilitar temporalmente las foreign keys
            await this.poolDev.query('SET session_replication_role = replica');

            // Eliminar en orden inverso de dependencias
            await this.poolDev.query('TRUNCATE TABLE canchas CASCADE');
            console.log('✅ Canchas truncadas en desarrollo');

            await this.poolDev.query('TRUNCATE TABLE complejos CASCADE');
            console.log('✅ Complejos truncados en desarrollo');

            await this.poolDev.query('TRUNCATE TABLE ciudades CASCADE');
            console.log('✅ Ciudades truncadas en desarrollo');

            // Habilitar de nuevo las foreign keys
            await this.poolDev.query('SET session_replication_role = DEFAULT');
            console.log('✅ Foreign keys re-habilitadas\n');

        } catch (error) {
            // Re-habilitar foreign keys en caso de error
            await this.poolDev.query('SET session_replication_role = DEFAULT');
            console.error('❌ Error limpiando tablas:', error.message);
            throw error;
        }
    }

    async insertarCiudades(ciudades) {
        console.log('📤 INSERTANDO CIUDADES EN DESARROLLO...');

        try {
            for (const ciudad of ciudades) {
                const query = `
                    INSERT INTO ciudades (id, nombre)
                    VALUES ($1, $2)
                `;

                await this.poolDev.query(query, [ciudad.id, ciudad.nombre]);
                console.log(`   ✅ Ciudad insertada: ${ciudad.nombre} (ID: ${ciudad.id})`);
            }

            console.log(`\n✅ ${ciudades.length} ciudades insertadas en desarrollo\n`);

        } catch (error) {
            console.error('❌ Error insertando ciudades:', error.message);
            throw error;
        }
    }

    async insertarComplejos(complejos) {
        console.log('📤 INSERTANDO COMPLEJOS EN DESARROLLO...');

        try {
            for (const complejo of complejos) {
                const query = `
                    INSERT INTO complejos (
                        id, nombre, ciudad_id, direccion, telefono, email
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6
                    )
                `;

                const values = [
                    complejo.id, complejo.nombre, complejo.ciudad_id,
                    complejo.direccion, complejo.telefono, complejo.email
                ];

                await this.poolDev.query(query, values);
                console.log(`   ✅ Complejo insertado: ${complejo.nombre} (ID: ${complejo.id})`);
            }

            console.log(`\n✅ ${complejos.length} complejos insertados en desarrollo\n`);

        } catch (error) {
            console.error('❌ Error insertando complejos:', error.message);
            throw error;
        }
    }

    async insertarCanchas(canchas) {
        console.log('📤 INSERTANDO CANCHAS EN DESARROLLO...');

        try {
            for (const cancha of canchas) {
                // Si el campo 'numero' existe en desarrollo, usar null; si no existe, omitirlo
                const hasNumero = await this.poolDev.query(`
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='canchas' AND column_name='numero'
                `);

                let query, values;

                if (hasNumero.rows.length > 0) {
                    query = `
                        INSERT INTO canchas (
                            id, nombre, tipo, complejo_id, precio_hora, numero
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6
                        )
                    `;
                    values = [
                        cancha.id, cancha.nombre, cancha.tipo, cancha.complejo_id,
                        cancha.precio_hora, null
                    ];
                } else {
                    query = `
                        INSERT INTO canchas (
                            id, nombre, tipo, complejo_id, precio_hora
                        ) VALUES (
                            $1, $2, $3, $4, $5
                        )
                    `;
                    values = [
                        cancha.id, cancha.nombre, cancha.tipo, cancha.complejo_id,
                        cancha.precio_hora
                    ];
                }

                await this.poolDev.query(query, values);
                console.log(`   ✅ Cancha insertada: ${cancha.nombre} (${cancha.tipo}) - Complejo ID: ${cancha.complejo_id}`);
            }

            console.log(`\n✅ ${canchas.length} canchas insertadas en desarrollo\n`);

        } catch (error) {
            console.error('❌ Error insertando canchas:', error.message);
            throw error;
        }
    }

    async actualizarSecuencias() {
        console.log('🔄 ACTUALIZANDO SECUENCIAS DE IDs...');

        try {
            // Actualizar secuencia de ciudades
            await this.poolDev.query(`
                SELECT setval(
                    pg_get_serial_sequence('ciudades', 'id'),
                    COALESCE((SELECT MAX(id) FROM ciudades), 1),
                    true
                )
            `);
            console.log('✅ Secuencia de ciudades actualizada');

            // Actualizar secuencia de complejos
            await this.poolDev.query(`
                SELECT setval(
                    pg_get_serial_sequence('complejos', 'id'),
                    COALESCE((SELECT MAX(id) FROM complejos), 1),
                    true
                )
            `);
            console.log('✅ Secuencia de complejos actualizada');

            // Actualizar secuencia de canchas
            await this.poolDev.query(`
                SELECT setval(
                    pg_get_serial_sequence('canchas', 'id'),
                    COALESCE((SELECT MAX(id) FROM canchas), 1),
                    true
                )
            `);
            console.log('✅ Secuencia de canchas actualizada\n');

        } catch (error) {
            console.error('❌ Error actualizando secuencias:', error.message);
            throw error;
        }
    }

    async verificarDemo3() {
        console.log('🔍 VERIFICANDO COMPLEJO DEMO 3 EN DESARROLLO...\n');

        try {
            const queryComplejo = `
                SELECT id, nombre, ciudad
                FROM complejos
                WHERE nombre LIKE '%Demo 3%'
            `;

            const resultComplejo = await this.poolDev.query(queryComplejo);

            if (resultComplejo.rows.length === 0) {
                console.log('❌ Complejo Demo 3 NO encontrado\n');
                return;
            }

            const complejo = resultComplejo.rows[0];
            console.log(`✅ Complejo encontrado: ${complejo.nombre} (ID: ${complejo.id})`);

            const queryCanchas = `
                SELECT id, nombre, tipo, precio_hora
                FROM canchas
                WHERE complejo_id = $1
                ORDER BY tipo, nombre
            `;

            const resultCanchas = await this.poolDev.query(queryCanchas, [complejo.id]);

            console.log(`\n📊 CANCHAS DEL COMPLEJO DEMO 3: ${resultCanchas.rows.length} canchas`);

            const futbol = resultCanchas.rows.filter(c => c.tipo === 'futbol');
            const padel = resultCanchas.rows.filter(c => c.tipo === 'padel');

            console.log(`\n⚽ CANCHAS DE FÚTBOL: ${futbol.length}`);
            futbol.forEach(c => {
                console.log(`   • ${c.nombre} (ID: ${c.id}) - $${c.precio_hora}/hora`);
            });

            console.log(`\n🏓 CANCHAS DE PÁDEL: ${padel.length}`);
            padel.forEach(c => {
                console.log(`   • ${c.nombre} (ID: ${c.id}) - $${c.precio_hora}/hora`);
            });

            console.log('\n');

        } catch (error) {
            console.error('❌ Error verificando Demo 3:', error.message);
        }
    }

    async cerrar() {
        if (this.poolProd) {
            await this.poolProd.end();
        }
        if (this.poolDev) {
            await this.poolDev.end();
        }
        console.log('✅ Conexiones cerradas\n');
    }

    async sincronizar() {
        console.log('═'.repeat(70));
        console.log('🔄 SINCRONIZACIÓN DE COMPLEJOS Y CANCHAS: PRODUCCIÓN → DESARROLLO');
        console.log('═'.repeat(70));
        console.log('\n⚠️  IMPORTANTE: Las RESERVAS NO se sincronizan');
        console.log('   Solo se sincronizan complejos y canchas (estructura del sistema)\n');
        console.log('═'.repeat(70));
        console.log('\n');

        try {
            await this.conectar();

            const ciudades = await this.obtenerCiudadesProduccion();
            const complejos = await this.obtenerComplejosProduccion();
            const canchas = await this.obtenerCanchasProduccion();

            if (ciudades.length === 0 || complejos.length === 0 || canchas.length === 0) {
                console.log('❌ No hay datos para sincronizar');
                await this.cerrar();
                return;
            }

            console.log('⚠️  ¿Estás seguro de continuar? Esto eliminará todas las ciudades, complejos y canchas de desarrollo.');
            console.log('   (Las reservas se mantendrán intactas)\n');

            // En un entorno no interactivo, simplemente proceder
            await this.limpiarTablas();
            await this.insertarCiudades(ciudades);
            await this.insertarComplejos(complejos);
            await this.insertarCanchas(canchas);
            await this.actualizarSecuencias();

            console.log('═'.repeat(70));
            console.log('✅ SINCRONIZACIÓN COMPLETADA EXITOSAMENTE');
            console.log('═'.repeat(70));
            console.log('\n');

            await this.verificarDemo3();

            await this.cerrar();

        } catch (error) {
            console.error('\n❌ ERROR EN LA SINCRONIZACIÓN:', error.message);
            await this.cerrar();
            process.exit(1);
        }
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    const sync = new SyncComplejosYCanchas();
    sync.sincronizar().catch(console.error);
}

module.exports = SyncComplejosYCanchas;
