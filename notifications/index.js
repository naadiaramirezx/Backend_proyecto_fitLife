// notifications/index.js
const notificationRoutes = require('./routes/notificationRoutes');
const { startSchedulers } = require('./services/notificationScheduler');
startSchedulers();
module.exports = notificationRoutes;