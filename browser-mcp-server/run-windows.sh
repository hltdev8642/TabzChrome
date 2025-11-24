#!/bin/bash
# Wrapper to run browser-mcp-server via Windows node.exe
# This allows CDP to connect to Chrome on Windows localhost
exec "/mnt/c/Program Files/nodejs/node.exe" "$(wslpath -w "$(dirname "$0")/dist/index.js")"
