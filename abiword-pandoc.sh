#!/bin/sh
# Drop-in replacement for abiword using pandoc.
# Etherpad calls: abiword --to=<format> <input.html>
# Output: same basename with new extension.
FORMAT=""
INPUT=""
for arg in "$@"; do
  case "$arg" in
    --to=*) FORMAT="${arg#--to=}" ;;
    *) INPUT="$arg" ;;
  esac
done

OUTPUT="${INPUT%.*}.${FORMAT}"
if [ "$FORMAT" = "pdf" ]; then
  exec pandoc "$INPUT" -o "$OUTPUT" --pdf-engine=weasyprint
else
  exec pandoc "$INPUT" -o "$OUTPUT"
fi
