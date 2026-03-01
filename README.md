# EveryUp

> 셀프 호스팅 통합 모니터링 플랫폼 — 서비스 헬스체크, 인프라 리소스, 알림을 하나의 대시보드에서 관리합니다.

![License](https://img.shields.io/badge/license-MIT-blue)
![Go](https://img.shields.io/badge/Go-1.24-00ADD8?logo=go)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **서비스 모니터링** | HTTP/TCP 헬스체크, 업타임, 레이턴시 추적 |
| **인프라 모니터링** | CPU/메모리/디스크/네트워크 실시간 수집 (로컬 + SSH 원격) |
| **알림** | Telegram / Discord 채널 연동, 임계값 기반 규칙 |
| **로그 관리** | 통합 로그 뷰어, 검색, Fluent Bit 에이전트 수집 |
| **실시간 스트리밍** | WebSocket 기반 메트릭 실시간 업데이트 |

---

## 프로젝트 구조

```
everyup/
├── frontend/      # React + Vite + TypeScript + Tailwind CSS
├── backend/       # Go (Fiber) + SQLite + WebSocket
└── log-agent/     # Fluent Bit 기반 로그 수집 에이전트
```

---

## 빠른 시작

### Docker로 실행 (권장)

**1. 이미지 받기**

아키텍처에 맞는 이미지를 선택하세요:

| 태그 | 대상 |
|------|------|
| `aiturn/everyup:amd64` | x86-64 서버 (일반 클라우드 VM) |
| `aiturn/everyup:arm64` | ARM 서버 (AWS Graviton, Raspberry Pi 등) |

```bash
docker pull aiturn/everyup:amd64   # x86-64
# 또는
docker pull aiturn/everyup:arm64   # ARM64
```

**2. 실행**

```bash
# x86-64 (amd64)
docker run -d \
  --name everyup \
  -p 3001:3001 \
  -v everyup-data:/app/data \
  -e TZ=Asia/Seoul \
  aiturn/everyup:amd64

# ARM64
docker run -d \
  --name everyup \
  -p 3001:3001 \
  -v everyup-data:/app/data \
  -e TZ=Asia/Seoul \
  aiturn/everyup:arm64
```

**3. 접속**

→ http://localhost:3001 접속 후 관리자 계정 생성

> **별도 계정 설정이 필요 없습니다.** 처음 실행 후 브라우저에서 관리자 계정을 직접 생성합니다.
> **암호화 키와 JWT 시크릿도 별도 설정 없이** 앱이 최초 실행 시 자동 생성하여 DB에 저장합니다.

---

### Docker Compose로 실행

이 저장소를 클론한 경우 Docker Compose를 사용할 수 있습니다.

```bash
git clone https://github.com/AI-turn/EveryUp.git
cd EveryUp
docker compose up -d
```

상태 확인:

```bash
docker compose ps
docker compose logs -f
```

---

### 로컬 개발

**백엔드**
```bash
cd backend
go run ./cmd/server
# → http://localhost:3001
```

**프론트엔드**
```bash
cd frontend
pnpm install
pnpm dev
# → http://localhost:5173
```

---

## 로그 에이전트

외부 서비스의 로그를 수집하려면 해당 서버에 `everyup-log-agent`를 배포합니다.

```bash
# amd64
docker run -d \
  -v /var/log/myapp:/var/log/app:ro \
  -e MT_ENDPOINT=http://your-everyup-server:3001 \
  -e MT_API_KEY=mt_your_api_key \
  aiturn/everyup-log-agent:amd64

# arm64
docker run -d \
  -v /var/log/myapp:/var/log/app:ro \
  -e MT_ENDPOINT=http://your-everyup-server:3001 \
  -e MT_API_KEY=mt_your_api_key \
  aiturn/everyup-log-agent:arm64
```

자세한 내용은 [log-agent/README.md](log-agent/README.md)를 참고하세요.

---

## 문서

| 문서 | 설명 |
|------|------|
| [backend/README.md](backend/README.md) | 백엔드 API 및 설정 문서 |
| [log-agent/README.md](log-agent/README.md) | 로그 에이전트 배포 가이드 |

---

## 라이선스

MIT
