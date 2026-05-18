const { Router } = require('express');
const { z } = require('zod');
const { prisma, authenticateToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = Router();

const overrideSchema = z.object({
  action: z.enum(['FORCE_OPEN', 'FORCE_CLOSE', 'RELEASE']),
  reason: z.string().optional(),
});

const rainAutoSchema = z.object({
  enabled: z.boolean(),
});

router.post('/override', authenticateToken, requireRole('ADMIN'), validate(overrideSchema), async (req, res) => {
  try {
    const { action, reason } = req.body;
    const state = await prisma.systemState.findUnique({ where: { id: 1 } });

    if (state?.emergencyLock && action !== 'RELEASE') {
      return res.status(403).json({ error: 'Emergencia climática activa. No se puede controlar manualmente.' });
    }

    if (action === 'RELEASE') {
      await prisma.override.updateMany({
        where: { active: true },
        data: { active: false, releasedAt: new Date() },
      });

      await prisma.systemState.update({
        where: { id: 1 },
        data: { activePriority: 4 },
      });

      const io = req.app.get('io');
      if (io) io.emit('system:status', { roofState: state.roofState, priority: 4, emergencyLock: false });

      return res.json({ message: 'Override liberado' });
    }

    await prisma.override.updateMany({
      where: { active: true },
      data: { active: false, releasedAt: new Date() },
    });

    await prisma.override.create({
      data: { adminId: req.user.id, action, reason },
    });

    const newRoofState = action === 'FORCE_OPEN' ? 'OPEN' : 'CLOSED';

    await prisma.systemState.update({
      where: { id: 1 },
      data: { roofState: newRoofState, activePriority: 2 },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('roof:moving', { targetState: newRoofState });
      io.emit('system:status', { roofState: newRoofState, priority: 2, emergencyLock: false });
      io.emit('roof:command', { command: 'SET_ROOF', state: newRoofState, source: 'admin_override', priority: 2 });
    }

    res.json({ message: `Override aplicado: ${action}`, roofState: newRoofState });
  } catch (err) {
    res.status(500).json({ error: 'Error al aplicar override' });
  }
});

router.get('/status', async (req, res) => {
  try {
    let state = await prisma.systemState.findUnique({ where: { id: 1 } });
    if (!state) {
      state = await prisma.systemState.create({ data: { id: 1 } });
    }

    const activeOverride = await prisma.override.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });
    const esp32Connected = state.lastEsp32Ping && (Date.now() - new Date(state.lastEsp32Ping).getTime()) < 30000;

    res.json({
      roofState: state.roofState,
      activePriority: state.activePriority,
      emergencyLock: state.emergencyLock,
      rainAutoMode: state.rainAutoMode,
      esp32Connected: !!esp32Connected,
      lastEsp32Ping: state.lastEsp32Ping,
      activeOverride: activeOverride ? { action: activeOverride.action, reason: activeOverride.reason } : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estado' });
  }
});

router.post('/rain-auto', authenticateToken, requireRole('ADMIN'), validate(rainAutoSchema), async (req, res) => {
  try {
    await prisma.systemState.update({
      where: { id: 1 },
      data: { rainAutoMode: req.body.enabled },
    });
    res.json({ message: `Modo lluvia automático ${req.body.enabled ? 'activado' : 'desactivado'}` });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar modo lluvia' });
  }
});

module.exports = router;
