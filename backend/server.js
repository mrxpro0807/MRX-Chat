const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mrx-chat')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/calls', require('./routes/calls'));

app.get('/', (req, res) => {
  res.json({ message: '🎉 MRX-Chat Backend API Running' });
});

// Socket.io Events
const connectedUsers = {};

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  socket.on('user_online', (userId) => {
    connectedUsers[userId] = socket.id;
    io.emit('user_status', { userId, status: 'online' });
  });

  socket.on('send_message', (data) => {
    io.to(connectedUsers[data.receiverId]).emit('receive_message', data);
  });

  socket.on('typing', (data) => {
    io.to(connectedUsers[data.receiverId]).emit('user_typing', { userId: data.senderId });
  });

  socket.on('stop_typing', (data) => {
    io.to(connectedUsers[data.receiverId]).emit('user_stop_typing', { userId: data.senderId });
  });

  socket.on('call_initiate', (data) => {
    io.to(connectedUsers[data.receiverId]).emit('incoming_call', {
      callerId: data.callerId,
      callerName: data.callerName,
      callType: data.callType // 'audio' или 'video'
    });
  });

  socket.on('call_accept', (data) => {
    io.to(connectedUsers[data.callerId]).emit('call_accepted', { receiverId: data.receiverId });
  });

  socket.on('call_reject', (data) => {
    io.to(connectedUsers[data.callerId]).emit('call_rejected', { receiverId: data.receiverId });
  });

  socket.on('disconnect', () => {
    Object.keys(connectedUsers).forEach(key => {
      if (connectedUsers[key] === socket.id) {
        delete connectedUsers[key];
        io.emit('user_status', { userId: key, status: 'offline' });
      }
    });
    console.log('👤 User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { app, io };