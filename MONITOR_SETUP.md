# TukacoPic URL Monitor Setup

I've created two monitoring scripts for your TukacoPic deployment:

## 🚀 Quick Start (No Email)

For immediate monitoring without email setup:

```bash
pip install requests
python simple_monitor.py
```

This will:
- Check all 4 URLs every 5 minutes
- Log results to console and `url_monitor.log`
- Give you a big success message when everything is up!

## 📧 Full Version (With Email Notifications)

For email notifications when your site is live:

### 1. Install Dependencies
```bash
pip install -r monitor_requirements.txt
```

### 2. Setup Gmail App Password

**Important**: You need a Gmail App Password (not your regular password)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Factor Authentication** if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Generate a new app password for "Mail"
5. Copy the 16-character password (like: `abcd efgh ijkl mnop`)

### 3. Configure Email Settings

Edit `url_monitor.py` and update the `EMAIL_CONFIG` section:

```python
EMAIL_CONFIG = {
    "smtp_server": "smtp.gmail.com",
    "smtp_port": 587,
    "sender_email": "your-gmail@gmail.com",        # Your Gmail address
    "sender_password": "abcd efgh ijkl mnop",       # Your 16-char app password
    "recipient_email": "aidanmcconnon210@gmail.com"
}
```

### 4. Run the Monitor
```bash
python url_monitor.py
```

## 📊 What Gets Monitored

Both scripts monitor these URLs every 5 minutes:

1. **Frontend (Cloud Run)**: `https://tukacopic-frontend-677567505225.africa-south1.run.app`
2. **Backend API (Cloud Run)**: `https://tukacopic-backend-677567505225.africa-south1.run.app/api/leaderboard/`
3. **Frontend (Custom Domain)**: `https://tukacopic.aether-lab.xyz`
4. **Backend API (Custom Domain)**: `https://api.tukacopic.aether-lab.xyz/api/leaderboard/`

## 🎯 Success Criteria

- **Frontend**: HTTP 200 with HTML content
- **Backend API**: HTTP 200 or 400 (400 is OK - just means ALLOWED_HOSTS needs the custom domain)

## 📧 Email Notifications

The full version sends:
- **Success Email**: When all services are up for the first time
- **Hourly Reports**: Status summary every hour

## 🔍 Current Status

Your SSL certificates are still provisioning. Expect:
- ✅ Cloud Run URLs: Should work immediately
- ⏳ Custom Domain URLs: Will work once SSL certificates finish (15min-2hrs)

## 🛑 Stopping the Monitor

Press `Ctrl+C` to stop monitoring at any time.

## 📝 Log Files

All activity is logged to `url_monitor.log` for your records.