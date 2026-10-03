const Bug = require('../models/Bug');

exports.getAllBugs = async (req, res) => {
  try {
    const bugs = await Bug.find().sort({ dateAdded: -1 });
    res.json(bugs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBugById = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id);
    if (!bug) return res.status(404).json({ error: 'Bug non trouvé' });
    res.json(bug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createBug = async (req, res) => {
  try {
    const bug = new Bug({ ...req.body, createdBy: req.user.name });
    await bug.save();
    res.status(201).json(bug);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateBug = async (req, res) => {
  try {
    const existing = await Bug.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Bug non trouvé' });

    if (req.body.status === 'Dev terminé' && existing.status !== 'Dev terminé') {
      if (existing.assignedTo !== req.user.name && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Seule la personne assignée peut marquer ce bug comme terminé' });
      }
    }

    const bug = await Bug.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(bug);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteBug = async (req, res) => {
  try {
    const bug = await Bug.findByIdAndDelete(req.params.id);
    if (!bug) return res.status(404).json({ error: 'Bug non trouvé' });
    res.json({ message: 'Bug supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};