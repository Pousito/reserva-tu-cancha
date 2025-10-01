#!/usr/bin/env node

/**
 * MCP Server para gestión de base de datos Neon
 * Proporciona herramientas para gestionar la BD de producción
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class NeonManager {
    constructor() {
        this.server = new Server(
            {
                name: 'neon-db-manager',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupHandlers();
    }

    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'check_neon_connection',
                        description: 'Verificar conexión a la base de datos Neon',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'get_neon_status',
                        description: 'Obtener estado y métricas de la BD Neon',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'backup_neon_db',
                        description: 'Crear backup de la base de datos Neon',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                backup_name: {
                                    type: 'string',
                                    description: 'Nombre del backup (opcional)'
                                }
                            }
                        }
                    },
                    {
                        name: 'check_table_sizes',
                        description: 'Verificar tamaños de las tablas en Neon',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'check_active_connections',
                        description: 'Verificar conexiones activas a Neon',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'run_neon_query',
                        description: 'Ejecutar consulta SQL en Neon (solo SELECT)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Consulta SQL a ejecutar (solo SELECT)'
                                }
                            },
                            required: ['query']
                        }
                    },
                    {
                        name: 'check_neon_performance',
                        description: 'Verificar performance y queries lentas',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'monitor_neon_resources',
                        description: 'Monitorear uso de recursos en Neon',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            switch (name) {
                case 'check_neon_connection':
                    return await this.checkNeonConnection();
                case 'get_neon_status':
                    return await this.getNeonStatus();
                case 'backup_neon_db':
                    return await this.backupNeonDb(args.backup_name);
                case 'check_table_sizes':
                    return await this.checkTableSizes();
                case 'check_active_connections':
                    return await this.checkActiveConnections();
                case 'run_neon_query':
                    return await this.runNeonQuery(args.query);
                case 'check_neon_performance':
                    return await this.checkNeonPerformance();
                case 'monitor_neon_resources':
                    return await this.monitorNeonResources();
                default:
                    throw new Error(`Herramienta desconocida: ${name}`);
            }
        });
    }

    async getNeonConnection() {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL no está configurado');
        }

        return new Pool({
            connectionString: databaseUrl,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    async checkNeonConnection() {
        try {
            const pool = await this.getNeonConnection();
            const client = await pool.connect();
            
            const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
            client.release();
            await pool.end();

            return {
                content: [
                    {
                        type: 'text',
                        text: `# ✅ Conexión a Neon Exitosa

**Estado**: Conectado
**Tiempo actual**: ${result.rows[0].current_time}
**Versión PostgreSQL**: ${result.rows[0].pg_version}
**URL**: ${process.env.DATABASE_URL ? 'Configurado' : 'No configurado'}

La base de datos Neon está funcionando correctamente.`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `# ❌ Error de Conexión a Neon

**Error**: ${error.message}
**URL**: ${process.env.DATABASE_URL ? 'Configurado' : 'No configurado'}

**Posibles causas**:
- DATABASE_URL incorrecto
- Servidor Neon no disponible
- Problemas de red
- Credenciales incorrectas

**Solución**: Verificar configuración en Render Dashboard`
                    }
                ]
            };
        }
    }

    async getNeonStatus() {
        try {
            const pool = await this.getNeonConnection();
            const client = await pool.connect();

            // Obtener información básica
            const [dbInfo, tableCount, userCount, reservaCount] = await Promise.all([
                client.query('SELECT current_database(), current_user, inet_server_addr(), inet_server_port()'),
                client.query('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = \'public\''),
                client.query('SELECT COUNT(*) as count FROM usuarios WHERE activo = true'),
                client.query('SELECT COUNT(*) as count FROM reservas WHERE fecha >= CURRENT_DATE')
            ]);

            client.release();
            await pool.end();

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 📊 Estado de Base de Datos Neon

## Información General
- **Base de datos**: ${dbInfo.rows[0].current_database}
- **Usuario**: ${dbInfo.rows[0].current_user}
- **Servidor**: ${dbInfo.rows[0].inet_server_addr}:${dbInfo.rows[0].inet_server_port}
- **Tablas**: ${tableCount.rows[0].count}

## Estadísticas de Uso
- **Usuarios activos**: ${userCount.rows[0].count}
- **Reservas hoy**: ${reservaCount.rows[0].count}

## Estado: ✅ Funcionando correctamente

**Última verificación**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error obteniendo estado de Neon: ${error.message}`
                    }
                ]
            };
        }
    }

    async backupNeonDb(backupName) {
        try {
            const pool = await this.getNeonConnection();
            const client = await pool.connect();

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = backupName || `neon_backup_${timestamp}.json`;
            
            // Exportar datos principales
            const tables = ['ciudades', 'complejos', 'canchas', 'usuarios', 'reservas', 'pagos'];
            const backup = {
                timestamp: new Date().toISOString(),
                tables: {}
            };

            for (const table of tables) {
                try {
                    const result = await client.query(`SELECT * FROM ${table} ORDER BY id`);
                    backup.tables[table] = result.rows;
                } catch (error) {
                    backup.tables[table] = { error: `Tabla ${table} no existe o no accesible` };
                }
            }

            client.release();
            await pool.end();

            // Guardar backup localmente
            const backupDir = path.join(process.env.PROJECT_ROOT || process.cwd(), 'backups');
            await fs.mkdir(backupDir, { recursive: true });
            const backupPath = path.join(backupDir, fileName);
            await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 💾 Backup de Neon Creado

**Archivo**: ${fileName}
**Ubicación**: ${backupPath}
**Timestamp**: ${backup.timestamp}

## Tablas incluidas:
${Object.keys(backup.tables).map(table => `- ${table}: ${Array.isArray(backup.tables[table]) ? backup.tables[table].length + ' registros' : 'Error'}`).join('\n')}

**Estado**: ✅ Backup completado exitosamente`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error creando backup de Neon: ${error.message}`
                    }
                ]
            };
        }
    }

    async checkTableSizes() {
        try {
            const pool = await this.getNeonConnection();
            const client = await pool.connect();

            const result = await client.query(`
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
                FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            `);

            client.release();
            await pool.end();

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 📏 Tamaños de Tablas en Neon

${result.rows.map(row => `**${row.tablename}**: ${row.size}`).join('\n')}

**Total de tablas**: ${result.rows.length}
**Última verificación**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error verificando tamaños de tablas: ${error.message}`
                    }
                ]
            };
        }
    }

    async checkActiveConnections() {
        try {
            const pool = await this.getNeonConnection();
            const client = await pool.connect();

            const result = await client.query(`
                SELECT 
                    count(*) as total_connections,
                    count(*) FILTER (WHERE state = 'active') as active_connections,
                    count(*) FILTER (WHERE state = 'idle') as idle_connections,
                    max_conn as max_connections
                FROM pg_stat_activity, 
                     (SELECT setting::int as max_conn FROM pg_settings WHERE name = 'max_connections') mc
                WHERE datname = current_database()
            `);

            client.release();
            await pool.end();

            const stats = result.rows[0];

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 🔗 Conexiones Activas en Neon

**Conexiones totales**: ${stats.total_connections}
**Conexiones activas**: ${stats.active_connections}
**Conexiones idle**: ${stats.idle_connections}
**Máximo permitido**: ${stats.max_connections}

**Estado**: ${stats.total_connections < stats.max_connections * 0.8 ? '✅ Normal' : '⚠️ Cerca del límite'}

**Última verificación**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error verificando conexiones: ${error.message}`
                    }
                ]
            };
        }
    }

    async runNeonQuery(query) {
        try {
            // Validar que sea solo SELECT
            const trimmedQuery = query.trim().toLowerCase();
            if (!trimmedQuery.startsWith('select')) {
                throw new Error('Solo se permiten consultas SELECT por seguridad');
            }

            const pool = await this.getNeonConnection();
            const client = await pool.connect();

            const result = await client.query(query);
            client.release();
            await pool.end();

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 🔍 Resultado de Consulta Neon

**Query**: \`${query}\`

**Filas devueltas**: ${result.rows.length}

**Resultado**:
\`\`\`json
${JSON.stringify(result.rows, null, 2)}
\`\`\`

**Ejecutado**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error ejecutando consulta: ${error.message}`
                    }
                ]
            };
        }
    }

    async checkNeonPerformance() {
        try {
            const pool = await this.getNeonConnection();
            const client = await pool.connect();

            // Consultas lentas
            const slowQueries = await client.query(`
                SELECT 
                    query,
                    calls,
                    total_time,
                    mean_time,
                    rows
                FROM pg_stat_statements 
                WHERE mean_time > 100
                ORDER BY mean_time DESC
                LIMIT 5
            `);

            client.release();
            await pool.end();

            return {
                content: [
                    {
                        type: 'text',
                        text: `# ⚡ Performance de Neon

## Consultas Lentas (>100ms promedio):
${slowQueries.rows.length > 0 ? 
    slowQueries.rows.map(q => `**${q.calls} ejecuciones** - ${q.mean_time.toFixed(2)}ms promedio\n\`${q.query.substring(0, 100)}...\``).join('\n\n') :
    '✅ No se encontraron consultas lentas'
}

**Estado**: ${slowQueries.rows.length === 0 ? '✅ Performance óptima' : '⚠️ Revisar consultas lentas'}

**Última verificación**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error verificando performance: ${error.message}`
                    }
                ]
            };
        }
    }

    async monitorNeonResources() {
        try {
            const pool = await this.getNeonConnection();
            const client = await pool.connect();

            // Información de recursos
            const [dbSize, cacheHit] = await Promise.all([
                client.query('SELECT pg_size_pretty(pg_database_size(current_database())) as db_size'),
                client.query(`
                    SELECT 
                        round(100.0 * sum(blks_hit) / (sum(blks_hit) + sum(blks_read)), 2) as cache_hit_ratio
                    FROM pg_stat_database 
                    WHERE datname = current_database()
                `)
            ]);

            client.release();
            await pool.end();

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 📊 Recursos de Neon

**Tamaño de BD**: ${dbSize.rows[0].db_size}
**Cache hit ratio**: ${cacheHit.rows[0].cache_hit_ratio}%

**Estado de recursos**:
- ${parseFloat(cacheHit.rows[0].cache_hit_ratio) > 90 ? '✅ Cache eficiente' : '⚠️ Cache podría mejorar'}
- ${dbSize.rows[0].db_size.includes('MB') ? '✅ Tamaño normal' : '⚠️ BD grande'}

**Última verificación**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error monitoreando recursos: ${error.message}`
                    }
                ]
            };
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Servidor MCP de Neon iniciado');
    }
}

const server = new NeonManager();
server.run().catch(console.error);
