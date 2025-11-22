#!/bin/bash

# Script para conectarse a Render PostgreSQL y ejecutar el SQL
# Uso: ./conectar-y-ejecutar-sql.sh

echo "🔌 Conectando a Render PostgreSQL..."
echo ""
echo "📋 INSTRUCCIONES:"
echo "1. Ve a Render Dashboard → Tu base de datos → Connect"
echo "2. Copia la 'External Database URL' completa"
echo "3. Pégalo aquí cuando te lo pida"
echo ""
read -p "Pega la External Database URL aquí: " DB_URL

if [ -z "$DB_URL" ]; then
    echo "❌ Error: No ingresaste la URL"
    exit 1
fi

echo ""
echo "📦 Ejecutando SQL..."
echo ""

# Ejecutar el SQL
psql "$DB_URL" -f "COPIAR_Y_PEGAR_EN_RENDER.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡SQL ejecutado exitosamente!"
    echo ""
    echo "🔍 Verificando que todo funcionó..."
    psql "$DB_URL" -c "SELECT 'email_logs existe' as estado WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_logs');"
    psql "$DB_URL" -c "SELECT 'campos agregados' as estado WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservas' AND column_name = 'email_cliente_enviado');"
else
    echo ""
    echo "❌ Error al ejecutar el SQL"
    exit 1
fi

