#!/bin/sh
# Parse MT_ENDPOINT URL into host/port/tls components for Fluent Bit
# Fluent Bit HTTP output requires separate host, port, tls settings

if [ -n "$MT_ENDPOINT" ]; then
  # Detect TLS
  case "$MT_ENDPOINT" in
    https://*) MT_TLS="on" ;;
    *)         MT_TLS="off" ;;
  esac

  # Extract host (strip protocol and path)
  MT_HOST=$(echo "$MT_ENDPOINT" | sed -E 's|https?://||' | sed -E 's|:[0-9]+.*||' | sed -E 's|/.*||')

  # Extract port (if present)
  MT_PORT=$(echo "$MT_ENDPOINT" | sed -nE 's|https?://[^:/]+:([0-9]+).*|\1|p')
  if [ -z "$MT_PORT" ]; then
    if [ "$MT_TLS" = "on" ]; then
      MT_PORT=443
    else
      MT_PORT=80
    fi
  fi

  export MT_TLS MT_HOST MT_PORT
fi

# Default values
: "${MT_LOG_LEVEL:=info}"
: "${MT_FILE:=/var/log/app/*.log}"
: "${MT_TLS:=off}"
: "${MT_HOST:=localhost}"
: "${MT_PORT:=3001}"
export MT_LOG_LEVEL MT_FILE MT_TLS MT_HOST MT_PORT

exec /fluent-bit/bin/fluent-bit -c "${MT_CONFIG:-/fluent-bit/etc/fluent-bit.conf}"
