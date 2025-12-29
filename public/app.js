document.addEventListener('DOMContentLoaded', () => {
    const kakaoLoginBtn = document.getElementById('kakaoLoginBtn');
    const inviteInput = document.getElementById('inviteCode');

    // 앱 시작 시 로그인 상태 체크
    checkLoginStatus();

    if (kakaoLoginBtn) {
        kakaoLoginBtn.addEventListener('click', async () => {
            const code = inviteInput.value.trim();
            if (!code) {
                alert('초대코드를 입력해주세요.');
                return;
            }

            try {
                const res = await fetch('/api/auth/verify-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const data = await res.json();

                if (data.success) {
                    window.location.href = '/api/auth/kakao';
                } else {
                    alert('초대코드가 올바르지 않습니다.');
                }
            } catch (err) {
                console.error('Verify Error:', err);
                alert(`오류: ${err.message}`);
            }
        });
    }
});

async function checkLoginStatus() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (data.loggedIn) {
            showLoggedInView(data.user);
        }
    } catch (error) {
        console.error('Failed to check login status', error);
    }
}

function showLoggedInView(user) {
    const mainContainer = document.querySelector('.card');

    // Chat UI Structure (User Profile + Chat Area)
    mainContainer.innerHTML = `
        <div class="profile-area">
            <img src="${user.profileImage}" alt="Profile" class="profile-img">
            <h2 id="nicknameDisplay">${user.nickname}</h2>
            <div id="editArea" style="display:none; margin-top: 10px;">
                <input type="text" id="nicknameInput" class="simple-input" value="${user.nickname}" maxlength="9">
                <div style="margin-top: 10px; display: flex; gap: 10px; justify-content: center;">
                    <button id="saveBtn" class="small-btn primary">저장</button>
                    <button id="cancelBtn" class="small-btn secondary">취소</button>
                </div>
            </div>
            <button id="editBtn" class="text-btn">내 정보 변경</button>
        </div>

        <!-- Chat Area -->
        <div class="chat-container">
            <div id="chatMessages" class="chat-messages">
                <!-- Messages will appear here -->
            </div>
            <div class="chat-input-area">
                <input type="file" id="fileInput" accept="image/*" style="display: none;">
                <button id="attachBtn" class="attach-btn">
                    <svg class="attach-icon" viewBox="0 0 24 24">
                        <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5a4 4 0 0 0-8 0v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
                    </svg>
                </button>
                <input type="text" id="chatInput" class="chat-input" placeholder="메시지를 입력하세요..." autocomplete="off">
                <button id="sendBtn" class="send-btn">
                    <svg class="send-icon" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                </button>
            </div>
        </div>

        <div class="button-group" style="margin-top: 2rem;">
            <button id="logoutBtn" class="secondary-btn">Logout</button>
        </div>
    `;

    // --- Logout & Profile Edit Logic (Keep Existing) ---
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.reload();
    });

    const editBtn = document.getElementById('editBtn');
    const editArea = document.getElementById('editArea');
    const nicknameDisplay = document.getElementById('nicknameDisplay');
    const nicknameInput = document.getElementById('nicknameInput');

    editBtn.addEventListener('click', () => {
        const isEditing = editArea.style.display !== 'none';
        if (!isEditing) {
            editArea.style.display = 'block';
            nicknameDisplay.style.display = 'none';
            editBtn.style.display = 'none';
        }
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
        editArea.style.display = 'none';
        nicknameDisplay.style.display = 'block';
        editBtn.style.display = 'inline-block';
        nicknameInput.value = nicknameDisplay.innerText;
    });

    document.getElementById('saveBtn').addEventListener('click', async () => {
        const newNickname = nicknameInput.value.trim();
        if (!newNickname) return alert('닉네임을 입력해주세요.');
        try {
            const res = await fetch('/api/user/nickname', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: newNickname })
            });
            const data = await res.json();
            if (data.success) {
                nicknameDisplay.innerText = data.nickname;
                editArea.style.display = 'none';
                nicknameDisplay.style.display = 'block';
                editBtn.style.display = 'inline-block';
                // user 객체 업데이트 (채팅용)
                user.nickname = data.nickname;
                alert('닉네임이 변경되었습니다.');
            } else {
                alert('변경 실패: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('오류가 발생했습니다.');
        }
    });

    // --- Chat Logic ---
    const socket = io(); // Initialize Socket.IO
    socket.emit('join_chat'); // Request recent messages

    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');

    const DEFAULT_PROFILE_IMG = 'https://k.kakaocdn.net/dn/dpk9l1/btqmGhA2lKL/Oz0wT9a5Szj5k4A95k4A95/img_640x640.jpg';

    // UI Helper: Add Message
    function addMessageToUI(msg) {
        // msg: { user_id, nickname, profile_image, content, type, created_at, ... }
        const item = document.createElement('div');

        // 닉네임이 아닌 고유 ID(kakao_id)로 비교
        // user.id 타입이 string/number 섞일 수 있으므로 String 변환 비교
        const isMe = String(msg.user_id) === String(user.id);

        item.className = `message-item ${isMe ? 'me' : 'other'}`;

        let contentHtml = '';
        if (msg.type === 'image') {
            contentHtml = `<img src="${msg.content}" class="msg-image" onclick="window.open(this.src)" onerror="this.style.border='2px solid red'; this.alt='Image Load Failed';"/>`;
        } else {
            contentHtml = `<div class="msg-bubble">${escapeHtml(msg.content)}</div>`;
        }

        const profileSrc = msg.profile_image || DEFAULT_PROFILE_IMG;

        item.innerHTML = `
            <img src="${profileSrc}" alt="Profile" class="msg-profile" onerror="this.src='${DEFAULT_PROFILE_IMG}'">
            <div class="msg-content">
                <span class="msg-nickname">${msg.nickname}</span>
                ${contentHtml}
            </div>
        `;

        chatMessages.appendChild(item);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Auto scroll
    }

    // Prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Load Previous Messages
    socket.on('load_messages', (messages) => {
        messages.forEach(msg => addMessageToUI(msg));
    });

    // Receive New Message
    socket.on('receive_message', (msg) => {
        addMessageToUI(msg);
    });

    // Send Message Logic
    function sendMessage() {
        const content = chatInput.value.trim();
        if (!content) return;

        socket.emit('send_message', {
            user_id: user.id, // Kakao ID 전송
            nickname: user.nickname,
            profileImage: user.profileImage,
            content: content,
            type: 'text'
        });

        chatInput.value = '';
        chatInput.focus();
    }

    // Upload & Send Image Logic
    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/chat/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                // Send socket event with image path
                socket.emit('send_message', {
                    user_id: user.id,
                    nickname: user.nickname,
                    profileImage: user.profileImage,
                    content: data.path, // path from server
                    type: 'image'
                });
            } else {
                alert('이미지 업로드 실패: ' + data.error);
            }
        } catch (err) {
            console.error('Upload Error:', err);
            alert('이미지 업로드 중 오류가 발생했습니다.');
        } finally {
            fileInput.value = ''; // Reset input
        }
    });

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

