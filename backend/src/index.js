const express = require('express');
const http = require('http');
const cors = require('cors');
const { port, corsOrigin } = require('./config');
const { setupSocket } = require('./socket');
const { reloadSchedules } = require('./services/schedulerService');
const { startWeatherPolling } = require('./services/weatherService');

const app = express();
const server = http.createServer(app);
const io = setupSocket(server);

app.set('io', io);

const allowedOrigins = corsOrigin.split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true);
  },
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/presence', require('./routes/presence'));
app.use('/api/voting', require('./routes/voting'));
app.use('/api/control', require('./routes/control'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/students', require('./routes/students'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(port, async () => {
  console.log(`Servidor corriendo en puerto ${port}`);
  try {
    await reloadSchedules(io);
    console.log('Horarios cargados');
    startWeatherPolling(io);
    console.log('Pronóstico del clima iniciado');
  } catch (err) {
    console.log('No se pudieron cargar horarios (DB puede no estar lista)');
  }
});
