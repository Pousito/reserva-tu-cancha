const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

console.log('🔍 Verificando base de datos...\n');

// Verificar ciudades
db.all("SELECT * FROM ciudades ORDER BY id", (err, ciudades) => {
    if (err) {
        console.error('❌ Error:', err);
        return;
    }
    console.log('\n📍 CIUDADES:');
    ciudades.forEach(ciudad => {
        console.log(`  ID ${ciudad.id}: ${ciudad.nombre}`);
    });

    // Verificar complejos
    db.all("SELECT c.*, ci.nombre as ciudad_nombre FROM complejos c JOIN ciudades ci ON c.ciudad_id = ci.id ORDER BY c.id", (err, complejos) => {
        if (err) {
            console.error('❌ Error:', err);
            return;
        }
        console.log('\n🏟️ COMPLEJOS:');
        complejos.forEach(complejo => {
            console.log(`  ID ${complejo.id}: ${complejo.nombre} (${complejo.ciudad_nombre})`);
        });

        // Contar MagnaSports
        const magnaSports = complejos.filter(c => c.nombre === 'MagnaSports');
        console.log(`\n🎯 MAGNASPORTS ENCONTRADOS: ${magnaSports.length}`);
        
        if (magnaSports.length === 1) {
            const magna = magnaSports[0];
            if (magna.ciudad_nombre === 'Los Ángeles') {
                console.log('✅ PERFECTO: Solo hay un MagnaSports en Los Ángeles');
            } else {
                console.log(`⚠️ PROBLEMA: MagnaSports está en ${magna.ciudad_nombre} en lugar de Los Ángeles`);
            }
        } else if (magnaSports.length > 1) {
            console.log('⚠️ PROBLEMA: Hay múltiples MagnaSports');
            magnaSports.forEach((ms, index) => {
                console.log(`  ${index + 1}. ID ${ms.id} en ${ms.ciudad_nombre}`);
            });
        } else {
            console.log('❌ PROBLEMA: No hay MagnaSports');
        }

        db.close();
    });
});
