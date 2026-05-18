const { Router } = require('express');
const { z } = require('zod');
const { prisma, authenticateToken, requireRole } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');

const router = Router();

const voteSchema = z.object({
  vote: z.enum(['OPEN', 'CLOSE']),
});

router.post('/session/start', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const existing = await prisma.votingSession.findFirst({ where: { status: 'ACTIVE' } });
    if (existing) return res.status(409).json({ error: 'Ya hay una sesión de votación activa' });

    const totalPresent = await prisma.presenceLog.count({ where: { active: true } });
    if (totalPresent === 0) return res.status(400).json({ error: 'No hay alumnos presentes' });

    const quorumNeeded = Math.ceil(0.30 * totalPresent);

    const session = await prisma.votingSession.create({
      data: { totalPresent, quorumNeeded },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('session:started', { sessionId: session.id, totalPresent, quorumNeeded });
    }

    setTimeout(async () => {
      const s = await prisma.votingSession.findUnique({ where: { id: session.id } });
      if (s && s.status === 'ACTIVE') {
        const { closeVotingSession } = require('../services/votingService');
        await closeVotingSession(session.id, req.app.get('io'));
      }
    }, 10 * 60 * 1000);

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión de votación' });
  }
});

router.post('/vote', authenticateToken, validate(voteSchema), async (req, res) => {
  try {
    const session = await prisma.votingSession.findFirst({ where: { status: 'ACTIVE' } });
    if (!session) return res.status(404).json({ error: 'No hay sesión de votación activa' });

    const presence = await prisma.presenceLog.findFirst({
      where: { userId: req.user.id, active: true },
    });
    if (!presence) return res.status(403).json({ error: 'Debes estar presente para votar' });

    const existingVote = await prisma.vote.findUnique({
      where: { userId_sessionId: { userId: req.user.id, sessionId: session.id } },
    });
    if (existingVote) return res.status(409).json({ error: 'Ya emitiste tu voto en esta sesión' });

    await prisma.vote.create({
      data: { userId: req.user.id, sessionId: session.id, vote: req.body.vote },
    });

    const votes = await prisma.vote.groupBy({
      by: ['vote'],
      where: { sessionId: session.id },
      _count: true,
    });

    const votesOpen = votes.find(v => v.vote === 'OPEN')?._count || 0;
    const votesClose = votes.find(v => v.vote === 'CLOSE')?._count || 0;
    const totalVotes = votesOpen + votesClose;

    await prisma.votingSession.update({
      where: { id: session.id },
      data: { totalVotes },
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('vote:update', { votesOpen, votesClose, totalVotes, quorum: session.quorumNeeded });
    }

    res.json({ message: 'Voto registrado', vote: req.body.vote });
  } catch (err) {
    res.status(500).json({ error: 'Error al votar' });
  }
});

router.get('/session/current', async (req, res) => {
  try {
    const session = await prisma.votingSession.findFirst({
      where: { status: 'ACTIVE' },
      include: { votes: true },
    });

    if (!session) return res.json({ active: false });

    const votesOpen = session.votes.filter(v => v.vote === 'OPEN').length;
    const votesClose = session.votes.filter(v => v.vote === 'CLOSE').length;

    res.json({
      active: true,
      sessionId: session.id,
      votesOpen,
      votesClose,
      totalVotes: session.votes.length,
      quorumNeeded: session.quorumNeeded,
      totalPresent: session.totalPresent,
      startedAt: session.startedAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener sesión' });
  }
});

router.post('/session/close', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const session = await prisma.votingSession.findFirst({ where: { status: 'ACTIVE' } });
    if (!session) return res.status(404).json({ error: 'No hay sesión activa' });

    const { closeVotingSession } = require('../services/votingService');
    const result = await closeVotingSession(session.id, req.app.get('io'));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});

module.exports = router;
