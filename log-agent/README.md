# EveryUp Log Agent

Collect logs from your application and forward them to your EveryUp dashboard.

Supports `linux/amd64` and `linux/arm64` — Docker automatically pulls the correct variant.

---

## Prerequisites

1. EveryUp server is running
2. Register a service in the EveryUp dashboard
3. Get your API key from **Service detail → Integration** tab

---

## Quick Start

### Docker

```bash
docker run -d \
  --name everyup-log-agent \
  -v /path/to/your/app/logs:/var/log/app:ro \
  -e MT_ENDPOINT=http://your-everyup-server:3001 \
  -e MT_API_KEY=mt_your_api_key \
  --restart unless-stopped \
  aiturn/everyup-log-agent:latest
```

### Docker Compose

`.env`:
```dotenv
MT_ENDPOINT=http://your-everyup-server:3001
MT_API_KEY=mt_your_api_key
LOG_PATH=/path/to/your/app/logs
```

`docker-compose.yml`:
```yaml
services:
  everyup-log-agent:
    image: aiturn/everyup-log-agent:latest
    restart: unless-stopped
    env_file: .env
    volumes:
      - ${LOG_PATH}:/var/log/app:ro
```

```bash
docker compose up -d
```

---

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MT_ENDPOINT` | EveryUp server URL | — |
| `MT_API_KEY` | Service API key **(required)** | — |
| `MT_FILE` | Log file path (glob supported) | `/var/log/app/*.log` |
| `MT_LOG_LEVEL` | Log level (`debug`, `info`, `warn`, `error`) | `info` |
| `MT_RETRY_LIMIT` | Retry count on failure (`0` = unlimited) | `3` |

> **`MT_ENDPOINT` URL parsing:**
> - `http://192.168.1.10:3001` → host=192.168.1.10, port=3001, tls=off
> - `https://monitoring.example.com` → host=monitoring.example.com, port=443, tls=on

---

## Log Format

### JSON (recommended)

```json
{"level": "error", "message": "connection failed", "service": "api", "userId": 123}
```

Recognized fields:
- **message**: `message`, `msg`, or `log`
- **level**: `level`, `levelname`, or `severity`
- **other fields**: collected automatically as `metadata`

Level mapping:

| Input | Mapped to |
|-------|-----------|
| `FATAL`, `CRITICAL`, `ERROR`, `ERR` | `error` |
| `WARN`, `WARNING` | `warn` |
| `INFO`, `DEBUG`, `TRACE` | `info` |
| unset or other | `error` |

### Plain text

Non-JSON lines are collected as-is. The full line becomes `message` and level is set to `error`.

---

## Troubleshooting

### Logs not being collected

- **Check volume mount**
  ```bash
  docker exec everyup-log-agent ls -la /var/log/app/
  ```
  If no files appear, your volume path is misconfigured.

- **Check file extension** — default pattern is `/var/log/app/*.log`. If your app uses a different extension, set `MT_FILE`:
  ```
  MT_FILE=/var/log/app/*
  ```

- **App must write to a file** — containers typically log to stdout/stderr only. Configure your app to also write logs to a file (e.g. `/var/log/app/app.log`).

### Logs not appearing in EveryUp

- **Check agent logs**
  ```bash
  docker logs everyup-log-agent
  ```
  Look for `Connection refused` or `401 Unauthorized`.

- **Check network connectivity**
  ```bash
  docker exec everyup-log-agent wget -qO- http://your-everyup-server:3001/api/v1/health
  ```

- **Verify API key** — confirm the key matches the one shown in the Integration tab.

- **Enable debug logging**
  ```
  MT_LOG_LEVEL=debug
  ```
