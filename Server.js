const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Database Path
const DB_PATH = path.join(__dirname, 'db.json');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Load/Save Data
const loadDB = () => {
    if (!fs.existsSync(DB_PATH)) {
        return { users: {}, submissions: [], classFeed: [], userNotes: [], ipMarket: [], liveState: { active: false } };
    }
    return JSON.parse(fs.readFileSync(DB_PATH));
};

const saveDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- API ROUTES ---

// Auth: Signup/Login
app.post('/api/signup', (req, res) => {
    const db = loadDB();
    const { id, name, pass, role } = req.body;
    if (db.users[id]) return res.status(400).json({ error: "User exists" });
    db.users[id] = { name, pass, role };
    saveDB(db);
    res.json({ success: true });
});

// AI Grading Simulation Logic
app.post('/api/grade', (req, res) => {
    const db = loadDB();
    db.submissions.forEach(s => {
        if (!s.score) {
            s.score = Math.floor(Math.random() * 31) + 70; // Simulate AI evaluation
            s.status = "AI Graded";
            s.feedback = "AI Review: Strong logical flow and correct use of terminology.";
        }
    });
    saveDB(db);
    // Notify parents/students via Socket.io
    io.emit('gradesUpdated', { message: "AI has finished grading latest submissions." });
    res.json({ success: true, updated: db.submissions });
});

// Notes: Save & Search
app.post('/api/notes', (req, res) => {
    const db = loadDB();
    db.userNotes.push(req.body); // { user, text, timestamp }
    saveDB(db);
    res.json({ success: true });
});

// --- REAL-TIME (SOCKET.IO) ---
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Live Class Toggle
    socket.on('toggleLive', (state) => {
        const db = loadDB();
        db.liveState.active = state;
        saveDB(db);
        // Broadcast to all students
        io.emit('liveStatusUpdate', { active: state });
    });

    // Chat / Class Feed Broadcast
    socket.on('sendMsg', (msgData) => {
        const db = loadDB();
        db.classFeed.push(msgData);
        saveDB(db);
        io.emit('newFeedItem', msgData);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start Server
server.listen(PORT, () => {
    console.log(`GreenBook OS Master Server at http://localhost:${PORT}`);
});
