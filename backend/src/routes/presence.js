const { Router } = require('express');
const { z } = require('zod');
const { prisma } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = Router();

const rfidSchema = z.object({
  rfidUid: z.string().min(1),
});

router.post('/checkin', validate(rfidSchema), async (req, res) => {
  try {
    const { rfidUid } = req.body;
    const user = await prisma.user.findUnique({ where: { rfidUid } });
    if (!user) return res.status(404).json({ error: 'Tarjeta RFID no registrada' });

    const existing = await prisma.presenceLog.findFirst({
      where: { userId: user.id, active: true },
    });
    if (existing) return res.status(409).json({ error: 'Ya tiene registro de entrada activo' });

    const log = await prisma.presenceLog.create({
      data: { userId: user.id, rfidUid },
    });

    const totalPresent = await prisma.presenceLog.count({ where: { active: true } });

    const io = req.app.get('io');
    if (io) {
      io.emit('presence:change', {
        action: 'checkin',
        student: { id: user.id, name: user.name, matricula: user.matricula },
        totalPresent,
      });
    }

    res.status(201).json({ log, student: { name: user.name, matricula: user.matricula } });
  } catch (err) {
    res.status(500).json({ error: 'Error en check-in' });
  }
});

router.post('/checkout', validate(rfidSchema), async (req, res) => {
  try {
    const { rfidUid } = req.body;
    const user = await prisma.user.findUnique({ where: { rfidUid } });
    if (!user) return res.status(404).json({ error: 'Tarjeta RFID no registrada' });

    const log = await prisma.presenceLog.findFirst({
      where: { userId: user.id, active: true },
    });
    if (!log) return res.status(404).json({ error: 'No hay registro de entrada activo' });

    await prisma.presenceLog.update({
      where: { id: log.id },
      data: { active: false, checkOut: new Date() },
    });

    const totalPresent = await prisma.presenceLog.count({ where: { active: true } });

    const io = req.app.get('io');
    if (io) {
      io.emit('presence:change', {
        action: 'checkout',
        student: { id: user.id, name: user.name, matricula: user.matricula },
        totalPresent,
      });
    }

    res.json({ message: 'Check-out exitoso', student: { name: user.name } });
  } catch (err) {
    res.status(500).json({ error: 'Error en check-out' });
  }
});

router.get('/active', async (req, res) => {
  try {
    const logs = await prisma.presenceLog.findMany({
      where: { active: true },
      include: { user: { select: { id: true, name: true, matricula: true } } },
      orderBy: { checkIn: 'desc' },
    });
    res.json(logs.map(l => ({ id: l.user.id, name: l.user.name, matricula: l.user.matricula, checkIn: l.checkIn })));
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener presencia' });
  }
});

router.get('/count', async (req, res) => {
  try {
    const total = await prisma.presenceLog.count({ where: { active: true } });
    res.json({ total });
  } catch (err) {
    res.status(500).json({ error: 'Error al contar presencia' });
  }
});

module.exports = router;
