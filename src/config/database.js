const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
  constructor() {
    this.pgPool = null;
    this.sqliteDb = null;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.databaseUrl = process.env.DATABASE_URL;
  }

  async connect() {
    console.log('🔌 CONECTANDO A BASE DE DATOS');
    console.log('==============================');
    
    if (this.isProduction && this.databaseUrl) {
      console.log('🐘 Usando PostgreSQL en producción');
      await this.connectPostgreSQL();
    } else {
      console.log('📁 Usando SQLite en desarrollo');
      await this.connectSQLite();
    }
    
    console.log('✅ Conexión a base de datos establecida');
  }

  async connectPostgreSQL() {
    try {
      this.pgPool = new Pool({
        connectionString: this.databaseUrl,
        ssl: {
          rejectUnauthorized: false
        }
      });

      // Probar conexión
      const client = await this.pgPool.connect();
      console.log('✅ PostgreSQL conectado exitosamente');
      client.release();

      // Crear tablas si no existen
      await this.createPostgreSQLTables();
      
    } catch (error) {
      console.error('❌ Error conectando a PostgreSQL:', error.message);
      console.log('🔄 Fallback a SQLite...');
      await this.connectSQLite();
    }
  }

  async connectSQLite() {
    const dbPath = process.env.DB_PATH || './database.sqlite';
    
    return new Promise((resolve, reject) => {
      this.sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Error conectando a SQLite:', err.message);
          reject(err);
        } else {
          console.log('✅ SQLite conectado exitosamente');
          this.createSQLiteTables();
          resolve();
        }
      });
    });
  }

  async createPostgreSQLTables() {
    const client = await this.pgPool.connect();
    
    try {
      // Crear tabla ciudades
      await client.query(`
        CREATE TABLE IF NOT EXISTS ciudades (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL UNIQUE
        )
      `);

      // Crear tabla complejos
      await client.query(`
        CREATE TABLE IF NOT EXISTS complejos (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(255) NOT NULL,
          ciudad_id INTEGER REFERENCES ciudades(id),
          direccion TEXT,
          telefono VARCHAR(50),
          email VARCHAR(255)
        )
      `);

      // Crear tabla canchas
      await client.query(`
        CREATE TABLE IF NOT EXISTS canchas (
          id SERIAL PRIMARY KEY,
          complejo_id INTEGER REFERENCES complejos(id),
          nombre VARCHAR(255) NOT NULL,
          tipo VARCHAR(50),
          precio_hora INTEGER
        )
      `);

      // Crear tabla usuarios
      await client.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          nombre VARCHAR(255),
          rol VARCHAR(50) DEFAULT 'usuario',
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Crear tabla reservas
      await client.query(`
        CREATE TABLE IF NOT EXISTS reservas (
          id SERIAL PRIMARY KEY,
          codigo_reserva VARCHAR(50) UNIQUE NOT NULL,
          cancha_id INTEGER REFERENCES canchas(id),
          usuario_id INTEGER REFERENCES usuarios(id),
          nombre_cliente VARCHAR(255) NOT NULL,
          email_cliente VARCHAR(255) NOT NULL,
          telefono_cliente VARCHAR(50),
          fecha DATE NOT NULL,
          hora_inicio TIME NOT NULL,
          hora_fin TIME NOT NULL,
          estado VARCHAR(50) DEFAULT 'pendiente',
          precio_total INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('✅ Tablas PostgreSQL creadas exitosamente');
      
    } catch (error) {
      console.error('❌ Error creando tablas PostgreSQL:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  createSQLiteTables() {
    const db = this.sqliteDb;
    
    db.serialize(() => {
      // Crear tabla ciudades
      db.run(`CREATE TABLE IF NOT EXISTS ciudades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      )`);

      // Crear tabla complejos
      db.run(`CREATE TABLE IF NOT EXISTS complejos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        ciudad_id INTEGER,
        direccion TEXT,
        telefono TEXT,
        email TEXT,
        FOREIGN KEY (ciudad_id) REFERENCES ciudades (id)
      )`);

      // Crear tabla canchas
      db.run(`CREATE TABLE IF NOT EXISTS canchas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complejo_id INTEGER,
        nombre TEXT NOT NULL,
        tipo TEXT,
        precio_hora INTEGER,
        FOREIGN KEY (complejo_id) REFERENCES complejos (id)
      )`);

      // Crear tabla usuarios
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre TEXT,
        rol TEXT DEFAULT 'usuario',
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Crear tabla reservas
      db.run(`CREATE TABLE IF NOT EXISTS reservas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_reserva TEXT UNIQUE NOT NULL,
        cancha_id INTEGER,
        usuario_id INTEGER,
        nombre_cliente TEXT NOT NULL,
        email_cliente TEXT NOT NULL,
        telefono_cliente TEXT,
        fecha DATE NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        estado TEXT DEFAULT 'pendiente',
        precio_total INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cancha_id) REFERENCES canchas (id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
      )`);
    });

    console.log('✅ Tablas SQLite creadas exitosamente');
  }

  // Métodos de consulta unificados
  async query(sql, params = []) {
    if (this.pgPool) {
      // PostgreSQL
      const client = await this.pgPool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows;
      } finally {
        client.release();
      }
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.sqliteDb.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    }
  }

  async run(sql, params = []) {
    if (this.pgPool) {
      // PostgreSQL
      const client = await this.pgPool.connect();
      try {
        const result = await client.query(sql, params);
        return { lastID: result.rows[0]?.id || 0, changes: result.rowCount };
      } finally {
        client.release();
      }
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.sqliteDb.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ lastID: this.lastID, changes: this.changes });
          }
        });
      });
    }
  }

  async get(sql, params = []) {
    if (this.pgPool) {
      // PostgreSQL
      const client = await this.pgPool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.sqliteDb.get(sql, params, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || null);
          }
        });
      });
    }
  }

  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
      console.log('✅ Conexión PostgreSQL cerrada');
    }
    
    if (this.sqliteDb) {
      this.sqliteDb.close();
      console.log('✅ Conexión SQLite cerrada');
    }
  }

  // Método para obtener información de la base de datos
  getDatabaseInfo() {
    if (this.pgPool) {
      return {
        type: 'PostgreSQL',
        connected: true,
        url: this.databaseUrl ? 'Configurado' : 'No configurado'
      };
    } else if (this.sqliteDb) {
      return {
        type: 'SQLite',
        connected: true,
        path: process.env.DB_PATH || './database.sqlite'
      };
    } else {
      return {
        type: 'No conectado',
        connected: false
      };
    }
  }
}

module.exports = DatabaseManager;