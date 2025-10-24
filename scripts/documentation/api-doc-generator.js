#!/usr/bin/env node

/**
 * Generador Automático de Documentación de API
 * Extrae rutas, parámetros y respuestas del código fuente
 */

const fs = require('fs');
const path = require('path');

class APIDocGenerator {
  constructor() {
    this.routes = [];
    this.serverPath = path.join(__dirname, '../../server.js');
  }

  /**
   * Extraer rutas del archivo server.js
   */
  extractRoutes() {
    try {
      const serverContent = fs.readFileSync(this.serverPath, 'utf8');
      
      // Buscar patrones de rutas
      const routePatterns = [
        /app\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        /app\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g
      ];

      for (const pattern of routePatterns) {
        let match;
        while ((match = pattern.exec(serverContent)) !== null) {
          const method = match[1].toUpperCase();
          const route = match[2];
          
          // Extraer información adicional del contexto
          const context = this.extractRouteContext(serverContent, match.index);
          
          this.routes.push({
            method,
            route,
            ...context
          });
        }
      }

      console.log(`✅ ${this.routes.length} rutas encontradas`);
      return this.routes;
    } catch (error) {
      console.error('❌ Error extrayendo rutas:', error);
      return [];
    }
  }

  /**
   * Extraer contexto de la ruta (parámetros, respuestas, etc.)
   */
  extractRouteContext(content, startIndex) {
    const context = {
      description: '',
      parameters: [],
      responses: [],
      middleware: []
    };

    // Buscar comentarios antes de la ruta
    const lines = content.substring(0, startIndex).split('\n');
    const lastLines = lines.slice(-10);
    
    for (let i = lastLines.length - 1; i >= 0; i--) {
      const line = lastLines[i].trim();
      if (line.startsWith('//') || line.startsWith('/*')) {
        context.description = line.replace(/^\/\/\s*/, '').replace(/^\/\*\s*/, '').replace(/\s*\*\/$/, '');
        break;
      }
    }

    // Buscar middleware en la línea de la ruta
    const routeLine = content.substring(startIndex, startIndex + 500);
    const middlewareMatches = routeLine.match(/require[A-Za-z]+\(/g);
    if (middlewareMatches) {
      context.middleware = middlewareMatches.map(m => m.replace(/require/, '').replace(/\(/, ''));
    }

    return context;
  }

  /**
   * Generar documentación en formato Markdown
   */
  generateMarkdown() {
    let markdown = `# 📚 Documentación de API - Reserva Tu Cancha (Generada Automáticamente)

## 🎯 Información General

**Base URL:** \`https://reserva-tu-cancha.onrender.com\`  
**Versión:** 1.0.0  
**Formato:** JSON  
**Autenticación:** JWT Bearer Token  
**Generado:** ${new Date().toISOString()}

---

## 📋 Resumen de Rutas

**Total de rutas:** ${this.routes.length}

`;

    // Agrupar rutas por método
    const routesByMethod = this.routes.reduce((acc, route) => {
      if (!acc[route.method]) acc[route.method] = [];
      acc[route.method].push(route);
      return acc;
    }, {});

    // Generar documentación por método
    for (const [method, routes] of Object.entries(routesByMethod)) {
      markdown += `## ${method} Routes\n\n`;
      
      for (const route of routes) {
        markdown += `### ${route.route}\n\n`;
        
        if (route.description) {
          markdown += `**Descripción:** ${route.description}\n\n`;
        }
        
        markdown += `\`\`\`http\n${method} ${route.route}\n\`\`\`\n\n`;
        
        if (route.middleware.length > 0) {
          markdown += `**Middleware:** ${route.middleware.join(', ')}\n\n`;
        }
        
        markdown += `---\n\n`;
      }
    }

    // Agregar sección de códigos de error
    markdown += `## 🚨 Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos para la acción |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: reserva ya existe) |
| 422 | Unprocessable Entity - Datos no procesables |
| 429 | Too Many Requests - Límite de rate limiting |
| 500 | Internal Server Error - Error del servidor |

---

## 📊 Estadísticas de la API

- **Total de rutas:** ${this.routes.length}
- **Rutas GET:** ${routesByMethod.GET?.length || 0}
- **Rutas POST:** ${routesByMethod.POST?.length || 0}
- **Rutas PUT:** ${routesByMethod.PUT?.length || 0}
- **Rutas DELETE:** ${routesByMethod.DELETE?.length || 0}

---

*Documentación generada automáticamente el ${new Date().toLocaleString('es-CL')}*
`;

    return markdown;
  }

  /**
   * Generar documentación en formato JSON
   */
  generateJSON() {
    return {
      info: {
        title: 'Reserva Tu Cancha API',
        version: '1.0.0',
        description: 'API para sistema de reservas de canchas deportivas',
        baseUrl: 'https://reserva-tu-cancha.onrender.com',
        generated: new Date().toISOString()
      },
      routes: this.routes,
      statistics: {
        total: this.routes.length,
        byMethod: this.routes.reduce((acc, route) => {
          acc[route.method] = (acc[route.method] || 0) + 1;
          return acc;
        }, {})
      }
    };
  }

  /**
   * Guardar documentación en archivos
   */
  saveDocumentation() {
    const docsDir = path.join(__dirname, '../../docs');
    
    // Crear directorio si no existe
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Generar y guardar Markdown
    const markdown = this.generateMarkdown();
    fs.writeFileSync(path.join(docsDir, 'api-documentation-auto.md'), markdown);
    console.log('✅ Documentación Markdown generada: docs/api-documentation-auto.md');

    // Generar y guardar JSON
    const json = this.generateJSON();
    fs.writeFileSync(path.join(docsDir, 'api-documentation.json'), JSON.stringify(json, null, 2));
    console.log('✅ Documentación JSON generada: docs/api-documentation.json');

    // Generar resumen
    const summary = {
      generated: new Date().toISOString(),
      totalRoutes: this.routes.length,
      routesByMethod: this.routes.reduce((acc, route) => {
        acc[route.method] = (acc[route.method] || 0) + 1;
        return acc;
      }, {}),
      files: [
        'docs/api-documentation-auto.md',
        'docs/api-documentation.json'
      ]
    };

    fs.writeFileSync(path.join(docsDir, 'api-summary.json'), JSON.stringify(summary, null, 2));
    console.log('✅ Resumen generado: docs/api-summary.json');
  }

  /**
   * Ejecutar generación completa
   */
  run() {
    console.log('🚀 Iniciando generación de documentación de API...');
    
    // Extraer rutas
    this.extractRoutes();
    
    // Guardar documentación
    this.saveDocumentation();
    
    console.log('✅ Documentación generada exitosamente');
    console.log(`📊 Total de rutas documentadas: ${this.routes.length}`);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const generator = new APIDocGenerator();
  generator.run();
}

module.exports = APIDocGenerator;
