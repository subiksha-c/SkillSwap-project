const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234567",
  database: "skillswap",
  port: 3306,
  multipleStatements: true
});

const createTablesSQL = `
-- Create notifications table (for real-time notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    skill_name VARCHAR(255) NOT NULL,
    duration VARCHAR(100),
    message TEXT,
    status ENUM('unread', 'read', 'accepted', 'rejected') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create chat_rooms table (for real-time chat)
CREATE TABLE IF NOT EXISTS chat_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    skill_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_chat (user1_id, user2_id, skill_name)
);

-- Create chat_messages table (for real-time messaging)
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chat_room_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance (MySQL doesn't support IF NOT EXISTS for indexes)
CREATE INDEX idx_notifications_to_user ON notifications(to_user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_chat_messages_room ON chat_messages(chat_room_id);
CREATE INDEX idx_chat_messages_time ON chat_messages(created_at);
`;

connection.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  }
  
  console.log("✅ Connected to MySQL Database!");
  
  connection.query(createTablesSQL, (err, results) => {
    if (err) {
      console.error("❌ Error creating tables:", err);
      process.exit(1);
    }
    
    console.log("✅ Real-time tables created successfully!");
    
    // Verify tables exist
    connection.query("SHOW TABLES", (err, tables) => {
      if (err) {
        console.error("❌ Error showing tables:", err);
      } else {
        console.log("📋 Available tables:");
        tables.forEach(table => {
          console.log("  -", Object.values(table)[0]);
        });
      }
      
      connection.end();
      console.log("🎉 Database setup complete! You can now start the real-time server.");
    });
  });
});
