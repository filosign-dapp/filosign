#!/bin/sh
# Dokploy bootstrap: INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET, INFISICAL_PROJECT_ID,
# INFISICAL_ENV (prod|staging|sandbox), optional INFISICAL_API_URL (EU), INFISICAL_SECRET_PATH (/app).
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
INFISICAL_SECRET_PATH="${INFISICAL_SECRET_PATH:-/app}"

# EU / self-hosted: https://eu.infisical.com — CLI reads INFISICAL_API_URL (also passed to login).
if [ -n "${INFISICAL_API_URL:-}" ]; then
	export INFISICAL_API_URL
fi

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
	--path="$INFISICAL_SECRET_PATH" \
	--silent \
	-- "$@"
