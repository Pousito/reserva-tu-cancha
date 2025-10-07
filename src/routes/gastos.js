// ============================================
// CONTROL DE GASTOS E INGRESOS - ROUTES
// ============================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// La base de datos se pasará desde el servidor principal
let db = null;

// Función para configurar la base de datos
const setDatabase = (databaseInstance) => {
    db = databaseInstance;
};

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            error: 'Token de acceso requerido' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_jwt', (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                error: 'Token inválido' 
            });
        }
        req.user = user;
        next();
    });
};

// ============================================
// MIDDLEWARE DE PERMISOS (OWNER O SUPER_ADMIN)
// ============================================

const requireOwnerOrAdmin = (req, res, next) => {
    const user = req.user;
    
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            error: 'Usuario no autenticado' 
        });
    }
    
    if (!['owner', 'super_admin'].includes(user.rol)) {
        return res.status(403).json({ 
            success: false, 
            error: 'No tienes permisos para acceder a este recurso. Solo owners y super admins.' 
        });
    }
    
    next();
};

// ============================================
// RUTAS Y CONTROLADORES
// ============================================

// GET /categorias - Obtener todas las categorías
router.get('/categorias', authenticateToken, async (req, res) => {
    try {
        const { tipo } = req.query;
        
        let query = 'SELECT * FROM categorias_gastos';
        let params = [];
        
        if (tipo) {
            query += ' WHERE tipo = $1';
            params.push(tipo);
        }
        
        query += ' ORDER BY nombre ASC';
        
        const categorias = await db.query(query, params);
        
        res.json(categorias);
    } catch (error) {
        console.error('❌ Error al obtener categorías:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener categorías',
            error: error.message 
        });
    }
});

// GET /movimientos - Obtener movimientos del complejo
router.get('/movimientos', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
    try {
        const usuario = req.user;
        const { tipo, categoria_id, fecha_desde, fecha_hasta } = req.query;
        
        let query = `
            SELECT 
                gi.id,
                gi.complejo_id,
                gi.categoria_id,
                gi.tipo,
                gi.monto,
                TO_CHAR(gi.fecha, 'YYYY-MM-DD') as fecha,
                gi.descripcion,
                gi.metodo_pago,
                gi.numero_documento,
                gi.creado_en,
                gi.actualizado_en,
                cat.nombre as categoria_nombre,
                cat.icono as categoria_icono,
                cat.color as categoria_color
            FROM gastos_ingresos gi
            JOIN categorias_gastos cat ON gi.categoria_id = cat.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        // Filtrar por complejo
        if (usuario.rol === 'owner' || usuario.rol === 'manager') {
            query += ` AND gi.complejo_id = $${paramIndex}`;
            params.push(usuario.complejo_id);
            paramIndex++;
        }
        
        // Filtros opcionales
        if (tipo) {
            query += ` AND gi.tipo = $${paramIndex}`;
            params.push(tipo);
            paramIndex++;
        }
        
        if (categoria_id) {
            query += ` AND gi.categoria_id = $${paramIndex}`;
            params.push(categoria_id);
            paramIndex++;
        }
        
        if (fecha_desde) {
            query += ` AND gi.fecha >= $${paramIndex}`;
            params.push(fecha_desde);
            paramIndex++;
        }
        
        if (fecha_hasta) {
            query += ` AND gi.fecha <= $${paramIndex}`;
            params.push(fecha_hasta);
            paramIndex++;
        }
        
        query += ' ORDER BY gi.fecha DESC, gi.creado_en DESC';
        
        const movimientos = await db.query(query, params);
        
        res.json(movimientos);
    } catch (error) {
        console.error('❌ Error al obtener movimientos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener movimientos',
            error: error.message 
        });
    }
});

// POST /movimientos - Crear nuevo movimiento
router.post('/movimientos', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
    try {
        const usuario = req.user;
        const { tipo, categoria_id, monto, fecha, descripcion, metodo_pago, numero_documento } = req.body;
        
        // Validaciones
        if (!tipo || !['gasto', 'ingreso'].includes(tipo)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tipo inválido. Debe ser "gasto" o "ingreso"' 
            });
        }
        
        if (!categoria_id || !monto || !fecha) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan campos requeridos: categoria_id, monto, fecha' 
            });
        }
        
        if (monto <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El monto debe ser mayor a 0' 
            });
        }
        
        // Verificar categoría
        const categoria = await db.get(
            'SELECT * FROM categorias_gastos WHERE id = $1',
            [categoria_id]
        );
        
        if (!categoria) {
            return res.status(404).json({ 
                success: false, 
                message: 'Categoría no encontrada' 
            });
        }
        
        if (categoria.tipo !== tipo) {
            return res.status(400).json({ 
                success: false, 
                message: `La categoría "${categoria.nombre}" no es de tipo "${tipo}"` 
            });
        }
        
        // Determinar complejo_id
        const complejo_id = usuario.rol === 'super_admin' 
            ? (req.body.complejo_id || usuario.complejo_id)
            : usuario.complejo_id;
        
        // Insertar movimiento
        const result = await db.run(`
            INSERT INTO gastos_ingresos (
                complejo_id, categoria_id, tipo, monto, fecha, 
                descripcion, metodo_pago, numero_documento, usuario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            complejo_id, categoria_id, tipo, monto, fecha,
            descripcion, metodo_pago, numero_documento, usuario.id
        ]);
        
        console.log(`✅ Movimiento creado: ${tipo} - $${monto}`);
        
        res.status(201).json({
            success: true,
            message: 'Movimiento creado correctamente',
            data: result
        });
    } catch (error) {
        console.error('❌ Error al crear movimiento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al crear movimiento',
            error: error.message 
        });
    }
});

// PUT /movimientos/:id - Actualizar movimiento
router.put('/movimientos/:id', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
    try {
        const usuario = req.user;
        const { id } = req.params;
        const { categoria_id, monto, fecha, descripcion, metodo_pago, numero_documento } = req.body;
        
        // Verificar movimiento
        const movimiento = await db.get(
            'SELECT * FROM gastos_ingresos WHERE id = $1',
            [id]
        );
        
        if (!movimiento) {
            return res.status(404).json({ 
                success: false, 
                message: 'Movimiento no encontrado' 
            });
        }
        
        // Verificar permisos
        if (usuario.rol !== 'super_admin' && movimiento.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para editar este movimiento' 
            });
        }
        
        // Actualizar
        const result = await db.run(`
            UPDATE gastos_ingresos 
            SET 
                categoria_id = COALESCE($1, categoria_id),
                monto = COALESCE($2, monto),
                fecha = COALESCE($3, fecha),
                descripcion = COALESCE($4, descripcion),
                metodo_pago = COALESCE($5, metodo_pago),
                numero_documento = COALESCE($6, numero_documento),
                actualizado_en = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `, [categoria_id, monto, fecha, descripcion, metodo_pago, numero_documento, id]);
        
        res.json({
            success: true,
            message: 'Movimiento actualizado correctamente',
            data: result
        });
    } catch (error) {
        console.error('❌ Error al actualizar movimiento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar movimiento',
            error: error.message 
        });
    }
});

// DELETE /movimientos/:id - Eliminar movimiento
router.delete('/movimientos/:id', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
    try {
        const usuario = req.user;
        const { id } = req.params;
        
        // Verificar movimiento
        const movimiento = await db.get(
            'SELECT * FROM gastos_ingresos WHERE id = $1',
            [id]
        );
        
        if (!movimiento) {
            return res.status(404).json({ 
                success: false, 
                message: 'Movimiento no encontrado' 
            });
        }
        
        // Verificar permisos
        if (usuario.rol !== 'super_admin' && movimiento.complejo_id !== usuario.complejo_id) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para eliminar este movimiento' 
            });
        }
        
        // Eliminar
        await db.run('DELETE FROM gastos_ingresos WHERE id = $1', [id]);
        
        res.json({
            success: true,
            message: 'Movimiento eliminado correctamente'
        });
    } catch (error) {
        console.error('❌ Error al eliminar movimiento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar movimiento',
            error: error.message 
        });
    }
});

// POST /categorias - Crear categoría personalizada
router.post('/categorias', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
    try {
        const { nombre, descripcion, icono, color, tipo } = req.body;
        
        // Validaciones
        if (!nombre || !tipo) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan campos requeridos: nombre, tipo' 
            });
        }
        
        if (!['gasto', 'ingreso'].includes(tipo)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tipo inválido. Debe ser "gasto" o "ingreso"' 
            });
        }
        
        // Verificar si ya existe
        const existente = await db.get(
            'SELECT id FROM categorias_gastos WHERE nombre = $1',
            [nombre]
        );
        
        if (existente) {
            return res.status(409).json({ 
                success: false, 
                message: 'Ya existe una categoría con ese nombre' 
            });
        }
        
        // Crear categoría
        const result = await db.run(`
            INSERT INTO categorias_gastos (nombre, descripcion, icono, color, tipo, es_predefinida)
            VALUES ($1, $2, $3, $4, $5, false)
            RETURNING *
        `, [nombre, descripcion, icono || 'fas fa-circle', color || '#95a5a6', tipo]);
        
        console.log(`✅ Categoría creada: ${nombre} (${tipo})`);
        
        res.status(201).json({
            success: true,
            message: 'Categoría creada correctamente',
            data: result
        });
    } catch (error) {
        console.error('❌ Error al crear categoría:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al crear categoría',
            error: error.message 
        });
    }
});

// PUT /categorias/:id - Actualizar categoría
router.put('/categorias/:id', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, icono, color } = req.body;
        
        // Verificar que existe
        const categoria = await db.get(
            'SELECT * FROM categorias_gastos WHERE id = $1',
            [id]
        );
        
        if (!categoria) {
            return res.status(404).json({ 
                success: false, 
                message: 'Categoría no encontrada' 
            });
        }
        
        // No permitir modificar predefinidas
        if (categoria.es_predefinida) {
            return res.status(403).json({ 
                success: false, 
                message: 'No se pueden modificar categorías predefinidas' 
            });
        }
        
        // Verificar nombre duplicado
        if (nombre && nombre !== categoria.nombre) {
            const existente = await db.get(
                'SELECT id FROM categorias_gastos WHERE nombre = $1 AND id != $2',
                [nombre, id]
            );
            
            if (existente) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'Ya existe otra categoría con ese nombre' 
                });
            }
        }
        
        // Actualizar
        const result = await db.run(`
            UPDATE categorias_gastos 
            SET 
                nombre = COALESCE($1, nombre),
                descripcion = COALESCE($2, descripcion),
                icono = COALESCE($3, icono),
                color = COALESCE($4, color)
            WHERE id = $5
            RETURNING *
        `, [nombre, descripcion, icono, color, id]);
        
        res.json({
            success: true,
            message: 'Categoría actualizada correctamente',
            data: result
        });
    } catch (error) {
        console.error('❌ Error al actualizar categoría:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar categoría',
            error: error.message 
        });
    }
});

// DELETE /categorias/:id - Eliminar categoría
router.delete('/categorias/:id', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que existe
        const categoria = await db.get(
            'SELECT * FROM categorias_gastos WHERE id = $1',
            [id]
        );
        
        if (!categoria) {
            return res.status(404).json({ 
                success: false, 
                message: 'Categoría no encontrada' 
            });
        }
        
        // No permitir eliminar predefinidas
        if (categoria.es_predefinida) {
            return res.status(403).json({ 
                success: false, 
                message: 'No se pueden eliminar categorías predefinidas' 
            });
        }
        
        // Verificar si hay movimientos
        const movimientos = await db.get(
            'SELECT COUNT(*) as total FROM gastos_ingresos WHERE categoria_id = $1',
            [id]
        );
        
        if (movimientos.total > 0) {
            return res.status(409).json({ 
                success: false, 
                message: `No se puede eliminar. Hay ${movimientos.total} movimiento(s) usando esta categoría` 
            });
        }
        
        // Eliminar
        await db.run('DELETE FROM categorias_gastos WHERE id = $1', [id]);
        
        res.json({
            success: true,
            message: 'Categoría eliminada correctamente'
        });
    } catch (error) {
        console.error('❌ Error al eliminar categoría:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar categoría',
            error: error.message 
        });
    }
});

// GET /estadisticas - Obtener estadísticas
router.get('/estadisticas', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
    try {
        const usuario = req.user;
        const { fecha_desde, fecha_hasta } = req.query;
        
        let whereClause = '1=1';
        const params = [];
        let paramIndex = 1;
        
        // Filtrar por complejo
        if (usuario.rol !== 'super_admin') {
            whereClause += ` AND complejo_id = $${paramIndex}`;
            params.push(usuario.complejo_id);
            paramIndex++;
        }
        
        // Filtrar por fechas
        if (fecha_desde) {
            whereClause += ` AND fecha >= $${paramIndex}`;
            params.push(fecha_desde);
            paramIndex++;
        }
        
        if (fecha_hasta) {
            whereClause += ` AND fecha <= $${paramIndex}`;
            params.push(fecha_hasta);
            paramIndex++;
        }
        
        // Obtener resumen
        const resumen = await db.get(`
            SELECT 
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos,
                SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as total_gastos,
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as balance,
                COUNT(*) as total_movimientos
            FROM gastos_ingresos
            WHERE ${whereClause}
        `, params);
        
        res.json({
            success: true,
            data: {
                total_ingresos: Number(resumen.total_ingresos || 0),
                total_gastos: Number(resumen.total_gastos || 0),
                balance: Number(resumen.balance || 0),
                total_movimientos: Number(resumen.total_movimientos || 0)
            }
        });
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener estadísticas',
            error: error.message 
        });
    }
});

// Exportar router y función setDatabase
module.exports = { router, setDatabase };
