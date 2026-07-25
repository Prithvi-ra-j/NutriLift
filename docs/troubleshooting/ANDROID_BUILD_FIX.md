# Android Build Failure - Troubleshooting Guide

## Changes Made

### 1. ✅ Disabled New Architecture
Changed `newArchEnabled: true` → `false` in `app.json`

**Why:** The new React Native architecture can cause compatibility issues with certain native modules, especially:
- `react-native-html-to-pdf`
- `react-native-worklets`
- Some Expo modules

### 2. ✅ Removed Deprecated Package
Removed `expo-barcode-scanner` from `package.json`

**Why:** This package is deprecated and can cause build failures. Use `expo-camera` with barcode scanning instead.

### 3. ✅ Enhanced EAS Build Configuration
Added to all build profiles in `eas.json`:
```json
{
  "gradleCommand": ":app:assembleRelease", // or assembleDebug for dev
  "env": {
    "EXPO_NO_CAPABILITY_SYNC": "1"
  }
}
```

**Why:** 
- Explicit Gradle commands help avoid build ambiguity
- `EXPO_NO_CAPABILITY_SYNC` prevents capability sync issues that can cause builds to fail

## Next Steps

### Step 1: Clean Install Dependencies
```bash
cd "c:\Users\chava\Desktop\Nutrition OS\apex"
rm -rf node_modules package-lock.json
npm install
```

### Step 2: Commit Changes
```bash
git add .
git commit -m "fix: disable new architecture and update build config for Android"
git push
```

### Step 3: Rebuild on EAS
```bash
eas build --platform android --profile preview
```

## If Build Still Fails

### Check the Logs for These Common Issues:

#### 1. **Memory Issues**
Error: `Expiring Daemon because JVM heap space is exhausted`

**Fix:** Add to `eas.json` under android:
```json
"android": {
  "buildType": "apk",
  "resourceClass": "large"
}
```

#### 2. **Gradle Version Issues**
Error: `Could not determine java version`

**Fix:** Add `android/gradle.properties` (if you have an android folder):
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m
```

#### 3. **Native Module Compatibility**
Error: `Task :react-native-html-to-pdf:compileDebugJavaWithJavac FAILED`

**Fix:** Consider removing `react-native-html-to-pdf` if not critical:
```bash
npm uninstall react-native-html-to-pdf
```

Then use an alternative like `expo-print` or `react-native-pdf-lib`.

#### 4. **Worklets Issues**
Error related to `react-native-worklets`

**Fix:** This is required by `victory-native`. If you see errors:
```bash
npm install react-native-worklets@latest
```

Or consider using a different charting library.

### Alternative: Use Development Build

If production builds keep failing, try a development build first:
```bash
eas build --platform android --profile development
```

Development builds are more forgiving and can help identify specific issues.

## Monitoring the Build

Watch the build progress:
```bash
eas build:list
```

View specific build logs:
```bash
eas build:view [BUILD_ID]
```

## Common Expo SDK 54 Issues

1. **React Native 0.81.5** - Very new, some packages may not be compatible
2. **New Architecture** - Many packages don't support it yet
3. **Gradle 8.x** - Some native modules need updates

## If All Else Fails

### Option 1: Downgrade Expo SDK
```bash
npm install expo@~53.0.0
npx expo install --fix
```

### Option 2: Create Minimal Build
Temporarily remove problematic dependencies:
- `react-native-html-to-pdf`
- `react-native-worklets` (and `victory-native`)
- Any other native modules

Build successfully, then add them back one by one.

## Resources

- [Expo Build Logs](https://expo.dev/accounts/prithviraj_12/projects/apex/builds)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
- [Expo SDK 54 Release Notes](https://expo.dev/changelog/2024/12-12-sdk-54)
- [React Native New Architecture](https://reactnative.dev/docs/new-architecture-intro)
