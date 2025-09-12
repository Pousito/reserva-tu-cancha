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
    console.log('🌍 Entorno:', process.env.NODE_ENV);
    console.log('📊 Base de datos:', this.databaseUrl ? 'PostgreSQL' : 'SQLite');
    console.log('🔗 DATABASE_URL:', this.databaseUrl ? 'Definido' : 'No definido');
    
    if (this.databaseUrl) {
      console.log('🐘 Usando PostgreSQL');
      await this.connectPostgreSQL();
    } else {
      console.log('📁 Usando SQLite');
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
      this.pgPool = null; // Limpiar el pool de PostgreSQL
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
          this.createSQLiteTables().then(() => {
            // En producción, NO restaurar automáticamente para evitar problemas de esquema
            if (this.isProduction) {
              console.log('🏭 Modo producción: No restaurando respaldos automáticamente');
              resolve();
            } else {
              resolve();
            }
          }).catch(reject);
        }
      });
    });
  }

  async restoreFromBackups() {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const backupDir = './data/backups';
      if (!fs.existsSync(backupDir)) {
        console.log('📁 Directorio de respaldos no existe');
        return;
      }
      
      const files = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.sqlite'))
        .sort()
        .reverse(); // Más recientes primero
      
      if (files.length === 0) {
        console.log('📋 No hay respaldos disponibles');
        return;
      }
      
      // Buscar el respaldo más reciente con datos
      for (const file of files) {
        const backupPath = path.join(backupDir, file);
        const stats = fs.statSync(backupPath);
        
        if (stats.size > 0) {
          console.log(`🔄 Restaurando desde respaldo: ${file}`);
          
          // Copiar respaldo a la base de datos principal
          const currentDbPath = process.env.DB_PATH || './database.sqlite';
          fs.copyFileSync(backupPath, currentDbPath);
          
          console.log('✅ Respaldo restaurado exitosamente');
          return;
        }
      }
      
      console.log('⚠️ No se encontraron respaldos válidos');
      
    } catch (error) {
      console.error('❌ Error restaurando respaldos:', error.message);
      throw error;
    }
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
          complejo_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (complejo_id) REFERENCES complejos(id)
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
          rut_cliente VARCHAR(20),
          fecha DATE NOT NULL,
          hora_inicio TIME NOT NULL,
          hora_fin TIME NOT NULL,
          estado VARCHAR(50) DEFAULT 'pendiente',
          estado_pago VARCHAR(50) DEFAULT 'pendiente',
          precio_total INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Crear tabla pagos
      await client.query(`
        CREATE TABLE IF NOT EXISTS pagos (
          id SERIAL PRIMARY KEY,
          reserva_id INTEGER REFERENCES reservas(id),
          transbank_token VARCHAR(255) UNIQUE NOT NULL,
          order_id VARCHAR(255) NOT NULL,
          amount INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          authorization_code VARCHAR(255),
          payment_type_code VARCHAR(50),
          response_code INTEGER,
          installments_number INTEGER,
          transaction_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          bloqueo_id VARCHAR(50),
          reservation_code VARCHAR(50)
        )
      `);

      // Crear tabla bloqueos temporales
      await client.query(`
        CREATE TABLE IF NOT EXISTS bloqueos_temporales (
          id VARCHAR(50) PRIMARY KEY,
          cancha_id INTEGER REFERENCES canchas(id),
          fecha DATE NOT NULL,
          hora_inicio TIME NOT NULL,
          hora_fin TIME NOT NULL,
          session_id VARCHAR(255) NOT NULL,
          expira_en TIMESTAMP NOT NULL,
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          datos_cliente TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Crear tabla de tokens de restablecimiento de contraseña
      await client.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES usuarios (id) ON DELETE CASCADE
        )
      `);

      // Migración: Agregar columna complejo_id si no existe
      try {
        await client.query(`ALTER TABLE usuarios ADD COLUMN complejo_id INTEGER`);
        console.log('✅ Columna complejo_id agregada a usuarios (PostgreSQL)');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error agregando columna complejo_id:', error.message);
        }
      }

      // Migración: Agregar columna rut_cliente si no existe
      try {
        await client.query(`ALTER TABLE reservas ADD COLUMN rut_cliente VARCHAR(20)`);
        console.log('✅ Columna rut_cliente agregada a reservas (PostgreSQL)');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error agregando columna rut_cliente:', error.message);
        }
      }

      // Migración: Agregar columna estado_pago si no existe
      try {
        await client.query(`ALTER TABLE reservas ADD COLUMN estado_pago VARCHAR(50) DEFAULT 'pendiente'`);
        console.log('✅ Columna estado_pago agregada a reservas (PostgreSQL)');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error agregando columna estado_pago:', error.message);
        }
      }

      // Migración: Agregar columna fecha_creacion si no existe
      try {
        await client.query(`ALTER TABLE reservas ADD COLUMN fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        console.log('✅ Columna fecha_creacion agregada a reservas (PostgreSQL)');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error agregando columna fecha_creacion:', error.message);
        }
      }

      // Migración: Agregar columnas a tabla pagos si no existen
      try {
        await client.query(`ALTER TABLE pagos ADD COLUMN bloqueo_id VARCHAR(50)`);
        console.log('✅ Columna bloqueo_id agregada a pagos (PostgreSQL)');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error agregando columna bloqueo_id:', error.message);
        }
      }

      try {
        await client.query(`ALTER TABLE pagos ADD COLUMN reservation_code VARCHAR(50)`);
        console.log('✅ Columna reservation_code agregada a pagos (PostgreSQL)');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error agregando columna reservation_code:', error.message);
        }
      }

      // Migración: Agregar columnas a tabla bloqueos_temporales si no existen
      try {
        await client.query(`ALTER TABLE bloqueos_temporales ADD COLUMN datos_cliente TEXT`);
        console.log('✅ Columna datos_cliente agregada a bloqueos_temporales (PostgreSQL)');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error agregando columna datos_cliente:', error.message);
        }
      }

      try {
        await client.query(`ALTER TABLE bloqueos_temporales ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        console.log('✅ Columna created_at agregada a bloqueos_temporales (PostgreSQL)');
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error('❌ Error agregando columna created_at:', error.message);
        }
      }

      console.log('✅ Tablas PostgreSQL creadas exitosamente');
      
    } catch (error) {
      console.error('❌ Error creando tablas PostgreSQL:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async createSQLiteTables() {
    const db = this.sqliteDb;
    
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Crear tabla ciudades
        db.run(`CREATE TABLE IF NOT EXISTS ciudades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL UNIQUE
        )`, (err) => {
          if (err) {
            console.error('❌ Error creando tabla ciudades:', err.message);
            reject(err);
            return;
          }
        });

        // Crear tabla complejos
        db.run(`CREATE TABLE IF NOT EXISTS complejos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          ciudad_id INTEGER,
          direccion TEXT,
          telefono TEXT,
          email TEXT,
          FOREIGN KEY (ciudad_id) REFERENCES ciudades (id)
        )`, (err) => {
          if (err) {
            console.error('❌ Error creando tabla complejos:', err.message);
            reject(err);
            return;
          }
        });

        // Crear tabla canchas
        db.run(`CREATE TABLE IF NOT EXISTS canchas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          complejo_id INTEGER,
          nombre TEXT NOT NULL,
          tipo TEXT,
          precio_hora INTEGER,
          FOREIGN KEY (complejo_id) REFERENCES complejos (id)
        )`, (err) => {
          if (err) {
            console.error('❌ Error creando tabla canchas:', err.message);
            reject(err);
            return;
          }
        });

        // Crear tabla usuarios
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          nombre TEXT,
          rol TEXT DEFAULT 'usuario',
          activo INTEGER DEFAULT 1,
          complejo_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (complejo_id) REFERENCES complejos(id)
        )`, (err) => {
          if (err) {
            console.error('❌ Error creando tabla usuarios:', err.message);
            reject(err);
            return;
          }
        });

        // Crear tabla reservas
        db.run(`CREATE TABLE IF NOT EXISTS reservas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo_reserva TEXT UNIQUE NOT NULL,
          cancha_id INTEGER,
          usuario_id INTEGER,
          nombre_cliente TEXT NOT NULL,
          email_cliente TEXT NOT NULL,
          telefono_cliente TEXT,
          rut_cliente TEXT,
          fecha DATE NOT NULL,
          hora_inicio TIME NOT NULL,
          hora_fin TIME NOT NULL,
          estado TEXT DEFAULT 'pendiente',
          estado_pago TEXT DEFAULT 'pendiente',
          precio_total INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cancha_id) REFERENCES canchas (id),
          FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        )`, (err) => {
          if (err) {
            console.error('❌ Error creando tabla reservas:', err.message);
            reject(err);
            return;
          }
          
            // Crear tabla pagos
            db.run(`CREATE TABLE IF NOT EXISTS pagos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              reserva_id INTEGER,
              transbank_token TEXT UNIQUE NOT NULL,
              order_id TEXT NOT NULL,
              amount INTEGER NOT NULL,
              status TEXT DEFAULT 'pending',
              authorization_code TEXT,
              payment_type_code TEXT,
              response_code INTEGER,
              installments_number INTEGER,
              transaction_date DATETIME,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              bloqueo_id TEXT,
              reservation_code TEXT,
              FOREIGN KEY (reserva_id) REFERENCES reservas (id)
            )`, (err) => {
            if (err) {
              console.error('❌ Error creando tabla pagos:', err.message);
              reject(err);
              return;
            }
            
            // Crear tabla bloqueos temporales
            db.run(`CREATE TABLE IF NOT EXISTS bloqueos_temporales (
              id TEXT PRIMARY KEY,
              cancha_id INTEGER,
              fecha DATE NOT NULL,
              hora_inicio TIME NOT NULL,
              hora_fin TIME NOT NULL,
              session_id TEXT NOT NULL,
              expira_en DATETIME NOT NULL,
              creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
              datos_cliente TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (cancha_id) REFERENCES canchas (id)
            )`, (err) => {
              if (err) {
                console.error('❌ Error creando tabla bloqueos_temporales:', err.message);
                reject(err);
                return;
              }
              
              // Migración: Agregar columna complejo_id si no existe
              db.run(`ALTER TABLE usuarios ADD COLUMN complejo_id INTEGER`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna complejo_id:', err.message);
                } else if (!err) {
                  console.log('✅ Columna complejo_id agregada a usuarios');
                }
              });

              // Migración: Agregar columna rut_cliente si no existe
              db.run(`ALTER TABLE reservas ADD COLUMN rut_cliente TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna rut_cliente:', err.message);
                } else if (!err) {
                  console.log('✅ Columna rut_cliente agregada a reservas');
                }
              });

              // Migración: Agregar columna estado_pago si no existe
              db.run(`ALTER TABLE reservas ADD COLUMN estado_pago TEXT DEFAULT 'pendiente'`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna estado_pago:', err.message);
                } else if (!err) {
                  console.log('✅ Columna estado_pago agregada a reservas');
                }
              });

              // Migración: Agregar columna fecha_creacion si no existe
              db.run(`ALTER TABLE reservas ADD COLUMN fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna fecha_creacion:', err.message);
                } else if (!err) {
                  console.log('✅ Columna fecha_creacion agregada a reservas');
                }
              });

              // Migración: Agregar columnas faltantes para el calendario
              db.run(`ALTER TABLE reservas ADD COLUMN tipo_reserva TEXT DEFAULT 'directa'`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna tipo_reserva:', err.message);
                } else if (!err) {
                  console.log('✅ Columna tipo_reserva agregada a reservas');
                }
              });

              db.run(`ALTER TABLE reservas ADD COLUMN creada_por_admin INTEGER DEFAULT 0`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna creada_por_admin:', err.message);
                } else if (!err) {
                  console.log('✅ Columna creada_por_admin agregada a reservas');
                }
              });

              db.run(`ALTER TABLE reservas ADD COLUMN metodo_contacto TEXT DEFAULT 'web'`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna metodo_contacto:', err.message);
                } else if (!err) {
                  console.log('✅ Columna metodo_contacto agregada a reservas');
                }
              });

              db.run(`ALTER TABLE reservas ADD COLUMN comision_aplicada INTEGER DEFAULT 0`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna comision_aplicada:', err.message);
                } else if (!err) {
                  console.log('✅ Columna comision_aplicada agregada a reservas');
                }
              });

              // Migración: Agregar columnas a tabla pagos si no existen
              db.run(`ALTER TABLE pagos ADD COLUMN bloqueo_id TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna bloqueo_id:', err.message);
                } else if (!err) {
                  console.log('✅ Columna bloqueo_id agregada a pagos');
                }
              });

              db.run(`ALTER TABLE pagos ADD COLUMN reservation_code TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna reservation_code:', err.message);
                } else if (!err) {
                  console.log('✅ Columna reservation_code agregada a pagos');
                }
              });

              // Migración: Agregar columnas a tabla bloqueos_temporales si no existen
              db.run(`ALTER TABLE bloqueos_temporales ADD COLUMN datos_cliente TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna datos_cliente:', err.message);
                } else if (!err) {
                  console.log('✅ Columna datos_cliente agregada a bloqueos_temporales');
                }
              });

              db.run(`ALTER TABLE bloqueos_temporales ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('❌ Error agregando columna created_at:', err.message);
                } else if (!err) {
                  console.log('✅ Columna created_at agregada a bloqueos_temporales');
                }
              });
              
              console.log('✅ Tablas SQLite creadas exitosamente');
              resolve();
            });
          });
        });
      });
    });
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
