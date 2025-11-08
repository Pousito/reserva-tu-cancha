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

// GET /categorias - Obtener categorías del complejo
router.get('/categorias', authenticateToken, async (req, res) => {
    try {
        const usuario = req.user;
        const { tipo } = req.query;
        
        let query = 'SELECT * FROM categorias_gastos WHERE 1=1';
        let params = [];
        let paramIndex = 1;
        
        console.log('👤 Usuario autenticado:', { 
            id: req.user.userId, 
            rol: req.user.rol, 
            complejo_id: req.user.complejo_id 
        });
        
        // Filtrar por complejo del usuario (owners/managers ven solo su complejo)
        if (req.user.rol === 'owner' || req.user.rol === 'manager') {
            query += ` AND complejo_id = $${paramIndex}`;
            params.push(req.user.complejo_id);
            paramIndex++;
            console.log('🔍 Filtro por complejo:', req.user.complejo_id);
        }
        // super_admin ve categorías de todos los complejos
        
        if (tipo) {
            query += ` AND tipo = $${paramIndex}`;
            params.push(tipo);
            paramIndex++;
            console.log('🔍 Filtro por tipo:', tipo);
        }
        
        query += ' ORDER BY nombre ASC';
        
        console.log('📋 Query final:', query);
        console.log('📋 Parámetros:', params);
        
        const categorias = await db.query(query, params);
        
        console.log('🔍 Resultado completo de db.query:', categorias);
        console.log('🔍 Tipo de resultado:', typeof categorias);
        console.log('🔍 Propiedades del resultado:', Object.keys(categorias || {}));
        
        // Validar que la consulta devolvió resultados
        if (!categorias) {
            console.log('⚠️ La consulta no devolvió resultados');
            return res.json([]);
        }
        
        // Manejar tanto el formato estándar (con rows) como el formato directo (array)
        let categoriasData = [];
        
        if (categorias.rows && Array.isArray(categorias.rows)) {
            // Formato estándar de PostgreSQL
            categoriasData = categorias.rows;
            console.log('📋 Usando formato estándar (rows):', categoriasData.length);
        } else if (Array.isArray(categorias)) {
            // Formato directo (array)
            categoriasData = categorias;
            console.log('📋 Usando formato directo (array):', categoriasData.length);
        } else {
            console.log('⚠️ Formato de resultado no reconocido');
            return res.json([]);
        }
        
        console.log('📋 Categorías encontradas:', categoriasData.length);
        if (categoriasData.length > 0) {
            console.log('🔍 Primer elemento:', categoriasData[0]);
        }
        
        res.json(categoriasData);
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
        const { tipo, categoria_id, fecha_desde, fecha_hasta, metodo_pago } = req.query;
        
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
        if (req.user.rol === 'owner' || req.user.rol === 'manager') {
            query += ` AND gi.complejo_id = $${paramIndex}`;
            params.push(req.user.complejo_id);
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
        
        if (metodo_pago) {
            query += ` AND gi.metodo_pago = $${paramIndex}`;
            params.push(metodo_pago);
            paramIndex++;
        }
        
        query += ' ORDER BY gi.fecha DESC, gi.creado_en DESC';
        
        console.log('🔍 Query final movimientos:', query);
        console.log('🔍 Parámetros movimientos:', params);
        
        const movimientos = await db.query(query, params);
        
        console.log('🔍 Resultado query movimientos:', movimientos);
        console.log('🔍 Tipo de resultado:', typeof movimientos);
        console.log('🔍 Propiedades:', Object.keys(movimientos || {}));
        
        // Manejar tanto el formato estándar (con rows) como el formato directo (array)
        let movimientosData = [];
        
        if (movimientos && movimientos.rows && Array.isArray(movimientos.rows)) {
            // Formato estándar de PostgreSQL
            movimientosData = movimientos.rows;
            console.log('✅ Enviando movimientos.rows:', movimientosData.length);
        } else if (Array.isArray(movimientos)) {
            // Formato directo (array)
            movimientosData = movimientos;
            console.log('✅ Enviando movimientos (array):', movimientosData.length);
        } else {
            console.log('⚠️ Formato no reconocido, enviando array vacío');
            movimientosData = [];
        }
        
        res.json(movimientosData);
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
        console.log('👤 Usuario completo en crear movimiento:', usuario);
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
        console.log('🔍 Verificando categoría ID:', categoria_id);
        const categoriaResult = await db.query(
            'SELECT * FROM categorias_gastos WHERE id = $1',
            [categoria_id]
        );
        console.log('🔍 Resultado verificación categoría:', categoriaResult);
        console.log('🔍 categoriaResult.rows:', categoriaResult.rows);
        
        const categoria = categoriaResult[0];
        
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
        const complejo_id = req.user.rol === 'super_admin' 
            ? (req.body.complejo_id || req.user.complejo_id)
            : req.user.complejo_id;
        
        // Insertar movimiento
        const result = await db.query(`
            INSERT INTO gastos_ingresos (
                complejo_id, categoria_id, tipo, monto, fecha, 
                descripcion, metodo_pago, numero_documento, usuario_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            complejo_id, categoria_id, tipo, monto, fecha,
            descripcion, metodo_pago, numero_documento, req.user.userId
        ]);
        
        console.log(`✅ Movimiento creado: ${tipo} - $${monto}`);
        console.log('🔍 Resultado inserción:', result);
        console.log('🔍 result.rows:', result.rows);
        
        // Manejar ambos formatos de respuesta de PostgreSQL
        const movimientoData = result[0];
        
        res.status(201).json({
            success: true,
            message: 'Movimiento creado correctamente',
            data: movimientoData
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
        const movimientoResult = await db.query(
            'SELECT * FROM gastos_ingresos WHERE id = $1',
            [id]
        );
        const movimiento = movimientoResult[0];
        
        if (!movimiento) {
            return res.status(404).json({ 
                success: false, 
                message: 'Movimiento no encontrado' 
            });
        }
        
        // Verificar permisos
        if (req.user.rol !== 'super_admin' && movimiento.complejo_id !== req.user.complejo_id) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para editar este movimiento' 
            });
        }
        
        // Actualizar
        const result = await db.query(`
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
            data: result[0]
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
        const movimientoResult = await db.query(
            'SELECT * FROM gastos_ingresos WHERE id = $1',
            [id]
        );
        console.log('🔍 Resultado query eliminar:', movimientoResult);
        console.log('🔍 Tipo de resultado:', typeof movimientoResult);
        console.log('🔍 Es array:', Array.isArray(movimientoResult));
        
        const movimiento = movimientoResult[0];
        
        if (!movimiento) {
            return res.status(404).json({ 
                success: false, 
                message: 'Movimiento no encontrado' 
            });
        }
        
        // Verificar permisos
        if (req.user.rol !== 'super_admin' && movimiento.complejo_id !== req.user.complejo_id) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes permiso para eliminar este movimiento' 
            });
        }
        
        // Eliminar
        await db.query('DELETE FROM gastos_ingresos WHERE id = $1', [id]);
        
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
        
        // Obtener complejo_id del usuario
        const complejo_id = req.user.complejo_id;
        
        if (!complejo_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Usuario no tiene complejo asignado' 
            });
        }
        
        // Verificar si ya existe en este complejo
        const existenteResult = await db.query(
            'SELECT id FROM categorias_gastos WHERE nombre = $1 AND complejo_id = $2',
            [nombre, complejo_id]
        );
        const existente = existenteResult[0];
        
        if (existente) {
            return res.status(409).json({ 
                success: false, 
                message: 'Ya existe una categoría con ese nombre en tu complejo' 
            });
        }
        
        // Crear categoría asociada al complejo
        const result = await db.query(`
            INSERT INTO categorias_gastos (complejo_id, nombre, descripcion, icono, color, tipo, es_predefinida)
            VALUES ($1, $2, $3, $4, $5, $6, false)
            RETURNING *
        `, [complejo_id, nombre, descripcion, icono || 'fas fa-circle', color || '#95a5a6', tipo]);
        
        console.log(`✅ Categoría creada: ${nombre} (${tipo})`);
        
        res.status(201).json({
            success: true,
            message: 'Categoría creada correctamente',
            data: result[0]
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
        const usuario = req.user;
        const { id } = req.params;
        const { nombre, descripcion, icono, color } = req.body;
        
        // Verificar que existe
        const categoriaResult = await db.query(
            'SELECT * FROM categorias_gastos WHERE id = $1',
            [id]
        );
        const categoria = categoriaResult[0];
        
        if (!categoria) {
            return res.status(404).json({ 
                success: false, 
                message: 'Categoría no encontrada' 
            });
        }
        
        // Verificar que pertenece al complejo del usuario (owners/managers)
        if (req.user.rol === 'owner' || req.user.rol === 'manager') {
            if (categoria.complejo_id !== req.user.complejo_id) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No tienes permiso para editar esta categoría' 
                });
            }
        }
        
        // Verificar nombre duplicado en el mismo complejo
        if (nombre && nombre !== categoria.nombre) {
            const existenteResult = await db.query(
                'SELECT id FROM categorias_gastos WHERE nombre = $1 AND complejo_id = $2 AND id != $3',
                [nombre, categoria.complejo_id, id]
            );
            const existente = existenteResult[0];
            
            if (existente) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'Ya existe otra categoría con ese nombre en tu complejo' 
                });
            }
        }
        
        // Actualizar
        const result = await db.query(`
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
            data: result[0]
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
        const usuario = req.user;
        const { id } = req.params;
        
        // Verificar que existe
        const categoriaResult = await db.query(
            'SELECT * FROM categorias_gastos WHERE id = $1',
            [id]
        );
        const categoria = categoriaResult[0];
        
        if (!categoria) {
            return res.status(404).json({ 
                success: false, 
                message: 'Categoría no encontrada' 
            });
        }
        
        // Verificar que pertenece al complejo del usuario (owners/managers)
        if (req.user.rol === 'owner' || req.user.rol === 'manager') {
            if (categoria.complejo_id !== req.user.complejo_id) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'No tienes permiso para eliminar esta categoría' 
                });
            }
        }
        
        // Verificar si hay movimientos
        const movimientosResult = await db.query(
            'SELECT COUNT(*) as total FROM gastos_ingresos WHERE categoria_id = $1',
            [id]
        );
        const movimientos = movimientosResult[0];
        
        if (movimientos.total > 0) {
            return res.status(409).json({ 
                success: false, 
                message: `No se puede eliminar. Hay ${movimientos.total} movimiento(s) usando esta categoría` 
            });
        }
        
        // Eliminar
        await db.query('DELETE FROM categorias_gastos WHERE id = $1', [id]);
        
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
        if (req.user.rol !== 'super_admin') {
            whereClause += ` AND complejo_id = $${paramIndex}`;
            params.push(req.user.complejo_id);
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
        const resumenResult = await db.query(`
            SELECT 
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos,
                SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END) as total_gastos,
                SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END) as balance,
                COUNT(*) as total_movimientos
            FROM gastos_ingresos
            WHERE ${whereClause}
        `, params);
        const resumen = resumenResult[0];
        
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
