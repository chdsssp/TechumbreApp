const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function closeVotingSession(sessionId, io) {
  const session = await prisma.votingSession.findUnique({
    where: { id: sessionId },
    include: { votes: true },
  });

  if (!session || session.status !== 'ACTIVE') return null;

  const votesOpen = session.votes.filter(v => v.vote === 'OPEN').length;
  const votesClose = session.votes.filter(v => v.vote === 'CLOSE').length;
  const totalVotes = votesOpen + votesClose;

  let result;
  if (totalVotes < session.quorumNeeded) {
    result = 'NO_QUORUM';
  } else if (votesOpen > votesClose) {
    result = 'OPEN';
  } else if (votesClose > votesOpen) {
    result = 'CLOSE';
  } else {
    result = 'TIE';
  }

  const updated = await prisma.votingSession.update({
    where: { id: sessionId },
    data: { status: 'CLOSED', result, totalVotes, closedAt: new Date() },
  });

  if (result === 'OPEN' || result === 'CLOSE') {
    const state = await prisma.systemState.findUnique({ where: { id: 1 } });
    if (state && state.activePriority >= 4 && !state.emergencyLock) {
      const newRoofState = result === 'OPEN' ? 'OPEN' : 'CLOSED';
      await prisma.systemState.update({
        where: { id: 1 },
        data: { roofState: newRoofState, activePriority: 4 },
      });

      if (io) {
        io.emit('roof:command', { command: 'SET_ROOF', state: newRoofState, source: 'voting', priority: 4 });
        io.emit('roof:moving', { targetState: newRoofState });
        io.emit('system:status', { roofState: newRoofState, priority: 4, emergencyLock: false });
      }
    }
  }

  if (io) {
    io.emit('session:result', { result, votesOpen, votesClose });
  }

  return { result, votesOpen, votesClose, totalVotes };
}

module.exports = { closeVotingSession };
