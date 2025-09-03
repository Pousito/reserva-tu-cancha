# Script para configurar Git y hacer commit inicial
Write-Host "🚀 Configurando Git para Reserva Tu Cancha..." -ForegroundColor Green

# Verificar estado actual
Write-Host "📊 Verificando estado de Git..." -ForegroundColor Yellow
git status

Write-Host "`n📝 Creando commit inicial..." -ForegroundColor Yellow
git commit -m "Initial commit - Sistema de reservas de canchas deportivas con seguridad y reportes"

Write-Host "`n✅ Verificando commit creado..." -ForegroundColor Yellow
git log --oneline -1

Write-Host "`n🎉 ¡Git configurado exitosamente!" -ForegroundColor Green
Write-Host "📋 Próximo paso: Crear repositorio en GitHub" -ForegroundColor Cyan
