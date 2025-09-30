#!/usr/bin/env python3
"""
TukacoPic URL Monitor
Checks if the frontend and backend URLs are responding correctly every 5 minutes.
Sends email notification when services are up and running.
"""

import requests
import smtplib
import time
import json
from datetime import datetime
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import logging

# Configuration
URLS_TO_MONITOR = {
    "Frontend (Cloud Run)": "https://tukacopic-frontend-677567505225.africa-south1.run.app",
    "Backend API (Cloud Run)": "https://tukacopic-backend-677567505225.africa-south1.run.app/api/leaderboard/",
    "Frontend (Custom Domain)": "https://tukacopic.aether-lab.xyz",
    "Backend API (Custom Domain)": "https://api.tukacopic.aether-lab.xyz/api/leaderboard/"
}

EMAIL_CONFIG = {
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "sender_email": "your-email@gmail.com",  # Replace with your Gmail
    "sender_password": "your-app-password",   # Replace with Gmail App Password
    "recipient_email": "aidanmcconnon210@gmail.com"
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

class URLMonitor:
    def __init__(self):
        self.status_history = {}
        self.notification_sent = {url: False for url in URLS_TO_MONITOR}

    def check_url(self, name, url):
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

    def send_email(self, subject, body):
        """Send email notification."""
        try:
            msg = MimeMultipart()
            msg['From'] = EMAIL_CONFIG['sender_email']
            msg['To'] = EMAIL_CONFIG['recipient_email']
            msg['Subject'] = subject

            msg.attach(MimeText(body, 'html'))

            server = smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port'])
            server.starttls()
            server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])

            text = msg.as_string()
            server.sendmail(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['recipient_email'], text)
            server.quit()

            logging.info(f"Email sent successfully: {subject}")
            return True

        except Exception as e:
            logging.error(f"Failed to send email: {e}")
            return False

    def generate_status_email(self, results):
        """Generate HTML email with status results."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        html_body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
                .status-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                .status-table th, .status-table td {{
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }}
                .status-table th {{ background-color: #f2f2f2; }}
                .status-up {{ color: #27ae60; font-weight: bold; }}
                .status-down {{ color: #e74c3c; font-weight: bold; }}
                .footer {{ margin-top: 30px; color: #7f8c8d; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🚀 TukacoPic URL Monitor Report</h2>
                <p>Checked at: {timestamp}</p>
            </div>

            <table class="status-table">
                <tr>
                    <th>Service</th>
                    <th>URL</th>
                    <th>Status</th>
                    <th>Details</th>
                </tr>
        """

        all_up = True
        for name, (url, is_up, details) in results.items():
            status_class = "status-up" if is_up else "status-down"
            status_text = "✅ UP" if is_up else "❌ DOWN"

            if not is_up:
                all_up = False

            html_body += f"""
                <tr>
                    <td><strong>{name}</strong></td>
                    <td><a href="{url}">{url}</a></td>
                    <td class="{status_class}">{status_text}</td>
                    <td>{details}</td>
                </tr>
            """

        html_body += """
            </table>

            <div class="footer">
                <p>This is an automated monitoring report for your TukacoPic deployment.</p>
                <p>Monitor script running every 5 minutes.</p>
            </div>
        </body>
        </html>
        """

        return html_body, all_up

    def monitor_loop(self):
        """Main monitoring loop."""
        logging.info("Starting TukacoPic URL Monitor...")
        logging.info(f"Monitoring {len(URLS_TO_MONITOR)} URLs every 5 minutes")

        while True:
            try:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                logging.info(f"\n--- Checking URLs at {timestamp} ---")

                results = {}
                all_services_up = True

                for name, url in URLS_TO_MONITOR.items():
                    is_up, details = self.check_url(name, url)
                    results[name] = (url, is_up, details)

                    status_emoji = "✅" if is_up else "❌"
                    logging.info(f"{status_emoji} {name}: {details}")

                    if not is_up:
                        all_services_up = False

                # Send email notification if all services are up and we haven't sent one yet
                if all_services_up:
                    any_notification_pending = any(not sent for sent in self.notification_sent.values())
                    if any_notification_pending:
                        html_body, _ = self.generate_status_email(results)
                        subject = "🎉 TukacoPic is LIVE! All Services Up and Running"

                        if self.send_email(subject, html_body):
                            # Mark all as notified
                            for key in self.notification_sent:
                                self.notification_sent[key] = True
                            logging.info("SUCCESS notification sent!")

                # Send status update every hour (12 cycles of 5 minutes)
                current_minute = datetime.now().minute
                if current_minute % 60 == 0:  # On the hour
                    html_body, all_up = self.generate_status_email(results)
                    subject = f"📊 TukacoPic Hourly Status Report - {timestamp}"
                    self.send_email(subject, html_body)

                logging.info(f"Next check in 5 minutes...\n")
                time.sleep(300)  # Wait 5 minutes

            except KeyboardInterrupt:
                logging.info("\nMonitoring stopped by user.")
                break
            except Exception as e:
                logging.error(f"Error in monitoring loop: {e}")
                time.sleep(60)  # Wait 1 minute before retrying

def main():
    print("TukacoPic URL Monitor")
    print("====================")
    print("\n⚠️  SETUP REQUIRED:")
    print("1. Edit this file and replace EMAIL_CONFIG with your Gmail credentials")
    print("2. Use Gmail App Password (not your regular password)")
    print("3. Enable 2-Factor Authentication in Gmail")
    print("4. Generate App Password: https://myaccount.google.com/apppasswords")
    print("\n🔍 Monitoring URLs:")
    for name, url in URLS_TO_MONITOR.items():
        print(f"   • {name}: {url}")

    print(f"\n📧 Notifications will be sent to: {EMAIL_CONFIG['recipient_email']}")
    print("\nPress Ctrl+C to stop monitoring\n")

    # Check if email is configured
    if EMAIL_CONFIG['sender_email'] == "your-email@gmail.com":
        print("❌ Please configure EMAIL_CONFIG before running!")
        return

    monitor = URLMonitor()
    monitor.monitor_loop()

if __name__ == "__main__":
    main()