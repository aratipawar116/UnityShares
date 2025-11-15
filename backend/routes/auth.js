import express from "express";
import mysql from "mysql2";
import bcrypt from "bcryptjs";

const router = express.Router();

// ✅ MySQL connection (reuse your same database)
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "arati@116116", // your MySQL password
  database: "unityshares_db",
});

// ============================
// 🔹 Register New User
// ============================
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if email already exists
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "Database error", error: err });

    if (result.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role || "Donor"],
      (err2, result2) => {
        if (err2) return res.status(500).json({ message: "Failed to register user", error: err2 });

        res.status(201).json({ message: "User registered successfully", userId: result2.insertId });
      }
    );
  });
});

// ============================
// 🔹 Login User
// ============================
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "Database error", error: err });

    if (result.length === 0) return res.status(404).json({ message: "User not found" });

    const user = result[0];

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid password" });

    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  });
});

export default router;
