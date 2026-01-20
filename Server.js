const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON
app.use(express.json());

// Create uploads folder if missing
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// In-memory DB (for demo; can replace with a real DB later)
let users = {};
let assignments = [];
let exams = [];
let submissions = [];
let classFeed = [];
let library = [];

// --- AUTH ---
app.post("/api/signup", (req, res) => {
  const { id, name, pass, role } = req.body;
  if (!id || !name || !pass || !role) return res.status(400).json({ error: "Missing fields" });
  if (users[id]) return res.status(400).json({ error: "User exists" });
  users[id] = { id, name, pass, role };
  res.json({ success: true });
});

app.post("/api/login", (req, res) => {
  const { id, pass, role } = req.body;
  const u = users[id];
  if (!u || u.pass !== pass || u.role !== role) return res.status(400).json({ error: "Invalid login" });
  res.json({ success: true, user: u });
});

// --- ASSIGNMENTS ---
app.post("/api/assignment", (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Missing title" });
  assignments.push({ title });
  res.json({ success: true, assignments });
});

app.get("/api/assignments", (req, res) => {
  res.json(assignments);
});

// --- EXAMS ---
app.post("/api/exam", (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "Missing title" });
  exams.push({ title });
  res.json({ success: true, exams });
});

app.get("/api/exams", (req, res) => {
  res.json(exams);
});

app.post("/api/takeExam", (req, res) => {
  const { student } = req.body;
  if (!student) return res.status(400).json({ error: "Missing student" });
  const score = Math.floor(Math.random() * 40) + 60;
  submissions.push({ student, type: "exam", score });
  res.json({ success: true, score });
});

// --- CLASS FEED ---
app.post("/api/feed", (req, res) => {
  const { user, text } = req.body;
  if (!user || !text) return res.status(400).json({ error: "Missing fields" });
  classFeed.push({ user, text });
  res.json({ success: true, classFeed });
});

app.get("/api/feed", (req, res) => {
  res.json(classFeed);
});

// --- PARENT RESULTS ---
app.get("/api/results", (req, res) => {
  const results = submissions.filter(s => s.type === "exam");
  res.json(results);
});

// --- WALLET / LIBRARY ---
app.post("/api/buy", (req, res) => {
  library.push("Digital Resource " + library.length);
  res.json({ success: true, library });
});

app.get("/api/library", (req, res) => {
  res.json(library);
});

// --- FILE UPLOAD ---
app.post("/api/upload", upload.single("file"), (req, res) => {
  res.json({ success: true, filename: req.file.filename });
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));