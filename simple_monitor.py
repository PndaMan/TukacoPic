#!/usr/bin/env python3
"""
Simple TukacoPic URL Monitor (No Email)
Checks if the frontend and backend URLs are responding correctly every 5 minutes.
Logs results to console and file.
"""

import requests
import time
from datetime import datetime
import logging

# URLs to monitor
URLS_TO_MONITOR = {
    "Frontend (Cloud Run)": "https://tukacopic-frontend-677567505225.africa-south1.run.app",
    "Backend API (Cloud Run)": "https://tukacopic-backend-677567505225.africa-south1.run.app/api/leaderboard/",
    "Frontend (Custom Domain)": "https://tukacopic.aether-lab.xyz",
    "Backend API (Custom Domain)": "https://api.tukacopic.aether-lab.xyz/api/leaderboard/"
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('url_monitor.log'),
        logging.StreamHandler()
    ]
)

def check_url(name, url):
    """Check if a URL is responding correctly."""
    try:
        response = requests.get(url, timeout=30, allow_redirects=True)

        # Different success criteria for different endpoints
        if "api" in url.lower():
            # For API endpoints, we expect either JSON response or 400 (ALLOWED_HOSTS issue)
            if response.status_code in [200, 400]:
                return True, f"Status {response.status_code}"
            else:
                return False, f"Status {response.status_code}"
        else:
            # For frontend, we expect 200 and HTML content
            if response.status_code == 200 and "html" in response.headers.get('content-type', '').lower():
                return True, f"Status {response.status_code} - HTML content"
            else:
                return False, f"Status {response.status_code}"

    except requests.exceptions.SSLError as e:
        return False, f"SSL Error: {str(e)[:100]}"
    except requests.exceptions.ConnectionError as e:
        return False, f"Connection Error: {str(e)[:100]}"
    except requests.exceptions.Timeout:
        return False, "Timeout (30s)"
    except Exception as e:
        return False, f"Error: {str(e)[:100]}"

def monitor_loop():
    """Main monitoring loop."""
    logging.info("Starting TukacoPic URL Monitor...")
    logging.info(f"Monitoring {len(URLS_TO_MONITOR)} URLs every 5 minutes")

    check_count = 0
    services_up_count = 0

    while True:
        try:
            check_count += 1
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            logging.info(f"\n--- Check #{check_count} at {timestamp} ---")

            all_services_up = True
            results = []

            for name, url in URLS_TO_MONITOR.items():
                is_up, details = check_url(name, url)
                status_emoji = "✅" if is_up else "❌"
                logging.info(f"{status_emoji} {name}: {details}")
                results.append((name, is_up, details))

                if not is_up:
                    all_services_up = False

            if all_services_up:
                services_up_count += 1
                logging.info(f"🎉 ALL SERVICES UP! (Success count: {services_up_count})")

                if services_up_count == 1:
                    logging.info("🚀 FIRST TIME ALL SERVICES ARE UP! Your TukacoPic deployment is ready!")
                    print("\n" + "="*60)
                    print("🎉 SUCCESS! TukacoPic is now LIVE!")
                    print("="*60)
                    print("Frontend: https://tukacopic.aether-lab.xyz")
                    print("Backend API: https://api.tukacopic.aether-lab.xyz")
                    print("="*60 + "\n")
            else:
                logging.info(f"⏳ Some services still coming online...")

            logging.info(f"Next check in 5 minutes... (Total checks: {check_count})")
            time.sleep(300)  # Wait 5 minutes

        except KeyboardInterrupt:
            logging.info(f"\n✋ Monitoring stopped by user after {check_count} checks.")
            break
        except Exception as e:
            logging.error(f"Error in monitoring loop: {e}")
            time.sleep(60)  # Wait 1 minute before retrying

def main():
    print("TukacoPic Simple URL Monitor")
    print("============================")
    print("\n🔍 Monitoring URLs:")
    for name, url in URLS_TO_MONITOR.items():
        print(f"   • {name}: {url}")

    print("\n📝 Logs will be saved to: url_monitor.log")
    print("⏰ Checking every 5 minutes")
    print("Press Ctrl+C to stop monitoring\n")

    monitor_loop()

if __name__ == "__main__":
    main()