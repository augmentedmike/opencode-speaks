#!/usr/bin/env bash
set -euo pipefail

OPENCODE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
PLUGINS_DIR="$OPENCODE_DIR/plugins"
TOOLS_DIR="$OPENCODE_DIR/tools"

# Detect edge-tts
EDGE_TTS_BIN=""
if command -v edge-tts &>/dev/null; then
  EDGE_TTS_BIN="$(which edge-tts)"
fi

if [[ -z "$EDGE_TTS_BIN" ]]; then
  echo "⚠  edge-tts not found in PATH."
  echo "   Install with: pipx install edge-tts"
  echo "   Then re-run this script."
  exit 1
fi

echo "✓ edge-tts found at $EDGE_TTS_BIN"

# Create dirs
mkdir -p "$PLUGINS_DIR"
mkdir -p "$TOOLS_DIR"

# Write plugin — sed in the real edge-tts path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sed "s|/Users/michaeloneal/.local/bin/edge-tts|$EDGE_TTS_BIN|g" \
  "$SCRIPT_DIR/src/plugin.ts" > "$PLUGINS_DIR/voice.ts"

echo "✓ Plugin installed → $PLUGINS_DIR/voice.ts"

# Ensure @opencode-ai/plugin dep is in package.json
PKG="$OPENCODE_DIR/package.json"
if [[ ! -f "$PKG" ]]; then
  echo '{"dependencies":{"@opencode-ai/plugin":"*"}}' > "$PKG"
  echo "✓ Created $PKG"
elif ! grep -q "@opencode-ai/plugin" "$PKG"; then
  # naive insert — works for standard opencode package.json
  sed -i '' 's/"dependencies": {/"dependencies": {\n    "@opencode-ai\/plugin": "*",/' "$PKG"
  echo "✓ Added @opencode-ai/plugin to $PKG"
else
  echo "✓ @opencode-ai/plugin already in $PKG"
fi

echo ""
echo "Done. Restart opencode, then run: enable_voice"
echo "Optional: enable_voice with save_dir ~/Desktop/my-clips to archive audio."
