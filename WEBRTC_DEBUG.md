# 🔍 WebRTC 화면 공유 디버깅 가이드

## 즉시 확인할 사항

### 1. 브라우저 콘솔 (F12) - 양쪽 다 확인
**방송자(admin) 콘솔:**
```
예상 로그:
- admin started broadcasting with audio: true
- Viewer joined: 1233
- Creating RTCPeerConnection for viewer
```

**시청자(1233) 콘솔:**
```
예상 로그:
- Watching broadcast: {userId: 21, nickname: "admin", ...}
- Emitting join_broadcast with broadcasterId: 21
- Received broadcast_offer from: ...
```

### 2. 서버 콘솔 확인
```
예상 로그:
- admin started broadcasting with audio: true
- Broadcast added. Total: 1
- 1233 joined admin's broadcast (ID: 21)
- (viewer_joined 이벤트는 로그 없음)
```

### 3. 에러 메시지 확인
- 빨간색 에러가 있는지
- "Not broadcasting, ignoring viewer" 메시지가 있는지
- WebRTC 관련 에러가 있는지

---

## 문제 가능성

### 1. viewerPeerConnection이 생성되지 않음
- viewer가 offer를 받지 못함
- broadcaster가 viewer_joined를 받지 못함

### 2. broadcasterId가 잘못 전달됨
- undefined 또는 잘못된 ID

### 3. ICE candidate 교환 실패
- STUN 서버 연결 문제

---

## 즉시 시도할 것

1. **F12** 누르고 Console 탭 열기
2. **Network** 탭에서 WebSocket 확인
3. **방송 클릭** 후 콘솔에 나오는 모든 로그 복사

콘솔 로그를 보내주시면 정확한 문제를 찾을 수 있습니다!
