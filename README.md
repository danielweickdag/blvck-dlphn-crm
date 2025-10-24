# BLVCK DLPHN CRM System

A comprehensive Real Estate Investment Customer Relationship Management (CRM) system built with modern web technologies.

## 🏢 Overview

BLVCK DLPHN CRM is a full-stack web application designed for real estate investment management. It provides a complete solution for managing deals, properties, client relationships, and investment analytics.

## ✨ Features

### 🔐 Authentication & User Management
- Secure JWT-based authentication
- Role-based access control (Admin, Agent, Client)
- User registration and login system
- Admin user management capabilities

### 📊 Dashboard & Analytics
- Real-time investment analytics
- Deal performance metrics
- Property portfolio overview
- Revenue tracking and forecasting

### 🏠 Property Management
- Property listing and details
- Property analysis tools
- Market value assessments
- Property status tracking

### 💼 Deal Management
- Deal creation and tracking
- Deal pipeline management
- Client assignment and communication
- Deal status updates and notifications

### 📄 Document Management
- Automated contract generation
- Document templates
- Digital signature integration
- File storage and organization

### 🤖 Discord Integration
- Real-time notifications
- Team communication
- Deal updates and alerts
- Bot commands for quick actions

## 🛠️ Technology Stack

### Frontend
- **React.js** - Modern UI framework
- **React Router** - Client-side routing
- **Context API** - State management
- **CSS3** - Responsive styling
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **Socket.io** - Real-time communication

### Additional Services
- **Discord.js** - Discord bot integration
- **PDF Generation** - Contract creation
- **Property Analysis APIs** - Market data integration

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/danielweickdag/blvck-dlphn-crm.git
   cd blvck-dlphn-crm
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   
   # Install server dependencies
   cd ../server
   npm install
   
   # Install Discord bot dependencies
   cd ../discord-bot
   npm install
   ```

3. **Environment Setup**
   
   Create `.env` files in the respective directories:
   
   **Server (.env)**
   ```env
   NODE_ENV=development
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/blvck-dlphn-crm
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRE=30d
   ```
   
   **Client (.env)**
   ```env
   REACT_APP_API_URL=http://localhost:5001
   REACT_APP_SOCKET_URL=http://localhost:5001
   ```
   
   **Discord Bot (.env)**
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   GUILD_ID=your_discord_server_id
   ```

4. **Database Setup**
   
   Start MongoDB and create an admin user:
   ```bash
   # Start MongoDB (if using Homebrew on macOS)
   brew services start mongodb/brew/mongodb-community
   
   # Create admin user
   cd server
   node scripts/createAdmin.js
   ```

5. **Start the Application**
   
   Open three terminal windows:
   
   **Terminal 1 - Backend Server**
   ```bash
   cd server
   npm start
   ```
   
   **Terminal 2 - Frontend Client**
   ```bash
   cd client
   npm start
   ```
   
   **Terminal 3 - Discord Bot (Optional)**
   ```bash
   cd discord-bot
   npm start
   ```

6. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - Admin Login: Use the credentials created in step 4

## 📁 Project Structure

```
blvck-dlphn-crm/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── context/       # React context providers
│   │   └── config/        # Configuration files
│   └── package.json
├── server/                # Express backend application
│   ├── config/           # Database and app configuration
│   ├── middleware/       # Custom middleware
│   ├── models/          # MongoDB data models
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic services
│   ├── scripts/         # Utility scripts
│   └── package.json
├── discord-bot/         # Discord bot integration
│   ├── bot.js
│   └── package.json
├── .gitignore
├── .env.example
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Deals
- `GET /api/deals` - Get all deals
- `POST /api/deals` - Create new deal
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

### Properties
- `GET /api/properties` - Get all properties
- `POST /api/properties` - Create new property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- CORS protection
- Environment variable protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software owned by BLVCK DLPHN Investments.

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**BLVCK DLPHN CRM System** - Empowering Real Estate Investment Management