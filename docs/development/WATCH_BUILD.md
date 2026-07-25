# How to Watch EAS Build Progress in Terminal

## Current Build Status

**Build ID:** 96c1afdc-2f78-4bbf-b9cd-77799af55108
**Status:** In Progress
**Started:** 16/5/2026, 5:25:55 pm

## Commands to Monitor Build

### 1. Check Build Status (Quick)
```bash
eas build:list --platform android --limit 1
```
Shows the latest build status.

### 2. View Specific Build Details
```bash
eas build:view 96c1afdc-2f78-4bbf-b9cd-77799af55108
```
Shows detailed info about this specific build.

### 3. Watch Build in Real-Time (Next Time)
```bash
# Don't use --no-wait flag
eas build --platform android --profile preview
```
This will:
- Show upload progress
- Wait for build to start
- Display build phases as they complete
- Show final result

## Why We Can't Stream Logs

EAS Build runs on remote servers (not your machine), so:
- ❌ No real-time log streaming to terminal
- ✅ Can check status periodically
- ✅ Can view logs on website
- ✅ Can wait for build to complete (without --no-wait)

## Current Build Progress

You can check progress by running:
```bash
eas build:list --platform android --limit 1
```

Or wait for it to complete:
```bash
# This will wait and show result when done
eas build:view 96c1afdc-2f78-4bbf-b9cd-77799af55108
```

## Build Phases (What's Happening Now)

1. ✅ **Upload** - Project uploaded to EAS
2. ✅ **Queue** - Build queued on server
3. ⏳ **Install Dependencies** - Running `npm install`
4. ⏳ **Prebuild** - Generating native code
5. ⏳ **Run Gradle** - Building Android APK
6. ⏳ **Package** - Creating final APK
7. ⏳ **Upload Artifact** - Uploading APK for download

## Estimated Timeline

- **Total Time:** ~20-30 minutes
- **Started:** 5:25 PM
- **Expected Completion:** ~5:45-5:55 PM

## Check Build Status Now

Run this command to see current status:
```bash
cd "c:\Users\chava\Desktop\Nutrition OS\apex"
eas build:list --platform android --limit 1
```

## When Build Completes

You'll see one of these statuses:
- ✅ **finished** - Success! Download APK
- ❌ **errored** - Failed, check logs
- ⏸️ **canceled** - Build was canceled

## View Logs After Completion

### In Terminal:
```bash
eas build:view 96c1afdc-2f78-4bbf-b9cd-77799af55108
```

### On Website:
https://expo.dev/accounts/prithviraj_12/projects/apex/builds/96c1afdc-2f78-4bbf-b9cd-77799af55108

## Next Time: Watch Build Live

To see progress in terminal next time:
```bash
# Remove --no-wait flag
eas build --platform android --profile preview

# You'll see:
# ✓ Compressed project files
# ✓ Uploaded to EAS
# ⏳ Build in progress...
# ✓ Build finished!
```

## Alternative: Poll for Status

Create a simple script to check status every minute:
```bash
# Windows PowerShell
while ($true) {
  Clear-Host
  eas build:list --platform android --limit 1
  Start-Sleep -Seconds 60
}
```

Press Ctrl+C to stop polling.

---

**Current Status:** Build is running on EAS servers
**Check Status:** `eas build:list --platform android --limit 1`
**View Logs:** https://expo.dev/accounts/prithviraj_12/projects/apex/builds/96c1afdc-2f78-4bbf-b9cd-77799af55108
