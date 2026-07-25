# Testing Cheatsheet

## 🚀 Quick Commands

```bash
# Native
npm run android          # Android emulator
npm run ios             # iOS simulator

# Web
npm run web             # Browser (localhost:8081)
npx expo start --web    # Alternative

# General
npm start               # Show QR code for physical device
```

## 📱 Form Factor Testing (Web)

### Open DevTools
- **Windows/Linux**: `F12` or `Ctrl+Shift+I`
- **Mac**: `Cmd+Option+I`

### Toggle Device Toolbar
- **Windows/Linux**: `Ctrl+Shift+M`
- **Mac**: `Cmd+Shift+M`

### Quick Device Sizes

| Device | Width | Height | Use Case |
|--------|-------|--------|----------|
| iPhone SE | 375 | 667 | Small phone |
| iPhone 12 Pro | 390 | 844 | Standard phone |
| iPhone 14 Pro Max | 430 | 932 | Large phone |
| iPad | 768 | 1024 | Small tablet |
| iPad Pro 11" | 834 | 1194 | Tablet |
| iPad Pro 12.9" | 1024 | 1366 | Large tablet |
| Desktop | 1920 | 1080 | Standard desktop |

## 🎯 What to Test Where

### ✅ Test on Native (iOS/Android)

- [ ] Food logging (data persists)
- [ ] Workout logging (data persists)
- [ ] Body stats (data persists)
- [ ] Progress charts (real data)
- [ ] Monthly reports (real data)
- [ ] Performance (smooth scrolling)
- [ ] Gestures (swipe, pinch, etc.)
- [ ] Offline functionality
- [ ] Push notifications
- [ ] Camera/photo access

### ✅ Test on Web

- [ ] UI layout (looks correct)
- [ ] Responsive design (different sizes)
- [ ] Color schemes (correct colors)
- [ ] Typography (fonts load)
- [ ] Navigation (routes work)
- [ ] Buttons (clickable)
- [ ] Forms (inputs work)
- [ ] Modals (open/close)
- [ ] Error messages (display correctly)
- [ ] Loading states (show correctly)

### ❌ Don't Test on Web

- [ ] Data persistence (won't work)
- [ ] Database queries (mock only)
- [ ] Long-term data (will be lost)
- [ ] Performance (not accurate)
- [ ] Native features (camera, etc.)

## 🔍 Debugging

### View Logs

**In-App (Both Platforms):**
1. More tab
2. Settings section
3. View App Logs

**Web Console:**
```javascript
// Check device info
console.log(window.innerWidth, window.innerHeight);

// Check logs
localStorage.getItem('apex_logs');

// Clear logs
localStorage.removeItem('apex_logs');
```

**Native Console:**
```bash
# Android
adb logcat | grep -i "apex"

# iOS
# Use Xcode console
```

## 🎨 Responsive Testing Workflow

### 1. Mobile First (Native)
```bash
npm run android
# Test on phone simulator
# Verify everything works
```

### 2. Mobile Web
```bash
npm run web
# DevTools → Device toolbar
# Select: iPhone 12 Pro
# Verify UI matches native
```

### 3. Tablet Web
```bash
# Already running web
# DevTools → Device toolbar
# Select: iPad Pro
# Check for stretched UI
```

### 4. Desktop Web
```bash
# Already running web
# DevTools → Responsive mode
# Set: 1920x1080
# Check for very stretched UI
```

## 📊 Data Testing

### Native (Real Data)
```typescript
// Log food
await db.insert(foodLogs).values({...});
// ✅ Saved to SQLite

// Close app, reopen
const logs = await db.select().from(foodLogs);
// ✅ Data still there
```

### Web (Mock Data)
```typescript
// Log food
await db.insert(foodLogs).values({...});
// ⚠️ Mock returns success (but doesn't save)

// Refresh page
const logs = await db.select().from(foodLogs);
// ❌ Empty array (data was never saved)
```

## 🛠️ Common Issues

### Issue: Web shows empty data
**Solution:** This is expected! Web uses mock database.

### Issue: UI looks stretched on tablet
**Solution:** Use responsive utilities from `lib/responsive.ts`

### Issue: Logs not appearing
**Solution:** 
- Native: Check file permissions
- Web: Check localStorage is enabled

### Issue: Hot reload not working
**Solution:**
```bash
# Clear cache
npx expo start --clear

# Or restart
# Ctrl+C, then npm start
```

### Issue: TypeScript errors
**Solution:**
```bash
# Restart TS server in VS Code
# Cmd/Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

## 📱 Physical Device Testing

### Android
```bash
# 1. Enable USB debugging on phone
# 2. Connect via USB
# 3. Run:
npm run android

# Or scan QR code:
npm start
# Scan with Expo Go app
```

### iOS
```bash
# 1. Install Expo Go from App Store
# 2. Run:
npm start
# 3. Scan QR code with Camera app
```

## 🎯 Quick Checks

### Before Committing Code

- [ ] Test on native (Android or iOS)
- [ ] Verify data persists
- [ ] Check for console errors
- [ ] Test main user flows
- [ ] Check logs for errors

### Before Showing to Others

- [ ] Test on native
- [ ] Test on web (mobile view)
- [ ] Check responsive design
- [ ] Verify no console errors
- [ ] Test all main features

### Before Release

- [ ] Test on real Android device
- [ ] Test on real iOS device
- [ ] Test all features with real data
- [ ] Check performance
- [ ] Review logs for errors
- [ ] Test offline functionality

## 🔧 Useful Code Snippets

### Check Platform
```typescript
import { Platform } from "react-native";

if (Platform.OS === "web") {
  console.log("Running on web");
} else {
  console.log("Running on native");
}
```

### Check Device Size
```typescript
import { getDeviceType, getDeviceDimensions } from "../lib/responsive";

console.log("Device:", getDeviceType());
console.log("Size:", getDeviceDimensions());
```

### Log with Context
```typescript
import { logger } from "../lib/logger";

logger.info("User action", { 
  action: "login", 
  userId: 123 
});
```

### Check if Data Persists
```typescript
// Add this to any screen
useEffect(() => {
  console.log("Platform:", Platform.OS);
  console.log("Data will persist:", Platform.OS !== "web");
}, []);
```

## 📚 Documentation Quick Links

- `RESPONSIVE_TESTING_GUIDE.md` - Full responsive guide
- `WEB_VS_NATIVE_COMPARISON.md` - Detailed comparison
- `LOGGING.md` - Logging documentation
- `QUICK_START.md` - Getting started
- `WEB_SETUP_SUMMARY.md` - Web setup details

## 🎬 TL;DR

**For Real Testing:**
```bash
npm run android  # or npm run ios
# Everything works, data persists ✅
```

**For UI/Responsive Testing:**
```bash
npm run web
# DevTools → Device toolbar
# Test different sizes ✅
# Data won't persist ⚠️
```

**For Debugging:**
```bash
npm run web
# F12 → Console
# Easy debugging ✅
```

---

**Remember:** Native = Real app, Web = Testing tool! 🚀
