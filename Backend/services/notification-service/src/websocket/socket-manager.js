const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../../../../shared/utils/logger');

let io = null;

// Track connected users: Map<userId, Set<socketId>>
const connectedUsers = new Map();
// Track connected roles: Map<role, Set<socketId>>
const connectedRoles = new Map();

/**
 * Initialize Socket.IO on the given HTTP server.
 * Handles JWT authentication, room management, and connection lifecycle.
 */
const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
    });

    // ─── JWT Authentication Middleware ─────────────────────
    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const secret = process.env.JWT_SECRET || 'speedcopy-dev-secret';
            const decoded = jwt.verify(token, secret);

            socket.userId = decoded.id || decoded.userId || decoded.sub;
            socket.userRole = decoded.role || 'user';
            socket.userEmail = decoded.email || '';

            if (!socket.userId) {
                return next(new Error('Invalid token: missing user ID'));
            }

            next();
        } catch (err) {
            logger.warn(`WebSocket auth failed: ${err.message}`);
            next(new Error('Authentication failed'));
        }
    });

    // ─── Connection Handler ───────────────────────────────
    io.on('connection', (socket) => {
        const { userId, userRole } = socket;

        // Join user-specific room
        socket.join(`user:${userId}`);

        // Join role-based room
        socket.join(`role:${userRole}`);

        // Track connected user
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
        }
        connectedUsers.get(userId).add(socket.id);

        // Track role connections
        if (!connectedRoles.has(userRole)) {
            connectedRoles.set(userRole, new Set());
        }
        connectedRoles.get(userRole).add(socket.id);

        logger.info(`🔌 Socket connected: ${userId} (${userRole}) [${socket.id}]`);

        // ─── Client Event Handlers ────────────────────────

        // Mark notification as read in real-time
        socket.on('notification:markRead', (data) => {
            socket.to(`user:${userId}`).emit('notification:read', {
                notificationId: data.notificationId,
                readAt: new Date(),
            });
        });

        // Typing indicator for ticket replies
        socket.on('ticket:typing', (data) => {
            if (data.ticketId) {
                socket.to(`ticket:${data.ticketId}`).emit('ticket:typing', {
                    userId,
                    userRole,
                    ticketId: data.ticketId,
                });
            }
        });

        // Join a specific ticket room (for live ticket chat)
        socket.on('ticket:join', (data) => {
            if (data.ticketId) {
                socket.join(`ticket:${data.ticketId}`);
            }
        });

        socket.on('ticket:leave', (data) => {
            if (data.ticketId) {
                socket.leave(`ticket:${data.ticketId}`);
            }
        });

        // ─── Disconnect Handler ───────────────────────────

        socket.on('disconnect', (reason) => {
            // Clean up user tracking
            const userSockets = connectedUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) connectedUsers.delete(userId);
            }

            // Clean up role tracking
            const roleSockets = connectedRoles.get(userRole);
            if (roleSockets) {
                roleSockets.delete(socket.id);
                if (roleSockets.size === 0) connectedRoles.delete(userRole);
            }

            logger.info(`🔌 Socket disconnected: ${userId} (${reason}) [${socket.id}]`);
        });
    });

    logger.info('⚡ WebSocket server initialized');
    return io;
};

/**
 * Emit an event to a specific user (across all their connected sockets).
 */
const emitToUser = (userId, event, data) => {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Emit an event to all users with a specific role.
 */
const emitToRole = (role, event, data) => {
    if (!io) return;
    io.to(`role:${role}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Emit an event to a specific ticket room.
 */
const emitToTicket = (ticketId, event, data) => {
    if (!io) return;
    io.to(`ticket:${ticketId}`).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Broadcast an event to all connected clients.
 */
const emitToAll = (event, data) => {
    if (!io) return;
    io.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Check if a user is currently online.
 */
const isUserOnline = (userId) => {
    return connectedUsers.has(userId) && connectedUsers.get(userId).size > 0;
};

/**
 * Get count of connected users by role.
 */
const getOnlineStats = () => {
    const stats = { totalConnections: 0, byRole: {} };
    for (const [role, sockets] of connectedRoles.entries()) {
        stats.byRole[role] = sockets.size;
        stats.totalConnections += sockets.size;
    }
    stats.uniqueUsers = connectedUsers.size;
    return stats;
};

/**
 * Get the Socket.IO instance (for advanced use cases).
 */
const getIO = () => io;

module.exports = {
    initializeSocket,
    emitToUser,
    emitToRole,
    emitToTicket,
    emitToAll,
    isUserOnline,
    getOnlineStats,
    getIO,
};
