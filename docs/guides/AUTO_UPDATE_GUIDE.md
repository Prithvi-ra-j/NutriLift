# Automatic Updates Guide (OTA - Over-The-Air)

## ✅ Already Configured!

Your app is already set up for automatic updates using **Expo Updates**.

## How It Works

### For Users:
1. User opens the app
2. App checks for updates in background
3. If update available, downloads automatically
4. App restarts with new version
5. **No manual download needed!**

### For You (Developer):
1. Make code changes
2. Run `eas update` command
3. Update is published to Expo servers
4. All users get it automatically

## Publishing Updates

### Quick Update (Bug Fixes, UI Changes)
```bash
# Make your changes in code
# Then publish:
eas update --branch preview --message "Fixed nutrition logging bug"
```

### What This Does:
- ✅ Publishes JavaScript/React code changes
- ✅ Updates all users on "preview" channel
- ✅ Happens automatically when they open app
- ✅ No new APK needed

## Update Channels

You have 3 channels configured:

### 1. Development Channel
```bash
eas update --branch development --message "Testing new feature"
```
- For testing only
- Users with development builds get this

### 2. Preview Channel (Current)
```bash
eas update --branch preview --message "Bug fixes"
```
- For beta testers
- Your current APK uses this channel
- **Use this for now**

### 3. Production Channel
```bash
eas update --branch production --message "Stable release"
```
- For production/Play Store users
- Most stable version

## Example Workflow

### Scenario: Fix a Bug

1. **Fix the bug in code:**
   ```typescript
   // Fixed bug in nutrition.tsx
   ```

2. **Test locally:**
   ```bash
   npm start
   ```

3. **Publish update:**
   ```bash
   eas update --branch preview --message "Fixed macro calculation bug"
   ```

4. **Users get it automatically:**
   - Next time they open the app
   - Update downloads in ~5-10 seconds
   - App restarts
   - Bug is fixed!

## When You NEED a New APK

### Requires New Build:
- ❌ Changed app icon
- ❌ Added new native dependency (e.g., new camera library)
- ❌ Changed permissions
- ❌ Changed native configuration
- ❌ Updated Expo SDK version
- ❌ Changed app version number

### Can Use OTA Update:
- ✅ Fixed bugs in JavaScript code
- ✅ Changed UI/styling
- ✅ Added new screens
- ✅ Updated text/content
- ✅ Changed app logic
- ✅ Updated API calls

## Check Update Status

### See Published Updates:
```bash
eas update:list --branch preview
```

### See Which Update Users Have:
```bash
eas update:view [UPDATE_ID]
```

## Configure Update Behavior

### Current Configuration (in app.json):
```json
{
  "updates": {
    "url": "https://u.expo.dev/4d082b22-8f1b-4d8d-abd2-dfe2c41a172b"
  }
}
```

### Advanced: Check for Updates on Launch
Add to app.json:
```json
{
  "updates": {
    "url": "https://u.expo.dev/4d082b22-8f1b-4d8d-abd2-dfe2c41a172b",
    "checkAutomatically": "ON_LOAD",
    "fallbackToCacheTimeout": 0
  }
}
```

Options:
- `ON_LOAD` - Check every time app opens (default)
- `ON_ERROR_RECOVERY` - Only check if app crashes
- `NEVER` - Manual updates only

## Manual Update Check (In Code)

You can add a "Check for Updates" button:

```typescript
import * as Updates from 'expo-updates';

async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync(); // Restart app with new version
    } else {
      Alert.alert('Up to date', 'You have the latest version!');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to check for updates');
  }
}
```

## Best Practices

### 1. Use Descriptive Messages
```bash
# Good
eas update --branch preview --message "Fixed macro calculation rounding error"

# Bad
eas update --branch preview --message "update"
```

### 2. Test Before Publishing
Always test changes locally before publishing updates.

### 3. Use Channels Properly
- `development` - For active development
- `preview` - For beta testing (your current users)
- `production` - For stable releases

### 4. Version Your Updates
Keep track of what's in each update:
```bash
eas update --branch preview --message "v1.0.1 - Fixed nutrition logging bug"
```

## Rollback Updates

If an update causes issues:

```bash
# Publish previous working version
eas update --branch preview --message "Rollback to previous version"
```

Or republish a specific update:
```bash
eas update:republish --group [UPDATE_GROUP_ID]
```

## Current Setup Summary

✅ **Expo Updates:** Enabled
✅ **Update URL:** Configured
✅ **Channels:** development, preview, production
✅ **Current Channel:** preview

## Quick Commands

### Publish Update:
```bash
eas update --branch preview --message "Your message here"
```

### List Updates:
```bash
eas update:list --branch preview
```

### View Update Details:
```bash
eas update:view [UPDATE_ID]
```

### Delete Update:
```bash
eas update:delete [UPDATE_ID]
```

## Example: Publishing Your First Update

Let's say you want to change the app name in the More tab:

1. **Edit the file:**
   ```typescript
   // app/(tabs)/more.tsx
   <Text>MORE SETTINGS</Text> // Changed from "MORE"
   ```

2. **Publish update:**
   ```bash
   eas update --branch preview --message "Changed More tab title"
   ```

3. **Done!** Users will get it automatically next time they open the app.

## Monitoring Updates

### Check Update Adoption:
```bash
eas update:list --branch preview
```

Shows:
- How many users have each update
- When update was published
- Update message

## Important Notes

1. **First Install:** Users must install the APK once manually
2. **After That:** All updates are automatic (for JS/React changes)
3. **Native Changes:** Still require new APK build
4. **Instant Updates:** Updates apply on next app launch (usually within seconds)

---

## TL;DR - Quick Start

**To publish an update:**
```bash
# 1. Make your code changes
# 2. Run this command:
eas update --branch preview --message "What you changed"

# 3. Users get it automatically!
```

**That's it!** No need to rebuild APK for most changes. 🚀
