import express from "express";
import cors from "cors";
import mysql from "mysql2";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const server = http.createServer(app);

// =============================
// ✅ Middleware
// =============================
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

// =============================
// ✅ MySQL Database Connection
// =============================
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "arati@116116",
  database: process.env.DB_NAME || "unityshares_db",
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection error:", err);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL database");
});

// =============================
// ✅ Socket.io Setup
// =============================
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("sendMessage", (messageData) => {
    const { chatId, sender, message } = messageData;
    db.query(
      "INSERT INTO messages (chat_id, sender, message) VALUES (?, ?, ?)",
      [chatId, sender, message],
      (err) => {
        if (err) return console.error("DB Insert Error:", err);
        console.log("✅ Message saved to DB");
      }
    );
    io.emit("receiveMessage", messageData);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// =============================
// ✅ USER AUTHENTICATION ROUTES
// =============================
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (results.length > 0) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role || "Donor"],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to register" });
        res.status(201).json({ message: "User registered successfully", userId: result.insertId });
      }
    );
  });
});

// ✅ Alias routes for easier frontend access
app.post("/api/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (results.length > 0) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role || "Donor"],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to register" });
        res.status(201).json({ success: true, message: "User registered successfully", userId: result.insertId });
      }
    );
  });
});

// Direct alias
app.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (results.length > 0) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role || "Donor"],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to register" });
        res.status(201).json({ success: true, message: "User registered successfully", userId: result.insertId });
      }
    );
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (results.length === 0) return res.status(401).json({ message: "Invalid email or password" });

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: "Invalid email or password" });

    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  });
});

// =============================
// ✅ CHAT ROUTES
// =============================
app.post("/api/chat/:chatId", (req, res) => {
  const { chatId } = req.params;
  const { sender, message } = req.body;
  db.query(
    "INSERT INTO messages (chat_id, sender, message) VALUES (?, ?, ?)",
    [chatId, sender, message],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to save message" });
      res.status(201).json({ id: result.insertId, sender, message });
    }
  );
});

app.get("/api/chat/:chatId", (req, res) => {
  const { chatId } = req.params;
  db.query("SELECT * FROM messages WHERE chat_id = ?", [chatId], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch messages" });
    res.status(200).json(results);
  });
});

// =============================
// ✅ DONATION + REQUEST ROUTES
// =============================
app.get("/donatedResources", (req, res) => {
  db.query("SELECT * FROM donations", (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch donated resources" });
    res.status(200).json(results);
  });
});

app.get("/requestedResources", (req, res) => {
  db.query("SELECT * FROM requests", (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch requested resources" });
    res.status(200).json(results);
  });
});

app.post("/donate", (req, res) => {
  const { donor_name, donation_type, quantity, description, status } = req.body;
  db.query(
    "INSERT INTO donations (donor_name, donation_type, quantity, description, status) VALUES (?, ?, ?, ?, ?)",
    [donor_name, donation_type, quantity, description, status || "Pending"],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to save donation" });
      res.status(201).json({ message: "Donation added successfully", donationId: result.insertId });
    }
  );
});

app.post("/request", (req, res) => {
  const { requester_name, request_type, quantity, description, status } = req.body;
  db.query(
    "INSERT INTO requests (requester_name, request_type, quantity, description, status) VALUES (?, ?, ?, ?, ?)",
    [requester_name, request_type, quantity, description, status || "Pending"],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to save request" });
      res.status(201).json({ message: "Request submitted successfully", requestId: result.insertId });
    }
  );
});

// =============================
// ✅ Start Server
// =============================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export { db };
