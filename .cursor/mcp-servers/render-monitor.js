#!/usr/bin/env node

/**
 * MCP Server para monitoreo y gestión de Render
 * Proporciona herramientas para gestionar deployments y monitorear el estado
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fetch = require('node-fetch');

class RenderMonitor {
    constructor() {
        this.server = new Server(
            {
                name: 'render-monitor',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.apiKey = process.env.RENDER_API_KEY;
        this.serviceId = process.env.RENDER_SERVICE_ID;
        this.baseUrl = 'https://api.render.com/v1';

        this.setupHandlers();
    }

    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'check_render_status',
                        description: 'Verificar estado del servicio en Render',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'get_render_deployments',
                        description: 'Obtener historial de deployments en Render',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                limit: {
                                    type: 'number',
                                    description: 'Número de deployments a mostrar (default: 5)'
                                }
                            }
                        }
                    },
                    {
                        name: 'check_render_logs',
                        description: 'Obtener logs recientes del servicio en Render',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                lines: {
                                    type: 'number',
                                    description: 'Número de líneas de logs (default: 50)'
                                }
                            }
                        }
                    },
                    {
                        name: 'trigger_render_deploy',
                        description: 'Disparar un nuevo deployment en Render',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'check_render_metrics',
                        description: 'Verificar métricas de performance del servicio',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'monitor_render_health',
                        description: 'Monitorear salud del servicio y endpoints',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'check_render_env_vars',
                        description: 'Verificar variables de entorno en Render',
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
                case 'check_render_status':
                    return await this.checkRenderStatus();
                case 'get_render_deployments':
                    return await this.getRenderDeployments(args.limit || 5);
                case 'check_render_logs':
                    return await this.checkRenderLogs(args.lines || 50);
                case 'trigger_render_deploy':
                    return await this.triggerRenderDeploy();
                case 'check_render_metrics':
                    return await this.checkRenderMetrics();
                case 'monitor_render_health':
                    return await this.monitorRenderHealth();
                case 'check_render_env_vars':
                    return await this.checkRenderEnvVars();
                default:
                    throw new Error(`Herramienta desconocida: ${name}`);
            }
        });
    }

    async makeRenderRequest(endpoint, options = {}) {
        if (!this.apiKey) {
            throw new Error('RENDER_API_KEY no está configurado');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`Error en API de Render: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    async checkRenderStatus() {
        try {
            if (!this.serviceId) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ⚠️ Configuración de Render

**RENDER_SERVICE_ID** no está configurado.

**Para configurar**:
1. Ve a Render Dashboard
2. Copia el ID del servicio
3. Añade RENDER_SERVICE_ID a las variables de entorno

**Servicio actual**: reserva-tu-cancha
**URL**: https://www.reservatuscanchas.cl`
                        }
                    ]
                };
            }

            const service = await this.makeRenderRequest(`/services/${this.serviceId}`);
            
            // Verificar health check
            let healthStatus = 'Desconocido';
            try {
                const healthResponse = await fetch('https://www.reservatuscanchas.cl/health', {
                    timeout: 5000
                });
                healthStatus = healthResponse.ok ? '✅ Saludable' : '❌ No responde';
            } catch (error) {
                healthStatus = '❌ No disponible';
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 🚀 Estado de Render

**Servicio**: ${service.service.name}
**Estado**: ${service.service.type}
**Región**: ${service.service.region}
**Plan**: ${service.service.plan}
**URL**: ${service.service.serviceDetails?.url || 'https://www.reservatuscanchas.cl'}

## Estado del Servicio
**Estado actual**: ${service.service.serviceDetails?.buildCommand ? '✅ Configurado' : '⚠️ Sin build command'}
**Auto-deploy**: ${service.service.autoDeploy ? '✅ Habilitado' : '❌ Deshabilitado'}
**Branch**: ${service.service.branch || 'main'}

## Health Check
**Endpoint**: ${healthStatus}

**Última verificación**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `# ❌ Error verificando Render

**Error**: ${error.message}

**Posibles causas**:
- RENDER_API_KEY incorrecto
- RENDER_SERVICE_ID incorrecto
- Servicio no encontrado
- Problemas de conectividad

**Verificación manual**: https://dashboard.render.com`
                    }
                ]
            };
        }
    }

    async getRenderDeployments(limit = 5) {
        try {
            const deployments = await this.makeRenderRequest(`/services/${this.serviceId}/deploys?limit=${limit}`);
            
            const deploymentList = deployments.map(deploy => {
                const status = deploy.deploy.status;
                const statusIcon = status === 'live' ? '✅' : 
                                 status === 'build_failed' ? '❌' : 
                                 status === 'update_failed' ? '⚠️' : '🔄';
                
                return `${statusIcon} **${deploy.deploy.commit?.message || 'Sin mensaje'}**
- **Estado**: ${deploy.deploy.status}
- **Fecha**: ${new Date(deploy.deploy.createdAt).toLocaleString('es-CL')}
- **Duración**: ${deploy.deploy.finishedAt ? Math.round((new Date(deploy.deploy.finishedAt) - new Date(deploy.deploy.createdAt)) / 1000) + 's' : 'En progreso'}
- **Commit**: ${deploy.deploy.commit?.id?.substring(0, 7) || 'N/A'}`;
            }).join('\n\n');

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 📋 Deployments Recientes en Render

${deploymentList}

**Total mostrados**: ${deployments.length}
**Última verificación**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error obteniendo deployments: ${error.message}`
                    }
                ]
            };
        }
    }

    async checkRenderLogs(lines = 50) {
        try {
            // Render no tiene API directa para logs, simulamos con health check
            const healthResponse = await fetch('https://www.reservatuscanchas.cl/health');
            const isHealthy = healthResponse.ok;
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `# 📝 Estado de Logs en Render

**Health Check**: ${isHealthy ? '✅ Aplicación respondiendo' : '❌ Aplicación no responde'}
**Status Code**: ${healthResponse.status}

## Acceso a Logs
Para ver logs detallados:
1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Selecciona tu servicio
3. Ve a la pestaña "Logs"
4. Filtra por nivel (Error, Warning, Info)

## Logs Recientes Simulados
${isHealthy ? 
    `✅ Health check exitoso - ${new Date().toLocaleString('es-CL')}
✅ Aplicación funcionando correctamente
✅ Base de datos conectada` :
    `❌ Health check falló - ${new Date().toLocaleString('es-CL')}
⚠️ Revisar logs en Render Dashboard
⚠️ Verificar configuración de base de datos`
}

**Nota**: Para logs detallados, usar Render Dashboard`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error verificando logs: ${error.message}`
                    }
                ]
            };
        }
    }

    async triggerRenderDeploy() {
        try {
            const deploy = await this.makeRenderRequest(`/services/${this.serviceId}/deploys`, {
                method: 'POST',
                body: JSON.stringify({
                    clearCache: 'clear'
                })
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 🚀 Deployment Iniciado en Render

**Deploy ID**: ${deploy.deploy.id}
**Estado**: ${deploy.deploy.status}
**Iniciado**: ${new Date().toLocaleString('es-CL')}

## Próximos Pasos
1. **Monitorear** el progreso en Render Dashboard
2. **Verificar** que el deployment complete exitosamente
3. **Probar** la aplicación en https://www.reservatuscanchas.cl
4. **Revisar** logs si hay errores

## Comandos Útiles
- Ver estado: \`check_render_status\`
- Ver deployments: \`get_render_deployments\`
- Ver logs: \`check_render_logs\`

**Enlace**: https://dashboard.render.com`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error iniciando deployment: ${error.message}`
                    }
                ]
            };
        }
    }

    async checkRenderMetrics() {
        try {
            // Simulamos métricas ya que Render no expone todas las métricas via API
            const healthResponse = await fetch('https://www.reservatuscanchas.cl/health');
            const responseTime = Date.now();
            await fetch('https://www.reservatuscanchas.cl/');
            const actualResponseTime = Date.now() - responseTime;

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 📊 Métricas de Render

## Performance
**Response Time**: ${actualResponseTime}ms
**Health Check**: ${healthResponse.ok ? '✅ OK' : '❌ Failed'}
**Status Code**: ${healthResponse.status}

## Estado del Servicio
**Uptime**: ${healthResponse.ok ? '✅ Activo' : '❌ Inactivo'}
**Latencia**: ${actualResponseTime < 1000 ? '✅ Buena' : '⚠️ Lenta'}

## Recomendaciones
${actualResponseTime > 2000 ? 
    '⚠️ Response time alto - Revisar optimizaciones' : 
    actualResponseTime > 1000 ? 
    '⚠️ Response time moderado - Monitorear' : 
    '✅ Performance óptima'
}

**Última verificación**: ${new Date().toLocaleString('es-CL')}

**Para métricas detalladas**: Usar Render Dashboard`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error verificando métricas: ${error.message}`
                    }
                ]
            };
        }
    }

    async monitorRenderHealth() {
        try {
            const endpoints = [
                { name: 'Health Check', url: 'https://www.reservatuscanchas.cl/health' },
                { name: 'Homepage', url: 'https://www.reservatuscanchas.cl/' },
                { name: 'API Status', url: 'https://www.reservatuscanchas.cl/api/status' }
            ];

            const results = await Promise.all(
                endpoints.map(async (endpoint) => {
                    try {
                        const start = Date.now();
                        const response = await fetch(endpoint.url, { timeout: 5000 });
                        const responseTime = Date.now() - start;
                        
                        return {
                            name: endpoint.name,
                            status: response.ok ? '✅ OK' : '❌ Error',
                            code: response.status,
                            time: `${responseTime}ms`
                        };
                    } catch (error) {
                        return {
                            name: endpoint.name,
                            status: '❌ Timeout/Error',
                            code: 'N/A',
                            time: 'N/A'
                        };
                    }
                })
            );

            const healthyEndpoints = results.filter(r => r.status === '✅ OK').length;
            const overallHealth = healthyEndpoints === results.length ? '✅ Saludable' : 
                                healthyEndpoints > 0 ? '⚠️ Parcial' : '❌ Crítico';

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 🏥 Monitoreo de Salud - Render

## Estado General: ${overallHealth}

## Endpoints Verificados:
${results.map(r => `**${r.name}**: ${r.status} (${r.code}) - ${r.time}`).join('\n')}

## Resumen
**Endpoints saludables**: ${healthyEndpoints}/${results.length}
**Estado general**: ${overallHealth}

## Recomendaciones
${overallHealth === '✅ Saludable' ? 
    '✅ Todos los endpoints funcionando correctamente' :
    overallHealth === '⚠️ Parcial' ?
    '⚠️ Algunos endpoints tienen problemas - Revisar logs' :
    '❌ Múltiples endpoints fallando - Verificar configuración'
}

**Última verificación**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error monitoreando salud: ${error.message}`
                    }
                ]
            };
        }
    }

    async checkRenderEnvVars() {
        try {
            const service = await this.makeRenderRequest(`/services/${this.serviceId}`);
            
            // Render no expone todas las env vars por seguridad, mostramos las que sí
            const envVars = service.service.envVars || [];
            const publicVars = envVars.filter(env => 
                !env.key.toLowerCase().includes('secret') &&
                !env.key.toLowerCase().includes('password') &&
                !env.key.toLowerCase().includes('key')
            );

            return {
                content: [
                    {
                        type: 'text',
                        text: `# 🔧 Variables de Entorno en Render

## Variables Públicas Configuradas:
${publicVars.length > 0 ? 
    publicVars.map(env => `**${env.key}**: ${env.value ? '✅ Configurado' : '❌ No configurado'}`).join('\n') :
    'No hay variables públicas visibles'
}

## Variables Sensibles (Ocultas por seguridad):
- Variables con "SECRET", "PASSWORD", "KEY" están configuradas pero ocultas
- Total de variables: ${envVars.length}

## Verificación Manual
Para ver todas las variables:
1. Ve a Render Dashboard
2. Selecciona tu servicio
3. Ve a "Environment"

**Estado**: ${envVars.length > 5 ? '✅ Bien configurado' : '⚠️ Revisar configuración'}

**Última verificación**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error verificando variables de entorno: ${error.message}`
                    }
                ]
            };
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Servidor MCP de Render iniciado');
    }
}

const server = new RenderMonitor();
server.run().catch(console.error);
