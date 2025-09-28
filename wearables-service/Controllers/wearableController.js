// wearables-service/controllers/wearableController.js

const DeviceModel = require('../models/Device');
const HealthDataModel = require('../models/HealthData');

// MOCK: Simula la obtención del perfilId del token JWT:
const MOCK_PROFILE_ID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; 

/**
 * POST /api/wearables/devices
 * Registra un nuevo dispositivo.
 */
async function registerDevice(req, res) {
    try {
        const perfilId = req.perfil_id || MOCK_PROFILE_ID;
        const { fabricante, modelo, serialNumber } = req.body;

        if (!fabricante || !modelo) {
            return res.status(400).json({ error: 'Faltan fabricante y modelo' });
        }
        
        const newDevice = await DeviceModel.registerDevice(perfilId, fabricante, modelo, serialNumber);
        res.status(201).json({ message: 'Dispositivo registrado', data: newDevice });

    } catch (error) {
        if (error.code === '23505') { // UNIQUE violation (serial number ya existe)
            return res.status(409).json({ error: 'Número de serie ya registrado.' });
        }
        console.error('Error al registrar dispositivo:', error);
        res.status(500).json({ error: 'Fallo interno del servidor' });
    }
}

/**
 * POST /api/wearables/data
 * Registra un lote de datos de salud sincronizados (puntos individuales).
 */
async function syncHealthData(req, res) {
    try {
        const perfilId = req.perfil_id || MOCK_PROFILE_ID;
        const { deviceId, records } = req.body; // records es un array de {tipoMedida, valor, timestamp}

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ error: 'El cuerpo debe contener un array de registros (records).' });
        }

        let insertedCount = 0;
        // NOTA: Para alto rendimiento, esto se debería hacer con una sola consulta SQL BULK INSERT
        for (const record of records) {
            await HealthDataModel.insertHealthRecord(
                perfilId,
                deviceId,
                record.tipoMedida,
                record.valor,
                record.timestamp
            );
            insertedCount++;
        }
        
        res.status(201).json({ 
            message: `Sincronización exitosa. Se insertaron ${insertedCount} registros.`,
        });

    } catch (error) {
        console.error('Error al sincronizar datos:', error);
        res.status(500).json({ error: 'Fallo interno al procesar los datos de salud' });
    }
}

/**
 * GET /api/wearables/data/steps?start=...&end=...
 * Obtiene el historial de un tipo de métrica (ej: pasos) en un rango.
 */
async function getDataHistory(req, res) {
    try {
        const perfilId = req.perfil_id || MOCK_PROFILE_ID;
        const { type, start, end } = req.query; // type=Pasos, start=2024-01-01, end=2024-01-31

        if (!type || !start || !end) {
            return res.status(400).json({ error: 'Faltan parámetros: type, start y end.' });
        }
        
        const history = await HealthDataModel.getHealthDataByType(perfilId, type, start, end);
        res.status(200).json(history);

    } catch (error) {
        console.error('Error al obtener historial de datos:', error);
        res.status(500).json({ error: 'Fallo interno al obtener historial' });
    }
}


module.exports = {
    registerDevice,
    syncHealthData,
    getDataHistory,
    // Exportar otras funciones de controlador (getDevices, disconnectDevice)
};