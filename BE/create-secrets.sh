#!/usr/bin/env bash
# Tạo secret cho BE trên Secret Manager. Đọc giá trị từ application-dev.properties
# (không hardcode secret trên dòng lệnh). Chạy 1 lần: bash BE/create-secrets.sh
set -euo pipefail

PROPS="src/main/resources/application-dev.properties"
[ -f "$PROPS" ] || PROPS="BE/src/main/resources/application-dev.properties"

# Lấy giá trị 1 property: getprop "jwt.secret"
getprop () { grep -m1 "^$1=" "$PROPS" | sed -E "s/^$1=//" | tr -d '\r'; }

create_secret () {
  local NAME="$1"; local VAL="$2"
  if [ -z "$VAL" ]; then echo "!! $NAME: giá trị trống, bỏ qua"; return; fi
  if gcloud secrets describe "$NAME" >/dev/null 2>&1; then
    printf '%s' "$VAL" | gcloud secrets versions add "$NAME" --data-file=- >/dev/null && echo "~ $NAME (version mới)"
  else
    printf '%s' "$VAL" | gcloud secrets create "$NAME" --data-file=- >/dev/null && echo "+ $NAME (tạo mới)"
  fi
}

# Giá trị động
REDIS_AUTH=$(gcloud redis instances get-auth-string siupo-redis --region=us-central1 --format='value(authString)')
JDBC='jdbc:mysql:///siupo_db?cloudSqlInstance=smiling-foundry-477815-s7:us-central1:siupo-mysql&socketFactory=com.google.cloud.sql.mysql.SocketFactory'

# DB password: tái dùng nếu secret đã có, nếu chưa thì sinh ngẫu nhiên
if gcloud secrets describe SPRING_DATASOURCE_PASSWORD >/dev/null 2>&1; then
  DB_PASS=$(gcloud secrets versions access latest --secret=SPRING_DATASOURCE_PASSWORD)
else
  DB_PASS=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)
fi

create_secret SPRING_DATASOURCE_URL      "$JDBC"
create_secret SPRING_DATASOURCE_USERNAME "siupo_user"
create_secret SPRING_DATASOURCE_PASSWORD "$DB_PASS"
create_secret JWT_SECRET                 "$(getprop 'jwt.secret')"
create_secret SPRING_MAIL_USERNAME       "$(getprop 'spring.mail.username')"
create_secret SPRING_MAIL_PASSWORD       "$(getprop 'spring.mail.password')"
create_secret APP_DEFAULT_ADMIN_PASSWORD "$(getprop 'app.default-admin.password')"
create_secret MOMO_ACCESS_KEY            "$(getprop 'momo.access-key')"
create_secret MOMO_SECRET_KEY            "$(getprop 'momo.secret-key')"
create_secret CLOUDINARY_API_KEY         "$(getprop 'cloudinary.api-key')"
create_secret CLOUDINARY_API_SECRET      "$(getprop 'cloudinary.api-secret')"
create_secret GOOGLE_CLIENT_SECRET       "$(getprop 'spring.security.oauth2.client.registration.google.client-secret')"
create_secret REDIS_PASSWORD             "$REDIS_AUTH"
echo "=== DONE ==="
