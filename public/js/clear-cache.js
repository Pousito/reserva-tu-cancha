#!/usr/bin/env node

/**
 * Script para limpiar cache del navegador
 * Se ejecuta en el cliente para forzar recarga de archivos
 */

console.log('🧹 Limpiando cache del navegador...');

// Limpiar localStorage
if (typeof localStorage !== 'undefined') {
    localStorage.clear();
    console.log('✅ localStorage limpiado');
}

// Limpiar sessionStorage  
if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
    console.log('✅ sessionStorage limpiado');
}

// Forzar recarga de la página
if (typeof window !== 'undefined') {
    window.location.reload(true);
    console.log('🔄 Página recargada');
}