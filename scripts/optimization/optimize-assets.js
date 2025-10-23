/**
 * Script de Optimización de Assets
 * Minifica CSS, JS y optimiza imágenes
 */

const fs = require('fs');
const path = require('path');
const { minify: minifyJS } = require('terser');
const CleanCSS = require('clean-css');

class AssetOptimizer {
  constructor() {
    this.publicDir = path.join(__dirname, '../../public');
    this.optimizedDir = path.join(this.publicDir, 'optimized');
    this.stats = {
      css: { original: 0, optimized: 0, savings: 0 },
      js: { original: 0, optimized: 0, savings: 0 },
      images: { original: 0, optimized: 0, savings: 0 }
    };
  }

  async optimize() {
    console.log('🚀 Iniciando optimización de assets...');
    
    // Crear directorio de assets optimizados
    if (!fs.existsSync(this.optimizedDir)) {
      fs.mkdirSync(this.optimizedDir, { recursive: true });
    }

    // Optimizar CSS
    await this.optimizeCSS();
    
    // Optimizar JavaScript
    await this.optimizeJS();
    
    // Generar reporte
    this.generateReport();
  }

  async optimizeCSS() {
    console.log('📝 Optimizando archivos CSS...');
    
    const cssFiles = this.findFiles('*.css');
    
    for (const file of cssFiles) {
      try {
        const originalPath = path.join(this.publicDir, file);
        const optimizedPath = path.join(this.optimizedDir, file);
        
        // Crear directorio si no existe
        const dir = path.dirname(optimizedPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        const originalContent = fs.readFileSync(originalPath, 'utf8');
        const originalSize = Buffer.byteLength(originalContent, 'utf8');
        
        // Minificar CSS
        const cleanCSS = new CleanCSS({
          level: 2,
          format: 'beautify'
        });
        
        const result = cleanCSS.minify(originalContent);
        
        if (result.errors.length > 0) {
          console.warn(`⚠️  Errores en ${file}:`, result.errors);
        }
        
        fs.writeFileSync(optimizedPath, result.styles);
        
        const optimizedSize = Buffer.byteLength(result.styles, 'utf8');
        const savings = originalSize - optimizedSize;
        const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
        
        this.stats.css.original += originalSize;
        this.stats.css.optimized += optimizedSize;
        this.stats.css.savings += savings;
        
        console.log(`✅ ${file}: ${this.formatBytes(originalSize)} → ${this.formatBytes(optimizedSize)} (${savingsPercent}% ahorro)`);
        
      } catch (error) {
        console.error(`❌ Error optimizando ${file}:`, error.message);
      }
    }
  }

  async optimizeJS() {
    console.log('📜 Optimizando archivos JavaScript...');
    
    const jsFiles = this.findFiles('*.js');
    
    for (const file of jsFiles) {
      try {
        const originalPath = path.join(this.publicDir, file);
        const optimizedPath = path.join(this.optimizedDir, file);
        
        // Crear directorio si no existe
        const dir = path.dirname(optimizedPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        const originalContent = fs.readFileSync(originalPath, 'utf8');
        const originalSize = Buffer.byteLength(originalContent, 'utf8');
        
        // Minificar JavaScript
        const result = await minifyJS(originalContent, {
          compress: {
            drop_console: false, // Mantener console.log para debugging
            drop_debugger: true,
            pure_funcs: ['console.log']
          },
          mangle: {
            reserved: ['$', 'jQuery'] // No minificar variables globales importantes
          }
        });
        
        if (result.error) {
          console.warn(`⚠️  Error minificando ${file}:`, result.error.message);
          // Copiar archivo original si falla la minificación
          fs.writeFileSync(optimizedPath, originalContent);
        } else {
          fs.writeFileSync(optimizedPath, result.code);
        }
        
        const optimizedSize = Buffer.byteLength(fs.readFileSync(optimizedPath, 'utf8'), 'utf8');
        const savings = originalSize - optimizedSize;
        const savingsPercent = ((savings / originalSize) * 100).toFixed(1);
        
        this.stats.js.original += originalSize;
        this.stats.js.optimized += optimizedSize;
        this.stats.js.savings += savings;
        
        console.log(`✅ ${file}: ${this.formatBytes(originalSize)} → ${this.formatBytes(optimizedSize)} (${savingsPercent}% ahorro)`);
        
      } catch (error) {
        console.error(`❌ Error optimizando ${file}:`, error.message);
      }
    }
  }

  findFiles(pattern) {
    const files = [];
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    const scanDir = (dir, relativePath = '') => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativeItemPath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath, relativeItemPath);
        } else if (regex.test(item)) {
          files.push(relativeItemPath);
        }
      }
    };
    
    scanDir(this.publicDir);
    return files;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  generateReport() {
    console.log('\n📊 REPORTE DE OPTIMIZACIÓN');
    console.log('=' * 50);
    
    const totalOriginal = this.stats.css.original + this.stats.js.original;
    const totalOptimized = this.stats.css.optimized + this.stats.js.optimized;
    const totalSavings = totalOriginal - totalOptimized;
    const totalSavingsPercent = ((totalSavings / totalOriginal) * 100).toFixed(1);
    
    console.log(`📝 CSS: ${this.formatBytes(this.stats.css.original)} → ${this.formatBytes(this.stats.css.optimized)} (${this.formatBytes(this.stats.css.savings)} ahorro)`);
    console.log(`📜 JS: ${this.formatBytes(this.stats.js.original)} → ${this.formatBytes(this.stats.js.optimized)} (${this.formatBytes(this.stats.js.savings)} ahorro)`);
    console.log(`📊 TOTAL: ${this.formatBytes(totalOriginal)} → ${this.formatBytes(totalOptimized)} (${this.formatBytes(totalSavings)} ahorro - ${totalSavingsPercent}%)`);
    
    // Guardar reporte
    const report = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      total: {
        original: totalOriginal,
        optimized: totalOptimized,
        savings: totalSavings,
        savingsPercent: parseFloat(totalSavingsPercent)
      }
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../../optimization-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n✅ Optimización completada!');
    console.log(`📁 Assets optimizados guardados en: ${this.optimizedDir}`);
    console.log(`📄 Reporte guardado en: optimization-report.json`);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const optimizer = new AssetOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = AssetOptimizer;
