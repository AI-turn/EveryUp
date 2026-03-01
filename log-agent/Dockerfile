FROM fluent/fluent-bit:latest

# Copy configuration files
COPY conf/fluent-bit.conf /fluent-bit/etc/fluent-bit.conf
COPY conf/stdin.conf      /fluent-bit/etc/stdin.conf
COPY conf/parsers.conf    /fluent-bit/etc/parsers.conf
COPY conf/mt_transform.lua /fluent-bit/etc/mt_transform.lua

# Copy entrypoint (parses MT_ENDPOINT into host/port/tls)
# Use --chmod to avoid RUN chmod (fluent-bit image has no shell on ARM)
COPY --chmod=755 entrypoint.sh /entrypoint.sh

# Default environment variables
ENV MT_LOG_LEVEL=info
ENV MT_FILE=/var/log/app/*.log
ENV MT_HOST=localhost
ENV MT_PORT=3001
ENV MT_TLS=off
ENV MT_API_KEY=changeme

ENTRYPOINT ["/entrypoint.sh"]
