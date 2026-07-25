# Web Support Setup Summary

## What Was Done

### 1. Fixed React Dependency Conflict
**Problem**: `react-dom@19.2.6` required `react@^19.2.6`, but the project had `react@19.1.0`

**Solution**: Upgraded React to 19.2.6
```bash
npm install react@19.2.6 react-dom@19.2.6 react-native-web@^0.21.0
```

### 2. Fixed SQLite Web Compatibility
**Problem**: `expo-sqlite` doesn't work on web (WASM module import error)

**Solution**: Made database client platform-aware
- Native platforms (iOS/Android): Use full SQLite implementation
- Web: Use chainable mock that returns empty results
- Location: `lib/db/client.ts`

### 3. Implemented Comprehensive Logging System
**Problem**: No way to track errors and debug issues

**Solution**: Created full-featured logging system

#### Features:
- **Native**: File-based logging with automatic cleanup (30-day retention)
- **Web**: localStorage-based logging with console interception
- **Error Boundary**: Catches React errors automatically
- **Log Viewer**: In-app UI to view and export logs
- **Auto-capture**: Unhandled errors and promise rejections

#### Files Created:
- `lib/logger.ts` - Main logging implementation
- `components/ErrorBoundary.tsx` - React error boundary
- `app/modals/view-logs.tsx` - Log viewer UI
- `LOGGING.md` - Complete documentation

#### Integration:
- Added to `app/_layout.tsx` with ErrorBoundary wrapper
- Added "View App Logs" button in More > Settings
- Logs app lifecycle events (startup, migrations, errors)

## How to Use

### Running on Web
```bash
npx expo start --web
```

### Viewing Logs
1. Open app
2. Go to **More** tab
3. Select **Settings**
4. Tap **View App Logs**

### Using Logger in Code
```typescript
import { logger } from "../lib/logger";

logger.info("Something happened");
logger.warn("Warning message", { context: "data" });
logger.error("Error occurred", { error: err.message });
logger.debug("Debug info", { userId: 123 });
```

## Current Limitations on Web

1. **No Data Persistence**: Database operations return empty results
   - Food logs won't save
   - Workout logs won't save
   - Body stats won't save

2. **Mock Database**: All queries return `[]` or `{ rowsAffected: 0 }`

3. **UI Will Load**: The app will render but won't have any data

## Future Improvements for Full Web Support

To make the app fully functional on web, you would need to:

1. **Implement Web Storage**:
   - Use IndexedDB for structured data
   - Use localStorage for simple key-value pairs
   - Create a web-specific database adapter

2. **Alternative Approach**:
   - Use a backend API
   - Store data in cloud (Firebase, Supabase, etc.)
   - Sync between native and web

3. **Hybrid Approach**:
   - Keep SQLite for native
   - Use IndexedDB for web
   - Abstract database layer to support both

## Files Modified

1. `package.json` - Updated React versions
2. `lib/db/client.ts` - Platform-aware database client
3. `app/_layout.tsx` - Added ErrorBoundary and logging
4. `app/(tabs)/more.tsx` - Added "View Logs" button
5. `components/ErrorBoundary.tsx` - New file
6. `lib/logger.ts` - New file
7. `app/modals/view-logs.tsx` - New file

## Testing

### On Web
- App loads without SQLite errors ✅
- Logs are captured to localStorage ✅
- Error boundary catches React errors ✅
- Log viewer works ✅
- Export logs works ✅

### On Native (iOS/Android)
- SQLite works normally ✅
- Logs saved to files ✅
- 30-day cleanup works ✅
- Share logs works ✅

## Notes

- The web version is primarily for **development and testing**
- The app is designed for **native mobile use**
- All core features require SQLite (native only)
- Logging works on all platforms
- Error tracking is comprehensive

## Dependencies Added

```json
{
  "react": "19.2.6",
  "react-dom": "19.2.6",
  "react-native-web": "^0.21.0",
  "expo-file-system": "latest"
}
```

## Quick Reference

### Start Web Server
```bash
npx expo start --web
```

### View Logs (Web)
- Open browser console
- Or use in-app viewer: More > Settings > View App Logs

### Export Logs (Web)
- In-app viewer > Share icon > Downloads as .txt file

### View Logs (Native)
- More > Settings > View App Logs > Share icon

### Clear Logs (Web Only)
- In-app viewer > Trash icon

---

**Status**: ✅ Web support enabled with comprehensive logging
**Date**: May 9, 2026
**Version**: Apex v1.0
