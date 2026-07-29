import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;
// userId -> Set of connected socket ids (a user can have more than one open tab/device).
const onlineUsers = new Map();

export const initSocket = (httpServer, allowedOrigins) => {
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }
      const decoded = jwt.verify(token, process.env.sessionKey);
      if (!decoded?.id) {
        return next(new Error("Invalid token payload"));
      }
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error("Invalid or expired session"));
    }
  });

  io.on("connection", (socket) => {
    const { userId } = socket;
    socket.join(`user:${userId}`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    socket.emit("presence:snapshot", Array.from(onlineUsers.keys()));
    socket.broadcast.emit("presence:update", { userId, online: true });

    // A client can request a fresh snapshot on demand (e.g. a component mounting
    // after the connect-time snapshot already fired and was missed — Socket.io
    // doesn't replay past events to a listener attached late).
    socket.on("presence:get", () => {
      socket.emit("presence:snapshot", Array.from(onlineUsers.keys()));
    });

    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (!sockets) return;
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("presence:update", { userId, online: false });
      }
    });
  });

  return io;
};

export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

export const isUserOnline = (userId) => onlineUsers.has(userId.toString());
