# 🔧 Cloudflare WebSocket 활성화 가이드

## 📍 WebSocket 설정 위치

### 1️⃣ Cloudflare 대시보드 접속
```
https://dash.cloudflare.com
```

### 2️⃣ 도메인 선택
- 대시보드에서 설정할 도메인을 클릭합니다
- 예: `your-domain.com`

### 3️⃣ Network 메뉴로 이동

**좌측 사이드바에서 찾기**:
```
🏠 Home
📊 Analytics
🔒 SSL/TLS
🌐 DNS
⚡ Speed
🛡️ Security
📦 Caching
🔌 Network         ← 여기를 클릭!
⚙️ Rules
...
```

**또는 URL 직접 접속**:
```
https://dash.cloudflare.com/[your-account-id]/[your-domain]/network
```

### 4️⃣ WebSockets 찾기

**Network 페이지에서 아래로 스크롤하면:**

```
Network 설정 페이지
├── WebSockets                 ← 이것을 찾으세요!
│   ├── 설명: WebSocket connections allow for ...
│   └── 토글 스위치: ⚫ OFF  →  🟢 ON
├── gRPC
├── HTTP/2
├── HTTP/3 (with QUIC)
└── 0-RTT Connection Resumption
```

### 5️⃣ WebSockets 활성화

**토글 스위치 클릭**:
```
⚫ OFF (회색)  →  클릭  →  🟢 ON (초록색)
```

**완료!** ✅

---

## 📸 시각적 가이드

### Step 1: 좌측 메뉴에서 "Network" 찾기
```
┌─────────────────────────┐
│ ☰ Cloudflare            │
├─────────────────────────┤
│ 🏠 Overview             │
│ 📊 Analytics            │
│ 🔒 SSL/TLS              │
│ 🌐 DNS                  │
│ ⚡ Speed                 │
│ 🛡️ Security             │
│ 📦 Caching              │
│ 🔌 Network        ← 클릭! │
│ 📋 Traffic              │
│ ⚙️ Rules                │
└─────────────────────────┘
```

### Step 2: WebSockets 토글 찾기
```
Network 페이지
┌──────────────────────────────────────┐
│  WebSockets                          │
│  ─────────────────────────────────── │
│  WebSocket connections allow for     │
│  full-duplex communication...        │
│                                      │
│  ⚫ OFF   ← 클릭해서 ON으로 변경      │
└──────────────────────────────────────┘
```

### Step 3: 활성화 확인
```
┌──────────────────────────────────────┐
│  WebSockets                          │
│  ─────────────────────────────────── │
│  WebSocket connections allow for     │
│  full-duplex communication...        │
│                                      │
│  🟢 ON   ← 초록색으로 변경됨 ✅      │
└──────────────────────────────────────┘
```

---

## 🔍 못 찾겠다면?

### 방법 A: 검색 사용
1. Cloudflare 대시보드 상단의 **검색창** 클릭
2. "WebSocket" 입력
3. 검색 결과에서 "Network settings" 클릭

### 방법 B: URL 직접 입력
```
https://dash.cloudflare.com/[계정ID]/[도메인]/network
```
- `[계정ID]`: 대시보드 URL에서 확인 가능
- `[도메인]`: your-domain.com

**예시**:
```
https://dash.cloudflare.com/abc123def456/example.com/network
```

### 방법 C: Cloudflare 플랜 확인
- WebSockets는 **모든 플랜(Free 포함)**에서 사용 가능합니다
- 만약 메뉴가 안 보인다면:
  1. 브라우저 캐시 삭제
  2. 다른 브라우저에서 시도
  3. 시크릿/프라이빗 모드로 접속

---

## ✅ 설정 확인

WebSockets를 켰는지 확인하는 방법:

### 1. Cloudflare 대시보드에서
```
Network → WebSockets → 🟢 ON 표시 확인
```

### 2. 브라우저에서 테스트
```javascript
// 사이트 접속 후 F12 → Console
const ws = new WebSocket('wss://your-domain.com');
ws.onopen = () => console.log('✅ WebSocket 연결 성공!');
ws.onerror = (e) => console.error('❌ WebSocket 에러:', e);
```

### 3. Socket.IO 연결 확인
```javascript
// 채팅 페이지에서 F12 → Network 탭
// "websocket" 또는 "polling" 타입 확인
// Status: 101 Switching Protocols 확인
```

---

## 🚨 주의사항

### 변경 사항 적용 시간
- WebSockets ON → 즉시 적용 (몇 초 소요)
- 설정 후 브라우저 새로고침 필요

### 캐싱 문제
- 설정을 켰는데도 안 되면:
  ```bash
  # 브라우저 캐시 완전 삭제
  Ctrl + Shift + Delete (Windows)
  Cmd + Shift + Delete (Mac)
  
  # 또는 시크릿 모드로 테스트
  ```

### Cloudflare Tunnel 사용 시
- Tunnel을 사용하더라도 **반드시** WebSockets를 켜야 합니다
- Tunnel 설정과는 별개입니다

---

## 📞 여전히 안 보인다면?

1. **스크린샷 공유**: 현재 보이는 Cloudflare 화면
2. **URL 확인**: 대시보드 주소 공유
3. **플랜 확인**: Overview → 우측 상단 플랜 정보

Cloudflare 고객센터:
- 커뮤니티: https://community.cloudflare.com
- 문서: https://developers.cloudflare.com/network/websockets/

---

## 💡 빠른 체크리스트

- [ ] Cloudflare 대시보드 로그인
- [ ] 올바른 도메인 선택
- [ ] 좌측 메뉴 → **Network** 클릭
- [ ] 페이지 아래로 스크롤
- [ ] **WebSockets** 섹션 찾기
- [ ] 토글 스위치 → **🟢 ON**
- [ ] 브라우저 새로고침 후 테스트

---

이 가이드를 따라도 찾을 수 없다면, 현재 보이는 Cloudflare 화면을 공유해주세요!
