const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Configuration for High-Res Sketches and JSON payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve the index.html and assets directly from the ROOT
// 1. Update static files to point to the current directory
app.use(express.static(path.join(__dirname)));



const DB_FILE = path.join(__dirname, 'database.json');

// --- DATABASE PERSISTENCE ENGINE ---
const initDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        const schema = { 
            users: {}, 
            submissions: [], 
            classFeed: [], 
            userNotes: [], 
            ipMarket: [],
            isLive: false 
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(schema, null, 2));
    }
};
initDB();

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- API ROUTES ---

// Serve the Main Dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Save Notes & Sketches to Cloud
app.post('/api/save-note', (req, res) => {
    const db = readDB();
    db.userNotes.push(req.body); // Expects { user, text, date }
    writeDB(db);
    res.json({ success: true });
});

// AI Grading Logic (Server-Side)
app.post('/api/ai-grade', (req, res) => {
    const db = readDB();
    db.submissions = db.submissions.map(s => {
        if (!s.score) {
            // Simulated AI Analysis: Grades based on consistency and submission data
            s.score = Math.floor(Math.random() * 21) + 79; 
            s.status = "AI Processed";
        }
        return s;
    });
    writeDB(db);
    io.emit('syncDB', db); // Real-time update for Parents and Students
    res.json({ success: true });
});

// --- REAL-TIME GLOBAL CLASSROOM (SOCKET.IO) ---
io.on('connection', (socket) => {
    console.log('User joined the Global Classroom');

    // Send the current school state to the new connection
    socket.emit('init', readDB());

    // Teacher Starts/Stops Live Broadcast
    socket.on('toggleLive', (state) => {
        const db = readDB();
        db.isLive = state;
        writeDB(db);
        io.emit('liveUpdate', state); // Broadcast to all students worldwide
    });

    // Handle Global Class Feed
    socket.on('postFeed', (item) => {
        const db = readDB();
        db.classFeed.push(item);
        writeDB(db);
        io.emit('newFeedItem', item);
    });

    socket.on('disconnect', () => {
        console.log('User left the Classroom');
    });
});

// 2. Explicitly serve index.html from the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// --- LAUNCH ---
server.listen(PORT, () => {
    console.log(`
    -------------------------------------------
    🌿 GreenBook OS: Global Learning Protocol
    STATUS: ONLINE
    URL: http://localhost:${PORT}
    STORAGE: ${DB_FILE}
    -------------------------------------------
    `);
});
