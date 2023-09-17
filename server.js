import { instrument } from "@socket.io/admin-ui";

import Express from "express";
import cors from "cors";
import { Server as SocketServer } from "socket.io";

const app = Express();
const PORT = 5000;
// Using Set Data Structure due to non-duplicate entry behaviour.
const activeConnections = new Map();

const corsOrigins = [
  "http://localhost:5173",
  "https://admin.socket.io/",
  "https://social-client-delta.vercel.app",
  "https://social-client-delta.vercel.app/chatroom",
];

app.use(
  cors({
    origin: corsOrigins,
  })
);

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Socket Config
const io = new SocketServer(server, {
  cors: {
    origin: corsOrigins,
  },
});

// Socket Routes
io.on("connection", (socket) => {
  // JOIN ROOM EVENT
  socket.on("join-room", (room, name) => {
    if (activeConnections.get(room)) {
      activeConnections.get(room).add(socket.id);
    } else {
      activeConnections.set(room, new Set());
      activeConnections.get(room).add(socket.id);
    }

    socket.join(room);
    io.to(room).emit("active-connections", activeConnections.get(room).size);
    console.log(
      "size of room -",
      room,
      " is ",
      activeConnections.get(room).size
    );
    socket.broadcast.to(room).emit("messages", {
      name,
      message: `${name} has joined the chat.`,
      time: Date.now(),
    });

    // MESSAGE EVENT
    socket.on("messages", (receivedMsg) => {
      socket.broadcast.to(room).emit("messages", receivedMsg);
    });

    // ROOM EXIT EVENT
    socket.on("disconnect", () => {
      console.log(`User ${socket.id} left ${room}.`);
      activeConnections.get(room).delete(socket.id);
      // console.log(activeConnections.get(room))
      socket.broadcast
        .to(room)
        .emit("active-connections", activeConnections.get(room).size);
      console.log(
        "size of room -",
        room,
        " is ",
        activeConnections.get(room).size
      );

      socket.broadcast.to(room).emit("messages", {
        name,
        message: `${name} left this room.`,
        time: Date.now(),
      }); // Emit to all in the room when user disconnects
    });
  });

  // NUMBER OF ACTIVE CONNECTIONS EVENT
  //   socket.on("active-connections", () => {
  //   });

  // DISCONNECTION EVENT
  socket.on("disconnect", () => {
    // activeConnections.get(socket.rooms).delete(socket.id);
    // console.log(socket.rooms)
    // console.log(socket.rooms.keys)
    // io.emit("active-connections", activeConnections.size);
    // console.log(
    //   `${socket.id} disconnected. Total connections ${activeConnections.size}`
    // );
  });
});

// CONNECTS TO ADMIN DASHBOARD
instrument(io, { auth: false });
