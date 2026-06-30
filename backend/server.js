require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { connectDB } = require('./config/db');

// Route Files
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);

// Test endpoint
app.get('/', (req, res) => {
  res.send('Wedding Project Management System API is running...');
});

// Configure Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Attach io to global object so controllers can access it
global.io = io;

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Client joining project-specific board updates
  socket.on('joinProject', (projectId) => {
    socket.join(String(projectId));
    console.log(`Socket ${socket.id} joined project room: ${projectId}`);
  });

  socket.on('leaveProject', (projectId) => {
    socket.leave(String(projectId));
    console.log(`Socket ${socket.id} left project room: ${projectId}`);
  });

  // Client joining private user notifications room
  socket.on('joinUser', (userId) => {
    socket.join(`user_${String(userId)}`);
    console.log(`Socket ${socket.id} joined private user room: user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Connect to Database and start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to MongoDB (will automatically fall back to JSON if offline)
  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
