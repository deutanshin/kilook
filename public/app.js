const DEFAULT_PROFILE_IMG = 'https://k.kakaocdn.net/dn/dpk9l1/btqmGhA2lKL/Oz0wT9a5Szj5k4A95k4A95/img_640x640.jpg';

document.addEventListener('DOMContentLoaded', () => {
    const kakaoLoginBtn = document.getElementById('kakaoLoginBtn');
    const inviteInput = document.getElementById('inviteCode');

    // 앱 시작 시 로그인 상태 체크
    checkLoginStatus();

    const headerTitle = document.querySelector('header h1');
    const userLoginWrapper = document.getElementById('userLoginWrapper');
    const adminAuthWrapper = document.getElementById('adminAuthWrapper');

    // Admin Mode Logic
    let clickCount = 0;
    let clickTimer = null;
    let isAdminMode = false;

    if (headerTitle) {
        headerTitle.addEventListener('click', () => {
            clickCount++;

            if (clickTimer) clearTimeout(clickTimer);
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 3000); // 3 seconds to click 5 times

            if (clickCount >= 5) {
                isAdminMode = !isAdminMode; // Toggle
                clickCount = 0;

                if (isAdminMode) {
                    alert('관리자 모드가 활성화되었습니다.');
                    userLoginWrapper.style.display = 'none';
                    adminAuthWrapper.style.display = 'flex';
                    headerTitle.style.color = "#ff4444";
                } else {
                    alert('관리자 모드가 해제되었습니다.');
                    userLoginWrapper.style.display = 'flex';
                    adminAuthWrapper.style.display = 'none';
                    headerTitle.style.color = "";
                }
            }
        });
    }

    // --- Admin Tabs & Forms ---
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminSignupForm = document.getElementById('adminSignupForm');

    if (tabLogin && tabSignup) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            adminLoginForm.classList.add('active');
            adminSignupForm.classList.remove('active');
        });

        tabSignup.addEventListener('click', () => {
            tabSignup.classList.add('active');
            tabLogin.classList.remove('active');
            adminSignupForm.classList.add('active');
            adminLoginForm.classList.remove('active');
        });
    }

    // Admin Signup
    if (adminSignupForm) {
        adminSignupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('adminSignupId').value;
            const password = document.getElementById('adminSignupPw').value;
            const nickname = document.getElementById('adminSignupNick').value;
            const adminCode = document.getElementById('adminSignupCode').value;

            try {
                const res = await fetch('/api/auth/admin/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, nickname, adminCode })
                });
                const data = await res.json();
                if (data.success) {
                    alert('관리자 가입 성공! 로그인해주세요.');
                    tabLogin.click(); // Switch to login tab
                } else {
                    alert(data.error || '가입 실패');
                }
            } catch (err) {
                console.error(err);
                alert('오류 발생');
            }
        });
    }

    // Admin Login
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('adminLoginId').value;
            const password = document.getElementById('adminLoginPw').value;

            try {
                const res = await fetch('/api/auth/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (data.success) {
                    window.location.reload(); // Reload to trigger checkLoginStatus
                } else {
                    alert(data.error || '로그인 실패');
                }
            } catch (err) {
                console.error(err);
                alert('오류 발생');
            }
        });
    }

    if (kakaoLoginBtn) {
        kakaoLoginBtn.addEventListener('click', async () => {
            const code = inviteInput.value.trim();
            if (!code) {
                alert('코드를 입력해주세요.');
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
                    if (data.role === 'admin') {
                        // Admin Login Success
                        window.location.href = '/api/auth/kakao';
                    } else {
                        // User Login Success
                        window.location.href = '/api/auth/kakao';
                    }
                } else {
                    alert('코드가 올바르지 않습니다.');
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

    // Hide Header (KTV private) and Footer
    document.querySelector('header').style.display = 'none';
    document.querySelector('footer').style.display = 'none';

    // --- UI Structure ---
    // Switch from .card to .dashboard-container
    mainContainer.className = 'dashboard-container';
    mainContainer.style.maxWidth = '1200px';

    // Fix layout width
    const container = document.querySelector('.container');
    if (container) {
        container.style.maxWidth = '100%';
        container.style.padding = '0';
        container.style.height = '100vh';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
    }

    mainContainer.innerHTML = `
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-brand">KTV</div>
            <nav>
                <div class="nav-item active" id="navChat">
                    <span>💬</span> Chat
                </div>
                <div class="nav-item" id="navWatching">
                    <span>🖥️</span> Watching
                </div>
                <div class="nav-item" id="navLadder">
                    <span>🪜</span> Ladder
                </div>
            </nav>
            
            <div style="margin-top: auto;">
                 <div class="button-group" style="flex-direction: column; gap: 10px;">
                    <button id="logoutBtn" class="secondary-btn" style="width:100%; padding: 10px; font-size: 0.9rem;">Logout</button>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <div class="content-area">
            
            <!-- Top Bar / Profile -->
            <div class="profile-area-dashboard">
                <div class="profile-mini">
                    <img src="${user.profileImage}" alt="Profile" id="headerProfileImg" onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_IMG}'">
                    <span style="font-weight: bold; font-size: 1.1rem;">${user.nickname}</span>
                </div>
                <div>
                     <button id="userListToggle" class="small-btn secondary" style="display:flex; align-items:center; gap:5px;">
                        <span>👥 Members</span>
                     </button>
                </div>
            </div>

            <!-- Chat Section -->
             <div id="chatSection" class="chat-container">
                <div id="chatMessages" class="chat-messages">
                    <!-- Messages will appear here -->
                </div>
                
                <div class="typing-indicator" id="typingIndicator"></div>

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

            <!-- Ladder Game Section -->
            <div id="ladderSection" class="chat-container" style="display: none; flex-direction: column; align-items: center; justify-content: start; padding: 20px;">
                <h2 style="margin-bottom: 20px;">Ladder Game</h2>
                
                <!-- Idle / Recruiting UI -->
                <div id="ladderControls" style="margin-bottom: 20px; display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <div id="ladderStatusText" style="color: var(--text-secondary);">게임을 생성하여 팀원을 모집하세요.</div>
                    
                    <div id="ladderTimerArea" style="display: none; font-size: 2rem; font-weight: bold; color: var(--accent-color);">30</div>

                    <div style="display: flex; gap: 10px;">
                        <button id="createLadderBtn" class="small-btn primary">모집 시작 (30초)</button>
                        <button id="joinLadderBtn" class="small-btn secondary" style="display: none;">참가하기</button>
                    </div>
                </div>

                <!-- Participant List -->
                <div id="ladderParticipantsList" style="margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                    <!-- Avatars will go here -->
                </div>

                <!-- Game Area -->
                <div id="ladderGameArea" style="width: 100%; height: 400px; background: rgba(0,0,0,0.2); border-radius: 12px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; display: none;">
                     <canvas id="ladderCanvas" width="800" height="400"></canvas>
                </div>
            </div>

            <!-- Screen Sharing Section -->
            <div id="watchingSection" class="chat-container" style="display: none; flex-direction: row; padding: 0; gap: 0;">
                
                <!-- Left Panel: Broadcast List -->
                <div style="width: 320px; background: rgba(0,0,0,0.3); border-right: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column;">
                    <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <h3 style="margin: 0; font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">
                            🎬 Live Broadcasts
                        </h3>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px;">
                            진행 중인 방송
                        </div>
                    </div>

                    <!-- Broadcast List -->
                    <div id="broadcastList" style="flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 12px;">
                        <!-- Broadcasts will be added here -->
                        <div id="noBroadcast" style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                            <div style="font-size: 3rem; margin-bottom: 15px; opacity: 0.3;">📡</div>
                            <div style="font-size: 0.95rem;">진행 중인 방송이 없습니다</div>
                            <div style="font-size: 0.8rem; margin-top: 8px; opacity: 0.7;">화면 공유를 시작해보세요!</div>
                        </div>
                    </div>

                    <!-- Start Broadcast Button -->
                    <div style="padding: 15px; border-top: 1px solid rgba(255,255,255,0.05);">
                        <button id="startShareBtn" class="full-btn primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px;">
                            <span>📺</span> 내 화면 공유하기
                        </button>
                    </div>
                </div>

                <!-- Right Panel: Video Player -->
                <div style="flex: 1; display: flex; flex-direction: column; padding: 20px; background: var(--card-bg);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h2 style="margin: 0; font-size: 1.3rem;">🖥️ Screen Sharing</h2>
                        
                        <!-- Control Buttons -->
                        <div style="display: flex; gap: 10px;">
                            <button id="stopShareBtn" class="small-btn secondary" style="display: none; align-items: center; gap: 8px;">
                                <span>⏹️</span> 공유 중지
                            </button>
                            <button id="fullscreenBtn" class="small-btn secondary" style="display: none; align-items: center; gap: 8px;">
                                <span>⛶</span> 전체화면
                            </button>
                        </div>
                    </div>

                    <!-- Status Info -->
                    <div id="shareStatus" style="text-align: center; margin-bottom: 15px; color: var(--text-secondary); font-size: 0.9rem;">
                        왼쪽 목록에서 방송을 선택하거나 직접 공유를 시작하세요
                    </div>

                    <!-- Viewer Count -->
                    <div id="viewerCount" style="text-align: center; margin-bottom: 15px; display: none;">
                        <span style="background: rgba(var(--accent-rgb), 0.2); padding: 8px 16px; border-radius: 20px; color: var(--accent-color); font-weight: 600;">
                            👥 시청자: <span id="viewerNumber">0</span>명
                        </span>
                    </div>

                    <!-- Video Container -->
                    <div id="videoContainer" style="position: relative; width: 100%; background: #000; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3); flex: 1;">
                        <!-- Main Video -->
                        <video 
                            id="sharedScreen" 
                            autoplay 
                            playsinline
                            style="width: 100%; height: 100%; display: block; background: #000; cursor: pointer; object-fit: contain;"
                        ></video>
                        
                        <!-- No Stream Placeholder -->
                        <div id="noStreamPlaceholder" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(41, 50, 65, 0.95), rgba(72, 52, 212, 0.1)); pointer-events: none;">
                            <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.5;">🖥️</div>
                            <div style="color: var(--text-secondary); font-size: 1.1rem;">공유된 화면이 없습니다</div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 8px;">방송을 선택하거나 직접 시작하세요</div>
                        </div>

                        <!-- Broadcaster Indicator -->
                        <div id="broadcasterInfo" style="position: absolute; top: 15px; left: 15px; background: rgba(220, 38, 38, 0.9); backdrop-filter: blur(10px); color: white; padding: 8px 16px; border-radius: 20px; font-weight: 600; display: none; align-items: center; gap: 8px; pointer-events: none;">
                            <span style="width: 8px; height: 8px; background: white; border-radius: 50%; animation: pulse 2s infinite;"></span>
                            <span id="broadcasterName">방송 중</span>
                        </div>

                        <!-- Quality Indicator -->
                        <div id="qualityIndicator" style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); color: white; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; display: none; pointer-events: none;">
                            <span id="qualityText">FHD 1080p</span>
                        </div>

                        <!-- Fullscreen Hint -->
                        <div id="fullscreenHint" style="position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; display: none; pointer-events: none; white-space: nowrap;">
                            💡 더블클릭으로 전체화면
                        </div>

                        <!-- Volume Control -->
                        <div id="volumeControl" style="position: absolute; bottom: 15px; right: 15px; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); padding: 10px 15px; border-radius: 8px; display: none; align-items: center; gap: 10px;">
                            <span style="font-size: 1.2rem;">🔊</span>
                            <input type="range" id="volumeSlider" min="0" max="100" value="100" 
                                   style="width: 100px; cursor: pointer;">
                        </div>
                    </div>

                    <!-- Connection Info -->
                    <div id="connectionInfo" style="margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; font-size: 0.85rem; color: var(--text-secondary); display: none;">
                        <div style="display: flex; justify-content: space-around; text-align: center;">
                            <div>
                                <div style="color: var(--text-primary); font-weight: 600;">연결 상태</div>
                                <div id="connState">대기중</div>
                            </div>
                            <div>
                                <div style="color: var(--text-primary); font-weight: 600;">화질</div>
                                <div id="resolution">-</div>
                            </div>
                            <div>
                                <div style="color: var(--text-primary); font-weight: 600;">오디오</div>
                                <div id="audioState">-</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- User List Modal -->
        <div id="userListModal" class="user-list-modal">
            <div class="user-list-content">
                <div class="user-list-header">
                    <h3>Members</h3>
                    <button id="closeUserList" class="small-btn secondary">닫기</button>
                </div>
                <div id="userListItems" class="user-list-items"></div>
                
                <!-- Profile Edit in Modal -->
                <div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
                    <h4>내 정보</h4>
                     <div class="profile-edit-container">
                         <div class="profile-img-wrapper" id="profileImgWrapper">
                             <img src="${user.profileImage}" id="previewImg" onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_IMG}'" style="width:60px; height:60px; border-radius:50%; object-fit:cover; margin-bottom:10px; cursor:pointer; border:2px solid var(--accent-color);">
                             <div style="font-size:0.8rem; color:var(--text-secondary);">이미지 변경 클릭</div>
                         </div>
                         <input type="file" id="profileInput" accept="image/*" style="display: none;">
                    </div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                         <input type="text" id="nicknameInput" class="simple-input" value="${user.nickname}" maxlength="9" style="width:100%;">
                         <button id="saveBtn" class="small-btn primary" style="white-space:nowrap;">저장</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize Socket.IO here
    const socket = io();
    socket.emit('join_chat', user);

    // --- User List Logic ---
    const userListToggle = document.getElementById('userListToggle');
    const userListModal = document.getElementById('userListModal');
    const closeUserList = document.getElementById('closeUserList');
    const userListItems = document.getElementById('userListItems');

    userListToggle.addEventListener('click', () => {
        // Fetch latest list from server
        socket.emit('request_user_list');
        userListModal.style.display = 'flex';
    });

    closeUserList.addEventListener('click', () => {
        userListModal.style.display = 'none';
    });

    // Close on outside click
    userListModal.addEventListener('click', (e) => {
        if (e.target === userListModal) userListModal.style.display = 'none';
    });

    // --- Logout ---
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        // Stop broadcasting or watching before logout
        if (typeof stopScreenShare === 'function' && isBroadcasting) {
            stopScreenShare();
        }
        if (typeof leaveAsViewer === 'function' && currentBroadcaster) {
            leaveAsViewer();
        }

        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.reload();
    });

    // --- Profile Edit Logic (Inside Modal) ---
    const nicknameInput = document.getElementById('nicknameInput');
    const profileImgWrapper = document.getElementById('profileImgWrapper');
    const profileInput = document.getElementById('profileInput');
    const previewImg = document.getElementById('previewImg');
    const headerProfileImg = document.getElementById('headerProfileImg');

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
                // Update local user object
                user.nickname = data.nickname;
                user.profileImage = data.profileImage;

                // Update Header
                if (headerProfileImg) headerProfileImg.src = data.profileImage;

                // Update nickname somewhere if visible in header (it is)
                // We need to re-render the header nickname or select it
                // Based on innerHTML: <span ...>${user.nickname}</span> - it's hard to select directly without ID or class
                // Ideally refresh the page or update specific element. 
                // Let's reload to be safe and simple or update text if we can find it.
                // Or better:
                alert('프로필이 변경되었습니다. 업데이트를 반영합니다.');
                window.location.reload();
            } else {
                alert('변경 실패: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('오류가 발생했습니다.');
        }
    });
    // --- Chat Logic ---

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
            <img src="${profileSrc}" alt="Profile" class="msg-profile" onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_IMG}'">
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
                <img src="${pImg}" class="user-item-img" onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_IMG}'">
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


    // --- Tab Switching Logic ---
    const navChat = document.getElementById('navChat');
    const navWatching = document.getElementById('navWatching');
    const navLadder = document.getElementById('navLadder');
    const chatSection = document.getElementById('chatSection');
    const watchingSection = document.getElementById('watchingSection');
    const ladderSection = document.getElementById('ladderSection');

    function switchTab(tabName) {
        // Remove active class from all
        navChat.classList.remove('active');
        navWatching.classList.remove('active');
        navLadder.classList.remove('active');

        // Hide all sections
        chatSection.style.display = 'none';
        watchingSection.style.display = 'none';
        ladderSection.style.display = 'none';

        // Show selected tab
        if (tabName === 'chat') {
            navChat.classList.add('active');
            chatSection.style.display = 'flex';
        } else if (tabName === 'watching') {
            navWatching.classList.add('active');
            watchingSection.style.display = 'flex';
        } else if (tabName === 'ladder') {
            navLadder.classList.add('active');
            ladderSection.style.display = 'flex';
        }
    }

    navChat.addEventListener('click', () => switchTab('chat'));
    navWatching.addEventListener('click', () => switchTab('watching'));
    navLadder.addEventListener('click', () => switchTab('ladder'));

    // --- Ladder Game Logic ---
    const createLadderBtn = document.getElementById('createLadderBtn');
    const joinLadderBtn = document.getElementById('joinLadderBtn');
    const ladderStatusText = document.getElementById('ladderStatusText');
    const ladderTimerArea = document.getElementById('ladderTimerArea');
    const ladderParticipantsList = document.getElementById('ladderParticipantsList');
    const ladderGameArea = document.getElementById('ladderGameArea');
    const ladderCanvas = document.getElementById('ladderCanvas');
    const ctx = ladderCanvas.getContext('2d');

    // Create new elements for inputs and controls dynamically or use a wrapper
    // Let's use the existing ladderGameArea but we need absolute positioning for inputs

    // Start Recruiting
    createLadderBtn.addEventListener('click', () => {
        socket.emit('start_ladder_recruitment', {
            nickname: user.nickname,
            profileImage: user.profileImage
        });
    });

    // Join Ladder
    joinLadderBtn.addEventListener('click', () => {
        socket.emit('join_ladder', {
            nickname: user.nickname,
            profileImage: user.profileImage
        });
        joinLadderBtn.disabled = true;
        joinLadderBtn.innerText = '참가 완료';
    });

    // Socket Events
    // State for Resize & Sync
    let currentLadderState = 'idle';
    let currentLadderParticipants = [];
    let currentLadderResults = [];
    let currentLadderCreator = null;

    // Socket Events
    socket.on('ladder_recruitment_state', (data) => {
        // Sync Local State
        currentLadderState = data.state;
        currentLadderParticipants = data.participants || [];
        currentLadderResults = data.results || [];
        currentLadderCreator = data.creator;

        // Clear previous dynamic inputs if any
        clearLadderInputs();

        if (data.state === 'recruiting') {
            ladderStatusText.innerText = '팀원 모집 중...';
            createLadderBtn.style.display = 'none';
            ladderTimerArea.style.display = 'block';
            ladderTimerArea.innerText = data.timeLeft || 30;
            ladderGameArea.style.display = 'none';

            // If I am not in participants, show join button
            const amIParticipating = data.participants && data.participants.some(p => p.nickname === user.nickname);
            if (!amIParticipating && data.participants) {
                joinLadderBtn.style.display = 'block';
                joinLadderBtn.disabled = false;
                joinLadderBtn.innerText = '참가하기';
            } else {
                joinLadderBtn.style.display = 'none';
            }

            renderParticipants(data.participants || []);

        } else if (data.state === 'input_phase') {
            // Input Phase: Show Ladder UI with inputs
            ladderStatusText.innerText = '결과를 입력하고 게임을 시작하세요.';
            createLadderBtn.style.display = 'none';
            joinLadderBtn.style.display = 'none';
            ladderTimerArea.style.display = 'none';
            ladderParticipantsList.innerHTML = ''; // Hide simple list, moved to canvas area

            ladderGameArea.style.display = 'flex';

            renderLadderSetup(data.participants, data.results, data.creator);

        } else if (data.state === 'idle') {
            resetLadderUI();
        }
    });

    socket.on('ladder_timer_update', (timeLeft) => {
        ladderTimerArea.innerText = timeLeft;
    });

    socket.on('ladder_update_participants', (participants) => {
        currentLadderParticipants = participants;
        renderParticipants(participants);
        const amIParticipating = participants.some(p => p.nickname === user.nickname);
        if (amIParticipating) {
            joinLadderBtn.style.display = 'none';
        }
    });

    socket.on('ladder_update_results', (data) => {
        currentLadderResults = data.ladderResults;
        // Sync input fields
        const inputs = document.querySelectorAll('.ladder-result-input');
        data.ladderResults.forEach((val, idx) => {
            if (inputs[idx] && document.activeElement !== inputs[idx]) {
                inputs[idx].value = val;
            }
        });
    });

    // ... (socket.on('ladder_game_start') is fine, but make sure it sets activeLadderParticipants correctly)

    function showLadderResultsModal(paths) {
        // Build result HTML
        let html = '<div style="display:flex; flex-direction:column; gap:10px; max-height:60vh; overflow-y:auto; width:100%;">';

        activeLadderParticipants.forEach((p, i) => {
            const finalCol = paths[i].finalCol;
            const result = finalLadderResults[finalCol] || '꽝';
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(255,255,255,0.05); border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${p.profileImage || DEFAULT_PROFILE_IMG}" style="width:36px; height:36px; border-radius:50%; border:2px solid var(--accent-color);">
                        <span style="font-weight:600; color:var(--text-primary); font-size:0.95rem;">${p.nickname}</span>
                    </div>
                    <div style="color:var(--accent-color); font-weight:bold; font-size:1rem; text-align:right;">${result}</div>
                </div>
            `;
        });
        html += '</div>';

        // Modal Overlay
        const modal = document.createElement('div');
        modal.id = 'ladderResultModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.85)';
        modal.style.backdropFilter = 'blur(5px)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '9999';
        modal.style.animation = 'fadeIn 0.3s ease-out';

        modal.innerHTML = `
            <div style="background:var(--card-bg); padding:30px; border-radius:24px; width:450px; max-width:90%; border:1px solid rgba(255,255,255,0.1); box-shadow:0 20px 50px rgba(0,0,0,0.5); display:flex; flex-direction:column; align-items:center;">
                <h2 style="margin-bottom:20px; font-size:1.5rem; color:var(--text-primary);">🎉 결과 발표 🎉</h2>
                ${html}
                <button id="closeResultBtn" class="full-btn primary" style="margin-top:25px; width:100%; padding:12px; border-radius:12px; font-weight:600;">닫기</button>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('closeResultBtn').onclick = () => {
            const isCreator = currentLadderCreator && user.nickname === currentLadderCreator.nickname;
            if (isCreator) {
                socket.emit('reset_ladder');
            }

            modal.style.opacity = '0';
            setTimeout(() => {
                modal.remove();
                // We rely on the server sending 'idle' state to call resetLadderUI()
                // ensuring we don't desync or show the start button prematurely.
            }, 300);
        };
    }

    // --- Global Ladder Data ---
    let activeLadderParticipants = [];
    let finalLadderResults = [];

    socket.on('ladder_game_start', (data) => {
        ladderStatusText.innerText = '게임 진행 중!';

        // Save data for results
        finalLadderResults = data.ladderResults || [];

        // Remove Run Button
        const runBtn = document.getElementById('runLadderBtn');
        if (runBtn) runBtn.remove();

        // Remove Inputs & Participants Overlays (Prepare for animation)
        const uiElements = document.querySelectorAll('.ladder-ui-element');
        uiElements.forEach(el => el.remove());

        // Update local participants from previous state
        activeLadderParticipants = data.participants || activeLadderParticipants;

        drawLadderAnimation(data.ladderData);
    });

    function renderParticipants(list) {
        ladderParticipantsList.innerHTML = '';
        list.forEach(p => {
            const el = document.createElement('div');
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'center';
            el.style.gap = '5px';

            el.innerHTML = `
                <img src="${p.profileImage || DEFAULT_PROFILE_IMG}" style="width:40px; height:40px; border-radius:50%; border:2px solid var(--accent-color);">
                <span style="font-size:0.8rem; color:var(--text-secondary);">${p.nickname}</span>
            `;
            ladderParticipantsList.appendChild(el);
        });
    }

    function resetLadderUI() {
        ladderStatusText.innerText = '게임을 생성하여 팀원을 모집하세요.';
        createLadderBtn.style.display = 'block';
        joinLadderBtn.style.display = 'none';
        ladderTimerArea.style.display = 'none';
        ladderParticipantsList.innerHTML = '';
        ladderGameArea.style.display = 'none';
        clearLadderInputs();
        currentLadderState = 'idle';
    }

    function clearLadderInputs() {
        const oldInputs = document.querySelectorAll('.ladder-ui-element');
        oldInputs.forEach(el => el.remove());
    }

    // Helper to store during input phase
    function renderLadderSetup(participants, results, creator) {
        activeLadderParticipants = participants; // Update global

        // Ensure display is block/flex before measuring
        ladderGameArea.style.display = 'flex';

        // 1. Setup Canvas
        const rect = ladderGameArea.getBoundingClientRect();
        ladderCanvas.width = rect.width;
        ladderCanvas.height = 400; // Fixed height logic for now

        ctx.clearRect(0, 0, ladderCanvas.width, ladderCanvas.height);

        const count = participants.length;
        const width = ladderCanvas.width;
        const height = ladderCanvas.height;
        const columnWidth = width / count;

        // Draw Vertical Lines
        ctx.strokeStyle = '#FFFFFF'; // Solid white
        ctx.lineWidth = 4; // Thicker
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const x = (i * columnWidth) + (columnWidth / 2);
            ctx.moveTo(x, 50);
            ctx.lineTo(x, height - 50);

            createParticipantOverlay(participants[i], x, 10, i);
            createResultInput(results ? results[i] : '', x, height - 40, i);
        }
        ctx.stroke();

        const isCreator = user.nickname === creator.nickname;
        if (isCreator) {
            // Remove existing button if any
            const existingBtn = document.getElementById('runLadderBtn');
            if (existingBtn) existingBtn.remove();

            const btn = document.createElement('button');
            btn.id = 'runLadderBtn';
            btn.className = 'small-btn primary ladder-ui-element';
            btn.innerText = 'START GAME';
            btn.style.position = 'absolute';
            btn.style.top = '50%';
            btn.style.left = '50%';
            btn.style.transform = 'translate(-50%, -50%)';
            btn.style.zIndex = '100';
            btn.onclick = () => {
                socket.emit('run_ladder_game');
            };
            ladderGameArea.appendChild(btn);
        }
    }

    function createParticipantOverlay(p, x, y, idx) {
        const div = document.createElement('div');
        div.className = 'ladder-ui-element';
        div.style.position = 'absolute';
        div.style.left = (x - 20) + 'px';
        div.style.top = y + 'px';
        div.style.textAlign = 'center';
        div.innerHTML = `
            <img src="${p.profileImage}" style="width:40px; height:40px; border-radius:50%; border:2px solid var(--accent-color);">
            <div style="font-size:0.7rem; margin-top:2px;">${p.nickname}</div>
        `;
        ladderGameArea.appendChild(div);
    }

    function createResultInput(val, x, y, idx) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'ladder-ui-element ladder-result-input simple-input';
        input.value = val || '';
        input.placeholder = '?';
        input.style.position = 'absolute';
        input.style.left = (x - 30) + 'px'; // approximate centering
        input.style.top = y + 'px';
        input.style.width = '60px';
        input.style.height = '30px';
        input.style.fontSize = '0.8rem';
        input.style.padding = '2px';
        input.style.textAlign = 'center';

        input.addEventListener('input', (e) => {
            socket.emit('update_ladder_result', { index: idx, value: e.target.value });
        });

        ladderGameArea.appendChild(input);
    }

    function drawLadderAnimation(ladderData) {
        // Sort lines by row to trace paths
        ladderData.sort((a, b) => a.row - b.row);

        // Re-measure in case of resize
        const rect = ladderGameArea.getBoundingClientRect();
        if (rect.width > 0) {
            ladderCanvas.width = rect.width;
            ladderCanvas.height = 400;
        }

        const count = activeLadderParticipants.length;
        const width = ladderCanvas.width;
        const height = ladderCanvas.height;
        const columnWidth = width / count;
        const startY = 50;
        const endY = height - 50;
        const effectiveHeight = endY - startY;
        const stepHeight = effectiveHeight / 10;

        // Calculate Paths
        const paths = activeLadderParticipants.map((_, i) => calculatePath(i, ladderData, count, columnWidth, startY, stepHeight));

        // Animation Loop
        let startTime = null;
        const duration = 5000; // 5 seconds

        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            ctx.clearRect(0, 0, width, height);

            // Draw Static Grid
            drawStaticLadder(ctx, count, width, height, ladderData, columnWidth, startY, endY, stepHeight);

            // Draw Moving Avatars
            paths.forEach((path, i) => {
                const pos = getPositionAtProgress(path, progress);

                // Draw Avatar
                ctx.save();
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 20, 0, Math.PI * 2); // Larger, explicit size
                ctx.fillStyle = getColor(i);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.stroke();

                // Draw Name
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(activeLadderParticipants[i].nickname, pos.x, pos.y - 25);
                ctx.restore();
            });

            // Draw Bottom Results (Static Text)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            for (let i = 0; i < count; i++) {
                const x = (i * columnWidth) + (columnWidth / 2);
                ctx.fillText(finalLadderResults[i] || '?', x, endY + 30);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // End: Show Result Modal
                showLadderResultsModal(paths);
            }
        }
        requestAnimationFrame(animate);
    }

    function calculatePath(startIndex, ladderData, count, columnWidth, startY, stepHeight) {
        let currentCol = startIndex;
        const pathPoints = [];
        pathPoints.push({ x: (currentCol * columnWidth) + (columnWidth / 2), y: startY }); // Start

        // Iterate through logical rows
        // Note: ladderData is sorted by row (0..9)
        // We need to check if there is a line connected to currentCol at each row step

        for (let r = 0; r < 10; r++) {
            const segmentY = startY + (r * stepHeight);
            // const nextSegmentY = startY + ((r + 1) * stepHeight);

            // Check connections at this row
            // A line at {col: C, row: R} connects C and C+1

            // Is there a line to the right? (col == currentCol)
            const rightLine = ladderData.find(l => l.row === r && l.col === currentCol);
            // Is there a line to the left? (col == currentCol - 1)
            const leftLine = ladderData.find(l => l.row === r && l.col === currentCol - 1);

            // Move down to center of current row/step
            const lineY = segmentY + (stepHeight / 2);

            // Vertical segment to lineY
            pathPoints.push({ x: (currentCol * columnWidth) + (columnWidth / 2), y: lineY });

            if (rightLine) {
                // Move Right
                currentCol++;
                pathPoints.push({ x: (currentCol * columnWidth) + (columnWidth / 2), y: lineY });
            } else if (leftLine) {
                // Move Left
                currentCol--;
                pathPoints.push({ x: (currentCol * columnWidth) + (columnWidth / 2), y: lineY });
            }
            // If no horizontal line, we just stay at this col and will continue down in next iteration or final vertical
        }

        // Final vertical to bottom
        const endY = startY + (10 * stepHeight);
        pathPoints.push({ x: (currentCol * columnWidth) + (columnWidth / 2), y: endY });

        return { points: pathPoints, finalCol: currentCol };
    }

    function getPositionAtProgress(pathData, progress) {
        const points = pathData.points;
        // Calculate total length to map progress accurately? 
        // For now, assume uniform time per segment is cleaner for "ladder feel"?
        // Actually, simple segment interpolation works okay.

        const totalSegments = points.length - 1;
        const currentSegmentFloat = progress * totalSegments;
        const segmentIdx = Math.floor(currentSegmentFloat);
        const segmentProgress = currentSegmentFloat - segmentIdx;

        if (segmentIdx >= totalSegments) return points[points.length - 1];

        const p1 = points[segmentIdx];
        const p2 = points[segmentIdx + 1];

        return {
            x: p1.x + (p2.x - p1.x) * segmentProgress,
            y: p1.y + (p2.y - p1.y) * segmentProgress
        };
    }

    function drawStaticLadder(ctx, count, width, height, ladderData, columnWidth, startY, endY, stepHeight) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 1.0)'; // Solid white
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath();

        // Verticals
        for (let i = 0; i < count; i++) {
            const x = (i * columnWidth) + (columnWidth / 2);
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }

        // Horizontals
        ladderData.forEach(line => {
            const x1 = (line.col * columnWidth) + (columnWidth / 2);
            const x2 = x1 + columnWidth;
            const y = startY + (line.row * stepHeight) + (stepHeight / 2);
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
        });

        ctx.stroke();
    }

    // Placeholder for getColor and showLadderResultsModal
    function getColor(index) {
        const colors = ['#FF6347', '#4682B4', '#32CD32', '#FFD700', '#BA55D3', '#00CED1', '#FF69B4', '#ADFF2F'];
        return colors[index % colors.length];
    }


    // Resize Listener for Ladder Setup
    window.addEventListener('resize', () => {
        if (currentLadderState === 'input_phase') {
            // Re-render the setup to adjust to new canvas size
            renderLadderSetup(currentLadderParticipants, currentLadderResults, currentLadderCreator);
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

    // ===================================
    // 🖥️ SCREEN SHARING LOGIC (WebRTC)
    // ===================================

    const startShareBtn = document.getElementById('startShareBtn');
    const stopShareBtn = document.getElementById('stopShareBtn');
    const sharedScreen = document.getElementById('sharedScreen');
    const noStreamPlaceholder = document.getElementById('noStreamPlaceholder');
    const shareStatus = document.getElementById('shareStatus');
    const broadcasterInfo = document.getElementById('broadcasterInfo');
    const broadcasterName = document.getElementById('broadcasterName');
    const viewerCount = document.getElementById('viewerCount');
    const viewerNumber = document.getElementById('viewerNumber');
    const qualityIndicator = document.getElementById('qualityIndicator');
    const volumeControl = document.getElementById('volumeControl');
    const volumeSlider = document.getElementById('volumeSlider');
    const connectionInfo = document.getElementById('connectionInfo');
    const connState = document.getElementById('connState');
    const resolution = document.getElementById('resolution');
    const audioState = document.getElementById('audioState');
    const broadcastList = document.getElementById('broadcastList');
    const noBroadcast = document.getElementById('noBroadcast');

    // WebRTC State
    let localStream = null;
    let peerConnections = {}; // socketId -> RTCPeerConnection (for broadcaster)
    let viewerPeerConnection = null; // RTCPeerConnection (for viewer)
    let isBroadcasting = false;
    let viewers = new Set();
    let activeBroadcasts = new Map(); // Map of broadcasterId -> broadcast info
    let currentBroadcaster = null; // Current broadcast being watched
    let isConnecting = false; // Flag to prevent double clicks

    // ICE Servers (STUN/TURN for NAT traversal)
    const iceServers = {
        iceServers: [
            // 1. Google STUN (Always reliable for direct P2P)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },

            // 2. Open Relay TURN (Fallback for restricted networks)
            // If this server is down, it might cause delays.
            // If connection fails, try commenting these out.
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject"
            }
        ]
        // iceCandidatePoolSize removed for better compatibility
    };

    // ===================================
    // 📋 BROADCAST LIST MANAGEMENT
    // ===================================

    function updateBroadcastList() {
        // Clear existing broadcasts
        broadcastList.innerHTML = '';

        if (activeBroadcasts.size === 0) {
            broadcastList.appendChild(noBroadcast);
            return;
        }

        // Add each broadcast
        activeBroadcasts.forEach((broadcast, broadcasterId) => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(255,255,255,0.05);
                border-radius: 12px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s;
                border: 2px solid transparent;
            `;

            card.innerHTML = `
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="position: relative;">
                        <img src="${broadcast.profileImage || DEFAULT_PROFILE_IMG}" 
                             style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-color);"
                             onerror="this.onerror=null; this.src='${DEFAULT_PROFILE_IMG}'">
                        <div style="position: absolute; bottom: -2px; right: -2px; width: 14px; height: 14px; background: #ef4444; border: 2px solid var(--card-bg); border-radius: 50%; animation: pulse 2s infinite;"></div>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 4px;">
                            ${broadcast.nickname}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-secondary);">
                            <span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 2px 8px; border-radius: 10px; font-weight: 600; font-size: 0.7rem;">
                                🔴 LIVE
                            </span>
                            <span>${broadcast.quality || 'FHD'}</span>
                            ${broadcast.hasAudio ? '<span>🔊</span>' : '<span style="opacity:0.5">🔇</span>'}
                        </div>
                    </div>
                </div>
            `;

            // Hover effect
            card.addEventListener('mouseenter', () => {
                card.style.borderColor = 'var(--accent-color)';
                card.style.background = 'rgba(56, 189, 248, 0.1)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.borderColor = 'transparent';
                card.style.background = 'rgba(255,255,255,0.05)';
            });

            // Click to watch
            card.addEventListener('click', () => {
                if (isBroadcasting && broadcasterId === user.id) {
                    alert('❌ 자신의 방송은 시청할 수 없습니다!');
                    return;
                }

                // If already broadcasting, ask to stop
                if (isBroadcasting) {
                    const confirmed = confirm(
                        '⚠️ 현재 방송 중입니다.\n\n' +
                        `${broadcast.nickname}님의 방송을 보려면 내 방송을 중지해야 합니다.\n\n` +
                        '방송을 중지하고 시청하시겠습니까?'
                    );

                    if (!confirmed) return;

                    // Stop broadcasting
                    stopScreenShare();
                }

                watchBroadcast(broadcast);
            });

            broadcastList.appendChild(card);
        });
    }

    function watchBroadcast(broadcast) {
        if (isConnecting) return; // Prevent double clicks

        console.log('Watching broadcast:', broadcast);

        // Prevent re-joining same broadcast if already watching
        if (currentBroadcaster && currentBroadcaster.id === broadcast.userId) {
            console.log("Already watching this broadcast, ignoring click.");
            return;
        }

        // If watching someone else, leave first
        if (currentBroadcaster) {
            leaveAsViewer();
        }

        isConnecting = true;
        // Auto-unlock after 5 seconds in case of failure/stuck
        setTimeout(() => { isConnecting = false; }, 5000);

        // Save current broadcaster
        currentBroadcaster = {
            id: broadcast.userId,
            name: broadcast.nickname
        };

        // Update UI
        shareStatus.textContent = `${broadcast.nickname}님의 방송 연결 중...`;
        shareStatus.style.color = 'var(--accent-color)';
        broadcasterInfo.style.display = 'flex';
        document.getElementById('broadcasterName').textContent = broadcast.nickname;

        // Join as viewer
        socket.emit('join_broadcast', {
            broadcasterId: broadcast.userId,
            viewerId: user.id,
            viewerName: user.nickname
        });
    }


    // Start Screen Sharing
    startShareBtn.addEventListener('click', async () => {
        try {
            // If currently viewing someone's broadcast, stop viewing
            if (currentBroadcaster) {
                const confirmed = confirm(
                    '⚠️ 현재 시청 중입니다.\n\n' +
                    `${currentBroadcaster.name}님의 방송 시청을 중지하고 내 방송을 시작하시겠습니까?`
                );

                if (!confirmed) return;

                // Leave viewer mode
                leaveAsViewer();
            }

            // Show audio sharing guide before starting
            const userConfirmed = confirm(
                '🔊 오디오 공유 안내\n\n' +
                '소리도 함께 공유하려면:\n' +
                '1. "Chrome 탭" 선택 (전체 화면 ❌)\n' +
                '2. "탭 오디오 공유" 체크 ✅\n\n' +
                '계속하시겠습니까?'
            );

            if (!userConfirmed) return;

            // Request screen capture with FHD quality + audio
            localStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: 'monitor',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30, max: 60 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 48000
                }
            });

            // Show local preview
            sharedScreen.srcObject = localStream;
            sharedScreen.muted = true; // Don't hear our own audio
            noStreamPlaceholder.style.display = 'none';

            // Get track info
            const videoTrack = localStream.getVideoTracks()[0];
            const audioTrack = localStream.getAudioTracks()[0];
            const settings = videoTrack.getSettings();

            // Check if audio is included
            if (!audioTrack) {
                // Show warning if no audio
                setTimeout(() => {
                    const retry = confirm(
                        '⚠️ 오디오가 포함되지 않았습니다!\n\n' +
                        '유튜브 소리를 공유하려면:\n' +
                        '1. 공유 중지\n' +
                        '2. 다시 시작\n' +
                        '3. "Chrome 탭" 선택\n' +
                        '4. "탭 오디오 공유" 체크\n\n' +
                        '영상만 공유하려면 "취소"를 누르세요.'
                    );

                    if (retry) {
                        stopScreenShare();
                        startShareBtn.click();
                    }
                }, 1000);
            }

            // Update UI
            startShareBtn.style.display = 'none';
            stopShareBtn.style.display = 'flex';
            shareStatus.textContent = audioTrack
                ? '🔴 화면 + 오디오 공유 중!'
                : '🔴 화면 공유 중 (오디오 없음)';
            shareStatus.style.color = 'var(--accent-color)';
            broadcasterInfo.style.display = 'flex';
            broadcasterName.textContent = `${user.nickname} (나)`;
            viewerCount.style.display = 'block';
            qualityIndicator.style.display = 'block';
            connectionInfo.style.display = 'block';
            connState.textContent = '방송 중';
            connState.style.color = '#22c55e';

            // Display quality info
            resolution.textContent = `${settings.width}x${settings.height}`;
            audioState.textContent = audioTrack ? '활성' : '없음';
            audioState.style.color = audioTrack ? '#22c55e' : '#ef4444';

            isBroadcasting = true;

            // Notify server that we're broadcasting
            socket.emit('start_broadcast', {
                userId: user.id,
                nickname: user.nickname,
                quality: `${settings.width}x${settings.height}`,
                hasAudio: !!audioTrack
            });

            // Handle screen share stop (user clicks browser "Stop sharing")
            videoTrack.onended = () => {
                stopScreenShare();
            };

        } catch (error) {
            console.error('Screen share error:', error);
            if (error.name === 'NotAllowedError') {
                alert('❌ 화면 공유 권한이 거부되었습니다.\n\n다시 시도해주세요.');
            } else if (error.name === 'NotFoundError') {
                alert('❌ 공유할 화면을 찾을 수 없습니다.');
            } else if (error.name === 'NotSupportedError') {
                alert('❌ 이 브라우저는 화면 공유를 지원하지 않습니다.\n\nChrome 또는 Edge를 사용해주세요.');
            } else {
                alert('❌ 화면 공유 시작 오류:\n' + error.message);
            }
        }
    });

    // Stop Screen Sharing
    stopShareBtn.addEventListener('click', () => {
        stopScreenShare();
    });

    function stopScreenShare() {
        console.log('=== Stopping screen share ===');

        // Stop local stream tracks
        if (localStream) {
            console.log('Stopping local stream tracks');
            localStream.getTracks().forEach(track => {
                track.stop();
                console.log(`Stopped track: ${track.kind}`);
            });
            localStream = null;
        }

        // Close all peer connections
        console.log(`Closing ${Object.keys(peerConnections).length} peer connections`);
        Object.values(peerConnections).forEach(pc => {
            if (pc) pc.close();
        });
        peerConnections = {};
        viewers.clear();

        // Reset UI
        sharedScreen.srcObject = null;
        noStreamPlaceholder.style.display = 'flex';
        startShareBtn.style.display = 'flex';
        stopShareBtn.style.display = 'none';
        shareStatus.textContent = '왼쪽 목록에서 방송을 선택하거나 직접 공유를 시작하세요';
        shareStatus.style.color = 'var(--text-secondary)';
        broadcasterInfo.style.display = 'none';
        viewerCount.style.display = 'none';
        qualityIndicator.style.display = 'none';
        volumeControl.style.display = 'none';
        connectionInfo.style.display = 'none';
        fullscreenBtn.style.display = 'none';
        viewerNumber.textContent = '0';

        isBroadcasting = false;

        // Notify server
        socket.emit('stop_broadcast');

        console.log('Screen share stopped successfully');
    }

    // Leave viewer mode (stop watching)
    function leaveAsViewer() {
        console.log('=== Leaving viewer mode ===');

        // Close viewer peer connection
        if (viewerPeerConnection) {
            console.log('Closing viewer peer connection');
            viewerPeerConnection.close();
            viewerPeerConnection = null;
        }

        // Clear broadcaster info
        currentBroadcaster = null;

        // Reset UI
        sharedScreen.srcObject = null;
        noStreamPlaceholder.style.display = 'flex';
        shareStatus.textContent = '왼쪽 목록에서 방송을 선택하거나 직접 공유를 시작하세요';
        shareStatus.style.color = 'var(--text-secondary)';
        broadcasterInfo.style.display = 'none';
        qualityIndicator.style.display = 'none';
        volumeControl.style.display = 'none';
        fullscreenBtn.style.display = 'none';
        connectionInfo.style.display = 'none';

        // Notify server
        socket.emit('leave_broadcast');

        console.log('Viewer mode left successfully');
    }

    // Socket Events for Screen Sharing

    // Viewer requests to watch
    socket.on('viewer_joined', async ({ viewerId, viewerName }) => {
        console.log('=== viewer_joined event received ===');
        console.log(`Viewer: ${viewerName} (ID: ${viewerId})`);

        if (!isBroadcasting || !localStream) {
            console.error('❌ Not broadcasting or no localStream, ignoring viewer');
            return;
        }

        // 1. Clean up existing connection if any (Crucial for reconnects)
        if (peerConnections[viewerId]) {
            console.warn(`⚠️ Existing peer connection found for ${viewerName}, closing it.`);
            peerConnections[viewerId].close();
            delete peerConnections[viewerId];
            viewers.delete(viewerId);
        }

        viewers.add(viewerId);
        viewerNumber.textContent = viewers.size;
        console.log(`✅ Adding viewer. Total viewers: ${viewers.size}`);

        try {
            // 2. Create New PeerConnection
            const pc = new RTCPeerConnection(iceServers);
            peerConnections[viewerId] = pc;
            console.log(`✅ Created PeerConnection for viewer ${viewerName}`);

            // 3. Add Tracks
            localStream.getTracks().forEach(track => {
                try {
                    pc.addTrack(track, localStream);
                    console.log(`  - Added ${track.kind} track`);
                } catch (err) {
                    console.error(`Error adding track: ${err}`);
                }
            });

            // 4. ICE Candidate Handling
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log(`Sending ICE candidate to ${viewerName}`);
                    socket.emit('ice_candidate', {
                        target: viewerId,
                        candidate: event.candidate
                    });
                }
            };

            // 5. Connection State Monitoring
            pc.onconnectionstatechange = () => {
                const state = pc.connectionState;
                console.log(`Connection state with ${viewerName}: ${state}`);
                if (state === 'disconnected' || state === 'failed') {
                    console.log(`Viewer ${viewerName} disconnected/failed`);
                    viewers.delete(viewerId);
                    viewerNumber.textContent = viewers.size;

                    if (peerConnections[viewerId]) {
                        peerConnections[viewerId].close();
                        delete peerConnections[viewerId];
                    }
                }
            };

            // 6. Create Offer with specific options
            console.log(`Creating offer for ${viewerName}...`);
            const offer = await pc.createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            });

            await pc.setLocalDescription(offer);
            console.log(`✅ Offer created & set local description`);

            socket.emit('broadcast_offer', {
                target: viewerId,
                offer: offer
            });
            console.log(`✅ broadcast_offer sent to ${viewerName}`);

        } catch (error) {
            console.error('❌ Critical error in viewer_joined:', error);
            // Rollback viewer count on error
            viewers.delete(viewerId);
            viewerNumber.textContent = viewers.size;
            if (peerConnections[viewerId]) {
                peerConnections[viewerId].close();
                delete peerConnections[viewerId];
            }
        }
    });

    // Receive answer from viewer
    socket.on('broadcast_answer', async ({ from, answer }) => {
        const pc = peerConnections[from];
        if (pc) {
            // CRITICAL: Only set remote description if we are waiting for an answer
            if (pc.signalingState !== 'have-local-offer') {
                console.warn(`⚠️ Ignoring answer from ${from} because state is '${pc.signalingState}' (expected 'have-local-offer')`);
                return;
            }

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                console.log(`✅ Remote description set for viewer ${from}`);
            } catch (error) {
                console.error('❌ Error setting remote description:', error);
            }
        } else {
            console.warn(`⚠️ Received answer from ${from} but no peer connection found`);
        }
    });

    // Receive ICE candidate
    socket.on('ice_candidate', async ({ from, candidate }) => {
        const pc = peerConnections[from];
        if (pc) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
                console.error('Error adding ICE candidate:', error);
            }
        }
    });

    // Viewer disconnected
    socket.on('viewer_left', ({ viewerId }) => {
        viewers.delete(viewerId);
        viewerNumber.textContent = viewers.size;
        if (peerConnections[viewerId]) {
            peerConnections[viewerId].close();
            delete peerConnections[viewerId];
        }
    });

    // ==== VIEWER SIDE ====

    // Broadcast started notification
    socket.on('broadcast_started', ({ broadcasterId, broadcasterName, quality, hasAudio, profileImage }) => {
        console.log(`Broadcast started by ${broadcasterName}`);

        // Just update the broadcast list - don't auto-join
        // User will manually click to watch from the list
    });

    // Broadcast list updated
    socket.on('broadcast_list', ({ broadcasts }) => {
        console.log('Broadcast list updated:', broadcasts);

        // Update activeBroadcasts map
        activeBroadcasts.clear();
        broadcasts.forEach(broadcast => {
            activeBroadcasts.set(broadcast.userId, broadcast);
        });

        // Update UI
        updateBroadcastList();
    });

    // Broadcast stopped notification
    socket.on('broadcast_stopped', ({ broadcasterId }) => {
        console.log('Broadcast stopped:', broadcasterId);

        // Remove from list
        activeBroadcasts.delete(broadcasterId);
        updateBroadcastList();

        // If we were watching this broadcast, leave
        if (currentBroadcaster && currentBroadcaster.id === broadcasterId) {
            leaveAsViewer();
        }
    });

    // Receive offer from broadcaster
    socket.on('broadcast_offer', async ({ from, offer }) => {
        // ALWAYS Reset connection on new offer to avoid stale state
        if (viewerPeerConnection) {
            console.warn('⚠️ Closing existing viewer connection for new offer');
            viewerPeerConnection.close();
            viewerPeerConnection = null;
        }

        viewerPeerConnection = new RTCPeerConnection(iceServers);

        // Handle incoming stream
        viewerPeerConnection.ontrack = async (event) => {
            isConnecting = false; // ✅ Unlock immediately on success

            console.log('Received remote stream');
            const stream = event.streams[0];
            sharedScreen.srcObject = stream;
            noStreamPlaceholder.style.display = 'none';

            // Autoplay Policy Handling:
            // 1. Start playback MUTED (allowed by browsers)
            sharedScreen.muted = true;

            try {
                await sharedScreen.play();
                console.log('✅ Video playing (muted)');

                // 2. Once playing, try to UNMUTE
                sharedScreen.muted = false;
                console.log('✅ Audio unmuted successfully');
            } catch (e) {
                console.warn("⚠️ Autoplay with sound failed. Starting muted.", e);
                // Fallback: Stay muted if unmuting fails, or keep trying to play
                sharedScreen.muted = true;
                try {
                    await sharedScreen.play();
                } catch (e2) {
                    console.error("❌ Muted autoplay also failed:", e2);
                    shareStatus.textContent = '화면을 클릭하여 재생하세요 ▶';
                    shareStatus.style.cursor = 'pointer';
                    shareStatus.onclick = () => {
                        sharedScreen.play();
                        sharedScreen.muted = false;
                    };
                }
            }

            // Show fullscreen button
            fullscreenBtn.style.display = 'flex';

            // Update specific UI elements
            connectionInfo.style.display = 'block';
            connState.textContent = '연결됨';
            connState.style.color = '#22c55e';

            // Update main status based on connection
            if (currentBroadcaster) {
                shareStatus.textContent = `${currentBroadcaster.name}님의 방송이 연결되었습니다!`;
                shareStatus.style.color = '#22c55e'; // Green color for success

                // Hide signal text after 3 seconds
                setTimeout(() => {
                    if (shareStatus.textContent.includes('연결되었습니다')) {
                        shareStatus.textContent = '화면 + 오디오 공유 중!';
                        shareStatus.classList.add('pulse');
                    }
                }, 3000);
            }

            // Update resolution info
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                const settings = videoTrack.getSettings();
                if (settings.width && settings.height) {
                    resolution.textContent = `${settings.width}x${settings.height}`;
                } else {
                    resolution.textContent = 'Auto';
                }
            }

            const audioTrack = stream.getAudioTracks()[0];
            audioState.textContent = audioTrack ? '활성' : '없음';
            audioState.style.color = audioTrack ? '#22c55e' : '#f59e0b';
        };

        // ICE Candidate handling
        viewerPeerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice_candidate', {
                    target: from,
                    candidate: event.candidate
                });
            }
        };

        // Connection state monitoring
        viewerPeerConnection.onconnectionstatechange = () => {
            console.log(`Connection state: ${viewerPeerConnection.connectionState}`);
            connState.textContent = viewerPeerConnection.connectionState;

            if (viewerPeerConnection.connectionState === 'connected') {
                connState.style.color = '#22c55e';
            } else if (viewerPeerConnection.connectionState === 'failed') {
                connState.style.color = '#ef4444';
            }
        };


        try {
            await viewerPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await viewerPeerConnection.createAnswer();
            await viewerPeerConnection.setLocalDescription(answer);

            socket.emit('broadcast_answer', {
                target: from,
                answer: answer
            });
        } catch (error) {
            console.error('Error answering offer:', error);
        }
    });

    function joinAsViewer() {
        if (isBroadcasting) return; // Can't view if you're broadcasting

        socket.emit('join_broadcast', {
            viewerId: user.id,
            viewerName: user.nickname
        });
    }

    function leaveAsViewer() {
        if (viewerPeerConnection) {
            viewerPeerConnection.close();
            viewerPeerConnection = null;
        }

        currentBroadcaster = null;
        sharedScreen.srcObject = null;
        noStreamPlaceholder.style.display = 'flex';
        shareStatus.textContent = '화면 공유를 시작하려면 위 버튼을 클릭하세요';
        shareStatus.style.color = 'var(--text-secondary)';
        broadcasterInfo.style.display = 'none';
        qualityIndicator.style.display = 'none';
        volumeControl.style.display = 'none';
        connectionInfo.style.display = 'none';

        socket.emit('leave_broadcast');
    }

    // Volume control
    volumeSlider.addEventListener('input', (e) => {
        sharedScreen.volume = e.target.value / 100;
    });

    // ===================================
    // 📺 FULLSCREEN FUNCTIONALITY
    // ===================================

    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const videoContainer = document.getElementById('videoContainer');
    const fullscreenHint = document.getElementById('fullscreenHint');
    let isFullscreen = false;
    let hintTimeout = null;

    // Toggle fullscreen function
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (videoContainer.requestFullscreen) {
                videoContainer.requestFullscreen();
            } else if (videoContainer.webkitRequestFullscreen) {
                videoContainer.webkitRequestFullscreen();
            } else if (videoContainer.msRequestFullscreen) {
                videoContainer.msRequestFullscreen();
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    // Fullscreen button click
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Double-click video to toggle fullscreen
    sharedScreen.addEventListener('dblclick', toggleFullscreen);

    // Fullscreen change event
    document.addEventListener('fullscreenchange', () => {
        isFullscreen = !!document.fullscreenElement;
        fullscreenBtn.querySelector('span').textContent = isFullscreen ? '⛶' : '⛶';
        fullscreenBtn.querySelector('span').nextSibling.textContent = isFullscreen ? ' 전체화면 종료' : ' 전체화면';
    });

    // Show hint on video hover (only when streaming)
    let hintShown = false;
    sharedScreen.addEventListener('mouseenter', () => {
        if (sharedScreen.srcObject && !hintShown && !isFullscreen) {
            fullscreenHint.style.display = 'block';
            hintTimeout = setTimeout(() => {
                fullscreenHint.style.display = 'none';
                hintShown = true; // Show only once per session
            }, 3000);
        }
    });

    sharedScreen.addEventListener('mouseleave', () => {
        if (hintTimeout) {
            clearTimeout(hintTimeout);
        }
    });

    // ===================================

    // Check for existing broadcast when entering watching tab
    navWatching.addEventListener('click', () => {
        if (!isBroadcasting) {
            socket.emit('check_broadcast');
        }
    });

    socket.on('broadcast_status', ({ isActive, broadcasterId, broadcasterName, quality }) => {
        if (isActive && !isBroadcasting) {
            currentBroadcaster = { id: broadcasterId, name: broadcasterName };
            shareStatus.textContent = `${broadcasterName}님이 화면을 공유 중입니다`;
            shareStatus.style.color = 'var(--accent-color)';
            broadcasterInfo.style.display = 'flex';
            broadcasterName.textContent = broadcasterName;
            qualityIndicator.style.display = 'block';
            volumeControl.style.display = 'flex';
            fullscreenBtn.style.display = 'flex'; // Show fullscreen button
            joinAsViewer();
        }
    });
}
