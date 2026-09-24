const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
  taskId: { type: String, required: true, unique: true },
  dateAdded: { type: Date, default: Date.now },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, enum: ['Bug', 'Amélioration', 'Nouvelle fonctionnalité'], default: 'Bug' },
  platform: { type: String, enum: ['Web', 'Mobile', 'Web & Mobile'], default: 'Web' },
  assignedTo: { type: String },
  priority: { type: String, enum: ['Haute', 'Moyenne', 'Basse'], default: 'Moyenne' },
  status: { type: String, enum: ['Ouvert', 'En cours', 'Bloqué', 'Résolu'], default: 'Ouvert' },
  dueDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Bug', bugSchema);