#!/bin/zsh
cd -- "$(dirname -- "$0")"
if [[ -x .venv/bin/python ]]; then
  exec .venv/bin/python server.py
fi
if command -v python3 >/dev/null 2>&1; then
  exec python3 server.py
fi
print "Install Python 3.10 or newer, then run: python3 server.py"
read
