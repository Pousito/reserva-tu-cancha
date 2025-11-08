const { Pool } = require('pg');

/**
 * DatabaseManager unificado - Solo PostgreSQL
 * Elimina dependencias de SQLite para evitar problemas de sincronización
 */
class DatabaseManager {
  constructor() {
    this.pgPool = null;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.databaseUrl = process.env.DATABASE_URL;
    
    // Validar que DATABASE_URL esté configurado
    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL no está configurado. PostgreSQL es requerido para ambos ambientes.');
    }
  }

  async connect() {
    console.log('🔌 CONECTANDO A BASE DE DATOS');
    console.log('==============================');
    console.log('🌍 Entorno:', process.env.NODE_ENV);
    console.log('📊 Base de datos: PostgreSQL (unificado)');
    console.log('🔗 DATABASE_URL:', this.databaseUrl ? 'Configurado' : 'No configurado');
    
    await this.connectPostgreSQL();
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

      // Probar conexión y configurar zona horaria
      const client = await this.pgPool.connect();
      console.log('✅ PostgreSQL conectado exitosamente');
      
      // CORRECCIÓN CRÍTICA: Configurar zona horaria de Chile para todas las conexiones
      // Esto es esencial para que las fechas se manejen correctamente en producción
      await client.query("SET timezone = 'America/Santiago'");
      console.log('🕐 Zona horaria configurada a America/Santiago');
      
      // Verificar que la configuración se aplicó correctamente
      const timezoneCheck = await client.query("SHOW timezone");
      console.log('🔍 Zona horaria verificada:', timezoneCheck.rows[0]?.timezone);
      
      client.release();

      // Crear tablas si no existen
      await this.createPostgreSQLTables();
      
    } catch (error) {
      console.error('❌ Error conectando a PostgreSQL:', error.message);
      console.log('💡 Verifica que PostgreSQL esté ejecutándose y DATABASE_URL sea correcto');
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
          complejo_id INTEGER REFERENCES complejos(id),
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
          codigo_reserva VARCHAR(50),
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

      // Crear tabla de códigos de un solo uso
      await client.query(`
        CREATE TABLE IF NOT EXISTS codigos_unico_uso (
          id SERIAL PRIMARY KEY,
          codigo VARCHAR(50) UNIQUE NOT NULL,
          email_cliente VARCHAR(255) NOT NULL,
          monto_descuento INTEGER NOT NULL DEFAULT 0,
          usado BOOLEAN DEFAULT FALSE,
          usado_en TIMESTAMP,
          bloqueo_id VARCHAR(50),
          reserva_id INTEGER REFERENCES reservas(id),
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expira_en TIMESTAMP,
          descripcion TEXT
        )
      `);

      // Crear índices para búsquedas rápidas
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_codigos_unico_uso_codigo ON codigos_unico_uso(codigo)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_codigos_unico_uso_email ON codigos_unico_uso(email_cliente)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_codigos_unico_uso_usado ON codigos_unico_uso(usado)
      `);

      console.log('✅ Tabla codigos_unico_uso creada/verificada');

      // Crear tabla de respaldo para intentos de pago fallidos
      // Esta tabla guarda los datos del cliente incluso si el bloqueo temporal se elimina
      await client.query(`
        CREATE TABLE IF NOT EXISTS pagos_fallidos_backup (
          id SERIAL PRIMARY KEY,
          transbank_token VARCHAR(255) NOT NULL,
          reservation_code VARCHAR(50),
          bloqueo_id VARCHAR(50),
          amount INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'failed',
          error_message TEXT,
          datos_cliente TEXT NOT NULL,
          cancha_id INTEGER REFERENCES canchas(id),
          fecha DATE,
          hora_inicio TIME,
          hora_fin TIME,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          procesado BOOLEAN DEFAULT FALSE,
          reserva_creada_id INTEGER REFERENCES reservas(id)
        )
      `);

      // Crear índice para búsquedas rápidas
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pagos_fallidos_token ON pagos_fallidos_backup(transbank_token)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pagos_fallidos_reservation_code ON pagos_fallidos_backup(reservation_code)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_pagos_fallidos_procesado ON pagos_fallidos_backup(procesado)
      `);

      // Verificar y agregar columna codigo_reserva si no existe
      console.log('🔧 Verificando columna codigo_reserva en bloqueos_temporales...');
      const checkColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'bloqueos_temporales' 
        AND column_name = 'codigo_reserva'
      `);
      
      if (checkColumn.rows.length === 0) {
        console.log('🔧 Agregando columna codigo_reserva a bloqueos_temporales...');
        await client.query(`
          ALTER TABLE bloqueos_temporales 
          ADD COLUMN codigo_reserva VARCHAR(50)
        `);
        console.log('✅ Columna codigo_reserva agregada exitosamente');
      } else {
        console.log('✅ Columna codigo_reserva ya existe');
      }

      console.log('✅ Tablas PostgreSQL creadas/verificadas exitosamente');
      
    } catch (error) {
      console.error('❌ Error creando tablas PostgreSQL:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  // Métodos de consulta unificados - Solo PostgreSQL
  async query(sql, params = []) {
    const client = await this.pgPool.connect();
    try {
      // Asegurar zona horaria en cada consulta para producción
      await client.query("SET timezone = 'America/Santiago'");
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async run(sql, params = []) {
    const client = await this.pgPool.connect();
    try {
      // Asegurar zona horaria en cada consulta para producción
      await client.query("SET timezone = 'America/Santiago'");
      const result = await client.query(sql, params);
      
      // Si la consulta tiene RETURNING, devolver el ID del primer registro
      let lastID = 0;
      if (result.rows && result.rows.length > 0 && result.rows[0].id) {
        lastID = result.rows[0].id;
      }
      
      return { lastID: lastID, changes: result.rowCount };
    } finally {
      client.release();
    }
  }

  async get(sql, params = []) {
    const client = await this.pgPool.connect();
    try {
      // Asegurar zona horaria en cada consulta para producción
      await client.query("SET timezone = 'America/Santiago'");
      const result = await client.query(sql, params);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
      console.log('✅ Conexión PostgreSQL cerrada');
    }
  }

  // Método para obtener información de la base de datos
  getDatabaseInfo() {
    if (this.pgPool) {
      return {
        type: 'PostgreSQL',
        connected: true,
        url: this.databaseUrl ? 'Configurado' : 'No configurado',
        unified: true
      };
    } else {
      return {
        type: 'No conectado',
        connected: false,
        unified: false
      };
    }
  }
}

module.exports = DatabaseManager;
