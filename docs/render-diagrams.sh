#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE="$SCRIPT_DIR/architecture-diagram.md"
OUT_DIR="$SCRIPT_DIR/diagrams"

mkdir -p "$OUT_DIR"

# Names for each mermaid block in order of appearance
NAMES=(
  "01-high-level-flow"
  "02-run-agent-per-iteration"
  "03-mcp-tool-use-flow"
  "04-validate-fix-loop"
  "05-accessibility-test-categories"
  "06-enforce-imports"
  "07-report-generation-pipeline"
)

# Extract all ```mermaid ... ``` blocks from the markdown file
# Uses awk to capture content between the fences
BLOCKS=()
CURRENT=""
IN_BLOCK=false

while IFS= read -r line; do
  if [[ "$line" =~ ^\`\`\`mermaid ]]; then
    IN_BLOCK=true
    CURRENT=""
    continue
  fi
  if $IN_BLOCK && [[ "$line" =~ ^\`\`\` ]]; then
    IN_BLOCK=false
    BLOCKS+=("$CURRENT")
    continue
  fi
  if $IN_BLOCK; then
    if [ -z "$CURRENT" ]; then
      CURRENT="$line"
    else
      CURRENT="$CURRENT
$line"
    fi
  fi
done < "$SOURCE"

BLOCK_COUNT=${#BLOCKS[@]}
NAME_COUNT=${#NAMES[@]}

echo "Found $BLOCK_COUNT mermaid blocks in $SOURCE"
echo "Rendering to $OUT_DIR/"
echo ""

if [ "$BLOCK_COUNT" -eq 0 ]; then
  echo "No mermaid blocks found. Check the source file."
  exit 1
fi

# Render each block
for i in "${!BLOCKS[@]}"; do
  if [ "$i" -lt "$NAME_COUNT" ]; then
    NAME="${NAMES[$i]}"
  else
    NAME="diagram-$(printf '%02d' $((i + 1)))"
  fi

  TMP_FILE=$(mktemp /tmp/mermaid-XXXXXX.mmd)
  echo "${BLOCKS[$i]}" > "$TMP_FILE"

  SVG_FILE="$OUT_DIR/$NAME.svg"

  echo "[$((i + 1))/$BLOCK_COUNT] Rendering $NAME.svg ..."

  npx --yes @mermaid-js/mermaid-cli \
    -i "$TMP_FILE" \
    -o "$SVG_FILE" \
    -b transparent \
    --quiet 2>/dev/null || {
    echo "  ⚠ Failed to render $NAME — skipping"
    rm -f "$TMP_FILE"
    continue
  }

  rm -f "$TMP_FILE"

  if [ -f "$SVG_FILE" ]; then
    SIZE=$(wc -c < "$SVG_FILE" | tr -d ' ')
    echo "  ✓ $SVG_FILE ($SIZE bytes)"
  else
    echo "  ⚠ Output file not created for $NAME"
  fi
done

echo ""
echo "Done. SVGs are in $OUT_DIR/"
ls -la "$OUT_DIR"/*.svg 2>/dev/null || echo "(no SVG files found)"
