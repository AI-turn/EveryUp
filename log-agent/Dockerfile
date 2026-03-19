# --- Stage 1: Prepare files (line-ending + permission fix) ---
FROM alpine:3.21 AS prep

COPY entrypoint.sh /entrypoint.sh
COPY conf/ /conf/

# Fix CRLF → LF (handles Windows/macOS hosts) and set executable
RUN sed -i 's/\r$//' /entrypoint.sh /conf/*.conf /conf/*.lua \
    && chmod 755 /entrypoint.sh

# --- Stage 2: Runtime ---
FROM fluent/fluent-bit:3.2

COPY --from=prep /conf/fluent-bit.conf   /fluent-bit/etc/fluent-bit.conf
COPY --from=prep /conf/stdin.conf        /fluent-bit/etc/stdin.conf
COPY --from=prep /conf/parsers.conf      /fluent-bit/etc/parsers.conf
COPY --from=prep /conf/mt_transform.lua  /fluent-bit/etc/mt_transform.lua
COPY --from=prep /entrypoint.sh          /entrypoint.sh

# Default environment variables
ENV MT_LOG_LEVEL=info
ENV MT_FILE=/var/log/app/*.log
ENV MT_HOST=localhost
ENV MT_PORT=3001
ENV MT_TLS=off
ENV MT_TLS_VERIFY=on
ENV MT_API_KEY=changeme

ENTRYPOINT ["/entrypoint.sh"]
