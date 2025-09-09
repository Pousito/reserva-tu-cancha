const express = require('express');
const app = express();
const PORT = 3000;

console.log('🚀 Iniciando servidor simple...');

app.get('/', (req, res) => {
  res.json({ message: 'Servidor simple funcionando', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor simple corriendo en puerto ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
});


