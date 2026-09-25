const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non autorisé' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isApproved) return res.status(401).json({ error: 'Non autorisé' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
};

exports.checkPermission = (action) => (req, res, next) => {
  if (req.user.role === 'admin' || req.user.permissions?.[action]) return next();
  res.status(403).json({ error: 'Vous n\'avez pas la permission pour cette action' });
};