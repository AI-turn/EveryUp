# --- Stage 1: Prepare files (line-ending + permission fix) ---
FROM alpine:3.21 AS prep

COPY entrypoint.sh /entrypoint.sh
COPY conf/ /conf/
COPY test/ /test/

# Fix CRLF → LF (handles Windows/macOS hosts) and set permissions.
# Copy busybox under distinct names so the runtime stage can install
# them as separate binaries (busybox dispatches by argv[0]).
RUN sed -i 's/\r$//' /entrypoint.sh /conf/*.conf /conf/*.lua \
    && chmod 755 /entrypoint.sh /test/www/cgi-bin/log.sh \
    && cp /bin/busybox /bin/bb-sh \
    && cp /bin/busybox /bin/bb-httpd \
    && cp /bin/busybox /bin/bb-cat \
    && cp /bin/busybox /bin/bb-mkdir

# --- Stage 2: Runtime ---
FROM fluent/fluent-bit:3.2

COPY --from=prep /conf/fluent-bit.conf   /fluent-bit/etc/fluent-bit.conf
COPY --from=prep /conf/stdin.conf        /fluent-bit/etc/stdin.conf
COPY --from=prep /conf/parsers.conf      /fluent-bit/etc/parsers.conf
COPY --from=prep /conf/mt_transform.lua  /fluent-bit/etc/mt_transform.lua
COPY --from=prep /entrypoint.sh          /entrypoint.sh

# Shell (needed by entrypoint.sh shebang and CGI scripts)
COPY --from=prep /bin/bb-sh              /bin/sh
# Test mode tools
COPY --from=prep /bin/bb-httpd           /bin/httpd
COPY --from=prep /bin/bb-cat             /bin/cat
COPY --from=prep /bin/bb-mkdir           /bin/mkdir

# Test console web files (served only when MT_TEST=true)
COPY --from=prep /test/                  /test/

# Default environment variables
ENV MT_LOG_LEVEL=info
ENV MT_FILE=/var/log/app/*.log
ENV MT_HOST=localhost
ENV MT_PORT=3001
ENV MT_TLS=off
ENV MT_TLS_VERIFY=on
ENV MT_API_KEY=changeme

# Test mode (disabled by default)
ENV MT_TEST=false
ENV MT_TEST_PORT=8080

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
