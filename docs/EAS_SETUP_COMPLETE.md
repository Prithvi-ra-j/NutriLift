# EAS Setup Guide - Complete the Setup

## ✅ What's Already Done

1. ✅ EAS CLI installed globally
2. ✅ `eas.json` created with preview profile (APK builds)
3. ✅ `expo-updates` package installed
4. ✅ `app.json` updated with required fields:
   - `owner`: "prithvi"
   - `runtimeVersion`: `{ "policy": "sdkVersion" }`
   - `updates` configuration added

---

## 🔧 Complete the Setup (Run These Commands)

### **Step 1: Login to Expo**

```bash
eas login
```

Enter your Expo account credentials (the one you created at expo.dev).

**Note**: If you don't have an account yet, create one at https://expo.dev/signup (it's free!)

---

### **Step 2: Initialize EAS Project**

```bash
eas init
```

This will:
- Link your project to your Expo account
- Create a project ID
- Update `app.json` with the project ID

---

### **Step 3: Configure OTA Updates**

```bash
eas update:configure
```

This will:
- Set up the update URL in `app.json`
- Configure the update channels

---

### **Step 4: Build Your First APK**

```bash
eas build -p android --profile preview
```

This will:
- Upload your code to Expo servers
- Build the APK in the cloud (takes 10-15 minutes)
- Provide a download link when complete

**Important**: The first build takes longer. Subsequent builds are faster.

---

### **Step 5: Download and Install APK**

1. When build completes, you'll get a download link
2. Download the APK to your computer
3. Transfer to your Samsung A52 (via USB, email, or cloud)
4. On phone: Settings → Security → Enable "Install from Unknown Sources"
5. Open the APK file and tap "Install"

---

## 🚀 Push OTA Updates (After First Install)

Once the APK is installed on your phone, you can push updates without rebuilding:

```bash
# Make your code changes, then:
eas update --branch preview --message "Added weekly summaries feature"
```

The app will automatically download and apply the update next time it's opened!

---

## 📋 Quick Reference

### **Build Commands**

```bash
# Preview build (for testing)
eas build -p android --profile preview

# Production build
eas build -p android --profile production

# Check build status
eas build:list
```

### **Update Commands**

```bash
# Push update to preview channel
eas update --branch preview --message "Your change description"

# Push update to production channel
eas update --branch production --message "Your change description"

# View update history
eas update:list
```

### **Useful Commands**

```bash
# View project info
eas project:info

# View build logs
eas build:view <build-id>

# Cancel a build
eas build:cancel
```

---

## 🔍 What Gets Updated OTA vs Requires Rebuild

### **OTA Updates Work For:**
- ✅ JavaScript/TypeScript code changes
- ✅ React components
- ✅ Business logic
- ✅ UI changes
- ✅ Database queries
- ✅ API calls
- ✅ Most bug fixes

### **Requires New Build:**
- ❌ Native code changes
- ❌ New native dependencies
- ❌ Changes to `app.json` (permissions, plugins, etc.)
- ❌ Changes to `eas.json`
- ❌ Expo SDK version upgrade

---

## 📱 Testing Updates on Your Phone

After pushing an update:

1. **Close the app completely** (swipe away from recent apps)
2. **Reopen the app**
3. App will check for updates on startup
4. Update downloads in background
5. Next time you open, new version is active

You can also force check for updates by adding a button in your app (optional).

---

## 🎯 Your Workflow

### **Initial Setup (One Time)**
```bash
eas login
eas init
eas update:configure
eas build -p android --profile preview
# Install APK on phone
```

### **Daily Development**
```bash
# Make code changes
# Test locally with: npm start

# When ready to push to phone:
eas update --branch preview --message "Fixed coach token limit"
```

### **Major Updates (Rare)**
```bash
# If you add new native dependencies or change app.json:
eas build -p android --profile preview
# Install new APK on phone
```

---

## 🔐 Environment Variables

Your `.env` file with `GROQ_API_KEY` needs to be configured for builds.

Add to `eas.json`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "channel": "preview",
      "env": {
        "GROQ_API_KEY": "your_groq_api_key_here"
      }
    }
  }
}
```

**Or** use EAS Secrets (more secure):

```bash
eas secret:create --scope project --name GROQ_API_KEY --value your_key_here
```

---

## 📊 Build Times

- **First build**: 15-20 minutes
- **Subsequent builds**: 10-15 minutes
- **OTA updates**: Instant (push in seconds, download on phone in ~10-30 seconds)

---

## 💡 Tips

1. **Use OTA updates for 90% of changes** - Much faster than rebuilding
2. **Test locally first** - Use `npm start` before pushing updates
3. **Write descriptive update messages** - Helps track what changed
4. **Keep APK for backup** - Save the APK file in case you need to reinstall
5. **Monitor build status** - Use `eas build:list` to check progress

---

## 🆘 Troubleshooting

### **"Build failed"**
- Check build logs: `eas build:view <build-id>`
- Common issues: Missing dependencies, syntax errors, configuration errors

### **"Update not downloading"**
- Make sure app is connected to internet
- Close and reopen app
- Check update channel matches build channel

### **"Login failed"**
- Reset password at expo.dev
- Try `eas logout` then `eas login` again

### **"Project not found"**
- Run `eas init` to link project
- Make sure you're in the correct directory

---

## 📚 Resources

- EAS Build: https://docs.expo.dev/build/introduction/
- EAS Update: https://docs.expo.dev/eas-update/introduction/
- Expo Forums: https://forums.expo.dev/

---

## ✅ Next Steps

Run these commands in order:

```bash
# 1. Login
eas login

# 2. Initialize project
eas init

# 3. Configure updates
eas update:configure

# 4. Build APK
eas build -p android --profile preview

# 5. Wait for build to complete (check status with: eas build:list)

# 6. Download APK and install on phone

# 7. Make changes and push updates:
eas update --branch preview --message "Your changes"
```

---

*Setup prepared: May 10, 2026*
*Ready for Samsung A52 installation*
