const { verifyToken, normalizeVerifiedToken } = require('../../../shared/utils/jwt');

const applyUserHeaders = (req, userLike) => {
  const userId = userLike.id || userLike.userId || userLike._id || userLike.uid;
  if (userId) req.headers['x-user-id'] = String(userId);
  if (userLike.role) req.headers['x-user-role'] = userLike.role;
  if (userLike.email) req.headers['x-user-email'] = userLike.email;

  const permissions = Array.isArray(userLike.permissions)
    ? userLike.permissions
    : Array.isArray(userLike.staffProfile?.permissions)
      ? userLike.staffProfile.permissions
      : [];

  if (permissions.length) {
    req.headers['x-user-permissions'] = permissions.join(',');
  }

  if (userLike.firebaseUid || userLike.uid) {
    req.headers['x-firebase-uid'] = String(userLike.firebaseUid || userLike.uid);
  }
};

/**
 * Gateway auth for short internal JWTs issued after the one-time Firebase exchange.
 * Injects x-user-id, x-user-role, x-user-email headers for downstream services.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const user = normalizeVerifiedToken(verifyToken(token));
    applyUserHeaders(req, user);
    next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
    });
  }
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const user = normalizeVerifiedToken(verifyToken(token));
    applyUserHeaders(req, user);
  } catch {
    // ignore — optional auth
  }

  next();
};

module.exports = { authenticate, optionalAuth };
