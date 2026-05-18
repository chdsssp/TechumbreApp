const { Server } = require('socket.io');
const { corsOrigin } = require('../config');

function setupSocket(server) {
  const origins = corsOrigin.split(',').map(o => o.trim());
  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || origins.includes(origin)) return cb(null, true);
        cb(null, true);
      },
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on('telemetry:update', (data) => {
      io.emit('sensors:live', data);
    });

    socket.on('rfid:scan', async (data) => {
      console.log(`RFID escaneado: ${data.uid}`);
    });

    socket.on('status:ack', (data) => {
      console.log(`ESP32 ACK: ${data.command} - ${data.success}`);
    });

    socket.on('esp32:register', () => {
      socket.esp32 = true;
      io.emit('esp32:connected', { connected: true });
      console.log('ESP32 registrado');
    });

    socket.on('disconnect', () => {
      if (socket.esp32) {
        io.emit('esp32:connected', { connected: false });
      }
      console.log(`Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { setupSocket };
