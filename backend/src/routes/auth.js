const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { jwtSecret } = require('../config');
const { prisma } = require('../middlewares/auth');
const { authenticateToken } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = Router();

const registerSchema = z.object({
  matricula: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(4),
  career: z.string().optional(),
});

const loginSchema = z.object({
  matricula: z.string().min(1),
  password: z.string().min(1),
});

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { matricula, name, password, career } = req.body;
    const existing = await prisma.user.findUnique({ where: { matricula } });
    if (existing) return res.status(409).json({ error: 'La matrícula ya está registrada' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { matricula, name, passwordHash, career: career || 'Ingeniería en Software' },
    });
    res.status(201).json({ id: user.id, matricula: user.matricula, name: user.name });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { matricula, password } = req.body;
    const user = await prisma.user.findUnique({ where: { matricula } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id, matricula: user.matricula, role: user.role, name: user.name },
      jwtSecret,
      { expiresIn: '12h' }
    );
    res.json({ token, user: { id: user.id, matricula: user.matricula, name: user.name, role: user.role, career: user.career } });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.post('/admin/login', validate(loginSchema), async (req, res) => {
  try {
    const { matricula, password } = req.body;
    const user = await prisma.user.findUnique({ where: { matricula } });
    if (!user || user.role !== 'ADMIN') return res.status(401).json({ error: 'Credenciales de administrador inválidas' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { id: user.id, matricula: user.matricula, role: user.role, name: user.name },
      jwtSecret,
      { expiresIn: '12h' }
    );
    res.json({ token, user: { id: user.id, matricula: user.matricula, name: user.name, role: user.role, career: user.career } });
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, matricula: true, name: true, role: true, career: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

module.exports = router;
