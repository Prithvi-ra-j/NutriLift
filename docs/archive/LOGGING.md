# Apex Logging System

## Overview

The Apex app now includes a comprehensive logging system that captures all errors, warnings, and debug information to help track issues and debug problems.

## Features

### 📱 Native (iOS/Android)
- **File-based logging**: All logs are saved to timestamped files in the device's document directory
- **Automatic cleanup**: Logs older than 30 days are automatically deleted
- **Persistent storage**: Logs survive app restarts
- **Location**: `{DocumentDirectory}/logs/app-YYYY-MM-DD_HH-MM-SS.log`

### 🌐 Web
- **localStorage logging**: Logs are saved to browser's localStorage
- **Console interception**: All console.log, console.warn, console.error, and console.debug calls are captured
- **Error tracking**: Unhandled errors and promise rejections are automatically logged
- **Export capability**: Download logs as a text file
- **Storage limit**: Keeps last 1000 log entries

## Usage

### In Your Code

```typescript
import { logger } from "../lib/logger";

// Log levels
logger.info("User logged in successfully");
logger.warn("API response took longer than expected", { duration: 5000 });
logger.error("Failed to fetch data", { error: error.message, stack: error.stack });
logger.debug("Debug info", { userId: 123, action: "click" });
```

### Viewing Logs

1. Open the app
2. Navigate to **More** tab
3. Select **Settings** section
4. Tap **View App Logs**

### Exporting Logs

#### On Native (iOS/Android)
- Tap the share icon in the logs viewer
- Share via any installed app (Messages, Email, etc.)

#### On Web
- Click the share icon to download logs as a text file
- Click the trash icon to clear all logs

## Log Format

Each log entry includes:
```
[2026-05-09T14:30:45.123Z] [ERROR] Failed to load nutrition data
Context: {"userId": "123", "date": "2026-05-09"}
Stack: Error: Network request failed
    at fetchNutrition (nutrition.ts:45)
    ...
```

## Error Boundary

The app includes a React Error Boundary that:
- Catches all React component errors
- Logs them automatically
- Shows a user-friendly error screen
- Allows users to retry

## Automatic Error Capture (Web Only)

On web, the following are automatically captured:
- Unhandled JavaScript errors
- Unhandled promise rejections
- All console.log/warn/error/debug calls

## File Structure

```
lib/
  logger.ts              # Main logging implementation
components/
  ErrorBoundary.tsx      # React error boundary component
app/
  modals/
    view-logs.tsx        # Log viewer UI
  _layout.tsx            # Error boundary integration
```

## Best Practices

1. **Use appropriate log levels**:
   - `info`: General information (user actions, successful operations)
   - `warn`: Warnings that don't break functionality
   - `error`: Errors that need attention
   - `debug`: Detailed debugging information

2. **Include context**: Always pass relevant context as the second parameter
   ```typescript
   logger.error("API call failed", {
     endpoint: "/api/nutrition",
     statusCode: 500,
     userId: currentUser.id
   });
   ```

3. **Don't log sensitive data**: Avoid logging passwords, tokens, or personal information

4. **Use structured data**: Pass objects instead of concatenating strings
   ```typescript
   // Good
   logger.info("User action", { action: "login", userId: 123 });
   
   // Avoid
   logger.info(`User ${userId} performed action login`);
   ```

## Troubleshooting

### Logs not appearing on native
- Check that `expo-file-system` is installed
- Verify app has file system permissions
- Check device storage space

### Logs not appearing on web
- Check browser console for errors
- Verify localStorage is not disabled
- Check if localStorage quota is exceeded

### Can't export logs
- On native: Ensure device has sharing capabilities
- On web: Check browser download permissions

## Storage Management

### Native
- Logs are stored in: `{DocumentDirectory}/logs/`
- Old logs (>30 days) are automatically deleted
- Each log file is named: `app-YYYY-MM-DD_HH-MM-SS.log`

### Web
- Logs are stored in: `localStorage` under key `apex_logs`
- Maximum 1000 entries kept (oldest are removed)
- Clear manually via the logs viewer

## Future Enhancements

Potential improvements:
- Remote log uploading to a server
- Log filtering and search
- Performance metrics tracking
- Crash reporting integration
- Log level configuration
- Export to different formats (JSON, CSV)
