#!/bin/sh
exec /opt/pw-browsers/chromium-1194/chrome-linux/chrome --host-resolver-rules="MAP cdn.tailwindcss.com 127.0.0.1:8443, MAP fonts.googleapis.com 127.0.0.1:8443, MAP fonts.gstatic.com 127.0.0.1:8443, MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1" --ignore-certificate-errors --no-proxy-server "$@"
