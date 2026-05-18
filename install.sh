#!/bin/bash
# Simple setup - installs all dependencies

echo "📦 Installing required packages..."
pip3 install --break-system-packages requests beautifulsoup4

echo "✅ Done! Now you can run:"
echo ""
echo "python3 scrape_fmgf_advanced.py"
echo ""
