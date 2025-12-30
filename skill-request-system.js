// Enhanced Skill Request System - Additional endpoints for comprehensive functionality

const express = require("express");
const db = require("./db");

const router = express.Router();

// ================= SKILL REQUEST ENDPOINTS =================

// 📊 Get comprehensive request statistics for a user
router.get('/stats/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    // Get sent requests stats
    const [sentStats] = await db.query(`
      SELECT 
        COUNT(*) as total_sent,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_sent,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_sent,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_sent
      FROM requests WHERE from_user = ?
    `, [user_id]);

    // Get received requests stats
    const [receivedStats] = await db.query(`
      SELECT 
        COUNT(*) as total_received,
        SUM(CASE WHEN status = 'unread' THEN 1 ELSE 0 END) as unread_received,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_received,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_received
      FROM notifications WHERE to_user_id = ?
    `, [user_id]);

    // Get active chat rooms
    const [chatStats] = await db.query(`
      SELECT COUNT(*) as active_chats
      FROM chat_rooms 
      WHERE user1_id = ? OR user2_id = ?
    `, [user_id, user_id]);

    res.json({
      sent: sentStats[0],
      received: receivedStats[0],
      chats: chatStats[0]
    });
  } catch (err) {
    console.error('Error getting request stats:', err);
    res.status(500).json({ message: '❌ Failed to get request statistics' });
  }
});

// 🔍 Search skills with advanced filters
router.post('/skills/search', async (req, res) => {
  const { search, category, location, user_id } = req.body;
  
  try {
    let query = `
      SELECT s.*, u.name AS user_name, u.location 
      FROM skills s 
      JOIN users u ON s.user_id = u.id 
      WHERE s.user_id != ?
    `;
    let params = [user_id];

    if (search) {
      query += ` AND (s.skill_name LIKE ? OR s.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ` AND s.category = ?`;
      params.push(category);
    }

    if (location) {
      query += ` AND u.location LIKE ?`;
      params.push(`%${location}%`);
    }

    query += ` ORDER BY s.created_at DESC`;

    const [results] = await db.query(query, params);
    res.json(results);
  } catch (err) {
    console.error('Error searching skills:', err);
    res.status(500).json({ message: '❌ Failed to search skills' });
  }
});

// 📈 Get skill popularity and request history
router.get('/skills/:skill_id/popularity', async (req, res) => {
  const { skill_id } = req.params;
  
  try {
    // Get request count for this skill
    const [requestCount] = await db.query(`
      SELECT COUNT(*) as request_count
      FROM requests WHERE skill_id = ?
    `, [skill_id]);

    // Get recent requests for this skill
    const [recentRequests] = await db.query(`
      SELECT r.*, u.name as requester_name
      FROM requests r
      JOIN users u ON r.from_user = u.id
      WHERE r.skill_id = ?
      ORDER BY r.created_at DESC
      LIMIT 5
    `, [skill_id]);

    // Get acceptance rate
    const [acceptanceRate] = await db.query(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted_requests
      FROM requests WHERE skill_id = ?
    `, [skill_id]);

    const rate = acceptanceRate[0].total_requests > 0 
      ? (acceptanceRate[0].accepted_requests / acceptanceRate[0].total_requests * 100).toFixed(1)
      : 0;

    res.json({
      request_count: requestCount[0].request_count,
      recent_requests: recentRequests,
      acceptance_rate: rate
    });
  } catch (err) {
    console.error('Error getting skill popularity:', err);
    res.status(500).json({ message: '❌ Failed to get skill popularity' });
  }
});

// 🎯 Get personalized skill recommendations
router.get('/recommendations/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    // Get user's interests based on their previous requests
    const [userInterests] = await db.query(`
      SELECT s.category, COUNT(*) as interest_count
      FROM requests r
      JOIN skills s ON r.skill_id = s.id
      WHERE r.from_user = ?
      GROUP BY s.category
      ORDER BY interest_count DESC
      LIMIT 3
    `, [user_id]);

    let recommendations = [];

    if (userInterests.length > 0) {
      // Get skills from categories user has shown interest in
      const categories = userInterests.map(interest => interest.category);
      const placeholders = categories.map(() => '?').join(',');
      
      const [categorySkills] = await db.query(`
        SELECT s.*, u.name AS user_name, u.location 
        FROM skills s 
        JOIN users u ON s.user_id = u.id 
        WHERE s.user_id != ? AND s.category IN (${placeholders})
        ORDER BY s.created_at DESC
        LIMIT 6
      `, [user_id, ...categories]);

      recommendations = categorySkills;
    }

    // If not enough recommendations, get popular skills
    if (recommendations.length < 6) {
      const [popularSkills] = await db.query(`
        SELECT s.*, u.name AS user_name, u.location, COUNT(r.id) as request_count
        FROM skills s 
        JOIN users u ON s.user_id = u.id 
        LEFT JOIN requests r ON s.id = r.skill_id
        WHERE s.user_id != ?
        GROUP BY s.id
        ORDER BY request_count DESC, s.created_at DESC
        LIMIT ?
      `, [user_id, 6 - recommendations.length]);

      recommendations = [...recommendations, ...popularSkills];
    }

    res.json(recommendations);
  } catch (err) {
    console.error('Error getting recommendations:', err);
    res.status(500).json({ message: '❌ Failed to get recommendations' });
  }
});

// 💬 Get request conversation history
router.get('/conversation/:request_id', async (req, res) => {
  const { request_id } = req.params;
  
  try {
    // Get the original request
    const [request] = await db.query(`
      SELECT r.*, s.skill_name, 
             u1.name as from_user_name, u2.name as to_user_name
      FROM requests r
      JOIN skills s ON r.skill_id = s.id
      JOIN users u1 ON r.from_user = u1.id
      JOIN users u2 ON r.to_user = u2.id
      WHERE r.id = ?
    `, [request_id]);

    if (request.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Get related notification
    const [notification] = await db.query(`
      SELECT * FROM notifications 
      WHERE from_user_id = ? AND to_user_id = ? AND skill_name = ?
      ORDER BY created_at DESC LIMIT 1
    `, [request[0].from_user, request[0].to_user, request[0].skill_name]);

    // Get chat room if exists
    const [chatRoom] = await db.query(`
      SELECT cr.*, 
             (SELECT COUNT(*) FROM chat_messages WHERE chat_room_id = cr.id) as message_count
      FROM chat_rooms cr
      WHERE (cr.user1_id = ? AND cr.user2_id = ?) OR (cr.user1_id = ? AND cr.user2_id = ?)
      AND cr.skill_name = ?
    `, [request[0].from_user, request[0].to_user, request[0].to_user, request[0].from_user, request[0].skill_name]);

    res.json({
      request: request[0],
      notification: notification[0] || null,
      chat_room: chatRoom[0] || null
    });
  } catch (err) {
    console.error('Error getting conversation history:', err);
    res.status(500).json({ message: '❌ Failed to get conversation history' });
  }
});

// 🏆 Get user's skill exchange achievements
router.get('/achievements/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const [user] = await db.query('SELECT * FROM users WHERE id = ?', [user_id]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = user[0];
    const achievements = [];

    // Check various achievements
    const [skillCount] = await db.query('SELECT COUNT(*) as count FROM skills WHERE user_id = ?', [user_id]);
    const [requestsSent] = await db.query('SELECT COUNT(*) as count FROM requests WHERE from_user = ?', [user_id]);
    const [requestsAccepted] = await db.query('SELECT COUNT(*) as count FROM requests WHERE to_user = ? AND status = "accepted"', [user_id]);
    const [chatRooms] = await db.query('SELECT COUNT(*) as count FROM chat_rooms WHERE user1_id = ? OR user2_id = ?', [user_id, user_id]);

    // Define achievements
    if (skillCount[0].count >= 1) achievements.push({ name: 'First Skill', icon: '🥉', description: 'Added your first skill' });
    if (skillCount[0].count >= 5) achievements.push({ name: 'Skill Master', icon: '🥈', description: 'Added 5 skills' });
    if (skillCount[0].count >= 10) achievements.push({ name: 'Skill Expert', icon: '🥇', description: 'Added 10 skills' });
    
    if (requestsSent[0].count >= 1) achievements.push({ name: 'First Request', icon: '📩', description: 'Sent your first skill request' });
    if (requestsSent[0].count >= 10) achievements.push({ name: 'Active Learner', icon: '📚', description: 'Sent 10 skill requests' });
    
    if (requestsAccepted[0].count >= 1) achievements.push({ name: 'Helpful Teacher', icon: '👨‍🏫', description: 'Accepted your first request' });
    if (requestsAccepted[0].count >= 5) achievements.push({ name: 'Master Teacher', icon: '🎓', description: 'Accepted 5 requests' });
    
    if (chatRooms[0].count >= 1) achievements.push({ name: 'Conversationalist', icon: '💬', description: 'Started your first chat' });
    if (chatRooms[0].count >= 5) achievements.push({ name: 'Social Butterfly', icon: '🦋', description: 'Active in 5 chat rooms' });
    
    if (userData.points >= 100) achievements.push({ name: 'Point Collector', icon: '💰', description: 'Earned 100 points' });
    if (userData.points >= 500) achievements.push({ name: 'Point Master', icon: '💎', description: 'Earned 500 points' });

    res.json(achievements);
  } catch (err) {
    console.error('Error getting achievements:', err);
    res.status(500).json({ message: '❌ Failed to get achievements' });
  }
});

// 📊 Get dashboard summary for user
router.get('/dashboard/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    // Get various counts and stats
    const [mySkills] = await db.query('SELECT COUNT(*) as count FROM skills WHERE user_id = ?', [user_id]);
    const [pendingRequests] = await db.query('SELECT COUNT(*) as count FROM notifications WHERE to_user_id = ? AND status = "unread"', [user_id]);
    const [sentRequests] = await db.query('SELECT COUNT(*) as count FROM requests WHERE from_user = ? AND status = "pending"', [user_id]);
    const [activeChats] = await db.query('SELECT COUNT(*) as count FROM chat_rooms WHERE user1_id = ? OR user2_id = ?', [user_id, user_id]);
    
    // Get recent activity
    const [recentNotifications] = await db.query(`
      SELECT n.*, u.name as from_user_name
      FROM notifications n
      JOIN users u ON n.from_user_id = u.id
      WHERE n.to_user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 5
    `, [user_id]);

    // Get skill categories user is involved in
    const [categories] = await db.query(`
      SELECT DISTINCT s.category, COUNT(*) as count
      FROM skills s
      WHERE s.user_id = ?
      GROUP BY s.category
      ORDER BY count DESC
    `, [user_id]);

    res.json({
      stats: {
        my_skills: mySkills[0].count,
        pending_requests: pendingRequests[0].count,
        sent_requests: sentRequests[0].count,
        active_chats: activeChats[0].count
      },
      recent_notifications: recentNotifications,
      skill_categories: categories
    });
  } catch (err) {
    console.error('Error getting dashboard summary:', err);
    res.status(500).json({ message: '❌ Failed to get dashboard summary' });
  }
});

module.exports = router;
