# ReservaTuCancha 🏟️

Sistema de reservas de canchas deportivas moderno y eficiente. Permite a los usuarios reservar canchas de padel y fútbol de forma rápida y sencilla, eliminando la necesidad de llamadas y esperas.

## 🚀 Características

- **Reservas en tiempo real**: Ver disponibilidad instantánea de canchas
- **Interfaz moderna**: Diseño responsive y atractivo
- **Filtros inteligentes**: Por ciudad, complejo y tipo de cancha
- **Códigos de reserva**: Sistema único de identificación
- **Búsqueda de reservas**: Consulta tus reservas existentes
- **Base de datos relacional**: SQLite para almacenamiento eficiente

## 📋 Requisitos

- Node.js (versión 14 o superior)
- npm (incluido con Node.js)

## 🛠️ Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   cd "C:\Users\Pousi\OneDrive\Escritorio\Proyecto Reserva Tu Cancha\Programacion\ReservaTuCancha"
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor**
   ```bash
   npm start
   ```

4. **Abrir en el navegador**
   ```
   http://localhost:5000
   ```

## 🏗️ Estructura del Proyecto

```
ReservaTuCancha/
├── server.js              # Servidor principal (Express)
├── package.json           # Dependencias y scripts
├── database.sqlite        # Base de datos (se crea automáticamente)
├── public/                # Archivos del frontend
│   ├── index.html         # Página principal
│   ├── styles.css         # Estilos CSS
│   └── script.js          # Lógica JavaScript
└── README.md              # Este archivo
```

## 🗄️ Base de Datos

El sistema utiliza SQLite con las siguientes tablas:

- **ciudades**: Lista de ciudades disponibles
- **complejos**: Complejos deportivos por ciudad
- **canchas**: Canchas disponibles por complejo
- **reservas**: Historial de reservas realizadas

### Datos de Ejemplo

El sistema incluye datos de ejemplo:
- **Ciudades**: Santiago, Valparaíso, Concepción, Los Ángeles
- **Complejos**: 
  - Complejo Deportivo Central (Santiago) - Canchas de fútbol ($25.000/hora)
  - Padel Club Premium (Santiago) - Canchas de padel ($30.000/hora)
  - **MagnaSports (Los Ángeles)** - Canchas techadas de futbolito ($28.000/hora)
    - 2 canchas techadas
    - 7 jugadores por equipo
    - Horarios: Lunes a viernes 16:00-23:00, Sábados y domingos 12:00-23:00

## 🎯 Funcionalidades

### 1. Proceso de Reserva
1. Seleccionar ciudad
2. Elegir complejo deportivo
3. Seleccionar tipo de cancha (fútbol o padel)
4. Ver disponibilidad en tiempo real
5. Seleccionar fecha y hora
6. Completar datos personales
7. Confirmar reserva

### 2. Consulta de Reservas
- Ingresar código de reserva
- Ver detalles completos de la reserva
- Estado de confirmación

### 3. Gestión de Disponibilidad
- Visualización gráfica de canchas disponibles/ocupadas
- Filtros por fecha y hora
- Actualización en tiempo real

## 🔧 Configuración

### Variables de Entorno
Crear archivo `.env` en la raíz del proyecto:
```env
PORT=5000
NODE_ENV=development
```

### Personalización
- **Precios**: Modificar en `server.js` función `insertSampleData()`
- **Horarios**: Ajustar en `public/index.html` en el select de horas
- **Estilos**: Editar `public/styles.css`

## 🚀 Despliegue

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## 📱 Uso

### Para Usuarios
1. Acceder a la página web
2. Seguir el proceso de reserva paso a paso
3. Guardar el código de reserva recibido
4. Usar el código para consultar reservas futuras

### Para Administradores
- Los datos se almacenan en `database.sqlite`
- Pueden agregar nuevas ciudades, complejos y canchas directamente en la base de datos
- El sistema es escalable para múltiples ubicaciones

## 🔮 Próximas Funcionalidades

- [ ] Integración con WebPay para pagos
- [ ] Sistema de notificaciones por email
- [ ] Panel de administración
- [ ] Aplicación móvil
- [ ] Sistema de usuarios y perfiles
- [ ] Calificaciones y reseñas

## 🐛 Solución de Problemas

### Error de conexión a la base de datos
- Verificar que Node.js esté instalado correctamente
- Asegurar permisos de escritura en el directorio

### Puerto ocupado
- Cambiar el puerto en el archivo `.env`
- O usar: `PORT=3000 npm start`

### Dependencias faltantes
```bash
npm install
```

## 📞 Soporte

Para soporte técnico o consultas sobre el proyecto, contactar al desarrollador.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo LICENSE para más detalles.

---

**Desarrollado con ❤️ para optimizar las reservas deportivas**
# Webhook corregido - URL actualizada - Wed Sep  3 16:28:17 -04 2025
