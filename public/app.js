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
    const DEFAULT_PROFILE_IMG = 'https://k.kakaocdn.net/dn/dpk9l1/btqmGhA2lKL/Oz0wT9a5Szj5k4A95k4A95/img_640x640.jpg';

    // --- UI Structure ---
    mainContainer.innerHTML = `
        <div class="user-list-btn" id="userListToggle">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
        </div>

        <div class="profile-area">
            <img src="${user.profileImage}" alt="Profile" class="profile-img">
            <h2 id="nicknameDisplay">${user.nickname}</h2>
            <div id="editArea" style="display:none; margin-top: 10px;">
                <div class="profile-edit-container">
                    <input type="file" id="profileInput" accept="image/*" style="display: none;">
                    <div class="profile-img-wrapper" id="profileImgWrapper">
                        <img src="${user.profileImage}" id="previewImg" onerror="this.src='${DEFAULT_PROFILE_IMG}'">
                        <div class="edit-overlay">
                            <span>변경</span>
                        </div>
                    </div>
                </div>
                <input type="text" id="nicknameInput" class="simple-input" value="${user.nickname}" maxlength="9">
                <div style="margin-top: 10px; display: flex; gap: 10px; justify-content: center;">
                    <button id="saveBtn" class="small-btn primary">저장</button>
                    <button id="cancelBtn" class="small-btn secondary">취소</button>
                </div>
            </div>
            <button id="editBtn" class="text-btn">내 정보 변경</button>
        </div>

        <div id="typingIndicator" class="typing-indicator"></div>

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

        <!-- User List Modal -->
        <div id="userListModal" class="user-list-modal">
            <div class="user-list-content">
                <div class="user-list-header">
                    <h3>Members</h3>
                    <button id="closeUserList" class="small-btn secondary">닫기</button>
                </div>
                <div id="userListItems" class="user-list-items">
                    <!-- Users Rendered Here -->
                </div>
            </div>
        </div>
    `;

    // --- User List Logic ---
    const userListToggle = document.getElementById('userListToggle');
    const userListModal = document.getElementById('userListModal');
    const closeUserList = document.getElementById('closeUserList');
    const userListItems = document.getElementById('userListItems');

    userListToggle.addEventListener('click', () => {
        userListModal.style.display = 'flex';
    });

    closeUserList.addEventListener('click', () => {
        userListModal.style.display = 'none';
    });

    // Close on outside click
    userListModal.addEventListener('click', (e) => {
        if (e.target === userListModal) userListModal.style.display = 'none';
    });

    // --- Logout & Profile Edit Logic ---
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.reload();
    });

    const editBtn = document.getElementById('editBtn');
    const editArea = document.getElementById('editArea');
    const nicknameDisplay = document.getElementById('nicknameDisplay');
    const nicknameInput = document.getElementById('nicknameInput');

    // Profile Image Edit Elements
    const profileImgWrapper = document.getElementById('profileImgWrapper');
    const profileInput = document.getElementById('profileInput');
    const previewImg = document.getElementById('previewImg');
    const mainProfileImg = document.querySelector('.profile-img'); // Main view image

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
        // Reset preview
        previewImg.src = user.profileImage;
    });

    // Handle Profile Image Selection
    profileImgWrapper.addEventListener('click', () => {
        profileInput.click();
    });

    profileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('saveBtn').addEventListener('click', async () => {
        const newNickname = nicknameInput.value.trim();
        const newProfileFile = profileInput.files[0];

        if (!newNickname) return alert('닉네임을 입력해주세요.');

        const formData = new FormData();
        formData.append('nickname', newNickname);
        if (newProfileFile) {
            formData.append('profileImage', newProfileFile);
        }

        try {
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                nicknameDisplay.innerText = data.nickname;
                editArea.style.display = 'none';
                nicknameDisplay.style.display = 'block';
                editBtn.style.display = 'inline-block';

                // Update local user object
                user.nickname = data.nickname;
                user.profileImage = data.profileImage;

                // Update Main Profile Image
                mainProfileImg.src = data.profileImage;

                alert('프로필이 변경되었습니다.');
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
    socket.emit('join_chat', user); // Pass User Info

    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const attachBtn = document.getElementById('attachBtn');
    const fileInput = document.getElementById('fileInput');
    const typingIndicator = document.getElementById('typingIndicator');

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
        // If someone sends a message, they stopped typing
        if (msg.nickname !== user.nickname) {
            typingIndicator.classList.remove('active');
        }
    });

    // Update User List
    socket.on('update_user_list', (users) => {
        userListItems.innerHTML = '';
        users.forEach(u => {
            const el = document.createElement('div');
            el.className = 'user-item';
            const pImg = u.profile_image || DEFAULT_PROFILE_IMG;

            el.innerHTML = `
                <img src="${pImg}" class="user-item-img" onerror="this.src='${DEFAULT_PROFILE_IMG}'">
                <div class="user-item-info">
                    <div style="font-weight: bold; color: var(--text-primary);">${u.nickname}</div>
                </div>
                <div class="status-indicator ${u.isOnline ? 'online' : ''}"></div>
            `;
            userListItems.appendChild(el);
        });
    });

    // Typing Handlers
    socket.on('display_typing', (nickname) => {
        typingIndicator.innerText = `${nickname} 님이 입력 중...`;
        typingIndicator.classList.add('active');
    });

    socket.on('hide_typing', () => {
        typingIndicator.classList.remove('active');
    });

    // Typing Emit Logic (Throttle)
    let typingTimeout = null;
    chatInput.addEventListener('input', () => {
        if (chatInput.value.length > 0) {
            socket.emit('typing', user.nickname);

            if (typingTimeout) clearTimeout(typingTimeout);

            typingTimeout = setTimeout(() => {
                socket.emit('stop_typing');
            }, 3000);
        } else {
            socket.emit('stop_typing');
        }
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

        socket.emit('stop_typing'); // Stop typing status explicitly

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

