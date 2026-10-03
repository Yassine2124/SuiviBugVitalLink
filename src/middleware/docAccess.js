function hasAccess(item, userId, userRole) {
  if (userRole === 'admin') return true;
  if (item.createdBy.toString() === userId.toString()) return true;
  if (item.visibility === 'Public') return true;
  if (item.visibility === 'Restreint') {
    return item.allowedUsers.some(u => (u.userId?._id || u.userId).toString() === userId.toString());
  }
  return false;
}

function canContribute(item, userId, userRole) {
  if (userRole === 'admin') return true;
  if (item.createdBy.toString() === userId.toString()) return true;
  if (item.visibility === 'Public') return item.publicCanContribute === true;
  if (item.visibility === 'Restreint') {
    const entry = item.allowedUsers.find(u => (u.userId?._id || u.userId).toString() === userId.toString());
    return entry && entry.role === 'Contributeur';
  }
  return false;
}

module.exports = { hasAccess, canContribute };