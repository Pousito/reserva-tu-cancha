#!/usr/bin/env node

/**
 * Servidor de Documentación de API
 * Sirve la documentación interactiva en un puerto local
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

class DocsServer {
  constructor() {
    this.app = express();
    this.port = process.env.DOCS_PORT || 3001;
    this.setupRoutes();
  }

  setupRoutes() {
    // Servir archivos estáticos
    this.app.use(express.static(path.join(__dirname, '../../public')));
    
    // Ruta principal de documentación
    this.app.get('/docs', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/api-docs.html'));
    });
    
    // API para obtener estadísticas de la documentación
    this.app.get('/api/docs/stats', (req, res) => {
      try {
        const docsDir = path.join(__dirname, '../../docs');
        const stats = {
          generated: new Date().toISOString(),
          files: [],
          totalRoutes: 0
        };

        if (fs.existsSync(docsDir)) {
          const files = fs.readdirSync(docsDir);
          stats.files = files;
          
          // Intentar leer el resumen si existe
          const summaryPath = path.join(docsDir, 'api-summary.json');
          if (fs.existsSync(summaryPath)) {
            const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
            stats.totalRoutes = summary.totalRoutes || 0;
          }
        }

        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Redireccionar raíz a documentación
    this.app.get('/', (req, res) => {
      res.redirect('/docs');
    });
  }

  start() {
    this.app.listen(this.port, () => {
      console.log('📚 Servidor de Documentación iniciado');
      console.log(`🌐 Documentación disponible en: http://localhost:${this.port}/docs`);
      console.log(`📊 Estadísticas en: http://localhost:${this.port}/api/docs/stats`);
      console.log('💡 Presiona Ctrl+C para detener el servidor');
    });
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const server = new DocsServer();
  server.start();
}

module.exports = DocsServer;
