#!/bin/bash

# Script de inicio para ReservaTuCancha
echo "🚀 Iniciando ReservaTuCancha..."

# Verificar si NVM está disponible
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo "📦 Cargando NVM..."
    source "$HOME/.nvm/nvm.sh"
    
    # Usar la versión especificada en .nvmrc
    if [ -f ".nvmrc" ]; then
        echo "🔄 Usando Node.js versión $(cat .nvmrc)..."
        nvm use
    fi
else
    echo "⚠️  NVM no encontrado. Asegúrate de tener Node.js instalado."
fi

# Verificar si Node.js está disponible
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado o no está en el PATH"
    echo "💡 Instala Node.js o configura NVM correctamente"
    exit 1
fi

echo "✅ Node.js $(node --version) detectado"
echo "✅ NPM $(npm --version) detectado"

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo "⚠️  Archivo .env no encontrado"
    if [ -f "env.example" ]; then
        echo "📋 Copiando env.example a .env..."
        cp env.example .env
        echo "✅ Archivo .env creado. Revisa la configuración si es necesario."
    else
        echo "❌ No se encontró env.example"
        exit 1
    fi
fi

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

echo "🎯 Iniciando servidor..."
echo "📍 URL: http://localhost:3000"
echo "🛑 Presiona Ctrl+C para detener el servidor"
echo ""

# Iniciar el servidor
npm start
