const express = require("express");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public
app.use(express.static(path.join(__dirname, "public")));

// Middleware for parsing JSON
app.use(express.json());

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Example upload route
app.post("/api/upload", upload.single("file"), (req, res) => {
  res.json({ filename: req.file.filename });
});

// Serve index.html for all other routes (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));