const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Función para limpiar la base de datos y dejar solo Los Ángeles y MagnaSports
function cleanDatabase() {
    console.log('🧹 LIMPIANDO BASE DE DATOS');
    console.log('==========================');
    
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    const db = new sqlite3.Database(dbPath);
    
    db.serialize(() => {
        console.log('🔄 Iniciando limpieza...');
        
        // 1. Eliminar todas las reservas existentes
        db.run('DELETE FROM reservas', function(err) {
            if (err) {
                console.error('❌ Error eliminando reservas:', err);
            } else {
                console.log('✅ Reservas eliminadas:', this.changes);
            }
        });
        
        // 2. Eliminar todos los complejos excepto MagnaSports
        db.run('DELETE FROM complejos WHERE nombre != "MagnaSports"', function(err) {
            if (err) {
                console.error('❌ Error eliminando complejos:', err);
            } else {
                console.log('✅ Complejos eliminados:', this.changes);
            }
        });
        
        // 3. Eliminar todas las ciudades excepto Los Ángeles
        db.run('DELETE FROM ciudades WHERE nombre != "Los Ángeles"', function(err) {
            if (err) {
                console.error('❌ Error eliminando ciudades:', err);
            } else {
                console.log('✅ Ciudades eliminadas:', this.changes);
            }
        });
        
        // 4. Actualizar el ID de Los Ángeles a 1 para simplificar
        db.run('UPDATE ciudades SET id = 1 WHERE nombre = "Los Ángeles"', function(err) {
            if (err) {
                console.error('❌ Error actualizando ID de Los Ángeles:', err);
            } else {
                console.log('✅ ID de Los Ángeles actualizado a 1');
            }
        });
        
        // 5. Actualizar el ID de MagnaSports a 1 y su ciudad_id a 1
        db.run('UPDATE complejos SET id = 1, ciudad_id = 1 WHERE nombre = "MagnaSports"', function(err) {
            if (err) {
                console.error('❌ Error actualizando MagnaSports:', err);
            } else {
                console.log('✅ MagnaSports actualizado - ID: 1, Ciudad ID: 1');
            }
        });
        
        // 6. Verificar el resultado final
        setTimeout(() => {
            console.log('\n📊 VERIFICACIÓN FINAL');
            console.log('=====================');
            
            db.all('SELECT * FROM ciudades', (err, rows) => {
                if (err) console.error('❌ Error consultando ciudades:', err);
                else {
                    console.log('🏙️ Ciudades finales:');
                    rows.forEach(ciudad => console.log(`  - ID: ${ciudad.id}, Nombre: ${ciudad.nombre}`));
                }
            });
            
            db.all('SELECT * FROM complejos', (err, rows) => {
                if (err) console.error('❌ Error consultando complejos:', err);
                else {
                    console.log('🏢 Complejos finales:');
                    rows.forEach(complejo => console.log(`  - ID: ${complejo.id}, Nombre: ${complejo.nombre}, Ciudad ID: ${complejo.ciudad_id}`));
                }
            });
            
            db.all('SELECT COUNT(*) as count FROM reservas', (err, rows) => {
                if (err) console.error('❌ Error consultando reservas:', err);
                else {
                    console.log(`📋 Reservas finales: ${rows[0].count}`);
                }
                
                console.log('\n✅ Limpieza completada exitosamente');
                db.close();
            });
        }, 1000);
    });
}

// Ejecutar si se llama directamente
if (require.main === module) {
    cleanDatabase();
}

module.exports = { cleanDatabase };
