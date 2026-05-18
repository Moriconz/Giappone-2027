#!/bin/bash
# Setup script for Find Me Gluten Free Scraper (NO BROWSER NEEDED!)

echo "🔧 Setting up environment (very simple!)..."

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "✅ Activating virtual environment..."
source venv/bin/activate

# Install requirements (very lightweight!)
echo "📥 Installing required packages..."
pip install --upgrade pip
pip install requests beautifulsoup4

# Run the scraper immediately
echo ""
echo "✅ Setup complete! Running scraper now..."
echo ""
python scrape_fmgf.py

# Keep the script running so user can see results
echo ""
echo "✨ Done! Check the fmgf_japan_restaurants.json file"
echo ""
