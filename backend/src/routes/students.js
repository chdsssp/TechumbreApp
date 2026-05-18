const { Router } = require('express');
const { z } = require('zod');
const bcrypt = require('bcrypt');
const { prisma, authenticateToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = Router();

const studentSchema = z.object({
  matricula: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(4),
  career: z.string().optional(),
});

const rfidSchema = z.object({
  rfidUid: z.string().min(1),
});

router.get('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const where = search
      ? {
          role: 'STUDENT',
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { matricula: { contains: search, mode: 'insensitive' } },
          ],
        }
      : { role: 'STUDENT' };

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, matricula: true, name: true, career: true, rfidUid: true, createdAt: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ students, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener alumnos' });
  }
});

router.post('/', authenticateToken, requireRole('ADMIN'), validate(studentSchema), async (req, res) => {
  try {
    const { matricula, name, password, career } = req.body;
    const existing = await prisma.user.findUnique({ where: { matricula } });
    if (existing) return res.status(409).json({ error: 'La matrícula ya existe' });

    const passwordHash = await bcrypt.hash(password, 10);
    const student = await prisma.user.create({
      data: { matricula, name, passwordHash, career: career || 'Ingeniería en Software', role: 'STUDENT' },
    });
    res.status(201).json({ id: student.id, matricula: student.matricula, name: student.name });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear alumno' });
  }
});

router.put('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, career } = req.body;
    const student = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { name, career },
      select: { id: true, matricula: true, name: true, career: true },
    });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar alumno' });
  }
});

router.delete('/:id', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Alumno eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar alumno' });
  }
});

router.post('/:id/rfid', authenticateToken, requireRole('ADMIN'), validate(rfidSchema), async (req, res) => {
  try {
    const student = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { rfidUid: req.body.rfidUid },
      select: { id: true, matricula: true, name: true, rfidUid: true },
    });
    res.json(student);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Esta tarjeta RFID ya está vinculada a otro alumno' });
    res.status(500).json({ error: 'Error al vincular RFID' });
  }
});

module.exports = router;
