const db = require('../utils/database');

/**
 * Validar que la fecha de inicio de una promoción tenga al menos 7 días de anticipación
 * Para promociones recurrentes, la validación es que comience la siguiente semana
 */
function validarAnticipacionMinima(tipoFecha, fechaEspecifica, fechaInicio) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const minimoAnticipacion = new Date(hoy);
    minimoAnticipacion.setDate(minimoAnticipacion.getDate() + 7);
    
    if (tipoFecha === 'recurrente_semanal') {
        // Para recurrentes, debe comenzar al menos la próxima semana (lunes siguiente)
        const proximoLunes = new Date(hoy);
        proximoLunes.setDate(proximoLunes.getDate() + ((8 - proximoLunes.getDay()) % 7 || 7));
        
        return {
            valido: true, // Siempre válido para recurrentes
            mensaje: `Esta promoción recurrente comenzará a aplicarse a partir del ${proximoLunes.toLocaleDateString('es-CL', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}`,
            fechaInicio: proximoLunes
        };
    }
    
    // Para fechas específicas o rangos
    const fechaAValidar = tipoFecha === 'especifico' ? new Date(fechaEspecifica) : new Date(fechaInicio);
    
    if (fechaAValidar < minimoAnticipacion) {
        return {
            valido: false,
            mensaje: `La promoción debe tener al menos 7 días de anticipación. La fecha más temprana permitida es: ${minimoAnticipacion.toLocaleDateString('es-CL')}`,
            fechaMinimaPermitida: minimoAnticipacion
        };
    }
    
    return {
        valido: true,
        mensaje: 'Fecha válida'
    };
}

/**
 * Obtener todas las promociones de una cancha
 */
async function getPromocionesCancha(req, res) {
    try {
        const { cancha_id } = req.params;
        
        const promociones = await db.query(
            `SELECT p.*, u.nombre as creado_por_nombre, c.nombre as cancha_nombre
             FROM promociones_canchas p
             LEFT JOIN usuarios u ON p.creado_por = u.id
             JOIN canchas c ON p.cancha_id = c.id
             WHERE p.cancha_id = $1
             ORDER BY p.creado_en DESC`,
            [cancha_id]
        );
        
        res.json(promociones);
    } catch (error) {
        console.error('Error obteniendo promociones:', error);
        res.status(500).json({ error: 'Error al obtener promociones' });
    }
}

/**
 * Obtener todas las promociones del complejo del usuario
 */
async function getPromocionesComplejo(req, res) {
    try {
        const usuario = req.user;
        
        let query = `
            SELECT p.*, u.nombre as creado_por_nombre, c.nombre as cancha_nombre, co.nombre as complejo_nombre
            FROM promociones_canchas p
            LEFT JOIN usuarios u ON p.creado_por = u.id
            JOIN canchas c ON p.cancha_id = c.id
            JOIN complejos co ON c.complejo_id = co.id
        `;
        
        let params = [];
        
        if (usuario.rol === 'owner' || usuario.rol === 'manager') {
            query += ' WHERE co.id = $1';
            params = [usuario.complejo_id];
        }
        
        query += ' ORDER BY p.creado_en DESC';
        
        const promociones = await db.query(query, params);
        
        res.json(promociones);
    } catch (error) {
        console.error('Error obteniendo promociones del complejo:', error);
        res.status(500).json({ error: 'Error al obtener promociones' });
    }
}

/**
 * Crear una nueva promoción
 */
async function createPromocion(req, res) {
    try {
        const usuario = req.user;
        const {
            cancha_id,
            precio_promocional,
            tipo_fecha,
            fecha_especifica,
            fecha_inicio,
            fecha_fin,
            dias_semana,
            tipo_horario,
            hora_especifica,
            hora_inicio,
            hora_fin,
            nombre,
            descripcion
        } = req.body;
        
        // Validar que la cancha pertenezca al complejo del usuario
        const cancha = await db.get(
            'SELECT c.*, co.id as complejo_id FROM canchas c JOIN complejos co ON c.complejo_id = co.id WHERE c.id = $1',
            [cancha_id]
        );
        
        if (!cancha) {
            return res.status(404).json({ error: 'Cancha no encontrada' });
        }
        
        if (usuario.rol !== 'super_admin' && cancha.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ error: 'No tienes permiso para crear promociones en esta cancha' });
        }
        
        // Validar anticipación mínima de 7 días
        const validacion = validarAnticipacionMinima(tipo_fecha, fecha_especifica, fecha_inicio);
        
        if (!validacion.valido) {
            return res.status(400).json({ 
                error: 'Anticipación insuficiente',
                mensaje: validacion.mensaje,
                fechaMinimaPermitida: validacion.fechaMinimaPermitida
            });
        }
        
        // Validar que el precio promocional sea menor que el precio normal
        if (precio_promocional >= cancha.precio_hora) {
            return res.status(400).json({ 
                error: 'El precio promocional debe ser menor que el precio normal de la cancha',
                precio_normal: cancha.precio_hora,
                precio_promocional_enviado: precio_promocional
            });
        }
        
        // Crear la promoción
        const result = await db.run(`
            INSERT INTO promociones_canchas (
                cancha_id, precio_promocional, tipo_fecha, fecha_especifica, 
                fecha_inicio, fecha_fin, dias_semana, tipo_horario, 
                hora_especifica, hora_inicio, hora_fin, nombre, descripcion, 
                creado_por, activo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
            RETURNING *
        `, [
            cancha_id, precio_promocional, tipo_fecha, fecha_especifica || null,
            fecha_inicio || null, fecha_fin || null, dias_semana || null, tipo_horario,
            hora_especifica || null, hora_inicio || null, hora_fin || null,
            nombre || null, descripcion || null, usuario.id
        ]);
        
        console.log('✅ Promoción creada:', result.id);
        
        res.status(201).json({
            success: true,
            mensaje: validacion.mensaje,
            data: result
        });
    } catch (error) {
        console.error('Error creando promoción:', error);
        res.status(500).json({ error: 'Error al crear promoción', detalle: error.message });
    }
}

/**
 * Actualizar una promoción existente
 */
async function updatePromocion(req, res) {
    try {
        const usuario = req.user;
        const { id } = req.params;
        const {
            precio_promocional,
            tipo_fecha,
            fecha_especifica,
            fecha_inicio,
            fecha_fin,
            dias_semana,
            tipo_horario,
            hora_especifica,
            hora_inicio,
            hora_fin,
            nombre,
            descripcion,
            activo
        } = req.body;
        
        // Obtener promoción actual
        const promocion = await db.get(
            `SELECT p.*, c.complejo_id, c.precio_hora
             FROM promociones_canchas p
             JOIN canchas c ON p.cancha_id = c.id
             WHERE p.id = $1`,
            [id]
        );
        
        if (!promocion) {
            return res.status(404).json({ error: 'Promoción no encontrada' });
        }
        
        if (usuario.rol !== 'super_admin' && promocion.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ error: 'No tienes permiso para editar esta promoción' });
        }
        
        // Validar anticipación mínima solo si se cambian las fechas
        if (tipo_fecha !== promocion.tipo_fecha || fecha_especifica || fecha_inicio) {
            const validacion = validarAnticipacionMinima(
                tipo_fecha || promocion.tipo_fecha,
                fecha_especifica || promocion.fecha_especifica,
                fecha_inicio || promocion.fecha_inicio
            );
            
            if (!validacion.valido) {
                return res.status(400).json({ 
                    error: 'Anticipación insuficiente',
                    mensaje: validacion.mensaje
                });
            }
        }
        
        // Validar precio promocional
        if (precio_promocional && precio_promocional >= promocion.precio_hora) {
            return res.status(400).json({ 
                error: 'El precio promocional debe ser menor que el precio normal de la cancha',
                precio_normal: promocion.precio_hora
            });
        }
        
        // Actualizar promoción
        const result = await db.run(`
            UPDATE promociones_canchas SET
                precio_promocional = COALESCE($1, precio_promocional),
                tipo_fecha = COALESCE($2, tipo_fecha),
                fecha_especifica = $3,
                fecha_inicio = $4,
                fecha_fin = $5,
                dias_semana = $6,
                tipo_horario = COALESCE($7, tipo_horario),
                hora_especifica = $8,
                hora_inicio = $9,
                hora_fin = $10,
                nombre = $11,
                descripcion = $12,
                activo = COALESCE($13, activo)
            WHERE id = $14
            RETURNING *
        `, [
            precio_promocional, tipo_fecha, fecha_especifica || null,
            fecha_inicio || null, fecha_fin || null, dias_semana || null,
            tipo_horario, hora_especifica || null, hora_inicio || null,
            hora_fin || null, nombre, descripcion, activo, id
        ]);
        
        console.log('✅ Promoción actualizada:', id);
        
        res.json({
            success: true,
            mensaje: 'Promoción actualizada exitosamente',
            data: result
        });
    } catch (error) {
        console.error('Error actualizando promoción:', error);
        res.status(500).json({ error: 'Error al actualizar promoción', detalle: error.message });
    }
}

/**
 * Eliminar una promoción
 */
async function deletePromocion(req, res) {
    try {
        const usuario = req.user;
        const { id } = req.params;
        
        // Verificar permisos
        const promocion = await db.get(
            `SELECT p.*, c.complejo_id
             FROM promociones_canchas p
             JOIN canchas c ON p.cancha_id = c.id
             WHERE p.id = $1`,
            [id]
        );
        
        if (!promocion) {
            return res.status(404).json({ error: 'Promoción no encontrada' });
        }
        
        if (usuario.rol !== 'super_admin' && promocion.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta promoción' });
        }
        
        // Eliminar
        await db.run('DELETE FROM promociones_canchas WHERE id = $1', [id]);
        
        console.log('✅ Promoción eliminada:', id);
        
        res.json({
            success: true,
            mensaje: 'Promoción eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando promoción:', error);
        res.status(500).json({ error: 'Error al eliminar promoción' });
    }
}

/**
 * Activar/Desactivar una promoción
 */
async function togglePromocion(req, res) {
    try {
        const usuario = req.user;
        const { id } = req.params;
        const { activo } = req.body;
        
        // Verificar permisos
        const promocion = await db.get(
            `SELECT p.*, c.complejo_id
             FROM promociones_canchas p
             JOIN canchas c ON p.cancha_id = c.id
             WHERE p.id = $1`,
            [id]
        );
        
        if (!promocion) {
            return res.status(404).json({ error: 'Promoción no encontrada' });
        }
        
        if (usuario.rol !== 'super_admin' && promocion.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ error: 'No tienes permiso para modificar esta promoción' });
        }
        
        // Actualizar estado
        await db.run('UPDATE promociones_canchas SET activo = $1 WHERE id = $2', [activo, id]);
        
        console.log(`✅ Promoción ${activo ? 'activada' : 'desactivada'}:`, id);
        
        res.json({
            success: true,
            mensaje: `Promoción ${activo ? 'activada' : 'desactivada'} exitosamente`
        });
    } catch (error) {
        console.error('Error cambiando estado de promoción:', error);
        res.status(500).json({ error: 'Error al cambiar estado de promoción' });
    }
}

module.exports = {
    getPromocionesCancha,
    getPromocionesComplejo,
    createPromocion,
    updatePromocion,
    deletePromocion,
    togglePromocion
};

