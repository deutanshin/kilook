# KTV - 실시간 채팅 서비스

> Cloudflare Tunnel + Socket.IO 기반 실시간 채팅 및 화면 공유 서비스

## 🚀 빠른 시작 (Cloudflare Tunnel 사용 중)

### ✅ Cloudflare 설정 (1분)

**WebSocket 활성화만 하면 됩니다!**

#### 📍 WebSocket 설정 위치
1. https://dash.cloudflare.com 접속
2. 도메인 선택
3. **좌측 메뉴** → **Network** 클릭 (🔌 아이콘)
4. 아래로 스크롤하여 **WebSockets** 찾기
5. 토글 스위치를 **ON** (초록색)으로 변경

> 💡 **찾을 수 없나요?** → `WEBSOCKET_GUIDE.md` 참고 (상세 가이드)

> **참고**: Cloudflare Tunnel이 HTTPS를 자동으로 처리하므로,  
> 별도의 SSL 설정이나 .env 파일 수정이 필요 없습니다!

### 🎯 화면 공유 기능 테스트

브라우저 콘솔(F12)에서 확인:

```javascript
// HTTPS 확인
console.log(window.location.protocol); // "https:" 출력되어야 함

// WebRTC 화면 공유 가능 여부 확인
if (navigator.mediaDevices?.getDisplayMedia) {
  console.log("✅ 화면 공유 사용 가능!");
} else {
  console.log("❌ HTTPS 필요");
}
```

---

## 📁 프로젝트 구조

```
ktv/
├── src/
│   └── server.js          # Node.js 서버
├── public/
│   ├── index.html         # 메인 페이지
│   ├── app.js             # 클라이언트 로직
│   ├── style.css          # 스타일
│   └── uploads/           # 업로드된 파일
├── docker-compose.yml     # Docker 설정
├── .env                   # 환경변수 (Git 제외)
├── .env.cloudflare.example # 환경변수 템플릿
└── TUNNEL_SETUP.md        # 상세 설정 가이드
```

---

## 🔧 주요 기능

- ✅ 실시간 채팅 (Socket.IO)
- ✅ 이미지 공유
- ✅ 사다리 게임
- ✅ Kakao 로그인
- ✅ 관리자 로컬 인증
- ✅ **화면 공유 (WebRTC)** - FHD 고품질 + 오디오 지원!

---

## 🛠️ 유용한 명령어

```bash
# 서비스 시작
docker-compose up -d

# 서비스 중지
docker-compose down

# 서비스 재시작
docker-compose restart app

# 로그 확인
docker-compose logs -f app

# 컨테이너 상태
docker-compose ps

# 환경변수 변경 후 재시작
docker-compose up -d --force-recreate

# DB 백업
docker-compose exec db mysqldump -u ktv_user -pktv_password ktv_db > backup.sql

# DB 복원
docker-compose exec -T db mysql -u ktv_user -pktv_password ktv_db < backup.sql
```

---

## 🔍 문제 해결

### WebSocket 연결 실패 (채팅이 안 될 때)
```bash
# Cloudflare 대시보드에서 확인
Network → WebSockets → ON 되어 있는지 확인

# 브라우저 캐시 삭제 후 재접속
```

### 화면 공유가 안 될 때
```bash
# 1. HTTPS 확인 (브라우저 주소창에 자물쇠 표시)
# 2. 브라우저 콘솔에서 확인:
navigator.mediaDevices?.getDisplayMedia ? "OK" : "HTTPS 필요"
```

---

## 🌐 Cloudflare Tunnel 설정

### Tunnel 포트 확인

```bash
# config.yml 확인
cat ~/.cloudflared/config.yml
```

**올바른 설정**:
```yaml
ingress:
  - hostname: your-domain.com
    service: http://localhost:13579  # ← KTV 포트
  - service: http_status:404
```

### Tunnel 재시작

```bash
# systemd 사용 시
sudo systemctl restart cloudflared

# 상태 확인
sudo systemctl status cloudflared
```

---

## 🧪 화면 공유 테스트

브라우저 콘솔(F12)에서:

```javascript
// HTTPS 확인
console.log(window.location.protocol); // "https:" 여야 함

// WebRTC 지원 확인
if (navigator.mediaDevices?.getDisplayMedia) {
  console.log("✅ 화면 공유 사용 가능!");
  
  // 테스트
  navigator.mediaDevices.getDisplayMedia({ video: true })
    .then(stream => {
      console.log("✅ 성공!", stream);
      stream.getTracks().forEach(t => t.stop());
    })
    .catch(err => console.error("❌ 오류:", err));
} else {
  console.log("❌ HTTPS 필요");
}
```

---

## 📚 추가 문서

- **상세 설정 가이드**: `TUNNEL_SETUP.md`
- **환경변수 템플릿**: `.env.cloudflare.example`

---

## 📝 라이선스

ISC

---

## 🔗 링크

- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [Kakao Developers](https://developers.kakao.com)
- [Socket.IO 문서](https://socket.io/docs/)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
