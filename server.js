const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const SECRET = "CHANGE_THIS_SECRET_KEY";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./academy.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      course TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const password = bcrypt.hashSync("Admin@12345", 10);

  db.run(
    `INSERT OR IGNORE INTO users
     (name,email,password,role)
     VALUES (?,?,?,?)`,
    ["Administrator", "admin@mansooracademy.com", password, "admin"]
  );
});

function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Login required" });
  }

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired login" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

// Register
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const hash = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users(name,email,password) VALUES(?,?,?)`,
    [name, email, hash],
    function (err) {
      if (err) {
        return res.status(400).json({
          message: "Email already registered"
        });
      }

      res.json({
        message: "Registration successful"
      });
    }
  );
});

// Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE email=?`,
    [email],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({
          message: "Invalid email or password"
        });
      }

      const valid = await bcrypt.compare(password, user.password);

      if (!valid) {
        return res.status(401).json({
          message: "Invalid email or password"
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: {
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }
  );
});

// Admission
app.post("/api/admission", (req, res) => {
  const { name, phone, email, course, message } = req.body;

  if (!name || !phone || !course) {
    return res.status(400).json({
      message: "Name, phone and course are required"
    });
  }

  db.run(
    `INSERT INTO admissions
     (name,phone,email,course,message)
     VALUES(?,?,?,?,?)`,
    [name, phone, email, course, message],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: "Could not submit admission"
        });
      }

      res.json({
        message: "Admission submitted successfully"
      });
    }
  );
});

// Student profile
app.get("/api/me", auth, (req, res) => {
  res.json(req.user);
});

// Admin admissions
app.get("/api/admin/admissions", auth, adminOnly, (req, res) => {
  db.all(
    `SELECT * FROM admissions ORDER BY id DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          message: "Database error"
        });
      }

      res.json(rows);
    }
  );
});

// Update admission status
app.put("/api/admin/admissions/:id", auth, adminOnly, (req, res) => {
  const { status } = req.body;

  db.run(
    `UPDATE admissions SET status=? WHERE id=?`,
    [status, req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: "Update failed"
        });
      }

      res.json({
        message: "Status updated"
      });
    }
  );
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Mansoor Online Academy running at http://localhost:${PORT}`);
});