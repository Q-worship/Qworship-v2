#!/bin/sh
set -eu

: "${CHAT_API_ORIGIN:=http://host.docker.internal:8787}"

envsubst '${CHAT_API_ORIGIN}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec "$@"
