# Build and Install Guide - Apex App

## Overview

This guide explains how to build and install the Apex app on your Android phone. There are two methods:

1. **Development Build** (Recommended for testing) - Install via Expo Go or Development Build
2. **Production Build** (For final release) - Create APK/AAB for installation

---

## Method 1: Development Build (Fastest - Recommended)

### **Prerequisites**
- Android phone with USB debugging enabled
- USB cable to connect phone to computer
- Expo Go app installed on phone (optional)

### **Step 1: Enable USB Debugging on Phone**

1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times to enable Developer Options
3. Go back to **Settings** → **Developer Options**
4. Enable **USB Debugging**
5. Connect phone to computer via USB
6. Accept the "Allow USB Debugging" prompt on phone

### **Step 2: Install on Phone**

Open terminal in the project directory and run:

```bash
# Start the development server
npm start

# Or directly run on Android
npm run android
```

This will:
- Start the Metro bundler
- Install the app on your connected phone
- Launch the app automatically

### **Alternative: Use Expo Go (No USB Required)**

1. Install **Expo Go** from Google Play Store on your phone
2. Run `npm start` on your computer
3. Scan the QR code with Expo Go app
4. App will load on your phone

**Note**: Expo Go has limitations with native modules. Development build is better.

---

## Method 2: Production Build (APK/AAB)

### **Prerequisites**
- EAS CLI installed: `npm install -g eas-cli`
- Expo account (free): https://expo.dev/signup

### **Step 1: Install EAS CLI**

```bash
npm install -g eas-cli
```

### **Step 2: Login to Expo**

```bash
eas login
```

### **Step 3: Configure EAS Build**

Create `eas.json` in project root:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### **Step 4: Build APK**

```bash
# For development/testing
eas build --platform android --profile preview

# For production
eas build --platform android --profile production
```

This will:
- Upload your code to Expo servers
- Build the APK in the cloud
- Provide a download link when complete (usually 10-15 minutes)

### **Step 5: Install APK on Phone**

1. Download the APK from the link provided by EAS
2. Transfer APK to your phone (via USB, email, or cloud storage)
3. On phone, go to **Settings** → **Security** → Enable **Install from Unknown Sources**
4. Open the APK file on phone
5. Tap **Install**

---

## Method 3: Local APK Build (No Cloud Required)

### **Prerequisites**
- Android Studio installed
- Android SDK configured
- Java JDK installed

### **Step 1: Generate Android Project**

```bash
npx expo prebuild --platform android
```

This creates the `android/` folder with native Android project.

### **Step 2: Build APK Locally**

```bash
cd android
./gradlew assembleRelease
```

The APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### **Step 3: Install on Phone**

Transfer the APK to your phone and install as described above.

---

## Quick Start (Recommended for You)

Since you're developing and testing, use **Method 1**:

```bash
# 1. Connect phone via USB
# 2. Enable USB debugging on phone
# 3. Run this command:
npm run android
```

The app will install and launch on your phone automatically!

---

## Troubleshooting

### **"Device not found"**
- Make sure USB debugging is enabled
- Try different USB cable
- Run `adb devices` to check if phone is detected

### **"Build failed"**
- Clear cache: `npx expo start -c`
- Delete node_modules: `rm -rf node_modules && npm install`
- Check for errors in terminal

### **"App crashes on startup"**
- Check if `.env` file exists with GROQ_API_KEY
- Check terminal for error logs
- Try clearing app data on phone

### **"Cannot connect to Metro bundler"**
- Make sure phone and computer are on same WiFi
- Check firewall settings
- Try USB connection instead

---

## Environment Variables

Before building, make sure your `.env` file is configured:

```env
GROQ_API_KEY=your_groq_api_key_here
```

**Important**: For production builds, you may need to configure environment variables in `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "GROQ_API_KEY": "your_key_here"
      }
    }
  }
}
```

---

## Build Sizes

- **Development Build**: ~50-80 MB
- **Production Build (APK)**: ~30-50 MB
- **Production Build (AAB)**: ~25-40 MB (for Play Store)

---

## Next Steps After Installation

1. **Open the app** on your phone
2. **Grant permissions** (camera, microphone, storage)
3. **Check database migration** - should run automatically on first launch
4. **Test basic features**:
   - Log food
   - Log workout
   - Ask coach a question
5. **Load dummy data** (optional) - for testing with sample data

---

## For Play Store Release

If you want to publish to Google Play Store:

1. **Create Google Play Developer account** ($25 one-time fee)
2. **Build AAB** (Android App Bundle):
   ```bash
   eas build --platform android --profile production
   ```
3. **Upload to Play Store Console**
4. **Fill in store listing** (description, screenshots, etc.)
5. **Submit for review**

---

## Summary

**For Development/Testing** (Fastest):
```bash
npm run android
```

**For Sharing with Others** (APK):
```bash
eas build --platform android --profile preview
```

**For Play Store** (AAB):
```bash
eas build --platform android --profile production
```

---

## Need Help?

- Expo Documentation: https://docs.expo.dev/
- EAS Build: https://docs.expo.dev/build/introduction/
- React Native: https://reactnative.dev/

---

*Last updated: May 10, 2026*
