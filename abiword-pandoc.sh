#!/bin/sh
# Drop-in replacement for abiword using pandoc.
#
# Unix mode:    abiword --plugin AbiCommand  (interactive, stdin/stdout)
#               stdin:  convert <srcFile> <destFile> <type>
#               stdout: OK\nAbiWord:>
#
# Windows mode: abiword --to=<destFile> <srcFile>  (one-shot)

pandoc_fmt() {
  case "$1" in
    doc) echo "docx" ;;
    *) echo "$1" ;;
  esac
}

do_convert() {
  _src="$1"; _dest="$2"; _type="$3"
  _fmt=$(pandoc_fmt "$_type")
  if [ "$_fmt" = "pdf" ]; then
    pandoc "$_src" -o "$_dest" --pdf-engine=weasyprint 2>&1
  else
    pandoc "$_src" -t "$_fmt" -o "$_dest" 2>&1
  fi
}

if [ "$1" = "--plugin" ] && [ "$2" = "AbiCommand" ]; then
  # Interactive mode (Unix) — emulate AbiCommand plugin protocol
  printf "AbiWord:>"
  while IFS= read -r line; do
    # Parse: convert <srcFile> <destFile> <type>
    set -- $line
    CMD="$1"; SRC="$2"; DEST="$3"; TYPE="$4"
    if [ "$CMD" = "convert" ] && [ -n "$SRC" ] && [ -n "$DEST" ]; then
      if do_convert "$SRC" "$DEST" "$TYPE"; then
        printf "OK\n"
      fi
    fi
    printf "AbiWord:>"
  done
else
  # One-shot mode (Windows): --to=<destFile> <srcFile>
  DEST=""; SRC=""
  for arg in "$@"; do
    case "$arg" in
      --to=*) DEST="${arg#--to=}" ;;
      *) SRC="$arg" ;;
    esac
  done
  EXT="${DEST##*.}"
  do_convert "$SRC" "$DEST" "$EXT"
fi
