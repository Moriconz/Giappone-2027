#!/usr/bin/env python3
"""
Web Scraper for Find Me Gluten Free Japan Restaurants (NO BROWSER NEEDED)
Extracts restaurant data and assigns safety levels based on ratings
Uses requests + BeautifulSoup for pure HTTP scraping
"""

import json
import requests
from bs4 import BeautifulSoup
import re
import time

def scrape_fmgf_japan():
    """Scrape Find Me Gluten Free Japan restaurants using HTTP requests"""

    print("🔍 Starting Find Me Gluten Free Japan scraper (no browser needed)...")

    restaurants = []

    # List of FMGF Japan pages to scrape
    urls = [
        "https://www.findmeglutenfree.com/jp",
        "https://www.findmeglutenfree.com/places/japan",
    ]

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }

    for url in urls:
        try:
            print(f"\n📍 Fetching: {url}")
            response = requests.get(url, headers=headers, timeout=10)

            if response.status_code != 200:
                print(f"⚠️ Failed to fetch {url}: Status {response.status_code}")
                continue

            print("✅ Page loaded successfully")

            # Parse HTML
            soup = BeautifulSoup(response.content, 'html.parser')

            # Try multiple selectors for restaurant data
            # Look for restaurant cards/links
            restaurant_links = soup.find_all('a', href=re.compile(r'/restaurants/\d+|/places/.*japan'))

            print(f"📊 Found {len(restaurant_links)} potential restaurant links")

            for idx, link in enumerate(restaurant_links):
                try:
                    # Extract basic info from link
                    name = link.get_text(strip=True)
                    url_href = link.get('href', '')

                    if not name or len(name) < 2:
                        continue

                    # Try to find parent container for more data
                    parent = link.find_parent(['div', 'article'])

                    rating = 4.0  # default
                    reviews_count = 0
                    city = "Japan"
                    cuisine = ""

                    # Try to extract rating from parent
                    if parent:
                        # Look for rating text
                        rating_text = parent.get_text()
                        rating_match = re.search(r'(\d+\.?\d*)\s*(?:star|★)', rating_text)
                        if rating_match:
                            rating = float(rating_match.group(1))

                        # Look for review count
                        reviews_match = re.search(r'(\d+)\s*(?:review|opinion)', rating_text)
                        if reviews_match:
                            reviews_count = int(reviews_match.group(1))

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
                        "source_url": f"https://www.findmeglutenfree.com{url_href}" if url_href.startswith('/') else url_href,
                        "lat": None,
                        "lng": None
                    }

                    if restaurant not in restaurants:  # Avoid duplicates
                        restaurants.append(restaurant)
                        print(f"  ✅ {idx+1}. {name} - {safety_level}")

                except Exception as e:
                    print(f"  ⚠️ Error processing link: {str(e)}")
                    continue

            time.sleep(1)  # Be respectful to the server

        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching {url}: {str(e)}")
            continue

    print(f"\n✨ Total restaurants found: {len(restaurants)}")

    return restaurants


def assign_safety_levels(restaurants):
    """Assign safety levels based on ratings and reviews"""

    for restaurant in restaurants:
        rating = restaurant.get('rating', 0)
        reviews = restaurant.get('reviews', 0)

        if rating >= 4.5 and reviews >= 5:
            restaurant['safety_level'] = 'GREEN'  # ✅ Safe
        elif rating >= 3.8 and reviews >= 3:
            restaurant['safety_level'] = 'YELLOW'  # ⚠️ Caution
        elif rating >= 3.0:
            restaurant['safety_level'] = 'YELLOW'  # ⚠️ Caution
        else:
            restaurant['safety_level'] = 'RED'  # ❌ Not recommended

    return restaurants


if __name__ == "__main__":
    print("=" * 70)
    print("🍽️  Find Me Gluten Free Japan Scraper (NO BROWSER NEEDED!)")
    print("=" * 70)

    # Scrape
    restaurants = scrape_fmgf_japan()

    if restaurants:
        # Assign safety levels
        restaurants = assign_safety_levels(restaurants)

        # Save to JSON
        output_file = "fmgf_japan_restaurants.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(restaurants, f, ensure_ascii=False, indent=2)

        print(f"\n✅ Scraping complete!")
        print(f"💾 Data saved to: {output_file}")
        print(f"📊 Total restaurants: {len(restaurants)}")

        # Show stats
        green = len([r for r in restaurants if r['safety_level'] == 'GREEN'])
        yellow = len([r for r in restaurants if r['safety_level'] == 'YELLOW'])
        red = len([r for r in restaurants if r['safety_level'] == 'RED'])

        print(f"\n📈 Safety Level Distribution:")
        print(f"  🟢 GREEN (Safe): {green}")
        print(f"  🟡 YELLOW (Caution): {yellow}")
        print(f"  🔴 RED (Not recommended): {red}")

        # Show sample data
        print(f"\n📋 Sample restaurants:")
        for i, r in enumerate(restaurants[:5]):
            print(f"  {i+1}. {r['name']} - {r['safety_level']} (⭐ {r['rating']})")

        print("\n✨ Ready to integrate into SafeEats app!")

    else:
        print("❌ No restaurants found. FMGF might have changed their structure.")
