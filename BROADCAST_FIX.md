# 🔧 방송 목록 기능 활성화 - 서버 수정 가이드

## 문제 상황
- 클라이언트는 준비되었지만 서버가 여전히 로컬 `activeBroadcast` 변수를 사용 중
- 전역 `activeBroadcasts` Map을 사용해야 함

## 📝 수정 방법

### 파일: `src/server.js`

**770-794줄을 다음으로 교체:**

```javascript
    // ============================================
    // 🖥️ SCREEN SHARING SIGNALING (WebRTC)
    // ============================================

    // Send current broadcast list to new connection
    socket.emit('broadcast_list', {
        broadcasts: Array.from(activeBroadcasts.values())
    });

    // Start broadcast
    socket.on('start_broadcast', async ({ userId, nickname, quality, hasAudio }) => {
        console.log(`${nickname} started broadcasting`);
        
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

        // Notify all other users about new broadcast
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
```

## 🚀 적용 후

1. 서버 재시작: `npm start`
2. 브라우저 새로고침
3. 화면 공유 시작하면 다른 사용자의 "Live Broadcasts" 목록에 표시됨!

## ✅ 변경 사항 요약

- ❌ 제거: `let activeBroadcast = null`
- ✅ 추가: 연결 시 `broadcast_list` 전송
- ✅ 추가: `hasAudio`, `profileImage` DB 조회
- ✅ 추가: 전역 `activeBroadcasts` Map 사용
- ✅ 추가: 모든 클라이언트에 `broadcast_list` 업데이트 전송
