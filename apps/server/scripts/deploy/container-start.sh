#!/bin/sh
# Apply Drizzle migrations before starting api/worker (Infisical env already loaded).
set -e

if [ -x ./drizzle-migrate ]; then
	./drizzle-migrate
fi

exec "$@"
