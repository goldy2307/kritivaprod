const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload; // { id, username, role, permissions }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// role 'admin' always passes. role 'back-office' must have the permission in their token.
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.admin) return res.status(401).json({ error: 'Not authenticated' });
    if (req.admin.role === 'admin') return next();
    const perms = req.admin.permissions || [];
    if (perms.includes(permission)) return next();
    return res.status(403).json({ error: `Missing permission: ${permission}` });
  };
}

module.exports = { requireAuth, requirePermission };
