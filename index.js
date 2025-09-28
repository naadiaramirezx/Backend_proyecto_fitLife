// index.js

// Servidor principal que actúa como API Gateway para múltiples microservicios
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// Cargar variables de entorno del archivo .env
dotenv.config();

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// 1. MIDDLEWARE GLOBAL
app.use(cors()); // Habilitar CORS para permitir peticiones desde el frontend
app.use(express.json()); // Permite a Express leer el cuerpo de las peticiones en formato JSON
app.use(express.urlencoded({ extended: true })); // Para formularios URL-encoded

// 2. CONEXIÓN A LA BASE DE DATOS (Se carga la configuración)
require('./config/database'); 

// 3. IMPORTAR Y MONTAR ROUTERS DE MICROSERVICIOS

// Importar los routers que cada servicio exporta desde su propio index.js:
const userServiceRouter = require('./users-service');
const planServiceRouter = require('./plans-services');
const notificationServiceRouter = require('./notifications');
const nutritionServiceRouter = require('./nutrition-service');
const wearableServiceRouter = require('./wearables-service');

// Montar los routers en rutas base específicas:

app.use('/api/users', userServiceRouter);         // /api/users/... (Registro, Login, Perfil)
app.use('/api/plans', planServiceRouter);         // /api/plans/... (Catálogo, Suscripciones)
app.use('/api/notifications', notificationServiceRouter); // /api/notifications/... (Preferencias)
app.use('/api/nutrition', nutritionServiceRouter); // /api/nutrition/... (Mediciones, Alimentos)
app.use('/api/wearables', wearableServiceRouter); // /api/wearables/... (Dispositivos, Datos de Salud)

// 4. RUTAS BASE Y MANEJO DE ERRORES

// Ruta de prueba
app.get('/', (req, res) => {
    res.status(200).send('API Gateway de Backend de Microservicios funcionando! 🚀');
});

// Manejador de Errores Global (Debe ser el último middleware)
app.use((err, req, res, next) => {
    console.error(err.stack);
    // Un simple manejador para errores no capturados
    res.status(err.status || 500).json({
        error: 'Fallo interno del servidor',
        message: err.message || 'Error desconocido',
    });
});

// 5. INICIO DEL SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor principal escuchando en el puerto ${PORT}`);
    console.log('Todos los microservicios están cargados y listos.');
});