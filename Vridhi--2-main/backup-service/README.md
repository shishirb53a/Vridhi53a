# Native PostgreSQL backup service

This service runs `pg_dump`, `pg_dumpall --globals-only`, `pg_restore`, and `psql` in a trusted server container. It is separate from the static app and Supabase Edge Functions because those runtimes cannot launch native executables.

## Requirements

- A direct PostgreSQL connection and a database account with privileges to dump and restore all objects, data, ownership, grants, and global roles.
- PostgreSQL client utilities at the same major version as the target server. The Dockerfile defaults to client 17; build with `--build-arg PG_MAJOR=15` (or the matching major) when needed.
- A persistent, encrypted volume for `/data/backups`, HTTPS termination, and one service replica. Do not expose this service over plain HTTP or run multiple replicas against the same directory.
- The latest `supabase/schema.sql` installed, including the `manage_database_backups` permission.

## Run

Build the image from the app directory:

```sh
docker build -t vr-db-backup-service -f backup-service/Dockerfile backup-service
```

Run it behind a trusted HTTPS reverse proxy. Keep secrets in the host's secret manager instead of shell history, use a persistent encrypted volume, and pin the allowed website origin:

```sh
docker run -d --name vr-db-backup-service --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v vr-db-backups:/data/backups \
  -e DATABASE_URL='postgresql://backup_user:password@db.example:5432/app?sslmode=require' \
  -e SUPABASE_URL='https://project.supabase.co' \
  -e SUPABASE_ANON_KEY='public-anon-key' \
  -e ALLOWED_ORIGINS='https://your-app.example' \
  vr-db-backup-service
```

Set `databaseBackupUrl` in `config.js` to the reverse proxy's HTTPS URL, then run the latest `supabase/schema.sql`. Super Admin and Admin receive the backup permission by default; other roles do not. Access is checked against the signed-in Supabase session for every request.

`MAX_BACKUP_BYTES` limits compressed uploads (default 10 GiB); `MAX_EXTRACTED_BYTES` limits archive contents (default 50 GiB); `OPERATION_TIMEOUT_MS` controls native command timeout (default 30 minutes). Reverse proxies must allow request bodies and operation durations at least this large. Monitor free space and copy backups to an independent off-site location.

## Bundle and restore behavior

Each `.tar.gz` bundle contains a custom-format `pg_dump` archive, `pg_dumpall --globals-only` SQL, and format metadata. The archive is validated before it is added to history. Restore applies global roles first and then runs `pg_restore --clean --if-exists --exit-on-error --single-transaction`. PostgreSQL does not make the globals and database restore one atomic transaction; a failed restore can have changed roles or objects. Use a disposable target to test restores before production use.

This service intentionally fails a backup if `pg_dumpall` cannot export global roles. Supabase-managed PostgreSQL does not generally grant superuser access to system role catalogs or permit restoring managed roles. Consequently, a standard Supabase project may not support the requested all-roles backup/restore through these utilities. Use a self-managed PostgreSQL server with suitable privileges, or the database provider's supported backup/restore mechanism; do not treat a dump without globals as a full backup.