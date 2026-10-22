# Mobile Notification Setup Guide

## 📱 Android Setup

### Chrome (Android)
1. Open the website in Chrome browser
2. Tap the menu (three dots) → "Add to Home Screen" or "Install App"
3. Open the app from your home screen
4. Go to Admin Panel → Overview
5. Click "ENABLE" button for push notifications
6. Allow notifications when prompted

### Samsung Internet
1. Open website in Samsung Internet
2. Tap menu → "Add page to"
3. Select "Home screen"
4. Open from home screen
5. Enable notifications in Admin Panel

## 🍎 iOS (iPhone/iPad) Setup - IMPORTANT!

iOS has strict requirements for push notifications:

### Step 1: Add to Home Screen
1. **Open ONLY in Safari browser** (not Chrome or other browsers)
2. Tap the **Share button** (square with arrow) at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right
5. The app icon will appear on your home screen

### Step 2: Open from Home Screen
1. **Close Safari completely**
2. **Tap the app icon** from your home screen (NOT from Safari)
3. The app will open in standalone mode (full screen)

### Step 3: Enable Notifications
1. Go to Admin Panel → Overview
2. Click **"ENABLE"** button for push notifications
3. Allow notifications when iOS prompts you
4. Test with "Test Phone Notification" button

### Step 4: iOS Settings (if needed)
1. Go to iPhone **Settings** → **Notifications**
2. Find **"MS Velora"** in the list
3. Enable:
   - ✅ Allow Notifications
   - ✅ Lock Screen
   - ✅ Notification Center
   - ✅ Banners (Alerts)
   - ✅ Sounds
   - ✅ Badges

## 🔧 Troubleshooting

### iOS: "Add to Home Screen" option not showing
- Make sure you're using **Safari browser only**
- Make sure the page is fully loaded
- Try refreshing the page first

### Android: Notifications not appearing
- Check Chrome Settings → Site Settings → Notifications
- Ensure MS Velora is allowed
- Check Android Settings → Apps → Chrome → Notifications

### Still not working?
1. Ensure you're on **localhost** (not in incognito mode)
2. Check if Service Worker is registered (open DevTools → Application → Service Workers)
3. Try clearing browser cache and starting fresh
4. Make sure VAPID keys are in .env file

## 🎯 Testing After Setup

Once setup is complete:
1. Click "Test Phone Notification" button in Admin Panel
2. You should receive a test notification
3. Check lock screen to verify it works when locked
4. Close the app and try again to test background notifications

## 📱 Quick Checklist

- [ ] Using correct browser (Safari for iOS, Chrome for Android)
- [ ] Added to Home Screen
- [ ] Opening from Home Screen (not browser)
- [ ] Clicked ENABLE button in Admin Panel
- [ ] Allowed notification permissions
- [ ] Tested with "Test Phone Notification" button
- [ ] Verified notifications work when app is closed
