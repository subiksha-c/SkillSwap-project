# SkillSwap App - Complete Setup Guide

## 🚀 Features Implemented

### ✅ Core Features
- **User Registration & Login** - Secure authentication system
- **Skill Management** - Add, view, edit, and delete skills
- **Request System** - Send and manage skill exchange requests
- **Points & Gamification** - Earn points for activities

### 🆕 New Features Added
- **📢 Notification System** - Send detailed skill exchange requests with custom messages
- **💬 Real-time Chat** - Chat with other users after notifications are accepted
- **🔔 Dashboard Integration** - Live notification updates on dashboard
- **📱 Responsive UI** - Modern Tailwind CSS interface

## 📋 Prerequisites

1. **MySQL Database** (running on localhost:3306)
2. **Node.js** (v14 or higher)
3. **Web Browser** (Chrome, Firefox, Safari, etc.)

## 🛠️ Setup Instructions

### 1. Database Setup

1. **Create Database:**
   ```sql
   CREATE DATABASE skillswap;
   USE skillswap;
   ```

2. **Run Database Schema:**
   Execute the SQL commands from `Backend/database_schema.sql`:
   ```bash
   mysql -u root -p skillswap < Backend/database_schema.sql
   ```

3. **Create Required Tables:**
   The schema includes:
   - `users` - User accounts
   - `skills` - User skills
   - `requests` - Skill exchange requests
   - `notifications` - New notification system
   - `chat_rooms` - Chat room management
   - `chat_messages` - Chat messages

### 2. Backend Setup

1. **Navigate to Backend Directory:**
   ```bash
   cd Backend/
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Database Connection:**
   Update `db.js` with your MySQL credentials:
   ```javascript
   const pool = mysql.createPool({
     host: "localhost",
     user: "root",          // Your MySQL username
     password: "1234567",   // Your MySQL password
     database: "skillswap",
     port: 3306
   });
   ```

4. **Start Backend Server:**
   ```bash
   node server.js
   ```
   Server will run on `http://localhost:5000`

### 3. Frontend Access

1. **Open in Browser:**
   Navigate to: `http://localhost:5000` or directly open `login.html`

2. **Create Account:**
   - Register a new user account
   - Login with your credentials

## 🎯 How to Use New Features

### 📢 Notification System

1. **Send Notification:**
   - Go to "View Skills" page
   - Find a skill you're interested in
   - Click "➕ Add Requirement & Notify"
   - Fill in duration and custom message
   - Click "📩 Send Notification"

2. **Receive Notifications:**
   - Check dashboard for notification count badge
   - Click on "📢 Notifications" in navbar or dashboard
   - View detailed notifications with Accept/Reject options

### 💬 Chat System

1. **Start Chat:**
   - Accept a notification from another user
   - Click "💬 Start Chat" button
   - Or navigate to Chat page from navbar

2. **Chat Features:**
   - Real-time messaging
   - Chat room management
   - Message history
   - Auto-refresh every 3 seconds

### 🔔 Dashboard Integration

- **Live Updates:** Notifications refresh every 30 seconds
- **Unread Count:** Red badges show unread notification count
- **Quick Access:** Click notification card to go to full notifications page

## 📊 API Endpoints

### Notification Endpoints
- `POST /notifications/send` - Send notification
- `GET /notifications/:user_id` - Get user notifications
- `POST /notifications/update` - Update notification status

### Chat Endpoints
- `POST /chat/room` - Create/get chat room
- `POST /chat/message` - Send message
- `GET /chat/messages/:room_id` - Get messages
- `GET /chat/rooms/:user_id` - Get user's chat rooms

## 🎨 Pages Overview

### Core Pages
- `login.html` - User authentication
- `register.html` - User registration
- `dash.html` - Main dashboard with gamification
- `addskills.html` - Add new skills
- `viewskills.html` - Browse all skills (with notification modal)
- `request.html` - Manage skill requests

### New Pages
- `notifications.html` - Complete notification management
- `chat.html` - Real-time chat interface

## 🔧 Technical Details

### Database Schema
- **notifications table:** Stores skill exchange notifications with custom messages
- **chat_rooms table:** Manages chat sessions between users
- **chat_messages table:** Stores all chat messages with timestamps

### Frontend Technologies
- **Tailwind CSS** - Modern responsive styling
- **Vanilla JavaScript** - No framework dependencies
- **Fetch API** - RESTful API communication

### Backend Technologies
- **Node.js + Express** - Server framework
- **MySQL2** - Database connectivity
- **bcrypt** - Password hashing
- **CORS** - Cross-origin resource sharing

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed:**
   - Check MySQL is running
   - Verify credentials in `db.js`
   - Ensure database `skillswap` exists

2. **Server Not Starting:**
   - Check if port 5000 is available
   - Run `npm install` in Backend directory
   - Check for syntax errors in server.js

3. **Notifications Not Loading:**
   - Ensure backend server is running
   - Check browser console for errors
   - Verify user is logged in (check localStorage)

4. **Chat Not Working:**
   - Ensure notifications are accepted first
   - Check if chat room was created
   - Verify WebSocket-like polling is working

## 🎉 Testing the Complete Flow

### End-to-End Test Scenario

1. **Setup:**
   - Create 2 user accounts (User A & User B)
   - User A adds a skill (e.g., "Python Programming")

2. **Notification Flow:**
   - User B views skills and finds User A's Python skill
   - User B clicks "Add Requirement & Notify"
   - User B fills: Duration="2 weeks", Message="I want to learn Python basics"
   - User B sends notification

3. **Response Flow:**
   - User A logs in and sees notification badge on dashboard
   - User A goes to Notifications page
   - User A sees User B's detailed request
   - User A accepts the notification

4. **Chat Flow:**
   - User A clicks "Start Chat" or "Continue Chat"
   - Both users can now chat in real-time
   - Messages are persistent and auto-refresh

## 📈 Future Enhancements

- **Real-time WebSocket** integration for instant messaging
- **File sharing** in chat
- **Video call** integration
- **Push notifications** for mobile
- **Advanced search** and filtering
- **Skill rating** system

## 🤝 Support

If you encounter any issues:
1. Check the browser console for JavaScript errors
2. Verify backend server logs
3. Ensure all database tables are created correctly
4. Test API endpoints using tools like Postman

---

**🎯 Your SkillSwap app now has a complete notification and chat system that enables seamless skill exchange communication!**
