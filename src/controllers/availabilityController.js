const DatabaseManager = require('../config/database');

/**
 * Sistema de caché para consultas de disponibilidad
 */
class AvailabilityCache {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
        this.maxCacheSize = 1000;
    }

    /**
     * Generar clave de caché
     */
    generateKey(canchaId, fecha) {
        return `${canchaId}_${fecha}`;
    }

    /**
     * Obtener datos del caché
     */
    get(canchaId, fecha) {
        const key = this.generateKey(canchaId, fecha);
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log(`📦 Cache hit para cancha ${canchaId} fecha ${fecha}`);
            return cached.data;
        }
        
        if (cached) {
            this.cache.delete(key);
            console.log(`⏰ Cache expirado para cancha ${canchaId} fecha ${fecha}`);
        }
        
        return null;
    }

    /**
     * Guardar datos en caché
     */
    set(canchaId, fecha, data) {
        const key = this.generateKey(canchaId, fecha);
        
        // Limpiar caché si está lleno
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            console.log(`🧹 Cache limpiado, eliminada clave: ${firstKey}`);
        }
        
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        console.log(`💾 Cache guardado para cancha ${canchaId} fecha ${fecha}`);
    }

    /**
     * Limpiar caché para una cancha específica
     */
    invalidateCancha(canchaId) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${canchaId}_`)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Cache invalidado para cancha ${canchaId} (${keysToDelete.length} entradas)`);
    }

    /**
     * Limpiar todo el caché
     */
    clear() {
        this.cache.clear();
        console.log('🧹 Cache completamente limpiado');
    }

    /**
     * Obtener estadísticas del caché
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            timeout: this.cacheTimeout
        };
    }
}

// Instancia global del caché (solo en desarrollo)
const isProduction = process.env.NODE_ENV === 'production';
const availabilityCache = isProduction ? null : new AvailabilityCache();

// Instancia global de la base de datos
const db = new DatabaseManager();

/**
 * Obtener disponibilidad de canchas con caché
 */
async function getDisponibilidad(req, res) {
    const { canchaId, fecha } = req.params;
    
    // Verificar caché primero (solo en desarrollo)
    if (availabilityCache) {
        const cachedData = availabilityCache.get(canchaId, fecha);
        if (cachedData) {
            return res.json(cachedData);
        }
    }
    
    // Si no está en caché, consultar la base de datos
    console.log(`🔍 Consultando disponibilidad para cancha ${canchaId} fecha ${fecha}`);
    
    // Usar async/await con el sistema de base de datos
    try {
        await db.connect();
        const rows = await db.query(`
            SELECT hora_inicio, hora_fin 
            FROM reservas 
            WHERE cancha_id = $1 AND fecha = $2 AND estado != 'cancelada'
            ORDER BY hora_inicio
        `, [canchaId, fecha]);
        
        // Guardar en caché (solo en desarrollo)
        if (availabilityCache) {
            availabilityCache.set(canchaId, fecha, rows);
        }
        
        res.json(rows);
    } catch (err) {
        console.error('❌ Error consultando disponibilidad:', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * Obtener disponibilidad completa de un complejo para una fecha
 */
async function getDisponibilidadComplejo(req, res) {
    const { complejoId, fecha } = req.params;
    
    console.log(`🔍 Consultando disponibilidad completa para complejo ${complejoId} fecha ${fecha}`);
    
    // Consulta optimizada que obtiene toda la información en una sola query
    try {
        await db.connect();
        const rows = await db.query(`
            SELECT 
                c.id as cancha_id,
                c.nombre as cancha_nombre,
                c.tipo as cancha_tipo,
                c.precio_hora,
                r.hora_inicio,
                r.hora_fin,
                r.estado
            FROM canchas c
            LEFT JOIN reservas r ON c.id = r.cancha_id 
                AND r.fecha = $1 
                AND r.estado != 'cancelada'
            WHERE c.complejo_id = $2
            ORDER BY c.id, r.hora_inicio
        `, [fecha, complejoId]);
        
        // Procesar resultados para agrupar por cancha
        const canchas = {};
        rows.forEach(row => {
            if (!canchas[row.cancha_id]) {
                canchas[row.cancha_id] = {
                    id: row.cancha_id,
                    nombre: row.cancha_nombre,
                    tipo: row.cancha_tipo,
                    precio_hora: row.precio_hora,
                    reservas: []
                };
            }
            
            if (row.hora_inicio) {
                canchas[row.cancha_id].reservas.push({
                    hora_inicio: row.hora_inicio,
                    hora_fin: row.hora_fin,
                    estado: row.estado
                });
            }
        });
        
        const resultado = Object.values(canchas);
        console.log(`✅ Disponibilidad obtenida para ${resultado.length} canchas`);
        
        res.json(resultado);
    } catch (err) {
        console.error('❌ Error consultando disponibilidad del complejo:', err);
        res.status(500).json({ error: err.message });
    }
}

/**
 * Invalidar caché cuando se crea una nueva reserva
 */
function invalidateCacheOnReservation(canchaId, fecha) {
    if (availabilityCache) {
        availabilityCache.invalidateCancha(canchaId);
        console.log(`🔄 Cache invalidado por nueva reserva en cancha ${canchaId} fecha ${fecha}`);
    }
}

/**
 * Obtener estadísticas del caché
 */
function getCacheStats(req, res) {
    if (availabilityCache) {
        const stats = availabilityCache.getStats();
        res.json({
            cache: stats,
            timestamp: new Date().toISOString()
        });
    } else {
        res.json({
            cache: { message: 'Cache deshabilitado en producción' },
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Limpiar caché manualmente
 */
function clearCache(req, res) {
    if (availabilityCache) {
        availabilityCache.clear();
        res.json({
            message: 'Cache limpiado exitosamente',
            timestamp: new Date().toISOString()
        });
    } else {
        res.json({
            message: 'Cache no disponible en producción',
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = {
    getDisponibilidad,
    getDisponibilidadComplejo,
    invalidateCacheOnReservation,
    getCacheStats,
    clearCache,
    availabilityCache
};
