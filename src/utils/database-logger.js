/**
 * Wrapper para Base de Datos con Logging Automático
 * Intercepta consultas SQL y registra métricas de rendimiento
 */

const logger = require('./advanced-logger');

class DatabaseLogger {
  constructor(database) {
    this.db = database;
    this.slowQueryThreshold = 1000; // 1 segundo
    this.criticalQueryThreshold = 5000; // 5 segundos
  }

  async query(sql, params = []) {
    const start = Date.now();
    let result;
    let error;

    try {
      result = await this.db.query(sql, params);
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const duration = Date.now() - start;
      this.logQuery(sql, params, duration, error);
    }

    return result;
  }

  async get(sql, params = []) {
    const start = Date.now();
    let result;
    let error;

    try {
      result = await this.db.get(sql, params);
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const duration = Date.now() - start;
      this.logQuery(sql, params, duration, error);
    }

    return result;
  }

  logQuery(sql, params, duration, error) {
    const context = {
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
      params: params ? params.slice(0, 3) : [], // Solo primeros 3 parámetros
      duration,
      error: error ? error.message : null
    };

    if (error) {
      logger.error('Database query failed', context);
    } else if (duration > this.criticalQueryThreshold) {
      logger.error('Critical slow query detected', context);
    } else if (duration > this.slowQueryThreshold) {
      logger.warn('Slow database query detected', context);
    } else {
      logger.debug('Database query executed', context);
    }

    // Métricas de rendimiento
    logger.performance('db_query_duration', duration, {
      sql_type: this.getQueryType(sql),
      has_params: params && params.length > 0
    });
  }

  getQueryType(sql) {
    const query = sql.trim().toLowerCase();
    
    if (query.startsWith('select')) return 'SELECT';
    if (query.startsWith('insert')) return 'INSERT';
    if (query.startsWith('update')) return 'UPDATE';
    if (query.startsWith('delete')) return 'DELETE';
    if (query.startsWith('create')) return 'CREATE';
    if (query.startsWith('alter')) return 'ALTER';
    if (query.startsWith('drop')) return 'DROP';
    
    return 'OTHER';
  }

  // Métodos de conveniencia para operaciones comunes
  async findById(table, id) {
    return await this.get(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  }

  async findAll(table, conditions = {}) {
    let sql = `SELECT * FROM ${table}`;
    const params = [];
    
    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions).map((key, index) => {
        params.push(conditions[key]);
        return `${key} = $${index + 1}`;
      }).join(' AND ');
      
      sql += ` WHERE ${whereClause}`;
    }
    
    return await this.query(sql, params);
  }

  async insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    return await this.query(sql, values);
  }

  async update(table, id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`;
    return await this.query(sql, [...values, id]);
  }

  async delete(table, id) {
    const sql = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
    return await this.query(sql, [id]);
  }
}

module.exports = DatabaseLogger;
