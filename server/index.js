const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const colors = require('colors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Database connection
const connectDB = require('./config/database');

// Route imports
const authRoutes = require('./routes/auth');
const dealRoutes = require('./routes/deals');
const propertyRoutes = require('./routes/properties');

// Connect to database
connectDB();

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/properties', propertyRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'BLVCK DLPHN CRM API Server',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test endpoint for API connectivity
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working correctly',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test POST endpoint
app.post('/api/test', (req, res) => {
  res.json({
    message: 'POST request successful',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`.green);

  // Handle user authentication
  socket.on('authenticate', (userData) => {
    connectedUsers.set(socket.id, userData);
    socket.userId = userData.id;
    socket.join(`user_${userData.id}`);
    
    // Broadcast user online status
    socket.broadcast.emit('user_online', userData);
    
    // Send current online users
    const onlineUsers = Array.from(connectedUsers.values());
    socket.emit('online_users', onlineUsers);
  });

  // Handle joining deal rooms
  socket.on('join_deal', (dealId) => {
    socket.join(`deal_${dealId}`);
    console.log(`User ${socket.userId} joined deal room: ${dealId}`.cyan);
  });

  // Handle leaving deal rooms
  socket.on('leave_deal', (dealId) => {
    socket.leave(`deal_${dealId}`);
    console.log(`User ${socket.userId} left deal room: ${dealId}`.cyan);
  });

  // Handle deal updates
  socket.on('deal_update', (data) => {
    socket.to(`deal_${data.dealId}`).emit('deal_updated', data);
  });

  // Handle new deal notifications
  socket.on('new_deal', (data) => {
    socket.broadcast.emit('deal_created', data);
  });

  // Handle offer submissions
  socket.on('offer_submitted', (data) => {
    io.to(`deal_${data.dealId}`).emit('offer_update', data);
  });

  // Handle contract generation
  socket.on('contract_generated', (data) => {
    io.to(`deal_${data.dealId}`).emit('contract_ready', data);
  });

  // Handle property analysis
  socket.on('property_analysis_started', (data) => {
    socket.emit('analysis_progress', { status: 'started', ...data });
  });

  socket.on('property_analysis_completed', (data) => {
    socket.emit('analysis_progress', { status: 'completed', ...data });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`.red);
    
    const userData = connectedUsers.get(socket.id);
    if (userData) {
      connectedUsers.delete(socket.id);
      socket.broadcast.emit('user_offline', userData);
    }
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold);
});