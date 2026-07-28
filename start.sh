#!/bin/bash
set -euo pipefail
CWD=$(realpath ./);

mkdir -p $CWD/logs;

forever -f -a \
  -l $CWD/logs/forever.log \
  -o $CWD/logs/output.log \
  -e $CWD/logs/error.log \
  -c "./node_modules/.bin/dotenvx run -- node" server.js
