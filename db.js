// db.js
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",     // ✅ Don't write localhost:3306
  user: "root",          // your MySQL username
  password: "1234567", // your MySQL password
  database: "skillswap", // database name
  port: 3306             // default MySQL port
});

// check connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL Database!");
    connection.release();
  }
});

module.exports = pool.promise();
