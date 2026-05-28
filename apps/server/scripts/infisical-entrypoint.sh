#!/bin/sh
# Dokploy: set INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET, INFISICAL_PROJECT_ID, INFISICAL_ENV (staging|prod).
set -e

if [ -z "${INFISICAL_CLIENT_ID:-}" ] || [ -z "${INFISICAL_CLIENT_SECRET:-}" ]; then
	echo "infisical-entrypoint: INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET are required" >&2
	exit 1
fi

if [ -z "${INFISICAL_PROJECT_ID:-}" ]; then
	echo "infisical-entrypoint: INFISICAL_PROJECT_ID is required" >&2
	exit 1
fi

INFISICAL_ENV="${INFISICAL_ENV:-staging}"

export INFISICAL_TOKEN
INFISICAL_TOKEN="$(
	infisical login --method=universal-auth \
		--client-id="$INFISICAL_CLIENT_ID" \
		--client-secret="$INFISICAL_CLIENT_SECRET" \
		--plain --silent
)"

exec infisical run \
	--env="$INFISICAL_ENV" \
	--projectId="$INFISICAL_PROJECT_ID" \
	--path=/ \
	--silent \
	-- "$@"
