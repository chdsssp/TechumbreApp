const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let emergencyClearTimeout = null;

async function evaluatePriorities(io, data) {
  const state = await prisma.systemState.findUnique({ where: { id: 1 } });
  if (!state) return;

  const isEmergency = data.rain === true || data.uvIndex >= 8;

  if (isEmergency && state.rainAutoMode) {
    if (emergencyClearTimeout) {
      clearTimeout(emergencyClearTimeout);
      emergencyClearTimeout = null;
    }

    if (!state.emergencyLock || state.roofState !== 'CLOSED') {
      await prisma.systemState.update({
        where: { id: 1 },
        data: { emergencyLock: true, roofState: 'CLOSED', activePriority: 1 },
      });

      if (io) {
        io.emit('roof:command', { command: 'SET_ROOF', state: 'CLOSED', source: 'emergency', priority: 1 });
        io.emit('roof:moving', { targetState: 'CLOSED' });
        io.emit('system:status', { roofState: 'CLOSED', priority: 1, emergencyLock: true });
      }
    }
  } else if (state.emergencyLock && !isEmergency) {
    if (!emergencyClearTimeout) {
      emergencyClearTimeout = setTimeout(async () => {
        const currentState = await prisma.systemState.findUnique({ where: { id: 1 } });
        if (currentState?.emergencyLock) {
          const activeOverride = await prisma.override.findFirst({ where: { active: true } });
          const newPriority = activeOverride ? 2 : 4;

          await prisma.systemState.update({
            where: { id: 1 },
            data: { emergencyLock: false, activePriority: newPriority },
          });

          if (io) {
            io.emit('system:status', {
              roofState: currentState.roofState,
              priority: newPriority,
              emergencyLock: false,
            });
          }
        }
        emergencyClearTimeout = null;
      }, 60000);
    }
  }
}

module.exports = { evaluatePriorities };
