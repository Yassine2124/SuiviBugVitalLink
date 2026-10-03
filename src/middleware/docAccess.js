// Vérifie si un utilisateur a accès à un dossier/document selon sa visibilité
function hasAccess(item, userId, userRole) {
  if (userRole === 'admin') return true;
  if (item.createdBy.toString() === userId.toString()) return true;
  if (item.visibility === 'Public') return true;
  if (item.visibility === 'Restreint') {
    return item.allowedUsers.some(u => u.userId.toString() === userId.toString());
  }
  return false; // Privé et pas créateur
}

function canContribute(item, userId, userRole) {
  if (userRole === 'admin') return true;
  if (item.createdBy.toString() === userId.toString()) return true;
  if (item.visibility === 'Restreint') {
    const entry = item.allowedUsers.find(u => u.userId.toString() === userId.toString());
    return entry && entry.role === 'Contributeur';
  }
  return false;
}

module.exports = { hasAccess, canContribute };