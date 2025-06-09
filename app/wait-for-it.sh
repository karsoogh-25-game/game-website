#!/bin/sh
# wait-for-it.sh - A script to wait for a service to be available.

set -e

host="$1"
shift
cmd="$@"

# Loop until we can successfully connect to the host and port
# nc (netcat) is a common utility available on alpine linux
until nc -z -v -w30 "$host" 2>/dev/null; do
  >&2 echo "Service is unavailable - sleeping"
  sleep 1
done

>&2 echo "Service is up - executing command"
exec $cmd