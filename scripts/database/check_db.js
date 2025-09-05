const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('reservas.db');

console.log('=== VERIFICANDO ESTRUCTURA DE LA BASE DE DATOS ===');

// Verificar estructura de la tabla complejos
db.all("PRAGMA table_info(complejos)", (err, rows) => {
    if (err) {
        console.error('Error obteniendo estructura de complejos:', err);
    } else {
        console.log('\n--- Estructura de la tabla COMPLEJOS ---');
        rows.forEach(row => {
            console.log(`${row.name}: ${row.type} (${row.notnull ? 'NOT NULL' : 'NULL'})`);
        });
    }
});

// Verificar datos existentes
db.all("SELECT * FROM complejos LIMIT 3", (err, rows) => {
    if (err) {
        console.error('Error obteniendo datos de complejos:', err);
    } else {
        console.log('\n--- Datos existentes en COMPLEJOS ---');
        rows.forEach(row => {
            console.log(JSON.stringify(row, null, 2));
        });
    }
    
    db.close();
});