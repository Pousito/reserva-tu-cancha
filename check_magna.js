const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

console.log('Revisando complejos MagnaSports...\n');

db.all('SELECT * FROM complejos WHERE nombre LIKE "%Magna%"', (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Complejos MagnaSports encontrados:');
        console.log(rows);
        console.log('\nTotal:', rows.length);
    }
    
    db.close();
});
