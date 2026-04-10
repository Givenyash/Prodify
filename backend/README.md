# ProdiFY Backend - MERN Stack API

## Overview
This is the backend API for ProdiFY, a task management application built with Node.js, Express, and MongoDB.

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
The `.env` file has been created with default values. Update the following variables as needed:

```env
# Server Configuration
PORT=8001
NODE_ENV=development

# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017/prodify
DB_NAME=prodify

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Admin Credentials
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

### 3. MongoDB Setup

#### Option A: Local MongoDB Installation
1. Install MongoDB Community Edition from [MongoDB官网](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   - Windows: MongoDB should start automatically after installation
   - macOS: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`
3. The default connection string is: `mongodb://localhost:27017/prodify`

#### Option B: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string from Atlas
4. Update `MONGO_URL` in `.env` file with your Atlas connection string:
   ```
   MONGO_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/prodify?retryWrites=true&w=majority
   ```

### 4. Test Database Connection
```bash
npm run test-db
```

### 5. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:8001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh access token

### Tasks
- `GET /api/tasks` - Get all tasks (with filters: status, priority, tag, search)
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:taskId` - Get a specific task
- `PUT /api/tasks/:taskId` - Update a task
- `DELETE /api/tasks/:taskId` - Delete a task
- `POST /api/tasks/reorder` - Reorder tasks
- `GET /api/tasks/stats/summary` - Get task statistics

### Tags
- `GET /api/tags` - Get all tags with counts

### Health Check
- `GET /api/` - API health check

## Database Models

### User
- name: String
- email: String (unique, lowercase)
- passwordHash: String (bcrypt hashed)
- role: String (user/admin)
- createdAt: Date

### Task
- id: String (unique)
- title: String (max 200 chars)
- description: String
- priority: String (low/medium/high)
- deadline: Date
- status: String (todo/in_progress/done)
- tags: Array of Strings
- userId: ObjectId (ref: User)
- position: Number
- createdAt: Date
- updatedAt: Date

## Security Features
- Password hashing with bcrypt
- JWT-based authentication (access + refresh tokens)
- HTTP-only cookies for token storage
- Brute force protection on login
- Input validation with express-validator
- CORS configuration

## Default Admin Account
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ Important:** Change these credentials in production!

## Project Structure
```
backend/
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── models/
│   ├── User.js              # User schema
│   ├── Task.js              # Task schema
│   └── LoginAttempt.js      # Login attempt tracking
├── routes/
│   ├── auth.js              # Authentication routes
│   └── tasks.js             # Task management routes
├── utils/
│   ├── jwt.js               # JWT token utilities
│   └── seed.js              # Admin user seeding
├── .env                     # Environment variables
├── server.js                # Main server file
├── test-db.js               # Database connection test
└── package.json
```

## Troubleshooting

### MongoDB Connection Issues
1. **Check if MongoDB is running:**
   - Windows: Check Services or run `mongod` in terminal
   - Verify with: `mongosh` or `mongo` command

2. **Verify connection string:**
   - Local: `mongodb://localhost:27017/prodify`
   - Atlas: Check username, password, and cluster URL

3. **Check firewall/antivirus:**
   - Ensure port 27017 is not blocked

### Common Errors
- **ECONNREFUSED**: MongoDB is not running
- **Authentication failed**: Check MongoDB credentials
- **ENOTFOUND**: Invalid hostname in connection string

## Development Tips
- Use `npm run dev` for development with auto-reload
- Run `npm run test-db` to verify MongoDB connection
- Check server logs for detailed error messages
- Use tools like Postman or Thunder Client to test APIs
