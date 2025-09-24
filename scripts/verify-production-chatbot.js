#!/usr/bin/env node

/**
 * Script para verificar el estado del chatbot en producción
 */

const https = require('https');
const fs = require('fs');

console.log('🔍 Verificando chatbot en producción...\n');

const productionUrl = 'https://www.reservatuscanchas.cl';

// Función para hacer petición HTTPS
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function verifyChatbot() {
    try {
        console.log('📡 Obteniendo contenido de producción...');
        const html = await fetchUrl(productionUrl);
        
        console.log('🔍 Verificando elementos del chatbot...\n');
        
        // Verificar CSS del chatbot
        if (html.includes('chatbot.css')) {
            console.log('✅ CSS del chatbot encontrado en producción');
        } else {
            console.log('❌ CSS del chatbot NO encontrado en producción');
        }
        
        // Verificar JS del chatbot
        if (html.includes('chatbot.js')) {
            console.log('✅ JavaScript del chatbot encontrado en producción');
        } else {
            console.log('❌ JavaScript del chatbot NO encontrado en producción');
        }
        
        // Verificar si Carla está mencionada
        if (html.includes('Carla')) {
            console.log('✅ Referencias a "Carla" encontradas en producción');
        } else {
            console.log('❌ No se encontraron referencias a "Carla" en producción');
        }
        
        // Verificar versión del CSS
        const cssMatch = html.match(/chatbot\.css\?v=([\d.]+)/);
        if (cssMatch) {
            console.log(`✅ Versión del CSS del chatbot: ${cssMatch[1]}`);
        }
        
        // Verificar versión del JS
        const jsMatch = html.match(/chatbot\.js\?v=([\d.]+)/);
        if (jsMatch) {
            console.log(`✅ Versión del JS del chatbot: ${jsMatch[1]}`);
        }
        
        console.log('\n📋 Verificando archivos del chatbot...');
        
        // Verificar si podemos acceder a los archivos del chatbot
        try {
            const chatbotCss = await fetchUrl(productionUrl + '/chatbot.css');
            if (chatbotCss.includes('chatbot-container')) {
                console.log('✅ Archivo chatbot.css accesible y válido');
            } else {
                console.log('❌ Archivo chatbot.css no válido');
            }
        } catch (error) {
            console.log('❌ No se pudo acceder a chatbot.css');
        }
        
        try {
            const chatbotJs = await fetchUrl(productionUrl + '/chatbot.js');
            if (chatbotJs.includes('Carla')) {
                console.log('✅ Archivo chatbot.js accesible y contiene "Carla"');
            } else {
                console.log('❌ Archivo chatbot.js no contiene "Carla"');
            }
        } catch (error) {
            console.log('❌ No se pudo acceder a chatbot.js');
        }
        
        console.log('\n🎯 Verificación completada');
        
    } catch (error) {
        console.error('❌ Error verificando producción:', error.message);
    }
}

verifyChatbot();
