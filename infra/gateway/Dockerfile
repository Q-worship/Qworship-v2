FROM nginx:alpine

RUN apk add --no-cache gettext

COPY infra/gateway/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY infra/gateway/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
