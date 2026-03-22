#!/bin/sh
# Parse MT_ENDPOINT URL into host/port/tls components for Fluent Bit.
# Uses only POSIX shell built-ins (no sed/awk) for maximum portability.
#
# Supported URL formats:
#   http://host:port         → tls=off, host=host, port=port
#   https://host:port        → tls=on,  host=host, port=port
#   https://host             → tls=on,  host=host, port=443
#   http://host:port/path    → path component is stripped (ignored)
#
# Known limitations:
#   - IPv6 addresses (e.g. [::1]:3001) are not supported
#   - URL credentials (user:pass@host) are not supported
#   - Use MT_HOST / MT_PORT / MT_TLS directly for unsupported formats

if [ -n "$MT_ENDPOINT" ]; then
  # Detect TLS from scheme
  case "$MT_ENDPOINT" in
    https://*) MT_TLS="on";  _stripped="${MT_ENDPOINT#https://}" ;;
    http://*)  MT_TLS="off"; _stripped="${MT_ENDPOINT#http://}" ;;
    *)         MT_TLS="off"; _stripped="$MT_ENDPOINT" ;;
  esac

  # Remove path component: "host:port/path" → "host:port"
  _hostport="${_stripped%%/*}"

  # Extract host and port
  case "$_hostport" in
    *:*)
      MT_HOST="${_hostport%%:*}"
      MT_PORT="${_hostport##*:}"
      ;;
    *)
      MT_HOST="$_hostport"
      if [ "$MT_TLS" = "on" ]; then MT_PORT=443; else MT_PORT=80; fi
      ;;
  esac

  export MT_TLS MT_HOST MT_PORT
fi

# Default values (set only if unset)
: "${MT_LOG_LEVEL:=info}"
: "${MT_FILE:=/var/log/app/*.log}"
: "${MT_TLS:=off}"
: "${MT_TLS_VERIFY:=off}"
: "${MT_HOST:=localhost}"
: "${MT_PORT:=3001}"
: "${MT_RETRY_LIMIT:=3}"
export MT_LOG_LEVEL MT_FILE MT_TLS MT_TLS_VERIFY MT_HOST MT_PORT MT_RETRY_LIMIT

# Start test console web UI when MT_TEST=true
# WARNING: This starts an unauthenticated HTTP server on MT_TEST_PORT (default 8080).
# Never set MT_TEST=true in production environments.
if [ "${MT_TEST:-false}" = "true" ]; then
  mkdir -p /var/log/app
  /test/server &
fi

exec /fluent-bit/bin/fluent-bit -c "${MT_CONFIG:-/fluent-bit/etc/fluent-bit.conf}"
