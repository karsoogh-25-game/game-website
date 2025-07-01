#!/bin/sh
set -e

host="$1"
shift
cmd="$@"

until nc -z -v -w30 "$host" 2>/dev/null; do
  >&2 echo "Service is unavailable - sleeping"
  sleep 1
done

>&2 echo "Service is up - executing command"
exec $cmd