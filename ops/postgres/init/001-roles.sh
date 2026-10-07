#!/bin/bash
set -euo pipefail

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${DB_MIGRATOR_PASSWORD:?DB_MIGRATOR_PASSWORD is required}"
: "${DB_RUNTIME_PASSWORD:?DB_RUNTIME_PASSWORD is required}"

psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set ON_ERROR_STOP=1 \
  --set migrator_password="$DB_MIGRATOR_PASSWORD" \
  --set runtime_password="$DB_RUNTIME_PASSWORD" \
  --set app_database="$POSTGRES_DB" <<'SQL'
CREATE ROLE webmail_migrator
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  PASSWORD :'migrator_password';

CREATE ROLE webmail_runtime
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  PASSWORD :'runtime_password';

ALTER DATABASE :"app_database" OWNER TO webmail_migrator;
REVOKE ALL ON DATABASE :"app_database" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"app_database" TO webmail_runtime;
ALTER ROLE webmail_migrator SET search_path = app, public;
ALTER ROLE webmail_runtime SET search_path = app, public;

CREATE DATABASE webmail_test OWNER webmail_migrator;
REVOKE ALL ON DATABASE webmail_test FROM PUBLIC;
GRANT CONNECT ON DATABASE webmail_test TO webmail_runtime;
SQL

psql \
  --username "$POSTGRES_USER" \
  --dbname webmail_test \
  --set ON_ERROR_STOP=1 <<'SQL'
REVOKE ALL ON SCHEMA public FROM PUBLIC;
SQL
