const { Router } = require('express');
const { z } = require('zod');
const { prisma, authenticateToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = Router();

const scheduleSchema = z.object({
  dayOfWeek: z.array(z.number().min(0).max(6)),
  action: z.enum(['OPEN', 'CLOSE']),
  time: z.string().regex(/^\d{2}:\d{2}$/),
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const schedules = await prisma.schedule.findMany({ orderBy: { time: 'asc' } });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

router.post('/', authenticateToken, requireRole('ADMIN'), validate(scheduleSchema), async (req, res) => {
  try {
    const schedule = await prisma.schedule.create({ data: req.body });

    const { reloadSchedules } = require('../services/schedulerService');
    reloadSchedules(req.app.get('io'));

    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear horario' });
  }
});

router.put('/:id', authenticateToken, requireRole('ADMIN'), validate(scheduleSchema), async (req, res) => {
  try {
    const schedule = await prisma.schedule.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });

    const { reloadSchedules } = require('../services/schedulerService');
    reloadSchedules(req.app.get('io'));

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar horario' });
  }
});

router.delete('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.schedule.delete({ where: { id: parseInt(req.params.id) } });

    const { reloadSchedules } = require('../services/schedulerService');
    reloadSchedules(req.app.get('io'));

    res.json({ message: 'Horario eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar horario' });
  }
});

router.patch('/:id/toggle', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!schedule) return res.status(404).json({ error: 'Horario no encontrado' });

    const updated = await prisma.schedule.update({
      where: { id: schedule.id },
      data: { active: !schedule.active },
    });

    const { reloadSchedules } = require('../services/schedulerService');
    reloadSchedules(req.app.get('io'));

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar estado del horario' });
  }
});

module.exports = router;
