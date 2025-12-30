# 🚇 Cloudflare Tunnel 환경 배포 가이드

## ✨ 당신의 환경 (이미 Tunnel 사용 중)

```
사용자 → Cloudflare (HTTPS) → Tunnel → 내 서버 (HTTP:13579)
```

**장점**:
- ✅ 포트 오픈 불필요 (방화벽 설정 간단)
- ✅ Public IP 노출 안 됨 (보안 강화)
- ✅ SSL/TLS 자동 처리
- ✅ DDoS 보호 기본 제공

---

## 🚀 초간단 배포 (3단계)

### Step 1: Cloudflare 설정 확인 (1분)

#### A. SSL/TLS 모드
```
Cloudflare 대시보드 → SSL/TLS → Overview
→ "Full" 선택 (Flexible 아님!)
```

#### B. WebSocket 활성화 (필수!)
```
Network → WebSockets → ON
```

**완료!** 이게 끝입니다. ✅

---

### Step 2: 환경변수 설정 (서버에서)

```bash
# 서버 SSH 접속
ssh user@your-server-ip

# 프로젝트 디렉토리
cd /path/to/ktv

# .env 파일 수정
nano .env
```

**변경 필수 항목**:
```env
# HTTPS로 설정 (Cloudflare Tunnel이 처리)
REDIRECT_URI=https://your-domain.com/api/auth/kakao/callback

# Kakao 정보
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# 코드
INVITE_CODE=your_invite_code
ADMIN_CODE=your_admin_code

# JWT 시크릿
JWT_SECRET=your_super_secret_key_minimum_32_chars
```

---

### Step 3: 서비스 재시작

#### 방법 A: 기존 docker-compose.yml 사용 (권장)

```bash
# 그냥 기존 설정 그대로 재시작
docker-compose down
docker-compose up -d

# 로그 확인
docker-compose logs -f app
```

#### 방법 B: Cloudflare 전용 설정 사용

```bash
# Cloudflare 전용 설정으로 재시작
docker-compose -f docker-compose.cloudflare.yml down
docker-compose -f docker-compose.cloudflare.yml up -d

# 로그 확인
docker-compose -f docker-compose.cloudflare.yml logs -f app
```

---

## ⚙️ Cloudflare Tunnel 설정 확인

### Tunnel이 올바르게 설정되어 있는지 확인:

```bash
# Tunnel 상태 확인
cloudflared tunnel list

# Tunnel 설정 확인 (config.yml)
cat ~/.cloudflared/config.yml
```

**예상 설정**:
```yaml
tunnel: your-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  - hostname: your-domain.com
    service: http://localhost:13579  # ← 이 포트가 중요!
  - service: http_status:404
```

**중요**: `service`가 `http://localhost:13579`을 가리켜야 합니다!

---

## 🔍 Tunnel 설정 수정이 필요한 경우

### 포트 변경 (13579로 설정)

```bash
# Tunnel 설정 파일 편집
nano ~/.cloudflared/config.yml

# 또는
cloudflared tunnel route dns your-tunnel-name your-domain.com
```

**config.yml 예시**:
```yaml
tunnel: abc123-def456-ghi789
credentials-file: /home/user/.cloudflared/abc123-def456-ghi789.json

ingress:
  # KTV 서비스
  - hostname: your-domain.com
    service: http://localhost:13579
  
  # www 서브도메인도 같은 곳으로
  - hostname: www.your-domain.com
    service: http://localhost:13579
  
  # 기본 (매칭 안 되는 요청)
  - service: http_status:404
```

### Tunnel 재시작

```bash
# systemd 사용 시
sudo systemctl restart cloudflared

# 또는 직접 실행 시
cloudflared tunnel run your-tunnel-name
```

---

## ✅ 최종 체크리스트

### Cloudflare 대시보드
- [ ] SSL/TLS: **Full** (Flexible 아님!)
- [ ] Network → WebSockets: **ON**
- [ ] Tunnel 연결 상태: **Healthy**

### Cloudflare Tunnel 설정
- [ ] `service: http://localhost:13579` 확인
- [ ] Tunnel 실행 중 (`cloudflared tunnel list`)
- [ ] 도메인 라우팅 확인

### 서버
- [ ] `.env` 파일: `REDIRECT_URI=https://...` 확인
- [ ] Docker 컨테이너 실행 중
- [ ] 포트 13579 리스닝 중 (`netstat -tulpn | grep 13579`)

### Kakao Developers
- [ ] Redirect URI: `https://your-domain.com/api/auth/kakao/callback` 등록

### 테스트
- [ ] https://your-domain.com 접속 성공
- [ ] 카카오 로그인 작동
- [ ] 채팅 (Socket.IO) 작동
- [ ] 화면 공유 API 사용 가능 (F12 → Console 테스트)

---

## 🧪 WebRTC 화면 공유 테스트

브라우저에서 `https://your-domain.com` 접속 후:

**F12** → **Console**:
```javascript
// HTTPS 확인
console.log("Protocol:", window.location.protocol); // "https:" 여야 함

// WebRTC 지원 확인
console.log("getDisplayMedia:", 
  typeof navigator.mediaDevices?.getDisplayMedia === 'function' 
    ? "✅ 사용 가능" 
    : "❌ HTTPS 필요"
);

// 실제 테스트
navigator.mediaDevices.getDisplayMedia({ video: true })
  .then(stream => {
    console.log("✅ 화면 공유 성공!", stream);
    stream.getTracks().forEach(t => t.stop()); // 스트림 중지
  })
  .catch(err => console.error("❌ 오류:", err));
```

**성공 시**: "✅ 화면 공유 성공!" 출력  
**실패 시**: HTTPS 설정 다시 확인

---

## 🔧 문제 해결

### "WebSocket connection failed"
```bash
# 1. Cloudflare WebSockets 확인
Network → WebSockets → ON

# 2. Tunnel ingress 확인
cat ~/.cloudflared/config.yml
# service: http://localhost:13579 확인

# 3. 서비스 재시작
docker-compose restart app
sudo systemctl restart cloudflared
```

### "Too Many Redirects"
```bash
# Cloudflare SSL/TLS 모드 변경
SSL/TLS → Overview → "Full" (Flexible 아님!)
```

### Tunnel 연결 안 됨
```bash
# Tunnel 상태 확인
cloudflared tunnel list

# Tunnel 로그 확인
sudo journalctl -u cloudflared -f

# Tunnel 재시작
sudo systemctl restart cloudflared
```

### 서비스 접속 안 됨
```bash
# 1. 컨테이너 확인
docker-compose ps

# 2. 포트 리스닝 확인
sudo netstat -tulpn | grep 13579

# 3. 로그 확인
docker-compose logs app

# 4. 직접 접속 테스트 (서버 내부에서)
curl http://localhost:13579/health
```

---

## 💡 핵심 포인트

### ✅ 이미 Tunnel 사용 중이면:

1. **Nginx 불필요** → 기존 `docker-compose.yml` 사용 가능
2. **Certbot 불필요** → Cloudflare가 SSL 처리
3. **포트 오픈 불필요** → Tunnel이 처리
4. **방화벽 설정 불필요** → 외부 노출 안 됨

### ⚠️ 확인만 하면 되는 것:

1. **Tunnel 설정**: `service: http://localhost:13579`
2. **Cloudflare SSL/TLS**: Full 모드
3. **WebSockets**: ON
4. **환경변수**: `REDIRECT_URI=https://...`

---

## 🎯 요약

```bash
# 1. 환경변수만 HTTPS로 수정
nano .env  # REDIRECT_URI=https://...

# 2. 기존 서비스 재시작
docker-compose down && docker-compose up -d

# 3. 테스트
curl https://your-domain.com
```

**끝!** 정말 간단합니다. 😊

---

## 📞 추가 도움

### Cloudflare Tunnel 문서
- https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

### WebSocket over Tunnel
- Tunnel은 WebSocket을 기본 지원합니다
- 추가 설정 불필요

---

## 🎉 완료!

이제 화면 공유 기능을 구현할 수 있습니다!

WebRTC `getDisplayMedia()` API가 HTTPS 환경에서 정상 작동합니다. ✅
