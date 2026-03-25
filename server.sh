#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
PIDFILE=".server.pid"
LOGFILE="server.log"

start() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "Already running (pid $(cat "$PIDFILE"))"
    return 1
  fi
  echo "Starting etherpad-mcp..."
  nohup node dist/index.js >> "$LOGFILE" 2>&1 &
  echo $! > "$PIDFILE"
  echo "Started (pid $!). Logs: $LOGFILE"
}

stop() {
  if [ ! -f "$PIDFILE" ] || ! kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "Not running."
    rm -f "$PIDFILE"
    return 1
  fi
  echo "Stopping (pid $(cat "$PIDFILE"))..."
  kill "$(cat "$PIDFILE")"
  rm -f "$PIDFILE"
  echo "Stopped."
}

case "${1:-}" in
  start)   start ;;
  stop)    stop ;;
  restart) stop || true; start ;;
  status)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "Running (pid $(cat "$PIDFILE"))"
    else
      echo "Not running."
      rm -f "$PIDFILE"
    fi
    ;;
  *) echo "Usage: $0 {start|stop|restart|status}" ;;
esac
