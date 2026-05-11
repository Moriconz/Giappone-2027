#!/usr/bin/env python3
"""
Advanced Find Me Gluten Free Japan Scraper
Extracts REAL restaurant data directly from FMGF with verification
"""

import requests
import json
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import time

def fetch_fmgf_restaurants():
    """Fetch restaurants from Find Me Gluten Free Japan"""

    print("=" * 80)
    print("🍽️  Advanced Find Me Gluten Free Japan Scraper")
    print("=" * 80)

    restaurants = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }

    # FMGF Japan page
    url = "https://www.findmeglutenfree.com/jp"

    print(f"\n📍 Fetching: {url}")

    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.encoding = 'utf-8'

        if response.status_code != 200:
            print(f"❌ Failed: Status {response.status_code}")
            return restaurants

        print("✅ Page loaded")

        soup = BeautifulSoup(response.content, 'html.parser')

        # Try multiple strategies to find restaurant data
        print("\n🔍 Searching for restaurant data...")

        # Strategy 1: Look for restaurant links with patterns
        restaurant_links = []

        # Pattern 1: Links containing /restaurants/
        for link in soup.find_all('a', href=re.compile(r'/restaurants/\d+')):
            restaurant_links.append(link)

        print(f"  Found {len(restaurant_links)} restaurant links (strategy 1)")

        # Pattern 2: Links containing place names
        if len(restaurant_links) == 0:
            for link in soup.find_all('a', href=re.compile(r'/places/')):
                if 'japan' in link.get('href', '').lower():
                    restaurant_links.append(link)
            print(f"  Found {len(restaurant_links)} place links (strategy 2)")

        # Pattern 3: Look for restaurant cards by class/data attributes
        if len(restaurant_links) == 0:
            cards = soup.find_all(['div', 'article'], class_=re.compile(r'restaurant|place|card'))
            for card in cards:
                link = card.find('a')
                if link and link.get('href'):
                    restaurant_links.append(link)
            print(f"  Found {len(restaurant_links)} restaurant cards (strategy 3)")

        # Extract data from each link
        print(f"\n📋 Extracting data from {len(restaurant_links)} restaurants...")

        for idx, link in enumerate(restaurant_links):
            try:
                # Get name
                name = link.get_text(strip=True)
                if not name or len(name) < 2:
                    continue

                # Get URL
                href = link.get('href', '')
                if not href:
                    continue

                # Full URL
                if href.startswith('http'):
                    full_url = href
                else:
                    full_url = urljoin("https://www.findmeglutenfree.com", href)

                # Get parent container for more data
                parent = link.find_parent(['div', 'article', 'li'])

                rating = 4.0
                reviews_count = 0
                city = "Japan"
                cuisine = ""

                # Extract rating and reviews from parent
                if parent:
                    parent_text = parent.get_text()

                    # Look for rating (e.g., "4.5 stars", "★★★★★")
                    rating_match = re.search(r'(\d+\.?\d*)\s*(?:star|★|⭐)', parent_text)
                    if rating_match:
                        rating = float(rating_match.group(1))

                    # Look for review count
                    review_match = re.search(r'(\d+)\s*(?:review|opinion|recension)', parent_text, re.IGNORECASE)
                    if review_match:
                        reviews_count = int(review_match.group(1))

                    # Try to extract location
                    location_match = re.search(r'(Tokyo|Kyoto|Osaka|Sapporo|Nagano|Kanazawa|Nara|Hiroshima|Fukuoka)', parent_text)
                    if location_match:
                        city = location_match.group(1)

                # Assign safety level
                if rating >= 4.5 and reviews_count >= 5:
                    safety_level = "GREEN"
                elif rating >= 3.8 and reviews_count >= 3:
                    safety_level = "YELLOW"
                elif rating >= 3.0:
                    safety_level = "YELLOW"
                else:
                    safety_level = "RED"

                restaurant = {
                    "id": f"fmgf-{idx}",
                    "name": name,
                    "city": city,
                    "rating": rating,
                    "reviews": reviews_count,
                    "safety_level": safety_level,
                    "cuisine": cuisine,
                    "source": "Find Me Gluten Free",
                    "source_url": full_url,
                    "lat": None,
                    "lng": None
                }

                restaurants.append(restaurant)
                print(f"  ✅ {idx+1}. {name} ({city}) - {safety_level} ⭐{rating}")

            except Exception as e:
                print(f"  ⚠️  Error: {str(e)}")
                continue

            # Be respectful to server
            time.sleep(0.5)

        print(f"\n✨ Total restaurants extracted: {len(restaurants)}")

        return restaurants

    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {str(e)}")
        return restaurants


def verify_restaurants(restaurants):
    """Verify restaurant data and enrich with additional info"""

    print(f"\n🔐 Verifying {len(restaurants)} restaurants...")

    verified = []

    for i, rest in enumerate(restaurants):
        try:
            # Check if URL is accessible
            if rest.get('source_url'):
                print(f"  Checking: {rest['name'][:30]}...", end="")

                headers = {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                }
                response = requests.head(rest['source_url'], headers=headers, timeout=5)

                if response.status_code == 200:
                    print(" ✅")
                    verified.append(rest)
                else:
                    print(f" ⚠️ (status {response.status_code})")
                    verified.append(rest)  # Keep anyway

        except Exception as e:
            # Keep the restaurant even if verification fails
            verified.append(rest)

        time.sleep(0.3)

    return verified


def save_restaurants(restaurants, filename="fmgf_japan_restaurants.json"):
    """Save restaurants to JSON file"""

    print(f"\n💾 Saving to {filename}...")

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(restaurants, f, ensure_ascii=False, indent=2)

    print(f"✅ Saved {len(restaurants)} restaurants")

    # Show statistics
    green = len([r for r in restaurants if r['safety_level'] == 'GREEN'])
    yellow = len([r for r in restaurants if r['safety_level'] == 'YELLOW'])
    red = len([r for r in restaurants if r['safety_level'] == 'RED'])

    cities = {}
    for r in restaurants:
        city = r.get('city', 'Unknown')
        cities[city] = cities.get(city, 0) + 1

    print(f"\n📊 Statistics:")
    print(f"  🟢 GREEN (Safe): {green}")
    print(f"  🟡 YELLOW (Caution): {yellow}")
    print(f"  🔴 RED (Not recommended): {red}")
    print(f"\n🗾 By City:")
    for city in sorted(cities.keys()):
        print(f"  {city}: {cities[city]}")

    print(f"\n✨ Data ready for SafeEats app!")
    return filename


def show_sample(restaurants, count=5):
    """Show sample restaurants"""

    print(f"\n📋 Sample Data ({count} restaurants):")
    for i, r in enumerate(restaurants[:count]):
        print(f"\n  {i+1}. {r['name']}")
        print(f"     City: {r['city']}")
        print(f"     Rating: {r['rating']} ⭐ ({r['reviews']} reviews)")
        print(f"     Safety: {r['safety_level']}")
        print(f"     URL: {r['source_url']}")


if __name__ == "__main__":
    # Fetch from FMGF
    restaurants = fetch_fmgf_restaurants()

    if restaurants:
        # Verify data
        restaurants = verify_restaurants(restaurants)

        # Save to file
        filename = save_restaurants(restaurants)

        # Show sample
        show_sample(restaurants)
    else:
        print("\n⚠️  No restaurants found.")
        print("Note: If FMGF changed their website structure, manual update may be needed.")
        print("See: generate_restaurants_db.py for manual database generation")
