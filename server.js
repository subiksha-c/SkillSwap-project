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

// 📜 View Skills
app.get("/skills/all", async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT s.id AS skill_id, s.skill_name, s.description, s.category, s.price, s.availability,
             u.name AS owner_name, u.id AS owner_id
      FROM skills s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.id DESC
    `);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Fetching skills failed" });
  }
});

// ➡️ Send Request (deduct points)
app.post("/requests/send", async (req, res) => {
  const { from_user, skill_id } = req.body;
  if (!from_user || !skill_id)
    return res.status(400).json({ message: "from_user and skill_id required" });

  try {
    const [skills] = await db.query("SELECT user_id FROM skills WHERE id = ?", [skill_id]);
    if (skills.length === 0) return res.status(404).json({ message: "Skill not found" });

    const to_user = skills[0].user_id;
    if (Number(from_user) === Number(to_user))
      return res.status(400).json({ message: "❌ Cannot request your own skill" });

    const [existing] = await db.query(
      "SELECT id FROM requests WHERE from_user = ? AND skill_id = ?",
      [from_user, skill_id]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "❌ Request already sent for this skill" });

    const [user] = await db.query("SELECT points FROM users WHERE id = ?", [from_user]);
    if (user.length === 0) return res.status(404).json({ message: "User not found" });
    if (user[0].points < 5) return res.status(400).json({ message: "❌ Not enough points" });

    await db.query("UPDATE users SET points = points - 5 WHERE id = ?", [from_user]);
    await db.query(
      "INSERT INTO requests (from_user, to_user, skill_id, status) VALUES (?, ?, ?, 'pending')",
      [from_user, to_user, skill_id]
    );

    res.json({ message: "✅ Request sent successfully and 5 points deducted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Sending request failed" });
  }
});

// 📜 Get Requests for User
app.get("/requests/:user_id", async (req, res) => {
  const user_id = req.params.user_id;
  try {
    const [results] = await db.query(`
      SELECT r.id AS request_id, r.status, r.skill_id, r.from_user, r.to_user,
             s.skill_name, s.user_id AS owner_id,
             u_from.name AS from_name, u_to.name AS to_name
      FROM requests r
      JOIN skills s ON r.skill_id = s.id
      JOIN users u_from ON r.from_user = u_from.id
      JOIN users u_to ON r.to_user = u_to.id
      WHERE r.to_user = ? OR r.from_user = ?
      ORDER BY r.id DESC
    `, [user_id, user_id]);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Fetching requests failed" });
  }
});

// ✅ Accept / Reject Request
app.post("/requests/update", async (req, res) => {
  const { request_id, status } = req.body;
  if (!request_id || !["accepted", "rejected"].includes(status))
    return res.status(400).json({ message: "Invalid request or status" });

  try {
    const [reqDetails] = await db.query("SELECT from_user FROM requests WHERE id = ?", [request_id]);
    if (reqDetails.length === 0) return res.status(404).json({ message: "Request not found" });

    const from_user = reqDetails[0].from_user;

    await db.query("UPDATE requests SET status=? WHERE id=?", [status, request_id]);
    if (status === "accepted") await db.query("UPDATE users SET points = points + 5 WHERE id = ?", [from_user]);

    res.json({ message: `✅ Request ${status}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "❌ Updating request failed" });
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

// ------------------- NOTIFICATION ENDPOINTS -------------------

// 📩 Send Notification
app.post("/notifications/send", async (req, res) => {
  const { fromUserId, toUserId, skillName, duration, message } = req.body;
  
  if (!fromUserId || !toUserId || !skillName) {
    return res.status(400).json({ message: "fromUserId, toUserId, and skillName are required" });
  }

  try {
    await db.query(
      `INSERT INTO notifications (from_user_id, to_user_id, skill_name, duration, message, status) 
       VALUES (?, ?, ?, ?, ?, 'unread')`,
      [fromUserId, toUserId, skillName, duration || "", message || ""]
    );
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

// ✅ Update Notification Status
app.post("/notifications/update", async (req, res) => {
  const { notification_id, status } = req.body;
  
  if (!notification_id || !["read", "accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid notification_id or status" });
  }

  try {
    await db.query("UPDATE notifications SET status = ? WHERE id = ?", [status, notification_id]);
    res.json({ message: `✅ Notification ${status}` });
  } catch (err) {
    console.error("Update notification error:", err);
    res.status(500).json({ message: "❌ Failed to update notification" });
  }
});

// ------------------- CHAT ENDPOINTS -------------------

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

// 📨 Send Chat Message
app.post("/chat/message", async (req, res) => {
  const { chat_room_id, sender_id, message } = req.body;
  
  if (!chat_room_id || !sender_id || !message) {
    return res.status(400).json({ message: "chat_room_id, sender_id, and message are required" });
  }

  try {
    await db.query(
      "INSERT INTO chat_messages (chat_room_id, sender_id, message) VALUES (?, ?, ?)",
      [chat_room_id, sender_id, message]
    );
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
      SELECT cm.id, cm.message, cm.created_at, cm.sender_id,
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
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
