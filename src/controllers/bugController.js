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
    const bug = new Bug(req.body);
    await bug.save();
    res.status(201).json(bug);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateBug = async (req, res) => {
  try {
    const bug = await Bug.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!bug) return res.status(404).json({ error: 'Bug non trouvé' });
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