const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const activeTasks = [];

function clearTasks() {
  activeTasks.forEach(task => task.stop());
  activeTasks.length = 0;
}

async function reloadSchedules(io) {
  clearTasks();

  const schedules = await prisma.schedule.findMany({ where: { active: true } });

  for (const schedule of schedules) {
    const [hour, minute] = schedule.time.split(':');
    const days = schedule.dayOfWeek.join(',');
    const cronExpr = `${minute} ${hour} * * ${days}`;

    const task = cron.schedule(cronExpr, async () => {
      const state = await prisma.systemState.findUnique({ where: { id: 1 } });
      if (!state || state.activePriority < 3 || state.emergencyLock) return;

      const newRoofState = schedule.action === 'OPEN' ? 'OPEN' : 'CLOSED';

      await prisma.systemState.update({
        where: { id: 1 },
        data: { roofState: newRoofState, activePriority: 3 },
      });

      if (io) {
        io.emit('roof:command', { command: 'SET_ROOF', state: newRoofState, source: 'scheduler', priority: 3 });
        io.emit('roof:moving', { targetState: newRoofState });
        io.emit('system:status', { roofState: newRoofState, priority: 3, emergencyLock: false });
      }
    });

    activeTasks.push(task);
  }
}

module.exports = { reloadSchedules };
