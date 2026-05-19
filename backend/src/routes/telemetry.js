const { Router } = require('express');
const { z } = require('zod');
const { prisma, authenticateEsp32 } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = Router();

const telemetrySchema = z.object({
  temperature: z.number(),
  humidity: z.number(),
  rain: z.boolean(),
  rainAnalog: z.number().int().optional().default(0),
  uvIndex: z.number(),
  roofState: z.enum(['OPEN', 'CLOSED', 'MOVING']).optional(),
});

router.post('/', authenticateEsp32, validate(telemetrySchema), async (req, res) => {
  try {
    const data = req.body;
    const telemetry = await prisma.telemetry.create({ data });

    await prisma.systemState.upsert({
      where: { id: 1 },
      update: { lastEsp32Ping: new Date() },
      create: { id: 1, lastEsp32Ping: new Date() },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('sensors:live', {
        temperature: data.temperature,
        humidity: data.humidity,
        rain: data.rain,
        uvIndex: data.uvIndex,
        roofState: data.roofState || 'CLOSED',
      });

      const { evaluatePriorities } = require('../services/telemetryService');
      await evaluatePriorities(io, data);
    }

    res.status(201).json(telemetry);
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar telemetría' });
  }
});

router.post('/simulate', async (req, res) => {
  try {
    const data = {
      temperature: 20 + Math.random() * 25,
      humidity: 30 + Math.random() * 60,
      rain: Math.random() > 0.8,
      rainAnalog: Math.floor(Math.random() * 4095),
      uvIndex: Math.random() * 11,
      roofState: 'CLOSED',
    };

    const state = await prisma.systemState.findUnique({ where: { id: 1 } });
    if (state) data.roofState = state.roofState;

    const telemetry = await prisma.telemetry.create({ data });

    await prisma.systemState.upsert({
      where: { id: 1 },
      update: { lastEsp32Ping: new Date() },
      create: { id: 1, lastEsp32Ping: new Date() },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('sensors:live', {
        temperature: data.temperature,
        humidity: data.humidity,
        rain: data.rain,
        uvIndex: data.uvIndex,
        roofState: data.roofState,
      });

      const { evaluatePriorities } = require('../services/telemetryService');
      await evaluatePriorities(io, data);
    }

    res.status(201).json(telemetry);
  } catch (err) {
    res.status(500).json({ error: 'Error al simular telemetría' });
  }
});

router.get('/current', async (req, res) => {
  try {
    const latest = await prisma.telemetry.findFirst({ orderBy: { createdAt: 'desc' } });
    res.json(latest || { temperature: 0, humidity: 0, rain: false, uvIndex: 0, roofState: 'CLOSED' });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener telemetría' });
  }
});

router.get('/weather', async (req, res) => {
  try {
    const { fetchWeather } = require('../services/weatherService');
    const weather = await fetchWeather();
    res.json(weather);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener clima' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const rows = await prisma.telemetry.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });
    res.json(rows.reverse()); // oldest first for the chart
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener histórico' });
  }
});

module.exports = router;
