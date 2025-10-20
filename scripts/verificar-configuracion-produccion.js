const { Pool } = require('pg');
require('dotenv').config();

async function verificarConfiguracion() {
    console.log('⚙️ VERIFICANDO CONFIGURACIÓN DE PRODUCCIÓN');
    console.log('==========================================');
    
    try {
        console.log('🔍 Variables de entorno:');
        console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? 'Configurado' : 'No configurado'}`);
        console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurado' : 'No configurado'}`);
        
        // Verificar si hay un JWT_SECRET específico para producción
        const jwtSecret = process.env.JWT_SECRET || 'tu-secreto-jwt';
        console.log(`   - JWT_SECRET usado: ${jwtSecret}`);
        
        // Verificar si el problema está en el middleware de autenticación
        console.log('\n🔍 Verificando middleware de autenticación...');
        
        // Simular el proceso de autenticación
        const jwt = require('jsonwebtoken');
        
        // Crear un token con el secreto local
        const tokenLocal = jwt.sign(
            { userId: 3, email: 'owner@complejodemo3.cl', rol: 'owner', complejo_id: 8 },
            jwtSecret,
            { expiresIn: '24h' }
        );
        
        console.log('✅ Token creado con secreto local:', tokenLocal.substring(0, 50) + '...');
        
        // Verificar si el token es válido
        try {
            const decoded = jwt.verify(tokenLocal, jwtSecret);
            console.log('✅ Token válido con secreto local');
        } catch (error) {
            console.log('❌ Token inválido con secreto local:', error.message);
        }
        
        // Probar con diferentes secretos posibles
        const posiblesSecretos = [
            'tu-secreto-jwt',
            'reserva-tu-cancha-secret',
            'jwt-secret-key',
            'admin-secret-key',
            process.env.JWT_SECRET
        ];
        
        console.log('\n🔍 Probando diferentes secretos...');
        for (const secreto of posiblesSecretos) {
            if (secreto) {
                try {
                    const tokenTest = jwt.sign(
                        { userId: 3, email: 'owner@complejodemo3.cl', rol: 'owner', complejo_id: 8 },
                        secreto,
                        { expiresIn: '24h' }
                    );
                    
                    const decoded = jwt.verify(tokenTest, secreto);
                    console.log(`✅ Secreto "${secreto}" funciona`);
                } catch (error) {
                    console.log(`❌ Secreto "${secreto}" no funciona`);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

verificarConfiguracion();
