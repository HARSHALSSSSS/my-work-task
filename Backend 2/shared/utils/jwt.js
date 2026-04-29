const jwt = require('jsonwebtoken');

const normalizeString = (value) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const getUserId = (source = {}) =>
    normalizeString(source.id || source.userId || source._id || source.sub);

const getFirebaseUid = (source = {}) =>
    normalizeString(source.uid || source.firebaseUid);

const getPermissions = (source = {}) => {
    const rawPermissions = Array.isArray(source.permissions)
        ? source.permissions
        : Array.isArray(source.staffProfile?.permissions)
          ? source.staffProfile.permissions
          : [];

    return rawPermissions.map((permission) => normalizeString(permission)).filter(Boolean);
};

const getScopes = (source = {}) => {
    const rawScopes = Array.isArray(source.scopes)
        ? source.scopes
        : Array.isArray(source.staffProfile?.scopes)
          ? source.staffProfile.scopes
          : [];

    return rawScopes.map((scope) => normalizeString(scope)).filter(Boolean);
};

const signToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

const verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

const buildSessionPayload = (user = {}) => {
    const id = getUserId(user);
    const firebaseUid = getFirebaseUid(user);
    const uid = firebaseUid || id;
    const permissions = getPermissions(user);
    const scopes = getScopes(user);
    const payload = {
        uid,
        email: normalizeString(user.email),
        role: normalizeString(user.role) || 'user',
    };

    if (id) payload.id = id;
    if (firebaseUid) payload.firebaseUid = firebaseUid;
    if (permissions.length) payload.permissions = permissions;
    if (scopes.length) payload.scopes = scopes;
    if (user.staffProfile?.team) payload.team = normalizeString(user.staffProfile.team);

    return payload;
};

const normalizeVerifiedToken = (decoded = {}) => {
    const id = getUserId(decoded);
    const firebaseUid = getFirebaseUid(decoded);
    const uid = firebaseUid || id || normalizeString(decoded.uid);
    const permissions = getPermissions(decoded);
    const scopes = getScopes(decoded);

    return {
        ...decoded,
        ...(id ? { id, userId: id } : {}),
        ...(uid ? { uid } : {}),
        ...(firebaseUid ? { firebaseUid } : {}),
        email: normalizeString(decoded.email),
        role: normalizeString(decoded.role) || 'user',
        ...(permissions.length ? { permissions } : {}),
        ...(scopes.length ? { scopes } : {}),
    };
};

module.exports = { signToken, verifyToken, buildSessionPayload, normalizeVerifiedToken };
