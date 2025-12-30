const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const bcrypt = require('bcryptjs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // file.originalname uses latin1 in some cases, verify encoding needed?
        // simple unique filename: Date.now() + random + extension
        const ext = path.extname(file.originalname);
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 13579;

// MySQL Connection Setup
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ktv_db',
    port: process.env.DB_PORT || 3307
};

console.log('--- DB Config Debug ---');
console.log('Host:', dbConfig.host);
console.log('User:', dbConfig.user);
console.log('Port:', dbConfig.port);
console.log('INVITE_CODE:', process.env.INVITE_CODE); // Debug code
console.log('-----------------------');

// Create a connection pool preferrably
const pool = mysql.createPool(dbConfig);
const promisePool = pool.promise();

// Initialize DB schema
async function initDB() {
    try {
        // We need to modify the table if it exists to allow NULL kakao_id
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kakao_id BIGINT UNIQUE NULL,
                username VARCHAR(50) UNIQUE,
                password VARCHAR(255),
                nickname VARCHAR(100),
                profile_image VARCHAR(255),
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Migration: Modify kakao_id to be NULLable if it's NOT NULL
        try {
            await promisePool.query("ALTER TABLE users MODIFY COLUMN kakao_id BIGINT NULL");
        } catch (e) {
            // Check if error is simply because it's already nullable or other safe ignore
            // console.log("Migration (kakao_id):", e.message); 
        }

        // Migration: Add username/password columns if not exist
        try {
            const [columns] = await promisePool.query("SHOW COLUMNS FROM users LIKE 'username'");
            if (columns.length === 0) {
                await promisePool.query("ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE");
                await promisePool.query("ALTER TABLE users ADD COLUMN password VARCHAR(255)");
                console.log("Added 'username' and 'password' columns to users table.");
            }
        } catch (e) { console.error("Migration (username/password):", e); }

        // Add 'role' column if it doesn't exist (Migration for existing DB)
        try {
            const [columns] = await promisePool.query("SHOW COLUMNS FROM users LIKE 'role'");
            if (columns.length === 0) {
                await promisePool.query("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'");
                console.log("Added 'role' column to users table.");
            }
        } catch (e) {
            console.error("Migration check error (role):", e);
        }

        // 채팅 메시지 테이블
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS messages(
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT,
        nickname VARCHAR(100),
        profile_image VARCHAR(255),
        content TEXT,
        type VARCHAR(20) DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `);

        // Add 'type' column if it doesn't exist (Migration for existing DB)
        try {
            const [columns] = await promisePool.query("SHOW COLUMNS FROM messages LIKE 'type'");
            if (columns.length === 0) {
                await promisePool.query("ALTER TABLE messages ADD COLUMN type VARCHAR(20) DEFAULT 'text'");
                console.log("Added 'type' column to messages table.");
            }
        } catch (e) {
            console.error("Migration check error:", e);
        }

        console.log('Database tables checked/created successfully.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// ... (DB Connection Test - Keep existing) ...
const waitForDB = () => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error connecting to the database:', err.code, err.message);
            console.log('Retrying in 5 seconds...');
            setTimeout(waitForDB, 5000);
        } else {
            console.log('Successfully connected to the MySQL database.');
            initDB();
            connection.release();
        }
    });
};

waitForDB();

// ... (Middleware & Routes - Keep existing) ...
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await promisePool.query('SELECT 1');
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
        console.error('Health check database error:', error);
        res.status(500).json({ status: 'error', database: 'disconnected', message: error.message });
    }
});

// Image Upload Endpoint
app.post('/api/chat/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    // Return the path relative to public
    // req.file.filename is the file name in uploads dir
    const relativePath = `/uploads/${req.file.filename}`;
    res.json({ success: true, path: relativePath });
});

// Kakao Login Logic
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${PORT}/api/auth/kakao/callback`;

app.get('/api/auth/kakao', (req, res) => {
    const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
    res.redirect(kakaoAuthURL);
});

app.get('/api/auth/kakao/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('No code provided');
    }

    try {
        // 1. Get Access Token
        const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', null, {
            params: {
                grant_type: 'authorization_code',
                client_id: KAKAO_CLIENT_ID,
                client_secret: KAKAO_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                code: code
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token } = tokenResponse.data;

        // 2. Get User Info
        const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        const kakaoUser = userResponse.data;
        const kakaoId = kakaoUser.id;
        const nickname = kakaoUser.properties?.nickname || 'Unknown';
        const profileImage = kakaoUser.properties?.profile_image || '';

        // Determine Role from cookie, default to 'user'
        const authRole = req.cookies.auth_role || 'user';

        // 3. Upsert User (Update profile image, role, and login time, KEEP nickname)
        // 닉네임은 최초 가입 시에만 Kakao 닉네임 사용, 이후엔 DB 값 유지
        await promisePool.query(
            `INSERT INTO users (kakao_id, nickname, profile_image, role) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             profile_image = VALUES(profile_image),
             role = VALUES(role),
             last_login = NOW()`,
            [kakaoId, nickname, profileImage, authRole]
        );

        // 4. Retrieve Latest User Info using Kakao ID (to get the custom nickname and role)
        const [rows] = await promisePool.query('SELECT * FROM users WHERE kakao_id = ?', [kakaoId]);
        const user = rows[0];

        // 5. Issue JWT Token (Use DB nickname and role, not Kakao's)
        const token = jwt.sign(
            { id: user.kakao_id, nickname: user.nickname, profileImage: user.profile_image, role: user.role }, // Use user.nickname and user.role from DB
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 6. Set Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Localhost development
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // 6. Redirect to Home
        res.redirect('/');

    } catch (error) {
        console.error('Kakao Login Error:', error.message);
        if (error.response) {
            console.error('Kakao API Error Data:', error.response.data);
            console.error('Used Redirect URI:', REDIRECT_URI);
        }
        res.status(500).json({ error: 'Login Failed', details: error.message });
    }
});

// Check Auth Status
app.get('/api/auth/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ loggedIn: false });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ loggedIn: true, user: decoded });
    } catch (err) {
        res.clearCookie('token');
        res.json({ loggedIn: false });
    }
});

// Update Profile (Nickname + Image)
app.post('/api/user/profile', upload.single('profileImage'), async (req, res) => {
    const token = req.cookies.token;
    const { nickname } = req.body;
    // req.file might be undefined if not changing image

    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    if (!nickname) return res.status(400).json({ error: 'Nickname is required' });
    if (nickname.length > 9) return res.status(400).json({ error: '닉네임은 최대 9글자까지만 설정 가능합니다.' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;

        // 0. Check for duplicate nickname
        const [existing] = await promisePool.query(
            'SELECT id FROM users WHERE nickname = ? AND kakao_id != ?',
            [nickname, userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: '이미 존재하는 닉네임입니다.' });
        }

        let updateQuery = 'UPDATE users SET nickname = ?';
        let queryParams = [nickname];

        let newProfileImage = decoded.profileImage;

        if (req.file) {
            newProfileImage = `/uploads/${req.file.filename}`;
            updateQuery += ', profile_image = ?';
            queryParams.push(newProfileImage);
        }

        updateQuery += ' WHERE kakao_id = ?';
        queryParams.push(userId);

        // 1. Update DB
        await promisePool.query(updateQuery, queryParams);

        // 2. Issue New Token
        const newToken = jwt.sign(
            { id: userId, nickname: nickname, profileImage: newProfileImage },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 3. Set Cookie
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true, nickname: nickname, profileImage: newProfileImage });

    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Verify Invite Code & Admin Code
app.post('/api/auth/verify-code', (req, res) => {
    const { code } = req.body;
    const inviteCode = process.env.INVITE_CODE;
    const adminCode = process.env.ADMIN_CODE;

    if (!code) return res.status(400).json({ success: false, error: 'Code required' });

    if (adminCode && code.trim() === adminCode.trim()) {
        res.cookie('auth_role', 'admin', { httpOnly: true, maxAge: 10 * 60 * 1000 }); // 10 min
        return res.json({ success: true, role: 'admin' });
    }

    if (code.trim() === inviteCode.trim()) {
        res.cookie('auth_role', 'user', { httpOnly: true, maxAge: 10 * 60 * 1000 });
        return res.json({ success: true, role: 'user' });
    }

    res.status(400).json({ success: false, error: 'Invalid code' });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('auth_role');
    res.json({ success: true });
});

// --- Admin Local Auth Endpoints ---

// Admin Signup
app.post('/api/auth/admin/signup', async (req, res) => {
    const { username, password, nickname, adminCode } = req.body;
    const envAdminCode = process.env.ADMIN_CODE;

    if (!username || !password || !nickname || !adminCode) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (adminCode.trim() !== envAdminCode.trim()) {
        return res.status(403).json({ error: 'Invalid Admin Code' });
    }

    try {
        // Check duplicate username
        const [existing] = await promisePool.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert Admin User
        await promisePool.query(
            `INSERT INTO users (username, password, nickname, role, kakao_id) VALUES (?, ?, ?, 'admin', NULL)`,
            [username, hashedPassword, nickname]
        );

        res.json({ success: true, message: 'Admin registered successfully' });

    } catch (err) {
        console.error('Admin Signup Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Admin Login
app.post('/api/auth/admin/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const [rows] = await promisePool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Issue Token
        const token = jwt.sign(
            { id: user.id, nickname: user.nickname, profileImage: user.profile_image || null, role: 'admin' },
            JWT_SECRET, // Note: user.id is INT. Previous kakao flow used kakao_id (BIGINT). 
            // We should ensure socket.js handles user.id (which is INT now for admins). 
            // Actually, in `join_chat`, we used `socket.userId = user.id`. 
            // In kakao flow, `id` in token was `kakao_id`. 
            // For admin, `id` in token is auto-increment `id`.
            // Messages table uses `user_id BIGINT`.
            // This might cause confusion if admins and users chat. 
            // Kakao IDs are huge numbers. Local IDs are small. They won't overlap likely, but technically user_id field mixes them.
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true });

    } catch (err) {
        console.error('Admin Login Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 기본 라우트 (SPA 지원을 위해 API가 아닌 요청은 index.html 반환)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 Handler for API
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Socket.IO Logic
const onlineUsers = new Map(); // socketId -> userId
const userIdToInfo = new Map(); // userId -> { nickname, profileImage }

// Ladder Game State
let ladderState = 'idle'; // idle, recruiting, input_phase, playing
let ladderParticipants = [];
let ladderTimer = null;
let ladderTimeLeft = 0;
let ladderCreator = null;
let ladderResults = []; // Bottom texts
let ladderData = []; // The generated horizontal lines
let ladderResetTimer = null;

// Screen Sharing Broadcast State
const activeBroadcasts = new Map(); // userId -> { socketId, userId, nickname, quality, hasAudio, profileImage }

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Sync Ladder State for new connection
    socket.emit('ladder_recruitment_state', {
        state: ladderState,
        participants: ladderParticipants,
        timeLeft: ladderTimeLeft,
        creator: ladderCreator,
        results: ladderResults,
        ladderData: ladderData
    });

    // 입장 시
    socket.on('join_chat', async (user) => {
        // user: { id, nickname, profileImage }
        if (user && user.id) {
            socket.userId = user.id; // Store in socket session
            onlineUsers.set(socket.id, user.id);
            userIdToInfo.set(user.id, { nickname: user.nickname, profile_image: user.profileImage });
        }

        try {
            // 1. Load Recent Messages
            const [rows] = await promisePool.query(
                `SELECT m.id, m.user_id, m.content, m.type, m.created_at, 
                        COALESCE(u.nickname, m.nickname) as nickname, 
                        COALESCE(u.profile_image, m.profile_image) as profile_image
                 FROM messages m
                 LEFT JOIN users u ON m.user_id = u.kakao_id
                 WHERE m.created_at >= NOW() - INTERVAL 3 DAY 
                 ORDER BY m.created_at ASC`
            );
            socket.emit('load_messages', rows);

            // 2. Broadcast User List & Online Status
            broadcastUserList();

            // Re-emit ladder state just in case custom join logic is needed later
            socket.emit('ladder_recruitment_state', {
                state: ladderState,
                participants: ladderParticipants,
                timeLeft: ladderTimeLeft,
                creator: ladderCreator,
                results: ladderResults,
                ladderData: ladderData
            });

        } catch (err) {
            console.error('Load error:', err);
        }
    });

    // 메시지 전송
    socket.on('send_message', async (data) => {
        // ... (Existing logic) ...
        const msgType = data.type || 'text';
        try {
            const [result] = await promisePool.query(
                `INSERT INTO messages (user_id, nickname, profile_image, content, type) VALUES (?, ?, ?, ?, ?)`,
                [data.user_id, data.nickname, data.profileImage, data.content, msgType]
            );

            const newMessage = {
                id: result.insertId,
                user_id: data.user_id,
                nickname: data.nickname,
                profile_image: data.profileImage,
                content: data.content,
                type: msgType,
                created_at: new Date()
            };
            io.emit('receive_message', newMessage);

        } catch (err) {
            console.error('Save message error:', err);
        }
    });

    // Typing Indicator
    socket.on('typing', (nickname) => {
        socket.broadcast.emit('display_typing', nickname);
    });

    socket.on('stop_typing', () => {
        socket.broadcast.emit('hide_typing');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (socket.userId) {
            onlineUsers.delete(socket.id);
            // Optionally remove from userIdToInfo if no other sockets exist for this user, 
            // but for "Registered List" we want to keep them.
            broadcastUserList();
        }

        // Check if disconnecting user was broadcasting
        for (const [userId, broadcast] of activeBroadcasts.entries()) {
            if (broadcast.socketId === socket.id) {
                console.log(`Broadcaster ${broadcast.nickname} disconnected unexpectedly`);
                activeBroadcasts.delete(userId);
                io.emit('broadcast_stopped', { broadcasterId: userId });
                io.emit('broadcast_list', {
                    broadcasts: Array.from(activeBroadcasts.values())
                });

                // Also notify viewers to leave?
                // The client handles broadcast_stopped by calling leaveAsViewer()
                break;
            }
        }
    });

    // Request User List On-Demand
    socket.on('request_user_list', async () => {
        try {
            // Select both id and kakao_id to handle both user types
            const [users] = await promisePool.query('SELECT id, kakao_id, nickname, profile_image FROM users ORDER BY nickname ASC');
            const activeUserIds = new Set(onlineUsers.values());

            const userList = users.map(u => {
                // Determine the ID used for online checking
                // Kakao users use kakao_id, Admins use id
                const uniqueId = u.kakao_id ? u.kakao_id : u.id;
                return {
                    id: uniqueId,
                    nickname: u.nickname,
                    profile_image: u.profile_image,
                    isOnline: activeUserIds.has(uniqueId)
                };
            });

            socket.emit('update_user_list', userList);
        } catch (err) {
            console.error('Request User List Error:', err);
        }
    });

    // --- Ladder Game Logic ---

    // Start Recruitment
    socket.on('start_ladder_recruitment', (user) => {
        if (ladderState !== 'idle') return; // Already recruiting or playing

        ladderState = 'recruiting';
        ladderParticipants = [user]; // Creator auto-joins
        ladderCreator = user;
        ladderTimeLeft = 30;
        ladderResults = []; // reset results
        ladderData = [];

        io.emit('ladder_recruitment_state', {
            state: 'recruiting',
            participants: ladderParticipants,
            timeLeft: ladderTimeLeft,
            creator: ladderCreator
        });

        // Clear existing timer if any (safety)
        if (ladderTimer) clearInterval(ladderTimer);

        ladderTimer = setInterval(() => {
            ladderTimeLeft--;
            io.emit('ladder_timer_update', ladderTimeLeft);

            if (ladderTimeLeft <= 0) {
                clearInterval(ladderTimer);
                ladderTimer = null;

                // Transition to Input Phase
                startInputPhase();
            }
        }, 1000);
    });

    // Join Ladder
    socket.on('join_ladder', (user) => {
        if (ladderState !== 'recruiting') return;

        // Check if already joined (by nickname or id)
        const exists = ladderParticipants.find(u => u.nickname === user.nickname);
        if (!exists) {
            ladderParticipants.push(user);
            io.emit('ladder_update_participants', ladderParticipants);
        }
    });

    // Update Result Input (Bottom text)
    socket.on('update_ladder_result', ({ index, value }) => {
        if (ladderState !== 'input_phase') return;
        if (index >= 0 && index < ladderResults.length) {
            ladderResults[index] = value;
            socket.broadcast.emit('ladder_update_results', { ladderResults });
        }
    });

    // Run Game
    socket.on('run_ladder_game', () => {
        if (ladderState !== 'input_phase') return;
        // Verify creator? 
        // For simplicity, allow anyone or frontend checks. Better: check socket.userId against creator.id if we had ids.
        // We will relay on frontend for now or check nickname.

        ladderState = 'playing';

        // Generate Ladder Structure
        // N verticals, Height H. 
        // Generate M horizontal lines. 
        // line: { col: 0..N-2, row: 0..100 }

        const N = ladderParticipants.length;
        const lines = [];
        const rows = 10; // Logic grid height

        // For each column gap (0 to N-2)
        for (let col = 0; col < N - 1; col++) {
            // For each row, random chance
            for (let r = 0; r < rows; r++) {
                // Avoid adjacent collisions: simplistic approach
                // Just random generation
                if (Math.random() > 0.5) {
                    lines.push({ col, row: r });
                }
            }
        }
        // Improve generation to prevent overlapping? For valid ladder logic, we just need steps. 
        // Client will draw using these logical row steps.

        ladderData = lines;

        io.emit('ladder_game_start', {
            ladderData,
            ladderResults
        });

        // Reset after 30s
        if (ladderResetTimer) clearTimeout(ladderResetTimer);
        ladderResetTimer = setTimeout(() => {
            resetLadderState();
        }, 30000);
    });

    socket.on('reset_ladder', () => {
        // Validate creator
        if (!ladderCreator) return;

        const userInfo = userIdToInfo.get(socket.userId);
        if (userInfo && userInfo.nickname === ladderCreator.nickname) {
            resetLadderState();
        }
    });

    function resetLadderState() {
        if (ladderResetTimer) clearTimeout(ladderResetTimer);
        ladderResetTimer = null;

        ladderState = 'idle';
        ladderParticipants = [];
        ladderResults = [];
        ladderData = [];
        ladderCreator = null;
        io.emit('ladder_recruitment_state', { state: 'idle' });
    }

    function startInputPhase() {
        ladderState = 'input_phase';
        // Initialize results array based on participant count
        ladderResults = new Array(ladderParticipants.length).fill('');

        io.emit('ladder_recruitment_state', {
            state: 'input_phase',
            participants: ladderParticipants,
            creator: ladderCreator,
            results: ladderResults
        });
    }

    // ============================================
    // 🖥️ SCREEN SHARING SIGNALING (WebRTC)
    // ============================================

    // Send current broadcast list to new connection
    socket.emit('broadcast_list', {
        broadcasts: Array.from(activeBroadcasts.values())
    });

    // Start broadcast
    socket.on('start_broadcast', async ({ userId, nickname, quality, hasAudio }) => {
        console.log(`${nickname} started broadcasting with audio:`, hasAudio);

        // Get user profile image  
        let profileImage = null;
        try {
            const [rows] = await promisePool.query(
                'SELECT profile_image FROM users WHERE id = ?',
                [userId]
            );
            if (rows.length > 0) {
                profileImage = rows[0].profile_image;
            }
        } catch (err) {
            console.error('Error fetching profile image:', err);
        }

        const broadcast = {
            socketId: socket.id,
            userId,
            nickname,
            quality,
            hasAudio: !!hasAudio,
            profileImage
        };

        activeBroadcasts.set(userId, broadcast);
        console.log(`Broadcast added. Total: ${activeBroadcasts.size}`);

        // Notify all other users
        socket.broadcast.emit('broadcast_started', {
            broadcasterId: userId,
            broadcasterName: nickname,
            quality,
            hasAudio: !!hasAudio,
            profileImage
        });

        // Send updated list to everyone
        io.emit('broadcast_list', {
            broadcasts: Array.from(activeBroadcasts.values())
        });
    });

    // Stop broadcast
    socket.on('stop_broadcast', () => {
        // Find and remove broadcaster
        for (const [userId, broadcast] of activeBroadcasts.entries()) {
            if (broadcast.socketId === socket.id) {
                console.log(`${broadcast.nickname} stopped broadcasting`);
                activeBroadcasts.delete(userId);

                // Notify everyone
                io.emit('broadcast_stopped', { broadcasterId: userId });

                // Send updated list
                io.emit('broadcast_list', {
                    broadcasts: Array.from(activeBroadcasts.values())
                });
                break;
            }
        }
    });

    // Check if there's an active broadcast
    socket.on('check_broadcast', () => {
        // Send full broadcast list
        socket.emit('broadcast_list', {
            broadcasts: Array.from(activeBroadcasts.values())
        });
    });

    // Viewer wants to join broadcast
    socket.on('join_broadcast', ({ broadcasterId, viewerId, viewerName }) => {
        // Find the specific broadcaster by ID
        const broadcast = activeBroadcasts.get(broadcasterId);

        if (broadcast) {
            console.log(`${viewerName} joined ${broadcast.nickname}'s broadcast (ID: ${broadcasterId})`);
            // Tell broadcaster about new viewer
            io.to(broadcast.socketId).emit('viewer_joined', {
                viewerId: socket.id,
                viewerName
            });
        } else {
            console.log(`Broadcast not found for ID: ${broadcasterId}`);
        }
    });

    // Viewer leaves broadcast
    socket.on('leave_broadcast', () => {
        // Notify all broadcasters
        activeBroadcasts.forEach(broadcast => {
            io.to(broadcast.socketId).emit('viewer_left', {
                viewerId: socket.id
            });
        });
    });

    // WebRTC Offer (broadcaster → viewer)
    socket.on('broadcast_offer', ({ target, offer }) => {
        io.to(target).emit('broadcast_offer', {
            from: socket.id,
            offer
        });
    });

    // WebRTC Answer (viewer → broadcaster)
    socket.on('broadcast_answer', ({ target, answer }) => {
        io.to(target).emit('broadcast_answer', {
            from: socket.id,
            answer
        });
    });

    // ICE Candidate exchange
    socket.on('ice_candidate', ({ target, candidate }) => {
        io.to(target).emit('ice_candidate', {
            from: socket.id,
            candidate
        });
    });
});

async function broadcastUserList() {
    try {
        // Get all registered users from DB
        const [users] = await promisePool.query('SELECT id, kakao_id, nickname, profile_image FROM users ORDER BY nickname ASC');

        // Check online status
        // Create a Set of currently active userIds
        const activeUserIds = new Set(onlineUsers.values());

        const userList = users.map(u => {
            const uniqueId = u.kakao_id ? u.kakao_id : u.id;
            return {
                id: uniqueId,
                nickname: u.nickname,
                profile_image: u.profile_image,
                isOnline: activeUserIds.has(uniqueId)
            };
        });

        io.emit('update_user_list', userList);
    } catch (err) {
        console.error('Broadcast User List Error:', err);
    }
}

// Cron Job: 매일 00:00에 7일 지난 메시지 "및 파일" 삭제
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily cron job: Clean up old messages and files...');
    try {
        // 1. Find images to be deleted
        const [rows] = await promisePool.query(
            `SELECT content, type FROM messages WHERE created_at < NOW() - INTERVAL 7 DAY AND type = 'image'`
        );

        if (rows.length > 0) {
            console.log(`Found ${rows.length} image files to delete.`);
            rows.forEach((row) => {
                const filePath = path.join(__dirname, '../public', row.content);
                fs.unlink(filePath, (err) => {
                    if (err) console.error(`Failed to delete file ${filePath}:`, err);
                    else console.log(`Deleted file: ${filePath}`);
                });
            });
        }

        // 2. Delete DB records
        const [result] = await promisePool.query(
            `DELETE FROM messages WHERE created_at < NOW() - INTERVAL 7 DAY`
        );
        console.log(`Deleted ${result.affectedRows} old messages from DB.`);
    } catch (err) {
        console.error('Cron job error:', err);
    }
});

// app.listen -> server.listen
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
