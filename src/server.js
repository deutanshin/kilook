const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const mysql = require('mysql2');

const axios = require('axios');

const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');

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
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kakao_id BIGINT UNIQUE NOT NULL,
                nickname VARCHAR(100),
                profile_image VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // 채팅 메시지 테이블 (message type: text, image, etc. - 일단 text만)
        await promisePool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT, 
                nickname VARCHAR(100),
                profile_image VARCHAR(255),
                content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Database tables checked/created successfully.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// ... (DB Connection Test - Keep existing) ...
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Successfully connected to the MySQL database.');
        initDB();
        connection.release();
    }
});

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

        // 3. Upsert User (Update only profile image and login time, KEEP nickname)
        // 닉네임은 최초 가입 시에만 Kakao 닉네임 사용, 이후엔 DB 값 유지
        await promisePool.query(
            `INSERT INTO users (kakao_id, nickname, profile_image) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE 
             profile_image = VALUES(profile_image),
             last_login = NOW()`,
            [kakaoId, nickname, profileImage]
        );

        // 4. Retrieve Latest User Info using Kakao ID (to get the custom nickname)
        const [rows] = await promisePool.query('SELECT * FROM users WHERE kakao_id = ?', [kakaoId]);
        const user = rows[0];

        // 5. Issue JWT Token (Use DB nickname, not Kakao's)
        const token = jwt.sign(
            { id: user.kakao_id, nickname: user.nickname, profileImage: user.profile_image }, // Use user.nickname from DB
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 5. Set Cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Localhost development
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        // 6. Redirect to Home
        res.redirect('/');

    } catch (error) {
        console.error('Kakao Login Error:', error.response?.data || error.message);
        res.status(500).send('Login failed');
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

// Update Nickname
app.put('/api/user/nickname', async (req, res) => {
    const token = req.cookies.token;
    const { nickname } = req.body;

    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    if (!nickname) return res.status(400).json({ error: 'Nickname is required' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id; // kakao_id saved in token

        // 0. Check for duplicate nickname
        const [existing] = await promisePool.query(
            'SELECT id FROM users WHERE nickname = ? AND kakao_id != ?',
            [nickname, userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: '이미 존재하는 닉네임입니다.' });
        }

        // 1. Update DB
        await promisePool.query(
            'UPDATE users SET nickname = ? WHERE kakao_id = ?',
            [nickname, userId]
        );

        // 2. Issue New Token with updated nickname
        const newToken = jwt.sign(
            { id: userId, nickname: nickname, profileImage: decoded.profileImage },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 3. Set Cookie
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true, nickname: nickname });

    } catch (error) {
        console.error('Update Error:', error);
        res.status(500).json({ error: 'Failed to update nickname' });
    }
});

// Verify Invite Code
app.post('/api/auth/verify-code', (req, res) => {
    const { code } = req.body;
    const correctCode = process.env.INVITE_CODE;

    console.log(`[VERIFY] Env Code: '${correctCode}', Input: '${code}'`);

    if (code && code.trim() === correctCode.trim()) {
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: 'Invalid code' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
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
io.on('connection', (socket) => {
    console.log('A user connected');

    // 입장 시 최근 7일치 대화 내용 불러오기
    socket.on('join_chat', async () => {
        try {
            // messages 테이블과 users 테이블을 조인하여 최신 닉네임/프사를 가져옴
            const [rows] = await promisePool.query(
                `SELECT m.id, m.user_id, m.content, m.created_at, 
                        COALESCE(u.nickname, m.nickname) as nickname, 
                        COALESCE(u.profile_image, m.profile_image) as profile_image
                 FROM messages m
                 LEFT JOIN users u ON m.user_id = u.kakao_id
                 WHERE m.created_at >= NOW() - INTERVAL 7 DAY 
                 ORDER BY m.created_at ASC`
            );
            socket.emit('load_messages', rows);
        } catch (err) {
            console.error('Load messages error:', err);
        }
    });

    // 메시지 전송
    socket.on('send_message', async (data) => {
        // data: { user_id, nickname, profileImage, content }
        try {
            // DB 저장 (user_id = kakao_id 저장)
            const [result] = await promisePool.query(
                `INSERT INTO messages (user_id, nickname, profile_image, content) VALUES (?, ?, ?, ?)`,
                [data.user_id, data.nickname, data.profileImage, data.content]
            );

            // 모든 클라이언트에 전송
            const newMessage = {
                id: result.insertId,
                user_id: data.user_id, // 중요: 소유자 판별용 ID
                nickname: data.nickname, // 표시용 닉네임 (당시 닉네임)
                profile_image: data.profileImage,
                content: data.content,
                created_at: new Date()
            };
            io.emit('receive_message', newMessage);

        } catch (err) {
            console.error('Save message error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Cron Job: 매일 00:00에 7일 지난 메시지 삭제
cron.schedule('0 0 * * *', async () => {
    console.log('Running daily cron job: Deleting old messages...');
    try {
        const [result] = await promisePool.query(
            `DELETE FROM messages WHERE created_at < NOW() - INTERVAL 7 DAY`
        );
        console.log(`Deleted ${result.affectedRows} old messages.`);
    } catch (err) {
        console.error('Cron job error:', err);
    }
});

// app.listen -> server.listen
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
