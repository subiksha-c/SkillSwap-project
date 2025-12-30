const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const path = require("path");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files from parent directory (where HTML files are located)
app.use(express.static(path.join(__dirname, "..")));

// Store active SSE connections for real-time notifications
const activeConnections = new Map();

// ------------------- REAL-TIME SSE ENDPOINT -------------------

// 🔔 Server-Sent Events for real-time notifications
app.get("/notifications/stream/:user_id", (req, res) => {
  const userId = req.params.user_id;
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Store connection
  activeConnections.set(userId, res);
  
  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Real-time notifications connected',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    activeConnections.delete(userId);
    console.log(`📱 User ${userId} disconnected from real-time notifications`);
  });

  console.log(`📱 User ${userId} connected to real-time notifications`);
});

// Function to send real-time notification to user
function sendRealTimeNotification(userId, notification) {
  const connection = activeConnections.get(userId.toString());
  if (connection) {
    try {
      connection.write(`data: ${JSON.stringify({
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString()
      })}\n\n`);
      console.log(`📢 Real-time notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending real-time notification:', error);
      activeConnections.delete(userId.toString());
    }
  }
}

// Function to send real-time chat message
function sendRealTimeChatMessage(chatRoomId, message) {
  // Get all users in the chat room and send them the message
  activeConnections.forEach((connection, userId) => {
    try {
      connection.write(`data: ${JSON.stringify({
        type: 'chat_message',
        chat_room_id: chatRoomId,
        data: message,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      console.error('Error sending real-time chat message:', error);
      activeConnections.delete(userId);
    }
  });
}

// ------------------- APIs -------------------

// 🚀 Home redirect to login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../login.html"));
});

// 📝 Register
app.post("/auth/register", async (req, res) => {
  const { name, email, password, location } = req.body;

  if (!name || !email || !password || !location)
    return res.status(400).json({ message: "All fields required" });

  try {
    // 1️⃣ Check if email already exists
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "❌ Email already registered" });
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3️⃣ Insert new user
    await db.query(
      "INSERT INTO users (name, email, password, location, points, coins, xp) VALUES (?, ?, ?, ?, 50, 0, 0)",
      [name, email, hashedPassword, location]
    );

    res.json({ message: "✅ Registration successful" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "❌ Registration failed" });
  }
});

// 🔑 Login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email & password required" });

  try {
    const [results] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (results.length === 0) return res.status(401).json({ message: "❌ User not found" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "❌ Invalid password" });

    res.json({
      message: "✅ Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        points: user.points,
        coins: user.coins,
        xp: user.xp
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Login failed" });
  }
});

// ➕ Add Skill
app.post("/skills/add", async (req, res) => {
  const { user_id, skill_name, description, category, price, availability } = req.body;
  if (!user_id || !skill_name)
    return res.status(400).json({ message: "user_id and skill_name required" });

  try {
    await db.query(
      "INSERT INTO skills (user_id, skill_name, description, category, price, availability) VALUES (?, ?, ?, ?, ?, ?)",
      [user_id, skill_name, description || "", category || "", price || 0, availability || ""]
    );
    res.json({ message: "✅ Skill added successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Adding skill failed" });
  }
});

// 📋 Get All Skills
app.get("/skills/all", async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT s.*, u.name AS user_name, u.location 
      FROM skills s 
      JOIN users u ON s.user_id = u.id 
      ORDER BY s.created_at DESC
    `);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Fetching skills failed" });
  }
});

// 👤 Get User Skills
app.get("/skills/user/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const [results] = await db.query("SELECT * FROM skills WHERE user_id = ? ORDER BY created_at DESC", [user_id]);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Fetching user skills failed" });
  }
});

// ❌ Delete Skill
app.delete("/skills/delete/:skill_id", async (req, res) => {
  const { skill_id } = req.params;
  try {
    await db.query("DELETE FROM skills WHERE id = ?", [skill_id]);
    res.json({ message: "✅ Skill deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Deleting skill failed" });
  }
});

// ➕ Send Request
app.post("/requests/send", async (req, res) => {
  const { from_user, to_user, skill_id } = req.body;
  if (!from_user || !to_user || !skill_id)
    return res.status(400).json({ message: "from_user, to_user, and skill_id required" });

  try {
    const [userPoints] = await db.query("SELECT points FROM users WHERE id = ?", [from_user]);
    if (userPoints.length === 0 || userPoints[0].points < 5) {
      return res.status(400).json({ message: "❌ Insufficient points (need 5 points)" });
    }

    await db.query("UPDATE users SET points = points - 5 WHERE id = ?", [from_user]);
    await db.query(
      "INSERT INTO requests (from_user, to_user, skill_id, status) VALUES (?, ?, ?, 'pending')",
      [from_user, to_user, skill_id]
    );
    res.json({ message: "✅ Request sent! 5 points deducted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Sending request failed" });
  }
});

// 📋 Get Requests (Both sent and received)
app.get("/requests/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    // Get received requests (where user is the recipient)
    const [receivedRequests] = await db.query(`
      SELECT r.*, s.skill_name, 
             u1.name AS from_user_name, u2.name AS to_user_name,
             r.id as request_id, s.user_id as owner_id
      FROM requests r 
      JOIN skills s ON r.skill_id = s.id 
      JOIN users u1 ON r.from_user = u1.id 
      JOIN users u2 ON r.to_user = u2.id
      WHERE r.to_user = ? 
      ORDER BY r.created_at DESC
    `, [user_id]);
    
    // Get sent requests (where user is the sender)
    const [sentRequests] = await db.query(`
      SELECT r.*, s.skill_name, 
             u1.name AS from_user_name, u2.name AS to_user_name,
             r.id as request_id, s.user_id as owner_id
      FROM requests r 
      JOIN skills s ON r.skill_id = s.id 
      JOIN users u1 ON r.from_user = u1.id 
      JOIN users u2 ON r.to_user = u2.id
      WHERE r.from_user = ? 
      ORDER BY r.created_at DESC
    `, [user_id]);
    
    // Combine and mark the type
    const allRequests = [
      ...receivedRequests.map(r => ({ ...r, request_type: 'received' })),
      ...sentRequests.map(r => ({ ...r, request_type: 'sent' }))
    ];
    
    // Sort by creation date
    allRequests.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    res.json(allRequests);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ message: "❌ Fetching requests failed", error: err.message });
  }
});

// ✅ Accept Request (Enhanced)
app.post("/requests/accept", async (req, res) => {
  const { request_id } = req.body;
  try {
    const [reqDetails] = await db.query("SELECT * FROM requests WHERE id = ?", [request_id]);
    if (reqDetails.length === 0) return res.status(404).json({ message: "Request not found" });

    await db.query("UPDATE requests SET status = 'accepted' WHERE id = ?", [request_id]);
    await db.query("UPDATE users SET points = points + 10, coins = coins + 2, xp = xp + 15 WHERE id = ?", [reqDetails[0].to_user]);
    res.json({ message: "✅ Request accepted! +10 points, +2 coins, +15 XP" });
  } catch (err) {
    console.error('Error accepting request:', err);
    res.status(500).json({ message: "❌ Accepting request failed", error: err.message });
  }
});

// ❌ Reject Request (Enhanced)
app.post("/requests/reject", async (req, res) => {
  const { request_id } = req.body;
  try {
    await db.query("UPDATE requests SET status = 'rejected' WHERE id = ?", [request_id]);
    res.json({ message: "✅ Request rejected" });
  } catch (err) {
    console.error('Error rejecting request:', err);
    res.status(500).json({ message: "❌ Rejecting request failed", error: err.message });
  }
});

// ➖ Cancel Request
app.delete("/requests/cancel/:request_id", async (req, res) => {
  const request_id = req.params.request_id;
  try {
    const [reqDetails] = await db.query("SELECT from_user FROM requests WHERE id = ?", [request_id]);
    if (reqDetails.length > 0) {
      const from_user = reqDetails[0].from_user;
      await db.query("UPDATE users SET points = points + 5 WHERE id = ?", [from_user]);
    }
    await db.query("DELETE FROM requests WHERE id=?", [request_id]);
    res.json({ message: "✅ Request cancelled and 5 points refunded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Cancelling request failed" });
  }
});

// 🧠 Get User Points
app.get("/api/user-points/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const [results] = await db.query("SELECT points, coins, xp FROM users WHERE id = ?", [user_id]);
    if (results.length === 0) return res.status(404).json({ message: "❌ User not found" });
    res.json({ points: results[0].points, coins: results[0].coins, xp: results[0].xp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Failed to fetch points" });
  }
});

// ------------------- ENHANCED NOTIFICATION ENDPOINTS -------------------

// 📩 Send Notification (Enhanced with Real-time)
app.post("/notifications/send", async (req, res) => {
  const { fromUserId, toUserId, skillName, duration, message } = req.body;
  
  if (!fromUserId || !toUserId || !skillName) {
    return res.status(400).json({ message: "fromUserId, toUserId, and skillName are required" });
  }

  try {
    // Insert notification into database
    const [result] = await db.query(
      `INSERT INTO notifications (from_user_id, to_user_id, skill_name, duration, message, status) 
       VALUES (?, ?, ?, ?, ?, 'unread')`,
      [fromUserId, toUserId, skillName, duration || "", message || ""]
    );

    // Get sender information for real-time notification
    const [senderInfo] = await db.query("SELECT name FROM users WHERE id = ?", [fromUserId]);
    
    // Send real-time notification
    const notificationData = {
      id: result.insertId,
      from_user_id: fromUserId,
      from_user_name: senderInfo[0]?.name || "Unknown User",
      skill_name: skillName,
      duration: duration || "",
      message: message || "",
      status: 'unread',
      created_at: new Date().toISOString()
    };

    sendRealTimeNotification(toUserId, notificationData);
    
    res.status(200).json({ message: "📢 Notification sent successfully!" });
  } catch (err) {
    console.error("Send notification error:", err);
    res.status(500).json({ message: "❌ Failed to send notification" });
  }
});

// 📜 Get Notifications for User
app.get("/notifications/:user_id", async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const [results] = await db.query(`
      SELECT n.id, n.from_user_id, n.to_user_id, n.skill_name, n.duration, 
             n.message, n.status, n.created_at,
             u.name AS from_user_name
      FROM notifications n
      JOIN users u ON n.from_user_id = u.id
      WHERE n.to_user_id = ?
      ORDER BY n.created_at DESC
    `, [user_id]);
    
    res.json(results);
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ message: "❌ Failed to fetch notifications" });
  }
});

// ✅ Update Notification Status (Enhanced with Real-time)
app.post("/notifications/update", async (req, res) => {
  const { notification_id, status } = req.body;
  
  if (!notification_id || !["read", "accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid notification_id or status" });
  }

  try {
    // Update notification status
    await db.query("UPDATE notifications SET status = ? WHERE id = ?", [status, notification_id]);
    
    // If accepted, create chat room and send real-time updates to both users
    if (status === 'accepted') {
      const [notificationInfo] = await db.query(`
        SELECT n.from_user_id, n.to_user_id, n.skill_name, 
               u1.name AS from_user_name, u2.name AS to_user_name
        FROM notifications n
        JOIN users u1 ON n.from_user_id = u1.id
        JOIN users u2 ON n.to_user_id = u2.id
        WHERE n.id = ?
      `, [notification_id]);

      if (notificationInfo.length > 0) {
        const info = notificationInfo[0];
        
        // 🔥 AUTOMATICALLY CREATE CHAT ROOM when request is accepted
        let chatRoomId;
        try {
          // Check if chat room already exists
          const [existingRoom] = await db.query(`
            SELECT id FROM chat_rooms 
            WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)) 
            AND skill_name = ?
          `, [info.from_user_id, info.to_user_id, info.to_user_id, info.from_user_id, info.skill_name]);
          
          if (existingRoom.length > 0) {
            chatRoomId = existingRoom[0].id;
          } else {
            // Create new chat room
            const [chatResult] = await db.query(`
              INSERT INTO chat_rooms (user1_id, user2_id, skill_name) 
              VALUES (?, ?, ?)
            `, [info.from_user_id, info.to_user_id, info.skill_name]);
            chatRoomId = chatResult.insertId;
            
            // Send welcome message to the chat room
            await db.query(`
              INSERT INTO chat_messages (chat_room_id, sender_id, message) 
              VALUES (?, 0, ?)
            `, [chatRoomId, `🎉 Welcome! ${info.from_user_name} and ${info.to_user_name} are now connected to learn ${info.skill_name}. Start your skill exchange journey!`]);
          }
        } catch (chatError) {
          console.error('Error creating chat room:', chatError);
        }
        
        // Award points, coins, and XP to the skill owner (accepter)
        await db.query(`
          UPDATE users 
          SET points = points + 10, coins = coins + 2, xp = xp + 15 
          WHERE id = ?
        `, [info.to_user_id]);
        
        // Notify the original sender that their request was accepted
        sendRealTimeNotification(info.from_user_id, {
          type: 'request_accepted',
          message: `🎉 ${info.to_user_name} accepted your request for ${info.skill_name}! Chat room created.`,
          skill_name: info.skill_name,
          other_user: info.to_user_name,
          other_user_id: info.to_user_id,
          chat_room_id: chatRoomId,
          action: 'start_chat'
        });
        
        // Also notify the accepter
        sendRealTimeNotification(info.to_user_id, {
          type: 'request_accepted',
          message: `✅ You accepted ${info.from_user_name}'s request for ${info.skill_name}! +10 points, +2 coins, +15 XP earned.`,
          skill_name: info.skill_name,
          other_user: info.from_user_name,
          other_user_id: info.from_user_id,
          chat_room_id: chatRoomId,
          action: 'start_chat'
        });
      }
    }
    
    res.json({ message: `✅ Notification ${status}` });
  } catch (err) {
    console.error("Update notification error:", err);
    res.status(500).json({ message: "❌ Failed to update notification" });
  }
});

// ------------------- ENHANCED CHAT ENDPOINTS -------------------

// 💬 Create or Get Chat Room
app.post("/chat/room", async (req, res) => {
  const { user1_id, user2_id, skill_name } = req.body;
  
  if (!user1_id || !user2_id) {
    return res.status(400).json({ message: "user1_id and user2_id are required" });
  }

  try {
    // Check if chat room already exists (either direction)
    const [existing] = await db.query(`
      SELECT id FROM chat_rooms 
      WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
      AND skill_name = ?
    `, [user1_id, user2_id, user2_id, user1_id, skill_name || ""]);

    if (existing.length > 0) {
      return res.json({ chat_room_id: existing[0].id, message: "Chat room found" });
    }

    // Create new chat room
    const [result] = await db.query(
      "INSERT INTO chat_rooms (user1_id, user2_id, skill_name) VALUES (?, ?, ?)",
      [user1_id, user2_id, skill_name || ""]
    );

    res.json({ chat_room_id: result.insertId, message: "💬 Chat room created" });
  } catch (err) {
    console.error("Create chat room error:", err);
    res.status(500).json({ message: "❌ Failed to create chat room" });
  }
});

// 📨 Send Chat Message (Enhanced with Real-time)
app.post("/chat/message", async (req, res) => {
  const { chat_room_id, sender_id, message } = req.body;
  
  if (!chat_room_id || !sender_id || !message) {
    return res.status(400).json({ message: "chat_room_id, sender_id, and message are required" });
  }

  try {
    // Insert message into database
    const [result] = await db.query(
      "INSERT INTO chat_messages (chat_room_id, sender_id, message) VALUES (?, ?, ?)",
      [chat_room_id, sender_id, message]
    );

    // Get sender information and chat room details
    const [messageInfo] = await db.query(`
      SELECT cm.id, cm.message, cm.created_at, u.name AS sender_name,
             cr.user1_id, cr.user2_id
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      JOIN chat_rooms cr ON cm.chat_room_id = cr.id
      WHERE cm.id = ?
    `, [result.insertId]);

    if (messageInfo.length > 0) {
      const msgData = messageInfo[0];
      
      // Send real-time message to both users in the chat room
      const realTimeMessage = {
        id: msgData.id,
        chat_room_id: chat_room_id,
        sender_id: sender_id,
        sender_name: msgData.sender_name,
        message: msgData.message,
        created_at: msgData.created_at
      };

      // Send to both users in the chat room
      sendRealTimeChatMessage(chat_room_id, realTimeMessage);
    }

    res.json({ message: "✅ Message sent" });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "❌ Failed to send message" });
  }
});

// 📜 Get Chat Messages
app.get("/chat/messages/:chat_room_id", async (req, res) => {
  const { chat_room_id } = req.params;
  
  try {
    const [results] = await db.query(`
      SELECT cm.id, cm.chat_room_id, cm.sender_id, cm.message, cm.created_at,
             u.name AS sender_name
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.chat_room_id = ?
      ORDER BY cm.created_at ASC
    `, [chat_room_id]);
    
    res.json(results);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ message: "❌ Failed to fetch messages" });
  }
});

// 📋 Get User's Chat Rooms
app.get("/chat/rooms/:user_id", async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const [results] = await db.query(`
      SELECT cr.id, cr.skill_name, cr.created_at,
             CASE 
               WHEN cr.user1_id = ? THEN u2.name 
               ELSE u1.name 
             END AS other_user_name,
             CASE 
               WHEN cr.user1_id = ? THEN cr.user2_id 
               ELSE cr.user1_id 
             END AS other_user_id
      FROM chat_rooms cr
      JOIN users u1 ON cr.user1_id = u1.id
      JOIN users u2 ON cr.user2_id = u2.id
      WHERE cr.user1_id = ? OR cr.user2_id = ?
      ORDER BY cr.created_at DESC
    `, [user_id, user_id, user_id, user_id]);
    
    res.json(results);
  } catch (err) {
    console.error("Get chat rooms error:", err);
    res.status(500).json({ message: "❌ Failed to fetch chat rooms" });
  }
});

// ------------------- SERVER -------------------
const PORT = 5000;
const server = app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔔 Real-time notifications enabled via Server-Sent Events`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Shutting down server...');
  activeConnections.clear();
  server.close(() => {
    console.log('✅ Server shut down gracefully');
  });
});
