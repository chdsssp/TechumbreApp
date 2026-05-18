const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
}

function authenticateEsp32(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const { esp32ApiKey } = require('../config');
  if (apiKey !== esp32ApiKey) {
    return res.status(401).json({ error: 'API key inválida' });
  }
  next();
}

module.exports = { authenticateToken, requireRole, authenticateEsp32, prisma };
