# Quick Start Guide - Apex with Logging

## ✅ What's New

Your Apex app now has:
1. **Web support** - Run in browser for testing
2. **Comprehensive logging** - Track all errors and events
3. **Error boundary** - Graceful error handling
4. **Log viewer** - View and export logs from within the app

## 🚀 Running the App

### Native (iOS/Android)
```bash
# Android
npm run android

# iOS
npm run ios
```

### Web (New!)
```bash
npm run web
# or
npx expo start --web
```

## 📊 Viewing Logs

### Method 1: In-App Viewer
1. Open Apex
2. Tap **More** tab (bottom navigation)
3. Tap **Settings** (top tabs)
4. Scroll down and tap **View App Logs**
5. Use share icon to export logs

### Method 2: Browser Console (Web Only)
- Open browser DevTools (F12)
- Check Console tab
- All logs appear there too

### Method 3: Device Files (Native Only)
- Logs stored in: `{DocumentDirectory}/logs/`
- Named: `app-YYYY-MM-DD_HH-MM-SS.log`
- Access via file manager or iTunes/Finder

## 🔍 What Gets Logged

### Automatically Logged:
- ✅ App startup and initialization
- ✅ Database migrations
- ✅ All console.log/warn/error calls (web)
- ✅ Unhandled errors (web)
- ✅ Unhandled promise rejections (web)
- ✅ React component errors (all platforms)

### You Can Log:
```typescript
import { logger } from "../lib/logger";

logger.info("User action", { action: "login" });
logger.warn("Slow response", { duration: 5000 });
logger.error("Failed to save", { error: err.message });
logger.debug("Debug data", { userId: 123 });
```

## 🌐 Web Limitations

The web version is for **development/testing only**:
- ❌ No data persistence (SQLite doesn't work on web)
- ❌ Food logs won't save
- ❌ Workout logs won't save
- ❌ Body stats won't save
- ✅ UI loads and renders
- ✅ Logging works perfectly
- ✅ Error tracking works

## 📱 Native Features (Full)

Everything works on native:
- ✅ SQLite database
- ✅ Data persistence
- ✅ All features functional
- ✅ File-based logging
- ✅ 30-day log retention

## 🛠️ Troubleshooting

### Web won't start
```bash
# Clear cache and restart
npx expo start --web --clear
```

### Logs not appearing
- Check that app initialized successfully
- Look for errors in console
- Try refreshing the logs viewer

### Database errors on web
- This is expected! Web uses mock database
- Check `WEB_SETUP_SUMMARY.md` for details

### TypeScript errors
```bash
# Restart TypeScript server
# In VS Code: Cmd/Ctrl + Shift + P > "TypeScript: Restart TS Server"
```

## 📚 Documentation

- `LOGGING.md` - Complete logging documentation
- `WEB_SETUP_SUMMARY.md` - Web setup details
- `.logs` - Logs directory reference

## 🎯 Common Tasks

### Export logs for debugging
1. More > Settings > View App Logs
2. Tap share icon
3. Send via email/message

### Clear web logs
1. More > Settings > View App Logs
2. Tap trash icon (web only)

### Add logging to your code
```typescript
import { logger } from "../lib/logger";

// In any component or function
try {
  await someOperation();
  logger.info("Operation successful");
} catch (error) {
  logger.error("Operation failed", {
    error: error.message,
    stack: error.stack
  });
}
```

### Check log files (native)
```typescript
import { logger } from "../lib/logger";

// Get current log file path
const path = await logger.getLogFilePath();
console.log("Logs at:", path);

// Get all log files
const allLogs = await logger.getAllLogFiles();
console.log("All logs:", allLogs);
```

## 🔐 Security Notes

- Don't log passwords or tokens
- Don't log personal information
- Logs are stored locally (not sent anywhere)
- Web logs are in localStorage (not encrypted)

## 📞 Support

If you encounter issues:
1. Check the logs first (More > Settings > View App Logs)
2. Export and review the log file
3. Check `LOGGING.md` for detailed documentation
4. Look for error patterns in the logs

## 🎉 You're All Set!

Your app now has professional-grade logging and error tracking. Every error, warning, and important event is captured with timestamps and context.

**Happy coding!** 🚀
