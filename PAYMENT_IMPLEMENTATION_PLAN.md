# 🏦 Plan de Implementación - Transbank Webpay Plus

## 📋 **Fase 1: Configuración Inicial**
- [ ] Instalar SDK de Transbank
- [ ] Configurar variables de entorno
- [ ] Crear servicio de pagos
- [ ] Configurar ambiente de pruebas

## 📋 **Fase 2: Modificación de Base de Datos**
- [ ] Agregar tabla `pagos`
- [ ] Agregar campo `estado_pago` a tabla `reservas`
- [ ] Crear índices necesarios

## 📋 **Fase 3: Backend - API de Pagos**
- [ ] Endpoint para iniciar transacción
- [ ] Endpoint para confirmar pago
- [ ] Endpoint para consultar estado
- [ ] Webhook para notificaciones

## 📋 **Fase 4: Frontend - Flujo de Pago**
- [ ] Modificar flujo de reserva
- [ ] Crear página de pago
- [ ] Integrar con Transbank
- [ ] Manejar respuestas de pago

## 📋 **Fase 5: Testing y Deploy**
- [ ] Pruebas en ambiente de desarrollo
- [ ] Configurar ambiente de producción
- [ ] Deploy a Render
- [ ] Verificación final

## 🔧 **Configuración Requerida**

### Variables de Entorno:
```env
# Transbank
TRANSBANK_API_KEY=tu_api_key
TRANSBANK_COMMERCE_CODE=tu_commerce_code
TRANSBANK_ENVIRONMENT=integration  # o production
TRANSBANK_RETURN_URL=https://tu-dominio.com/payment/return
TRANSBANK_FINAL_URL=https://tu-dominio.com/payment/final
```

### Dependencias:
```json
{
  "transbank-sdk": "^1.0.0"
}
```

## 📊 **Flujo de Pago**

1. **Usuario selecciona cancha y horario**
2. **Sistema calcula precio total**
3. **Usuario confirma reserva**
4. **Sistema crea transacción en Transbank**
5. **Usuario es redirigido a Webpay**
6. **Usuario completa pago**
7. **Transbank redirige de vuelta**
8. **Sistema confirma pago y activa reserva**

## 🎯 **Próximos Pasos**

1. Instalar dependencias
2. Configurar variables de entorno
3. Crear servicio de pagos
4. Modificar base de datos
5. Implementar endpoints
6. Actualizar frontend
