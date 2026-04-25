#!/bin/bash
REPO_ROOT="${1:-.}"
CHUNK_DIR="$REPO_ROOT/chunk"
OUTPUT_DIR="$REPO_ROOT/chunk-zips"

if [ ! -d "$CHUNK_DIR" ]; then
  echo "❌ Cartella $CHUNK_DIR non trovata"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "🗜️  Comprimendo chunk per città..."

# Tokyo
echo "→ tokyo"
files=$(find "$CHUNK_DIR" -maxdepth 1 -name "tokyo*" 2>/dev/null)
if [ -n "$files" ]; then
  zip -q -j "$OUTPUT_DIR/tokyo-chunks.zip" $files
  size=$(ls -lh "$OUTPUT_DIR/tokyo-chunks.zip" | awk '{print $5}')
  count=$(echo $files | wc -w)
  echo "  ✅ tokyo-chunks.zip ($size, $count file)"
fi

# Osaka
echo "→ osaka"
files=$(find "$CHUNK_DIR" -maxdepth 1 -name "osaka*" 2>/dev/null)
if [ -n "$files" ]; then
  zip -q -j "$OUTPUT_DIR/osaka-chunks.zip" $files
  size=$(ls -lh "$OUTPUT_DIR/osaka-chunks.zip" | awk '{print $5}')
  count=$(echo $files | wc -w)
  echo "  ✅ osaka-chunks.zip ($size, $count file)"
fi

# Kyoto
echo "→ kyoto"
files=$(find "$CHUNK_DIR" -maxdepth 1 -name "kyoto*" 2>/dev/null)
if [ -n "$files" ]; then
  zip -q -j "$OUTPUT_DIR/kyoto-chunks.zip" $files
  size=$(ls -lh "$OUTPUT_DIR/kyoto-chunks.zip" | awk '{print $5}')
  count=$(echo $files | wc -w)
  echo "  ✅ kyoto-chunks.zip ($size, $count file)"
fi

# Hiroshima
echo "→ hiroshima"
files=$(find "$CHUNK_DIR" -maxdepth 1 -name "hiroshima*" 2>/dev/null)
if [ -n "$files" ]; then
  zip -q -j "$OUTPUT_DIR/hiroshima-chunks.zip" $files
  size=$(ls -lh "$OUTPUT_DIR/hiroshima-chunks.zip" | awk '{print $5}')
  count=$(echo $files | wc -w)
  echo "  ✅ hiroshima-chunks.zip ($size, $count file)"
fi

# Kamakura
echo "→ kamakura"
files=$(find "$CHUNK_DIR" -maxdepth 1 -name "kamakura*" 2>/dev/null)
if [ -n "$files" ]; then
  zip -q -j "$OUTPUT_DIR/kamakura-chunks.zip" $files
  size=$(ls -lh "$OUTPUT_DIR/kamakura-chunks.zip" | awk '{print $5}')
  count=$(echo $files | wc -w)
  echo "  ✅ kamakura-chunks.zip ($size, $count file)"
fi

# Nara
echo "→ nara"
files=$(find "$CHUNK_DIR" -maxdepth 1 -name "nara*" 2>/dev/null)
if [ -n "$files" ]; then
  zip -q -j "$OUTPUT_DIR/nara-chunks.zip" $files
  size=$(ls -lh "$OUTPUT_DIR/nara-chunks.zip" | awk '{print $5}')
  count=$(echo $files | wc -w)
  echo "  ✅ nara-chunks.zip ($size, $count file)"
fi

# Yokohama
echo "→ yokohama"
files=$(find "$CHUNK_DIR" -maxdepth 1 -name "yokohama*" 2>/dev/null)
if [ -n "$files" ]; then
  zip -q -j "$OUTPUT_DIR/yokohama-chunks.zip" $files
  size=$(ls -lh "$OUTPUT_DIR/yokohama-chunks.zip" | awk '{print $5}')
  count=$(echo $files | wc -w)
  echo "  ✅ yokohama-chunks.zip ($size, $count file)"
fi

echo ""
echo "📦 Zip creati in $OUTPUT_DIR:"
ls -lh "$OUTPUT_DIR/"

echo ""
echo "📤 Totale file zip creati: $(ls -1 "$OUTPUT_DIR" | wc -l)"
echo "📤 Spazio totale: $(du -sh "$OUTPUT_DIR" | awk '{print $1}')"
