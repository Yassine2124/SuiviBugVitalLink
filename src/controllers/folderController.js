const Folder = require('../models/Folder');
const Document = require('../models/Document');
const { hasAccess } = require('../middleware/docAccess');

exports.createFolder = async (req, res) => {
  try {
    const { name, parent, visibility, allowedUsers } = req.body;
    const folder = new Folder({
      name, parent: parent || null, visibility: visibility || 'Privé',
      allowedUsers: allowedUsers || [], createdBy: req.user._id, createdByName: req.user.name
    });
    await folder.save();
    res.status(201).json(folder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getFolders = async (req, res) => {
  try {
    const { parent } = req.query;
    const folders = await Folder.find({ parent: parent || null }).populate('allowedUsers.userId', 'name');
    const accessible = folders.filter(f => hasAccess(f, req.user._id, req.user.role));
    res.json(accessible);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFolderById = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id).populate('allowedUsers.userId', 'name');
    if (!folder) return res.status(404).json({ error: 'Dossier non trouvé' });
    if (!hasAccess(folder, req.user._id, req.user.role)) return res.status(403).json({ error: 'Accès refusé' });
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Dossier non trouvé' });
    if (folder.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seul le créateur peut modifier ce dossier' });
    }
    const updated = await Folder.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('allowedUsers.userId', 'name');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Dossier non trouvé' });
    if (folder.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seul le créateur peut supprimer ce dossier' });
    }
    const subFolders = await Folder.find({ parent: folder._id });
    if (subFolders.length > 0) return res.status(400).json({ error: 'Supprimez d\'abord les sous-dossiers' });
    const docs = await Document.find({ folder: folder._id });
    if (docs.length > 0) return res.status(400).json({ error: 'Supprimez d\'abord les documents de ce dossier' });

    await Folder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Dossier supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};