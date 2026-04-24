const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

// MIDDLEWARE
app.use(express.json());
// This allows the server to find assets (like images or extra JS) in the root
app.use(express.static(__dirname)); 

const DB_FILE = path.join(__dirname, 'database.json');

// DATABASE INITIALIZATION
const initDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = { 
            users: {}, 
            submissions: [], 
            classFeed: [], 
            userNotes: [], 
            isLive: false 
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
};
initDB();

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- API ENDPOINTS ---

// Main Route: Serve index.html from ROOT
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Auth Logic
app.post('/api/auth', (req, res) => {
    const { id, pass, role, action, name } = req.body;
    let db = readDB();
    if (action === 'signup') {
        db.users[id] = { name, pass, role };
        writeDB(db);
        return res.json({ success: true });
    }
    const user = db.users[id];
    if (user && user.pass === pass && user.role === role) {
        res.json({ success: true, user: { ...user, id } });
    } else {
        res.status(401).json({ error: "Invalid Credentials" });
    }
});

// AI Grading Engine
app.post('/api/ai-grade', (req, res) => {
    let db = readDB();
    db.submissions = db.submissions.map(s => {
        if (!s.score) {
            // AI Logic simulation: Grading based on submission status
            return { ...s, score: Math.floor(Math.random() * 25) + 75, status: "AI Graded" };
        }
        return s;
    });
    writeDB(db);
    io.emit('sync', db); 
    res.json({ success: true });
});

// --- REAL-TIME LIVE CLASS ENGINE ---
io.on('connection', (socket) => {
    console.log('User connected to GreenBook OS');
    
    // Send initial data state to the user
    socket.emit('init', readDB());

    // Toggle Live Class Session
    socket.on('toggleLive', (state) => {
        let db = readDB();
        db.isLive = state;
        writeDB(db);
        io.emit('liveUpdate', state); // Notify all students globally
    });

    // Handle Class Feed / Assignments
    socket.on('newFeed', (item) => {
        let db = readDB();
        db.classFeed.push(item);
        writeDB(db);
        io.emit('feedUpdate', db.classFeed);
    });
});

server.listen(PORT, () => {
    console.log(`GreenBook OS is LIVE at http://localhost:${PORT}`);
});
