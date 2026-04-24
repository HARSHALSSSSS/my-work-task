const jwt = require('jsonwebtoken');
const config = require('../config');

const applyUserHeaders = (req, userLike) => {
  const userId = userLike.id || userLike._id;
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

  if (userLike.firebaseUid) {
    req.headers['x-firebase-uid'] = userLike.firebaseUid;
  }
};

const tryVerifyLegacyJwt = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
};

const fetchAuthServiceUser = async (token) => {
  const response = await fetch(`${config.services.auth}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || 'Invalid or expired token');
    error.statusCode = response.status || 401;
    throw error;
  }

  const user = payload?.data?.user || payload?.user || payload?.data || null;
  if (!user) {
    const error = new Error('Authenticated user payload missing');
    error.statusCode = 401;
    throw error;
  }

  return user;
};

const resolveAuthenticatedUser = async (token) => {
  const legacyUser = tryVerifyLegacyJwt(token);
  if (legacyUser) {
    return {
      id: legacyUser.id,
      role: legacyUser.role,
      email: legacyUser.email,
      permissions: legacyUser.permissions,
      firebaseUid: legacyUser.firebaseUid,
    };
  }

  return await fetchAuthServiceUser(token);
};

/**
 * Gateway auth for both legacy internal JWTs and Firebase ID tokens.
 * Injects x-user-id, x-user-role, x-user-email headers for downstream services.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const user = await resolveAuthenticatedUser(token);
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
    const user = await resolveAuthenticatedUser(token);
    applyUserHeaders(req, user);
  } catch {
    // ignore — optional auth
  }

  next();
};

module.exports = { authenticate, optionalAuth };
