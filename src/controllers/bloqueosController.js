// Importar la instancia de base de datos
let db;

function setDatabase(databaseInstance) {
    db = databaseInstance;
}

/**
 * Obtener todos los bloqueos de una cancha
 */
async function getBloqueosCancha(req, res) {
    try {
        const { cancha_id } = req.query;
        
        if (!cancha_id) {
            return res.status(400).json({ error: 'cancha_id es requerido' });
        }
        
        const bloqueos = await db.query(
            `SELECT b.*, u.nombre as creado_por_nombre, c.nombre as cancha_nombre
             FROM bloqueos_canchas b
             LEFT JOIN usuarios u ON b.creado_por = u.id
             JOIN canchas c ON b.cancha_id = c.id
             WHERE b.cancha_id = $1
             ORDER BY b.creado_en DESC`,
            [cancha_id]
        );
        
        res.json({ bloqueos: (bloqueos && bloqueos.rows) ? bloqueos.rows : bloqueos || [] });
    } catch (error) {
        console.error('❌ Error obteniendo bloqueos:', error);
        // Si la tabla no existe, proporcionar un mensaje más claro
        if (error.message && error.message.includes('does not exist')) {
            console.error('⚠️ La tabla bloqueos_canchas no existe. Ejecuta el script SQL para crearla.');
            return res.status(500).json({ 
                error: 'La tabla de bloqueos no existe. Por favor, contacta al administrador.',
                detalles: 'La tabla bloqueos_canchas necesita ser creada en la base de datos.'
            });
        }
        res.status(500).json({ 
            error: 'Error al obtener bloqueos',
            detalles: error.message 
        });
    }
}

/**
 * Obtener todos los bloqueos del complejo del usuario
 */
async function getBloqueosComplejo(req, res) {
    try {
        const usuario = req.user;
        const complejoId = usuario.complejo_id;
        
        if (usuario.rol === 'super_admin') {
            // Super admin ve todos los bloqueos
            const bloqueos = await db.query(`
                SELECT b.*, u.nombre as creado_por_nombre, c.nombre as cancha_nombre, co.nombre as complejo_nombre
                FROM bloqueos_canchas b
                LEFT JOIN usuarios u ON b.creado_por = u.id
                JOIN canchas c ON b.cancha_id = c.id
                JOIN complejos co ON c.complejo_id = co.id
                ORDER BY b.creado_en DESC
            `);
            return res.json({ bloqueos: (bloqueos && bloqueos.rows) ? bloqueos.rows : bloqueos || [] });
        }
        
        if (!complejoId) {
            return res.status(403).json({ error: 'No tienes un complejo asignado' });
        }
        
        const bloqueos = await db.query(
            `SELECT b.*, u.nombre as creado_por_nombre, c.nombre as cancha_nombre
             FROM bloqueos_canchas b
             LEFT JOIN usuarios u ON b.creado_por = u.id
             JOIN canchas c ON b.cancha_id = c.id
             JOIN complejos co ON c.complejo_id = co.id
             WHERE co.id = $1
             ORDER BY b.creado_en DESC`,
            [complejoId]
        );
        
        res.json({ bloqueos: (bloqueos && bloqueos.rows) ? bloqueos.rows : bloqueos || [] });
    } catch (error) {
        console.error('Error obteniendo bloqueos del complejo:', error);
        res.status(500).json({ error: 'Error al obtener bloqueos' });
    }
}

/**
 * Obtener un bloqueo por ID
 */
async function getBloqueoById(req, res) {
    try {
        const { id } = req.params;
        const usuario = req.user;
        
        const bloqueo = await db.get(
            `SELECT b.*, c.complejo_id
             FROM bloqueos_canchas b
             JOIN canchas c ON b.cancha_id = c.id
             WHERE b.id = $1`,
            [id]
        );
        
        if (!bloqueo) {
            return res.status(404).json({ error: 'Bloqueo no encontrado' });
        }
        
        // Verificar permisos
        if (usuario.rol !== 'super_admin' && bloqueo.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ error: 'No tienes permiso para ver este bloqueo' });
        }
        
        // Verificar que el usuario tenga permisos
        if (!['owner', 'manager', 'super_admin'].includes(usuario.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para ver bloqueos' });
        }
        
        res.json(bloqueo);
    } catch (error) {
        console.error('Error obteniendo bloqueo:', error);
        res.status(500).json({ error: 'Error al obtener bloqueo' });
    }
}

/**
 * Crear un nuevo bloqueo
 */
async function createBloqueo(req, res) {
    try {
        console.log('🚫 POST /api/bloqueos-canchas - Creando bloqueo');
        console.log('👤 Usuario:', req.user);
        console.log('📦 Body:', req.body);
        
        const usuario = req.user;
        const usuarioId = usuario.id || usuario.userId;
        const {
            cancha_id,
            motivo,
            descripcion,
            tipo_fecha,
            fecha_especifica,
            fecha_inicio,
            fecha_fin,
            dias_semana,
            tipo_horario,
            hora_especifica,
            hora_inicio,
            hora_fin,
            activo = true
        } = req.body;
        
        // Validar que la cancha pertenezca al complejo del usuario
        const canchaResult = await db.query(
            'SELECT c.*, co.id as complejo_id FROM canchas c JOIN complejos co ON c.complejo_id = co.id WHERE c.id = $1',
            [cancha_id]
        );
        
        const cancha = (canchaResult && canchaResult.rows && canchaResult.rows[0]) || canchaResult[0] || null;
        
        if (!cancha) {
            return res.status(404).json({ error: 'Cancha no encontrada' });
        }
        
        if (usuario.rol !== 'super_admin' && cancha.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ error: 'No tienes permiso para crear bloqueos en esta cancha' });
        }
        
        // Verificar que el usuario tenga permisos (owner, manager o super_admin)
        if (!['owner', 'manager', 'super_admin'].includes(usuario.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para crear bloqueos' });
        }
        
        // Validar campos requeridos según tipo
        if (!motivo || !tipo_fecha || !tipo_horario) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        // Construir query de inserción
        const campos = ['cancha_id', 'motivo', 'tipo_fecha', 'tipo_horario', 'activo', 'creado_por'];
        const valores = [cancha_id, motivo, tipo_fecha, tipo_horario, activo, usuarioId];
        const placeholders = valores.map((_, i) => `$${i + 1}`).join(', ');
        
        let queryCampos = campos.join(', ');
        let queryValores = placeholders;
        
        // Agregar campos condicionales según tipo de fecha
        if (tipo_fecha === 'especifico' && fecha_especifica) {
            queryCampos += ', fecha_especifica';
            valores.push(fecha_especifica);
            queryValores += `, $${valores.length}`;
        } else if (tipo_fecha === 'rango' && fecha_inicio && fecha_fin) {
            queryCampos += ', fecha_inicio, fecha_fin';
            valores.push(fecha_inicio, fecha_fin);
            queryValores += `, $${valores.length - 1}, $${valores.length}`;
        } else if (tipo_fecha === 'recurrente_semanal' && dias_semana && Array.isArray(dias_semana) && dias_semana.length > 0) {
            queryCampos += ', dias_semana';
            valores.push(dias_semana);
            queryValores += `, $${valores.length}`;
        }
        
        // Agregar campos condicionales según tipo de horario
        if (tipo_horario === 'especifico' && hora_especifica) {
            queryCampos += ', hora_especifica';
            valores.push(hora_especifica);
            queryValores += `, $${valores.length}`;
        } else if (tipo_horario === 'rango' && hora_inicio && hora_fin) {
            queryCampos += ', hora_inicio, hora_fin';
            valores.push(hora_inicio, hora_fin);
            queryValores += `, $${valores.length - 1}, $${valores.length}`;
        }
        
        // Agregar descripción si existe
        if (descripcion) {
            queryCampos += ', descripcion';
            valores.push(descripcion);
            queryValores += `, $${valores.length}`;
        }
        
        const query = `
            INSERT INTO bloqueos_canchas (${queryCampos})
            VALUES (${queryValores})
            RETURNING *
        `;
        
        console.log('🔍 Query:', query);
        console.log('📊 Valores:', valores);
        
        const result = await db.query(query, valores);
        const nuevoBloqueo = (result && result.rows && result.rows[0]) || result[0] || null;
        
        console.log('✅ Bloqueo creado:', nuevoBloqueo);
        
        res.status(201).json(nuevoBloqueo);
    } catch (error) {
        console.error('Error creando bloqueo:', error);
        res.status(500).json({ error: 'Error al crear bloqueo', detalles: error.message });
    }
}

/**
 * Actualizar un bloqueo
 */
async function updateBloqueo(req, res) {
    try {
        const { id } = req.params;
        const usuario = req.user;
        const {
            motivo,
            descripcion,
            tipo_fecha,
            fecha_especifica,
            fecha_inicio,
            fecha_fin,
            dias_semana,
            tipo_horario,
            hora_especifica,
            hora_inicio,
            hora_fin,
            activo
        } = req.body;
        
        // Verificar que el bloqueo existe y pertenece al complejo del usuario
        const bloqueoResult = await db.query(
            `SELECT b.*, c.complejo_id
             FROM bloqueos_canchas b
             JOIN canchas c ON b.cancha_id = c.id
             WHERE b.id = $1`,
            [id]
        );
        
        const bloqueo = (bloqueoResult && bloqueoResult.rows && bloqueoResult.rows[0]) || bloqueoResult[0] || null;
        
        if (!bloqueo) {
            return res.status(404).json({ error: 'Bloqueo no encontrado' });
        }
        
        if (usuario.rol !== 'super_admin' && bloqueo.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ error: 'No tienes permiso para modificar este bloqueo' });
        }
        
        // Construir query de actualización
        const updates = [];
        const valores = [];
        let paramIndex = 1;
        
        if (motivo !== undefined) {
            updates.push(`motivo = $${paramIndex++}`);
            valores.push(motivo);
        }
        if (descripcion !== undefined) {
            updates.push(`descripcion = $${paramIndex++}`);
            valores.push(descripcion);
        }
        if (tipo_fecha !== undefined) {
            updates.push(`tipo_fecha = $${paramIndex++}`);
            valores.push(tipo_fecha);
        }
        if (tipo_horario !== undefined) {
            updates.push(`tipo_horario = $${paramIndex++}`);
            valores.push(tipo_horario);
        }
        if (activo !== undefined) {
            updates.push(`activo = $${paramIndex++}`);
            valores.push(activo);
        }
        
        // Actualizar campos de fecha según tipo
        if (tipo_fecha === 'especifico') {
            if (fecha_especifica !== undefined) {
                updates.push(`fecha_especifica = $${paramIndex++}`);
                valores.push(fecha_especifica);
            }
            updates.push(`fecha_inicio = NULL, fecha_fin = NULL, dias_semana = NULL`);
        } else if (tipo_fecha === 'rango') {
            if (fecha_inicio !== undefined) {
                updates.push(`fecha_inicio = $${paramIndex++}`);
                valores.push(fecha_inicio);
            }
            if (fecha_fin !== undefined) {
                updates.push(`fecha_fin = $${paramIndex++}`);
                valores.push(fecha_fin);
            }
            updates.push(`fecha_especifica = NULL, dias_semana = NULL`);
        } else if (tipo_fecha === 'recurrente_semanal') {
            if (dias_semana !== undefined && Array.isArray(dias_semana)) {
                updates.push(`dias_semana = $${paramIndex++}`);
                valores.push(dias_semana);
            }
            updates.push(`fecha_especifica = NULL, fecha_inicio = NULL, fecha_fin = NULL`);
        }
        
        // Actualizar campos de horario según tipo
        if (tipo_horario === 'especifico') {
            if (hora_especifica !== undefined) {
                updates.push(`hora_especifica = $${paramIndex++}`);
                valores.push(hora_especifica);
            }
            updates.push(`hora_inicio = NULL, hora_fin = NULL`);
        } else if (tipo_horario === 'rango') {
            if (hora_inicio !== undefined) {
                updates.push(`hora_inicio = $${paramIndex++}`);
                valores.push(hora_inicio);
            }
            if (hora_fin !== undefined) {
                updates.push(`hora_fin = $${paramIndex++}`);
                valores.push(hora_fin);
            }
            updates.push(`hora_especifica = NULL`);
        } else if (tipo_horario === 'todo_el_dia') {
            updates.push(`hora_especifica = NULL, hora_inicio = NULL, hora_fin = NULL`);
        }
        
        valores.push(id);
        
        const query = `
            UPDATE bloqueos_canchas 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        
        const result = await db.query(query, valores);
        const bloqueoActualizado = (result && result.rows && result.rows[0]) || result[0] || null;
        
        console.log('✅ Bloqueo actualizado:', bloqueoActualizado);
        
        res.json(bloqueoActualizado);
    } catch (error) {
        console.error('Error actualizando bloqueo:', error);
        res.status(500).json({ error: 'Error al actualizar bloqueo', detalles: error.message });
    }
}

/**
 * Eliminar un bloqueo
 */
async function deleteBloqueo(req, res) {
    try {
        const { id } = req.params;
        const usuario = req.user;
        
        // Verificar que el bloqueo existe y pertenece al complejo del usuario
        const bloqueo = await db.get(
            `SELECT b.*, c.complejo_id
             FROM bloqueos_canchas b
             JOIN canchas c ON b.cancha_id = c.id
             WHERE b.id = $1`,
            [id]
        );
        
        if (!bloqueo) {
            return res.status(404).json({ error: 'Bloqueo no encontrado' });
        }
        
        if (usuario.rol !== 'super_admin' && bloqueo.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este bloqueo' });
        }
        
        await db.query('DELETE FROM bloqueos_canchas WHERE id = $1', [id]);
        
        console.log('✅ Bloqueo eliminado:', id);
        
        res.json({
            success: true,
            mensaje: 'Bloqueo eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando bloqueo:', error);
        res.status(500).json({ error: 'Error al eliminar bloqueo' });
    }
}

/**
 * Activar/Desactivar un bloqueo
 */
async function toggleBloqueo(req, res) {
    try {
        const usuario = req.user;
        const { id } = req.params;
        const { activo } = req.body;
        
        // Verificar permisos
        const bloqueo = await db.get(
            `SELECT b.*, c.complejo_id
             FROM bloqueos_canchas b
             JOIN canchas c ON b.cancha_id = c.id
             WHERE b.id = $1`,
            [id]
        );
        
        if (!bloqueo) {
            return res.status(404).json({ error: 'Bloqueo no encontrado' });
        }
        
        if (usuario.rol !== 'super_admin' && bloqueo.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ error: 'No tienes permiso para modificar este bloqueo' });
        }
        
        // Actualizar estado
        await db.query('UPDATE bloqueos_canchas SET activo = $1 WHERE id = $2', [activo, id]);
        
        console.log(`✅ Bloqueo ${activo ? 'activado' : 'desactivado'}:`, id);
        
        res.json({
            success: true,
            mensaje: `Bloqueo ${activo ? 'activado' : 'desactivado'} exitosamente`
        });
    } catch (error) {
        console.error('Error cambiando estado de bloqueo:', error);
        res.status(500).json({ error: 'Error al cambiar estado de bloqueo' });
    }
}

module.exports = {
    setDatabase,
    getBloqueosCancha,
    getBloqueosComplejo,
    getBloqueoById,
    createBloqueo,
    updateBloqueo,
    deleteBloqueo,
    toggleBloqueo
};

