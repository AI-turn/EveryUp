# MT Log Agent

Fluent Bit 기반 로그 수집 에이전트입니다. 모니터링할 서버에 배포하여 로그 파일을 MT Monitoring으로 전송합니다.

---

## 빌드

```bash
# log-agent/ 폴더에서 실행
docker build -t mt-log-agent .

# Docker Hub 푸시
docker build -t your-dockerhub-user/mt-log-agent:latest .
docker push your-dockerhub-user/mt-log-agent:latest
```

### 멀티 플랫폼 (amd64 + arm64)

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t your-dockerhub-user/mt-log-agent:latest \
  --push \
  .
```

---

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `MT_ENDPOINT` | MT Monitoring 서버 URL **(권장)** | — |
| `MT_API_KEY` | 서비스 API Key | `changeme` **(필수 변경)** |
| `MT_FILE` | 수집할 로그 파일 경로 (glob 지원) | `/var/log/app/*.log` |
| `MT_LOG_LEVEL` | Fluent Bit 로그 레벨 | `info` |

> `MT_ENDPOINT`를 설정하면 `MT_HOST`, `MT_PORT`, `MT_TLS`를 자동 파싱합니다.
> - `http://192.168.1.10:3001` → host=192.168.1.10, port=3001, tls=off
> - `https://monitoring.example.com` → host=monitoring.example.com, port=443, tls=on

---

## 실행

### 기본 (로컬 MT 서버)

```bash
docker run -d \
  --name mt-log-agent \
  -v /var/log/myapp:/var/log/app:ro \
  -e MT_ENDPOINT=http://localhost:3001 \
  -e MT_API_KEY=mt_your_api_key_here \
  mt-log-agent
```

### 원격 MT 서버

```bash
docker run -d \
  --name mt-log-agent \
  -v /var/log/myapp:/var/log/app:ro \
  -e MT_ENDPOINT=https://monitoring.example.com \
  -e MT_API_KEY=mt_your_api_key_here \
  -e MT_FILE=/var/log/app/*.log \
  your-dockerhub-user/mt-log-agent:latest
```

### Docker Compose (사이드카 패턴)

모니터링할 서비스와 같은 `docker-compose.yml`에 추가:

```yaml
services:
  my-app:
    image: my-app:latest
    volumes:
      - app-logs:/var/log/app

  mt-log-agent:
    image: your-dockerhub-user/mt-log-agent:latest
    volumes:
      - app-logs:/var/log/app:ro
    environment:
      - MT_ENDPOINT=http://your-mt-server:3001
      - MT_API_KEY=mt_your_api_key_here
    depends_on:
      - my-app
    restart: unless-stopped

volumes:
  app-logs:
```

---

## API Key 발급

MT Monitoring 대시보드 → **서비스 상세** → **Integration** 탭에서 API Key를 발급받습니다.

---

## 로그 포맷

JSON 형식을 자동 감지합니다. 일반 텍스트도 수집 가능합니다.

```json
{"level": "error", "message": "connection failed", "service": "api"}
```
