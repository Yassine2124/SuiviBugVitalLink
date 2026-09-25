const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Cet email est déjà utilisé' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'Compte créé. En attente de validation par un administrateur.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    if (!user.isApproved) return res.status(403).json({ error: 'Votre compte est en attente de validation' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, permissions: user.permissions } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPendingUsers = async (req, res) => {
  const users = await User.find({ isApproved: false }).select('-password');
  res.json(users);
};

exports.getAllUsers = async (req, res) => {
  const users = await User.find({ isApproved: true, role: { $ne: 'admin' } }).select('-password');
  res.json(users);
};

exports.approveUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json(user);
};

exports.updatePermissions = async (req, res) => {
  const { canView, canCreate, canEdit, canDelete } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, {
    permissions: { canView, canCreate, canEdit, canDelete }
  }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json(user);
};