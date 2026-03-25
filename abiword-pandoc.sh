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

# Map abiword formats to pandoc equivalents
PANDOC_FMT="$FORMAT"
case "$FORMAT" in
  doc) PANDOC_FMT="docx" ;;
esac

if [ "$PANDOC_FMT" = "pdf" ]; then
  exec pandoc "$INPUT" -t html -o "$OUTPUT" --pdf-engine=weasyprint
else
  exec pandoc "$INPUT" -t "$PANDOC_FMT" -o "$OUTPUT"
fi
