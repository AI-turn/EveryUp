#!/bin/sh
# CGI: append POST body (one JSON line) to the test log file.
# busybox httpd pipes exactly CONTENT_LENGTH bytes to stdin.
mkdir -p /var/log/app
cat >> /var/log/app/test.log
printf "Content-Type: application/json\r\n\r\n"
printf '{"ok":true}\n'
