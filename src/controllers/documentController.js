const DocModel = require('../models/Document');
const Folder = require('../models/Folder');
const { hasAccess, canContribute } = require('../middleware/docAccess');

exports.uploadDocument = async (req, res) => {
  try {
    const { name, folder, visibility, allowedUsers, fileUrl, fileType, fileSize, publicCanContribute } = req.body;

    if (folder) {
      const parentFolder = await Folder.findById(folder);
      if (!parentFolder) return res.status(404).json({ error: 'Dossier non trouvé' });
      if (!canContribute(parentFolder, req.user._id, req.user.role)) {
        return res.status(403).json({ error: 'Vous n\'avez pas le droit d\'ajouter dans ce dossier' });
      }
    }

    const doc = new DocModel({
      name, folder: folder || null, fileUrl, fileType, fileSize,
      visibility: visibility || 'Privé', publicCanContribute: publicCanContribute || false,
      allowedUsers: allowedUsers || [],
      createdBy: req.user._id, createdByName: req.user.name
    });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { folder } = req.query;
    const docs = await DocModel.find({ folder: folder || null }).populate('allowedUsers.userId', 'name');
    const accessible = docs.filter(d => hasAccess(d, req.user._id, req.user.role));
    res.json(accessible);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    const doc = await DocModel.findById(req.params.id).populate('allowedUsers.userId', 'name');
    if (!doc) return res.status(404).json({ error: 'Document non trouvé' });
    if (!hasAccess(doc, req.user._id, req.user.role)) return res.status(403).json({ error: 'Accès refusé' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const doc = await DocModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document non trouvé' });
    if (doc.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seul le créateur peut modifier ce document' });
    }
    const updated = await DocModel.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('allowedUsers.userId', 'name');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await DocModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document non trouvé' });
    if (doc.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seul le créateur peut supprimer ce document' });
    }
    await DocModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};