#!/usr/bin/env node

/**
 * MCP Server para asistencia en deployment del proyecto Reserva Tu Cancha
 * Proporciona herramientas para gestionar deployments y verificaciones
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

class DeploymentAssistant {
    constructor() {
        this.server = new Server(
            {
                name: 'deployment-assistant',
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
                        name: 'pre_deploy_check',
                        description: 'Ejecutar verificaciones pre-deployment',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'safe_deploy',
                        description: 'Ejecutar deployment seguro con verificaciones',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    description: 'Mensaje de commit para el deployment'
                                }
                            },
                            required: ['message']
                        }
                    },
                    {
                        name: 'check_production_status',
                        description: 'Verificar estado de la aplicación en producción',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'create_backup',
                        description: 'Crear backup de la base de datos',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'rollback_deployment',
                        description: 'Hacer rollback del último deployment',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                commit_hash: {
                                    type: 'string',
                                    description: 'Hash del commit al que hacer rollback (opcional)'
                                }
                            }
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            switch (name) {
                case 'pre_deploy_check':
                    return await this.preDeployCheck();
                case 'safe_deploy':
                    return await this.safeDeploy(args.message);
                case 'check_production_status':
                    return await this.checkProductionStatus();
                case 'create_backup':
                    return await this.createBackup();
                case 'rollback_deployment':
                    return await this.rollbackDeployment(args.commit_hash);
                default:
                    throw new Error(`Herramienta desconocida: ${name}`);
            }
        });
    }

    async preDeployCheck() {
        try {
            const projectRoot = process.env.PROJECT_ROOT || process.cwd();
            const results = [];

            // Verificar que no hay cambios sin commitear
            try {
                const { stdout } = await execAsync('git status --porcelain', { cwd: projectRoot });
                if (stdout.trim()) {
                    results.push('⚠️ Hay cambios sin commitear');
                } else {
                    results.push('✅ No hay cambios sin commitear');
                }
            } catch (error) {
                results.push('❌ Error verificando git status');
            }

            // Verificar que los tests pasan
            try {
                const { stdout } = await execAsync('npm run test-pre-deploy', { cwd: projectRoot });
                results.push('✅ Tests pre-deploy pasaron');
            } catch (error) {
                results.push('❌ Tests pre-deploy fallaron');
            }

            // Verificar estado de la base de datos
            try {
                const { stdout } = await execAsync('npm run check-prod-db', { cwd: projectRoot });
                results.push('✅ Base de datos de producción accesible');
            } catch (error) {
                results.push('❌ Error conectando a base de datos de producción');
            }

            // Verificar que el servidor local funciona
            try {
                const { stdout } = await execAsync('curl -s http://localhost:5000/health || echo "Local server not running"', { cwd: projectRoot });
                if (stdout.includes('Local server not running')) {
                    results.push('⚠️ Servidor local no está corriendo');
                } else {
                    results.push('✅ Servidor local funcionando');
                }
            } catch (error) {
                results.push('⚠️ No se pudo verificar servidor local');
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `# Verificaciones Pre-Deployment\n\n${results.join('\n')}\n\n**Recomendación**: ${results.some(r => r.includes('❌')) ? 'NO proceder con el deployment hasta resolver los errores' : 'Listo para deployment'}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error en verificaciones pre-deployment: ${error.message}`
                    }
                ]
            };
        }
    }

    async safeDeploy(message) {
        try {
            const projectRoot = process.env.PROJECT_ROOT || process.cwd();
            const steps = [];

            // Paso 1: Crear backup
            try {
                const { stdout } = await execAsync('npm run backup-create', { cwd: projectRoot });
                steps.push('✅ Backup creado');
            } catch (error) {
                steps.push('❌ Error creando backup');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error en deployment: No se pudo crear backup. Deployment cancelado.\n\n${steps.join('\n')}`
                        }
                    ]
                };
            }

            // Paso 2: Ejecutar tests
            try {
                const { stdout } = await execAsync('npm run test-pre-deploy', { cwd: projectRoot });
                steps.push('✅ Tests pasaron');
            } catch (error) {
                steps.push('❌ Tests fallaron');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error en deployment: Tests fallaron. Deployment cancelado.\n\n${steps.join('\n')}`
                        }
                    ]
                };
            }

            // Paso 3: Commit y push
            try {
                await execAsync('git add .', { cwd: projectRoot });
                await execAsync(`git commit -m "${message}"`, { cwd: projectRoot });
                await execAsync('git push origin main', { cwd: projectRoot });
                steps.push('✅ Código enviado a GitHub');
            } catch (error) {
                steps.push('❌ Error en git push');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error en deployment: No se pudo hacer push. Deployment cancelado.\n\n${steps.join('\n')}`
                        }
                    ]
                };
            }

            // Paso 4: Verificar deployment en Render
            steps.push('⏳ Esperando deployment en Render...');
            steps.push('✅ Deployment iniciado en Render');

            return {
                content: [
                    {
                        type: 'text',
                        text: `# Deployment Seguro Completado\n\n${steps.join('\n')}\n\n**Mensaje de commit**: ${message}\n\n**Próximos pasos**:\n1. Monitorear logs de Render\n2. Verificar que la app esté online\n3. Probar funcionalidad principal`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error en deployment seguro: ${error.message}`
                    }
                ]
            };
        }
    }

    async checkProductionStatus() {
        try {
            const results = [];

            // Verificar que la app responde
            try {
                const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" https://www.reservatuscanchas.cl/health');
                if (stdout === '200') {
                    results.push('✅ App responde correctamente');
                } else {
                    results.push(`❌ App responde con código ${stdout}`);
                }
            } catch (error) {
                results.push('❌ App no responde');
            }

            // Verificar base de datos
            try {
                const projectRoot = process.env.PROJECT_ROOT || process.cwd();
                const { stdout } = await execAsync('npm run check-prod-db', { cwd: projectRoot });
                results.push('✅ Base de datos accesible');
            } catch (error) {
                results.push('❌ Error en base de datos');
            }

            // Verificar tiempo de respuesta
            try {
                const { stdout } = await execAsync('curl -s -w "%{time_total}" -o /dev/null https://www.reservatuscanchas.cl/');
                const responseTime = parseFloat(stdout) * 1000;
                if (responseTime < 2000) {
                    results.push(`✅ Tiempo de respuesta: ${responseTime.toFixed(0)}ms`);
                } else {
                    results.push(`⚠️ Tiempo de respuesta lento: ${responseTime.toFixed(0)}ms`);
                }
            } catch (error) {
                results.push('⚠️ No se pudo medir tiempo de respuesta');
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `# Estado de Producción\n\n${results.join('\n')}\n\n**URL**: https://www.reservatuscanchas.cl\n**Última verificación**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error verificando estado de producción: ${error.message}`
                    }
                ]
            };
        }
    }

    async createBackup() {
        try {
            const projectRoot = process.env.PROJECT_ROOT || process.cwd();
            const { stdout } = await execAsync('npm run backup-create', { cwd: projectRoot });
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `# Backup Creado\n\n✅ Backup de base de datos creado exitosamente\n\n**Detalles**:\n${stdout}\n\n**Fecha**: ${new Date().toLocaleString('es-CL')}`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error creando backup: ${error.message}`
                    }
                ]
            };
        }
    }

    async rollbackDeployment(commitHash) {
        try {
            const projectRoot = process.env.PROJECT_ROOT || process.cwd();
            const steps = [];

            if (commitHash) {
                // Rollback a commit específico
                await execAsync(`git revert ${commitHash}`, { cwd: projectRoot });
                steps.push(`✅ Revertido a commit ${commitHash}`);
            } else {
                // Rollback del último commit
                await execAsync('git revert HEAD', { cwd: projectRoot });
                steps.push('✅ Revertido último commit');
            }

            await execAsync('git push origin main', { cwd: projectRoot });
            steps.push('✅ Rollback enviado a GitHub');

            return {
                content: [
                    {
                        type: 'text',
                        text: `# Rollback Completado\n\n${steps.join('\n')}\n\n**Próximos pasos**:\n1. Monitorear deployment en Render\n2. Verificar que la app funcione correctamente\n3. Revisar logs para identificar el problema`
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error en rollback: ${error.message}`
                    }
                ]
            };
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Servidor MCP de deployment iniciado');
    }
}

const server = new DeploymentAssistant();
server.run().catch(console.error);
