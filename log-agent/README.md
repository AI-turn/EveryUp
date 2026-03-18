# MT Log Agent

Fluent Bit 기반 로그 수집 에이전트입니다.
모니터링할 서비스가 실행 중인 서버에 함께 배포하여, 로그 파일을 EveryUp 서버로 전송합니다.

---

## 동작 방식

```
┌─────────────────────────────────────────────┐
│  모니터링 대상 서버                            │
│                                             │
│  ┌──────────┐    로그 파일    ┌────────────┐ │       ┌──────────────┐
│  │  My App  │ ──────────── > │ Log Agent  │ │ ────> │ EveryUp 서버  │
│  └──────────┘  /var/log/app  └────────────┘ │ HTTP  └──────────────┘
└─────────────────────────────────────────────┘
```

1. 앱이 로그를 **파일**로 출력
2. Log Agent가 해당 파일을 tail하며 실시간 수집
3. EveryUp 서버의 `/api/v1/logs/ingest` 엔드포인트로 HTTP 전송

---

## 사전 준비

1. **EveryUp 서버**가 실행 중이어야 합니다
2. **서비스 등록** — EveryUp 대시보드에서 로그를 수집할 서비스를 먼저 등록합니다
3. **API Key 발급** — 서비스 상세 → **Integration** 탭에서 API Key를 복사합니다

---

## 빠른 시작 (Docker Compose)

가장 권장하는 방식입니다. 모니터링할 서비스와 **같은 `docker-compose.yml`**에 사이드카로 추가합니다.

```yaml
services:
  # 기존 서비스
  my-app:
    image: my-app:latest
    volumes:
      - app-logs:/var/log/app    # 앱이 이 경로에 로그 파일을 씁니다

  # Log Agent 추가
  mt-log-agent:
    image: aiturn/everyup-log-agent:latest
    volumes:
      - app-logs:/var/log/app:ro # 같은 볼륨을 읽기 전용으로 마운트
    environment:
      - MT_ENDPOINT=http://your-everyup-server:3001
      - MT_API_KEY=mt_your_api_key_here
    depends_on:
      - my-app
    restart: unless-stopped

volumes:
  app-logs:
```

```bash
docker compose up -d
```

### 왜 같은 compose에 넣어야 하나요?

Log Agent는 앱의 로그 **파일**을 읽어야 합니다. 같은 compose에 있으면 named volume(`app-logs`)을 통해 파일을 자연스럽게 공유할 수 있습니다. compose를 분리하면 external volume, network 등 추가 설정이 필요해 복잡해집니다.

---

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `MT_ENDPOINT` | EveryUp 서버 URL **(권장)** | — |
| `MT_API_KEY` | 서비스 API Key **(필수)** | `changeme` |
| `MT_FILE` | 수집할 로그 파일 경로 (glob 지원) | `/var/log/app/*.log` |
| `MT_LOG_LEVEL` | Fluent Bit 로그 레벨 (`debug`, `info`, `warn`, `error`) | `info` |

> **`MT_ENDPOINT` 자동 파싱:**
> - `http://192.168.1.10:3001` → host=192.168.1.10, port=3001, tls=off
> - `https://monitoring.example.com` → host=monitoring.example.com, port=443, tls=on

---

## 실행 방법

### Docker Run (단독 실행)

앱이 호스트에서 직접 실행 중이고, 로그 파일이 호스트 파일시스템에 있는 경우:

```bash
docker run -d \
  --name everyup-log-agent \
  -v /path/to/your/app/logs:/var/log/app:ro \
  -e MT_ENDPOINT=http://your-everyup-server:3001 \
  -e MT_API_KEY=mt_your_api_key_here \
  aiturn/everyup-log-agent:latest
```

> `-v` 옵션에서 콜론(`:`) 왼쪽을 앱의 실제 로그 디렉토리 경로로 변경하세요.

### stdin 모드 (빠른 테스트)

파일 없이 직접 로그를 입력하여 연결을 테스트할 수 있습니다:

```bash
echo '{"level":"error","message":"test log from agent"}' | \
  docker run -i --rm \
  -e MT_ENDPOINT=http://your-everyup-server:3001 \
  -e MT_API_KEY=mt_your_api_key_here \
  -e MT_CONFIG=/fluent-bit/etc/stdin.conf \
  aiturn/everyup-log-agent:latest
```

EveryUp 대시보드의 Logs 탭에서 "test log from agent" 메시지가 보이면 연결이 정상입니다.

---

## 로그 포맷

### JSON (권장)

JSON 형식은 자동으로 파싱되어 레벨, 메시지, 메타데이터가 분리됩니다.

```json
{"level": "error", "message": "connection failed", "service": "api", "userId": 123}
```

인식하는 필드:
- **message**: `message`, `msg`, `log` 중 하나
- **level**: `level`, `levelname`, `severity` 중 하나
- **나머지 필드**: `metadata`로 자동 수집

레벨 매핑:
| 입력값 | 변환 |
|--------|------|
| `FATAL`, `CRITICAL`, `ERROR`, `ERR` | `error` |
| `WARN`, `WARNING` | `warn` |
| `INFO`, `DEBUG`, `TRACE` | `info` |
| 미지정 또는 기타 | `error` |

### 일반 텍스트

JSON이 아닌 텍스트도 수집됩니다. 이 경우 전체 라인이 `message`로 들어가고 레벨은 `error`로 설정됩니다.

```
2024-03-18 10:30:00 ERROR Failed to connect to database
```

---

## 주의: 앱이 stdout으로만 로그를 출력하는 경우

Docker 컨테이너는 기본적으로 `stdout`/`stderr`로 로그를 출력합니다. 이 경우 로그 **파일**이 생성되지 않으므로 Log Agent가 수집할 수 없습니다.

**해결 방법 — 앱에서 파일 출력 추가:**

앱의 로깅 설정에서 파일 출력을 추가하세요.

```yaml
# Node.js (winston) 예시
logging:
  transports:
    - type: file
      filename: /var/log/app/app.log

# Python (logging) 예시
logging:
  handlers:
    file:
      filename: /var/log/app/app.log

# Java (logback) 예시
<appender name="FILE" class="ch.qos.logback.core.FileAppender">
  <file>/var/log/app/app.log</file>
</appender>
```

> `stdout` 출력은 그대로 두고 파일 출력을 **추가**하는 것을 권장합니다. (`docker logs` 명령어로 확인하는 용도)

---

## 트러블슈팅

### "파일을 찾을 수 없습니다" / 로그가 수집되지 않음

1. **볼륨 마운트 확인** — 앱의 로그 디렉토리가 agent 컨테이너에 마운트되었는지 확인:
   ```bash
   docker exec mt-log-agent ls -la /var/log/app/
   ```
   파일이 보이지 않으면 볼륨 설정이 잘못된 것입니다.

2. **`MT_FILE` 경로 확인** — 기본값은 `/var/log/app/*.log`입니다. 로그 파일 확장자가 `.log`가 아니라면 `MT_FILE`을 맞게 설정하세요:
   ```yaml
   environment:
     - MT_FILE=/var/log/app/*.txt    # .txt 파일인 경우
     - MT_FILE=/var/log/app/*        # 모든 파일
   ```

3. **앱이 실제로 파일을 쓰고 있는지 확인** — 위의 "stdout으로만 로그를 출력하는 경우" 섹션을 참고하세요.

### EveryUp 서버에 로그가 안 보임

1. **Agent 로그 확인**:
   ```bash
   docker logs mt-log-agent
   ```
   `Connection refused`, `401 Unauthorized` 등의 에러를 확인하세요.

2. **네트워크 연결 확인** — agent 컨테이너에서 EveryUp 서버에 접근할 수 있는지 확인:
   ```bash
   docker exec mt-log-agent wget -qO- http://your-everyup-server:3001/health
   ```

3. **API Key 확인** — EveryUp 대시보드에서 해당 서비스의 API Key가 맞는지 확인하세요.

4. **디버그 로그 활성화** — 상세 로그를 보려면:
   ```yaml
   environment:
     - MT_LOG_LEVEL=debug
   ```

---

## 빌드 (개발자용)

```bash
# 로컬 빌드
docker build -t everyup-log-agent .

# Docker Hub 배포 (멀티 플랫폼)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t aiturn/everyup-log-agent:latest \
  --push \
  .
```
