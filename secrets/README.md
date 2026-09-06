# secrets/

One file per secret, contents only — no `KEY=` prefix, no trailing newline
required (both the app and the redis service strip surrounding whitespace).

`redis_password` is generated locally and git-ignored. It is mounted into the
containers at `/run/secrets/redis_password` and read via the
`REDIS_PASSWORD_FILE` environment variable, so the value never appears in
`docker inspect`, the image, or the compose file.

To recreate it after a clean checkout:

    python -c "import secrets,pathlib; pathlib.Path('secrets/redis_password').write_text(secrets.token_urlsafe(32))"

Then `docker compose up -d --force-recreate redis`. Changing the password
requires recreating redis, not just the app services.
