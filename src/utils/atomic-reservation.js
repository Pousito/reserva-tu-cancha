/**
 * Utilidad para crear reservas de forma atómica
 * Previene condiciones de carrera y dobles reservas
 */

class AtomicReservationManager {
    constructor(database) {
        this.db = database;
    }

    /**
     * Crear reserva de forma atómica con bloqueo de base de datos
     * @param {Object} reservationData - Datos de la reserva
     * @param {Object} options - Opciones adicionales
     * @returns {Object} Resultado de la operación
     */
    async createAtomicReservation(reservationData, options = {}) {
        const {
            cancha_id,
            fecha,
            hora_inicio,
            hora_fin,
            nombre_cliente,
            email_cliente,
            telefono_cliente,
            rut_cliente,
            precio_total,
            tipo_reserva = 'directa',
            admin_id = null,
            bloqueo_id = null,
            porcentaje_pagado = 100,
            metodo_pago = null,
            estado_pago = 'pendiente',
            monto_abonado = 0
        } = reservationData;

        const {
            skipAvailabilityCheck = false,
            commissionRate = 0.035
        } = options;

        console.log('🔒 Iniciando reserva atómica:', {
            cancha_id,
            fecha,
            fecha_tipo: typeof fecha,
            fecha_string: fecha.toString(),
            hora_inicio,
            hora_fin,
            tipo_reserva,
            admin_id
        });

        // Limpiar bloqueos expirados antes de iniciar la transacción
        await this.cleanExpiredBlocks();
        
        // Iniciar transacción
        const client = await this.db.pgPool.connect();
        
        try {
            await client.query('BEGIN');
            console.log('🔄 Transacción iniciada');

            // PASO 1: Bloquear la cancha para el horario específico
            console.log('🔒 Adquiriendo bloqueo de cancha...');
            const lockResult = await client.query(`
                SELECT pg_advisory_xact_lock(
                    hashtext($1 || ':' || $2 || ':' || $3 || ':' || $4)
                ) as locked
            `, [cancha_id, fecha, hora_inicio, hora_fin]);

            console.log('✅ Bloqueo adquirido:', lockResult.rows[0].locked);

            // PASO 2: Verificar disponibilidad DENTRO de la transacción
            if (!skipAvailabilityCheck) {
                console.log('🔍 Verificando disponibilidad dentro de transacción...');
                
                // Verificar reservas existentes
                const reservasQuery = `
                    SELECT COUNT(*) as count
                    FROM reservas
                    WHERE cancha_id = $1 
                    AND fecha::date = $2::date 
                    AND (
                        (hora_inicio < $4 AND hora_fin > $3)
                    )
                    AND estado != 'cancelada'
                `;
                
                const reservasResult = await client.query(reservasQuery, [
                    cancha_id, fecha, hora_inicio, hora_fin
                ]);
                
                const reservasCount = parseInt(reservasResult.rows[0].count);
                console.log('📊 Reservas existentes encontradas:', reservasCount);
                
                if (reservasCount > 0) {
                    await client.query('ROLLBACK');
                    console.log('❌ Cancha no disponible, transacción cancelada');
                    return {
                        success: false,
                        error: 'La cancha ya no está disponible en ese horario',
                        code: 'NOT_AVAILABLE'
                    };
                }

                // Verificar bloqueos temporales activos (excluyendo el bloqueo actual si existe)
                let bloqueosQuery = `
                    SELECT COUNT(*) as count
                    FROM bloqueos_temporales 
                    WHERE cancha_id = $1 
                    AND fecha::date = $2::date 
                    AND expira_en > $3
                    AND (
                        (hora_inicio < $5 AND hora_fin > $4)
                    )
                `;
                
                const bloqueosParams = [cancha_id, fecha, new Date().toISOString(), hora_inicio, hora_fin];
                
                if (bloqueo_id) {
                    bloqueosQuery += ` AND id != $6`;
                    bloqueosParams.push(bloqueo_id);
                }
                
                const bloqueosResult = await client.query(bloqueosQuery, bloqueosParams);
                const bloqueosCount = parseInt(bloqueosResult.rows[0].count);
                console.log('🔒 Bloqueos temporales encontrados:', bloqueosCount);
                
                if (bloqueosCount > 0) {
                    await client.query('ROLLBACK');
                    console.log('❌ Bloqueo temporal activo, transacción cancelada');
                    return {
                        success: false,
                        error: 'La cancha está temporalmente bloqueada por otro usuario',
                        code: 'TEMPORARILY_BLOCKED'
                    };
                }
            }

            // PASO 3: Generar código de reserva único
            const codigo_reserva = this.generateReservationCode();
            console.log('🎫 Código de reserva generado:', codigo_reserva);

            // PASO 4: Calcular comisión (solo para registro, no se suma al precio)
            const comision = Math.round(precio_total * commissionRate);
            console.log('💰 Precio calculado:', { precio_total, comision, nota: 'La comisión es solo informativa' });

            // PASO 5: Crear la reserva
            console.log('💾 Creando reserva en base de datos...');
            // CORRECCIÓN: Asegurar que la fecha se almacene correctamente sin problemas de zona horaria
            let fechaParaBD = fecha;
            if (fecha instanceof Date) {
                // Si es un objeto Date, crear fecha local para evitar problemas de UTC
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, '0');
                const day = String(fecha.getDate()).padStart(2, '0');
                fechaParaBD = `${year}-${month}-${day}`;
            } else if (typeof fecha === 'string') {
                // Si es un string, verificar el formato
                if (fecha.includes('T')) {
                    // Fecha ISO - extraer solo la parte de fecha
                    fechaParaBD = fecha.split('T')[0];
                } else if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
                    // Fecha ya en formato YYYY-MM-DD - usar tal como está
                    fechaParaBD = fecha;
                } else {
                    // Otros formatos - intentar parsear y convertir
                    const fechaObj = new Date(fecha);
                    if (!isNaN(fechaObj.getTime())) {
                        const year = fechaObj.getFullYear();
                        const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
                        const day = String(fechaObj.getDate()).padStart(2, '0');
                        fechaParaBD = `${year}-${month}-${day}`;
                    }
                }
            }
            
            // Incluir metodo_pago y estado_pago en la inserción
            const insertQuery = `
                INSERT INTO reservas (
                    codigo_reserva, cancha_id, fecha, hora_inicio, hora_fin,
                    nombre_cliente, email_cliente, telefono_cliente, rut_cliente,
                    precio_total, estado, estado_pago, metodo_pago, fecha_creacion, tipo_reserva, 
                    comision_aplicada, creada_por_admin, admin_id, porcentaje_pagado
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING *
            `;
            
            const insertParams = [
                codigo_reserva, cancha_id, fechaParaBD, hora_inicio, hora_fin,
                nombre_cliente, email_cliente || null, telefono_cliente || null, rut_cliente || null,
                precio_total, 'confirmada', estado_pago, metodo_pago || null, new Date().toISOString(), tipo_reserva,
                comision, admin_id !== null, admin_id, porcentaje_pagado
            ];
            
            const insertResult = await client.query(insertQuery, insertParams);
            const nuevaReserva = insertResult.rows[0];
            console.log('✅ Reserva creada con ID:', nuevaReserva.id);

            // PASO 6: Eliminar bloqueo temporal si existe
            if (bloqueo_id) {
                console.log('🗑️ Eliminando bloqueo temporal:', bloqueo_id);
                await client.query('DELETE FROM bloqueos_temporales WHERE id = $1', [bloqueo_id]);
            }

            // PASO 7: Confirmar transacción
            await client.query('COMMIT');
            console.log('✅ Transacción confirmada');

            return {
                success: true,
                reserva: nuevaReserva,
                codigo_reserva,
                precio: {
                    base: precio_total,
                    comision,
                    final: precio_total // El precio final es el mismo que el base (comisión es solo informativa)
                }
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error en reserva atómica:', error);
            return {
                success: false,
                error: 'Error interno del servidor al crear la reserva',
                details: error.message,
                code: 'INTERNAL_ERROR'
            };
        } finally {
            client.release();
        }
    }

    /**
     * Limpiar bloqueos temporales expirados
     */
    async cleanExpiredBlocks() {
        try {
            const result = await this.db.run(
                'DELETE FROM bloqueos_temporales WHERE expira_en <= $1',
                [new Date().toISOString()]
            );
            
            if (result.rowCount > 0) {
                console.log(`🧹 Limpiados ${result.rowCount} bloqueos temporales expirados`);
            }
        } catch (error) {
            console.error('❌ Error limpiando bloqueos expirados:', error);
        }
    }

    /**
     * Generar código de reserva único
     * @returns {string} Código de 6 caracteres alfanuméricos
     */
    generateReservationCode() {
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let codigo = '';
        for (let i = 0; i < 6; i++) {
            codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        return codigo;
    }

    /**
     * Verificar disponibilidad de forma atómica
     * @param {number} cancha_id - ID de la cancha
     * @param {string} fecha - Fecha de la reserva
     * @param {string} hora_inicio - Hora de inicio
     * @param {string} hora_fin - Hora de fin
     * @param {string} bloqueo_id - ID del bloqueo temporal (opcional)
     * @returns {Object} Resultado de la verificación
     */
    async checkAtomicAvailability(cancha_id, fecha, hora_inicio, hora_fin, bloqueo_id = null) {
        // Limpiar bloqueos expirados antes de verificar disponibilidad
        await this.cleanExpiredBlocks();
        
        const client = await this.db.pgPool.connect();
        
        try {
            await client.query('BEGIN');

            // Bloquear la cancha para el horario específico
            await client.query(`
                SELECT pg_advisory_xact_lock(
                    hashtext($1 || ':' || $2 || ':' || $3 || ':' || $4)
                )
            `, [cancha_id, fecha, hora_inicio, hora_fin]);

            // Verificar disponibilidad
            const reservasQuery = `
                SELECT COUNT(*) as count
                FROM reservas
                WHERE cancha_id = $1 
                AND fecha::date = $2::date 
                AND (
                    (hora_inicio < $4 AND hora_fin > $3)
                )
                AND estado != 'cancelada'
            `;
            
            const reservasResult = await client.query(reservasQuery, [
                cancha_id, fecha, hora_inicio, hora_fin
            ]);
            
            const reservasCount = parseInt(reservasResult.rows[0].count);
            
            // Verificar bloqueos temporales
            let bloqueosQuery = `
                SELECT COUNT(*) as count
                FROM bloqueos_temporales 
                WHERE cancha_id = $1 
                AND fecha::date = $2::date 
                AND expira_en > $3
                AND (
                    (hora_inicio < $5 AND hora_fin > $4)
                )
            `;
            
            const bloqueosParams = [cancha_id, fecha, new Date().toISOString(), hora_inicio, hora_fin];
            
            if (bloqueo_id) {
                bloqueosQuery += ` AND id != $6`;
                bloqueosParams.push(bloqueo_id);
            }
            
            const bloqueosResult = await client.query(bloqueosQuery, bloqueosParams);
            const bloqueosCount = parseInt(bloqueosResult.rows[0].count);
            
            await client.query('COMMIT');
            
            return {
                disponible: reservasCount === 0 && bloqueosCount === 0,
                reservas_existentes: reservasCount,
                bloqueos_temporales: bloqueosCount
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error verificando disponibilidad atómica:', error);
            return {
                disponible: false,
                error: error.message
            };
        } finally {
            client.release();
        }
    }
}

module.exports = AtomicReservationManager;
