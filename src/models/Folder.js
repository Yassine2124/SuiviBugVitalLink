const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  visibility: { type: String, enum: ['Privé', 'Public', 'Restreint'], default: 'Privé' },
  allowedUsers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['Lecteur', 'Contributeur'], default: 'Lecteur' }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Folder', folderSchema);