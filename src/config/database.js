const { Pool } = require('pg');

/**
 * DatabaseManager unificado - Solo PostgreSQL
 * Configuración unificada para PostgreSQL en desarrollo y producción
 */
class DatabaseManager {
  constructor() {
    this.pgPool = null;
    this.isProduction = process.env.NODE_ENV === 'production';
    this.databaseUrl = process.env.DATABASE_URL;
    
    // Validar configuración: DATABASE_URL o variables separadas
    if (!this.databaseUrl && !process.env.DB_HOST) {
      throw new Error('DATABASE_URL o DB_HOST deben estar configurados. PostgreSQL es requerido para ambos ambientes.');
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
      const poolConfig = {};
      
      // Opción 1: Variables separadas (recomendado para desarrollo)
      if (process.env.DB_HOST) {
        poolConfig.host = process.env.DB_HOST;
        poolConfig.port = process.env.DB_PORT || 5432;
        poolConfig.database = process.env.DB_NAME;
        poolConfig.user = process.env.DB_USER;
        // Solo agregar password si está definida
        if (process.env.DB_PASSWORD) {
          poolConfig.password = process.env.DB_PASSWORD;
        }
        console.log('🔧 Usando configuración con variables separadas');
        console.log('👤 Usuario:', poolConfig.user, '| Host:', poolConfig.host);
      }
      // Opción 2: DATABASE_URL (para producción)
      else if (this.databaseUrl) {
        poolConfig.connectionString = this.databaseUrl;
        // Solo usar SSL en producción
        if (this.isProduction) {
          poolConfig.ssl = {
            rejectUnauthorized: false
          };
        }
        console.log('🔧 Usando DATABASE_URL');
      }
      
      // Configuración optimizada del pool de conexiones
      const optimizedPoolConfig = {
        ...poolConfig,
        // Configuración del pool para mejor rendimiento
        max: 20,                    // Máximo de conexiones en el pool
        min: 2,                     // Mínimo de conexiones en el pool
        idleTimeoutMillis: 30000,   // 30 segundos antes de cerrar conexiones inactivas
        connectionTimeoutMillis: 2000, // 2 segundos timeout para nuevas conexiones
        acquireTimeoutMillis: 60000,   // 60 segundos timeout para adquirir conexión
        // Configuración específica para desarrollo
        ...(process.env.NODE_ENV === 'development' && {
          max: 10,                  // Menos conexiones en desarrollo
          min: 1,
          idleTimeoutMillis: 10000, // Menos tiempo en desarrollo
        })
      };
      
      this.pgPool = new Pool(optimizedPoolConfig);
      
      // Configurar eventos del pool para monitoreo
      this.pgPool.on('connect', () => {
        console.log('🔗 Nueva conexión establecida al pool');
      });
      
      this.pgPool.on('error', (err) => {
        console.error('❌ Error en el pool de conexiones:', err);
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
      
      // Verificar y agregar columna comision_inicio_fecha si no existe
      console.log('🔧 Verificando columna comision_inicio_fecha en complejos...');
      const checkComisionCol = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'complejos' 
        AND column_name = 'comision_inicio_fecha'
      `);
      
      if (checkComisionCol.rows.length === 0) {
        console.log('🔧 Agregando columna comision_inicio_fecha a complejos...');
        await client.query(`
          ALTER TABLE complejos 
          ADD COLUMN comision_inicio_fecha DATE
        `);
        console.log('✅ Columna comision_inicio_fecha agregada exitosamente');
        
        // Configurar fecha de inicio de comisiones para Espacio Deportivo Borde Río (ID: 7)
        // Exento hasta 2026-01-01, comisiones a partir de esa fecha
        try {
          await client.query(`
            UPDATE complejos 
            SET comision_inicio_fecha = '2026-01-01' 
            WHERE id = 7 AND nombre = 'Espacio Deportivo Borde Río'
          `);
          console.log('✅ Fecha de inicio de comisiones configurada para Espacio Deportivo Borde Río (2026-01-01)');
        } catch (error) {
          console.log('⚠️ No se pudo configurar fecha para Borde Río:', error.message);
        }
      } else {
        console.log('✅ Columna comision_inicio_fecha ya existe');
      }

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
      
      // Verificar y agregar PRIMARY KEY si no existe (para tablas existentes)
      console.log('🔧 Verificando PRIMARY KEY en tabla canchas...');
      const checkPK = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'canchas' 
        AND constraint_type = 'PRIMARY KEY'
      `);
      
      if (checkPK.rows.length === 0) {
        console.log('🔧 Agregando PRIMARY KEY a tabla canchas...');
        // Verificar que la columna id existe
        const checkIdColumn = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'canchas' AND column_name = 'id'
        `);
        
        if (checkIdColumn.rows.length > 0) {
          await client.query(`
            ALTER TABLE canchas 
            ADD PRIMARY KEY (id)
          `);
          console.log('✅ PRIMARY KEY agregada a tabla canchas');
        } else {
          console.log('⚠️ Columna id no existe en canchas, creando tabla completa...');
          // Si no existe la columna id, recrear la tabla (caso extremo)
          await client.query(`DROP TABLE IF EXISTS canchas CASCADE`);
          await client.query(`
            CREATE TABLE canchas (
              id SERIAL PRIMARY KEY,
              complejo_id INTEGER REFERENCES complejos(id),
              nombre VARCHAR(255) NOT NULL,
              tipo VARCHAR(50),
              precio_hora INTEGER
            )
          `);
          console.log('✅ Tabla canchas recreada con PRIMARY KEY');
        }
      } else {
        console.log('✅ PRIMARY KEY ya existe en tabla canchas');
      }

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
      
      // Verificar y agregar PRIMARY KEY si no existe (para tablas existentes)
      console.log('🔧 Verificando PRIMARY KEY en tabla usuarios...');
      const checkPKUsuarios = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'usuarios' 
        AND constraint_type = 'PRIMARY KEY'
      `);
      
      if (checkPKUsuarios.rows.length === 0) {
        console.log('🔧 Agregando PRIMARY KEY a tabla usuarios...');
        // Verificar que la columna id existe
        const checkIdColumnUsuarios = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'usuarios' AND column_name = 'id'
        `);
        
        if (checkIdColumnUsuarios.rows.length > 0) {
          await client.query(`
            ALTER TABLE usuarios 
            ADD PRIMARY KEY (id)
          `);
          console.log('✅ PRIMARY KEY agregada a tabla usuarios');
        } else {
          console.log('⚠️ Columna id no existe en usuarios, se requiere intervención manual');
        }
      } else {
        console.log('✅ PRIMARY KEY ya existe en tabla usuarios');
      }

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

      // Crear tabla historial de abonos
      await client.query(`
        CREATE TABLE IF NOT EXISTS historial_abonos_reservas (
          id SERIAL PRIMARY KEY,
          reserva_id INTEGER REFERENCES reservas(id) ON DELETE CASCADE,
          codigo_reserva VARCHAR(50) NOT NULL,
          monto_abonado INTEGER NOT NULL,
          metodo_pago VARCHAR(50) NOT NULL,
          fecha_abono TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          notas TEXT,
          usuario_id INTEGER REFERENCES usuarios(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_historial_abonos_reserva_id
        ON historial_abonos_reservas(reserva_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_historial_abonos_codigo_reserva
        ON historial_abonos_reservas(codigo_reserva)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_historial_abonos_fecha
        ON historial_abonos_reservas(fecha_abono)
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

      // Crear tabla de códigos de descuento
      await client.query(`
        CREATE TABLE IF NOT EXISTS codigos_descuento (
          id SERIAL PRIMARY KEY,
          codigo VARCHAR(50) UNIQUE NOT NULL,
          descripcion TEXT,
          porcentaje_descuento DECIMAL(5,2) NOT NULL,
          monto_maximo_descuento INTEGER,
          fecha_inicio DATE NOT NULL,
          fecha_fin DATE NOT NULL,
          usos_maximos INTEGER,
          usos_actuales INTEGER DEFAULT 0,
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Crear tabla de uso de códigos de descuento
      await client.query(`
        CREATE TABLE IF NOT EXISTS uso_codigos_descuento (
          id SERIAL PRIMARY KEY,
          codigo_id INTEGER REFERENCES codigos_descuento(id),
          reserva_id INTEGER REFERENCES reservas(id),
          email_cliente VARCHAR(255) NOT NULL,
          monto_descuento INTEGER NOT NULL,
          monto_original INTEGER NOT NULL,
          monto_final INTEGER NOT NULL,
          usado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de promociones para canchas
      await client.query(`
        CREATE TABLE IF NOT EXISTS promociones_canchas (
          id SERIAL PRIMARY KEY,
          cancha_id INTEGER REFERENCES canchas(id) ON DELETE CASCADE,
          nombre VARCHAR(255) NOT NULL,
          precio_promocional INTEGER NOT NULL,
          tipo_fecha VARCHAR(50) NOT NULL CHECK (tipo_fecha IN ('especifico', 'rango', 'recurrente_semanal')),
          fecha_especifica DATE,
          fecha_inicio DATE,
          fecha_fin DATE,
          dias_semana TEXT,
          tipo_horario VARCHAR(50) NOT NULL CHECK (tipo_horario IN ('especifico', 'rango')),
          hora_especifica TIME,
          hora_inicio TIME,
          hora_fin TIME,
          descripcion TEXT,
          activo BOOLEAN DEFAULT TRUE,
          creado_por INTEGER REFERENCES usuarios(id),
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migración: Agregar columna creado_por si no existe
      try {
        await client.query(`
          ALTER TABLE promociones_canchas 
          ADD COLUMN IF NOT EXISTS creado_por INTEGER REFERENCES usuarios(id)
        `);
        console.log('✅ Migración: columna creado_por verificada/agregada');
      } catch (migrationError) {
        console.log('⚠️ Migración creado_por:', migrationError.message);
      }

      // Tabla de bloqueos permanentes para canchas
      await client.query(`
        CREATE TABLE IF NOT EXISTS bloqueos_canchas (
          id SERIAL PRIMARY KEY,
          cancha_id INTEGER NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
          motivo VARCHAR(255) NOT NULL,
          descripcion TEXT,
          tipo_fecha VARCHAR(30) NOT NULL CHECK (tipo_fecha IN ('especifico', 'rango', 'recurrente_semanal')),
          fecha_especifica DATE,
          fecha_inicio DATE,
          fecha_fin DATE,
          dias_semana TEXT[],
          tipo_horario VARCHAR(30) NOT NULL CHECK (tipo_horario IN ('especifico', 'rango', 'todo_el_dia')),
          hora_especifica TIME,
          hora_inicio TIME,
          hora_fin TIME,
          activo BOOLEAN DEFAULT true,
          creado_por INTEGER REFERENCES usuarios(id),
          creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT validar_fecha_especifica CHECK (
            (tipo_fecha = 'especifico' AND fecha_especifica IS NOT NULL) OR tipo_fecha != 'especifico'
          ),
          CONSTRAINT validar_rango_fechas CHECK (
            (tipo_fecha = 'rango' AND fecha_inicio IS NOT NULL AND fecha_fin IS NOT NULL AND fecha_inicio <= fecha_fin) 
            OR tipo_fecha != 'rango'
          ),
          CONSTRAINT validar_dias_semana CHECK (
            (tipo_fecha = 'recurrente_semanal' AND dias_semana IS NOT NULL AND array_length(dias_semana, 1) > 0) 
            OR tipo_fecha != 'recurrente_semanal'
          ),
          CONSTRAINT validar_hora_especifica CHECK (
            (tipo_horario = 'especifico' AND hora_especifica IS NOT NULL) OR tipo_horario != 'especifico'
          ),
          CONSTRAINT validar_rango_horarios CHECK (
            (tipo_horario = 'rango' AND hora_inicio IS NOT NULL AND hora_fin IS NOT NULL) 
            OR tipo_horario != 'rango'
          )
        )
      `);
      console.log('✅ Tabla bloqueos_canchas verificada/creada');

      // Índices para bloqueos_canchas
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_bloqueos_cancha_id ON bloqueos_canchas(cancha_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_bloqueos_activo ON bloqueos_canchas(activo)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_bloqueos_tipo_fecha ON bloqueos_canchas(tipo_fecha)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_bloqueos_fecha_especifica ON bloqueos_canchas(fecha_especifica) WHERE fecha_especifica IS NOT NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_bloqueos_rango_fechas ON bloqueos_canchas(fecha_inicio, fecha_fin) WHERE fecha_inicio IS NOT NULL
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

      // ============================================
      // Crear tabla depositos_complejos
      // ============================================
      console.log('🔧 Verificando tabla depositos_complejos...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS depositos_complejos (
          id SERIAL PRIMARY KEY,
          complejo_id INTEGER NOT NULL REFERENCES complejos(id) ON DELETE CASCADE,
          fecha_deposito DATE NOT NULL,

          -- Montos calculados
          monto_total_reservas INTEGER NOT NULL,
          comision_porcentaje DECIMAL(5,4) NOT NULL,
          comision_sin_iva INTEGER NOT NULL,
          iva_comision INTEGER NOT NULL,
          comision_total INTEGER NOT NULL,
          monto_a_depositar INTEGER NOT NULL,

          -- Control de estado
          estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'cancelado')),

          -- Detalles del pago
          metodo_pago VARCHAR(50),
          numero_transaccion VARCHAR(100),
          banco_destino VARCHAR(100),
          observaciones TEXT,

          -- Auditoría
          procesado_por INTEGER,
          fecha_procesado TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

          -- Índice único para evitar duplicados
          UNIQUE(complejo_id, fecha_deposito)
        )
      `);
      console.log('✅ Tabla depositos_complejos verificada/creada');

      // Crear índices para depositos_complejos
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_depositos_complejo ON depositos_complejos(complejo_id)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_depositos_fecha ON depositos_complejos(fecha_deposito)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_depositos_estado ON depositos_complejos(estado)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_depositos_fecha_estado ON depositos_complejos(fecha_deposito, estado)
      `);
      console.log('✅ Índices de depositos_complejos creados');

      // Crear trigger para actualizar updated_at
      await client.query(`
        CREATE OR REPLACE FUNCTION update_depositos_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS trigger_update_depositos_updated_at ON depositos_complejos
      `);

      await client.query(`
        CREATE TRIGGER trigger_update_depositos_updated_at
          BEFORE UPDATE ON depositos_complejos
          FOR EACH ROW
          EXECUTE FUNCTION update_depositos_updated_at()
      `);
      console.log('✅ Trigger de depositos_complejos creado');

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
      
      // Si la query tiene RETURNING, devolver el objeto completo
      if (sql.toUpperCase().includes('RETURNING')) {
        return result.rows[0] || null;
      }
      
      // De lo contrario, devolver formato legacy
      return { lastID: result.rows[0]?.id || 0, changes: result.rowCount };
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

  async all(sql, params = []) {
    const client = await this.pgPool.connect();
    try {
      // Asegurar zona horaria en cada consulta para producción
      await client.query("SET timezone = 'America/Santiago'");
      const result = await client.query(sql, params);
      return result.rows || [];
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
