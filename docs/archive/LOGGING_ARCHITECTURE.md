# Logging Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         APEX APP                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Error Boundary                         │  │
│  │  (Catches React component errors)                        │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │                                                     │ │  │
│  │  │              App Components                         │ │  │
│  │  │                                                     │ │  │
│  │  │  • Home Screen                                      │ │  │
│  │  │  • Nutrition Screen                                 │ │  │
│  │  │  • Workout Screen                                   │ │  │
│  │  │  • Progress Screen                                  │ │  │
│  │  │  • More Screen                                      │ │  │
│  │  │                                                     │ │  │
│  │  │  All components can use:                           │ │  │
│  │  │  logger.info()                                     │ │  │
│  │  │  logger.warn()                                     │ │  │
│  │  │  logger.error()                                    │ │  │
│  │  │  logger.debug()                                    │ │  │
│  │  │                                                     │ │  │
│  │  └──────────────┬──────────────────────────────────┘ │  │
│  │                 │                                       │  │
│  │                 │ Errors caught automatically           │  │
│  │                 ▼                                       │  │
│  │         ┌───────────────┐                              │  │
│  │         │ Error Handler │                              │  │
│  │         └───────┬───────┘                              │  │
│  │                 │                                       │  │
│  └─────────────────┼───────────────────────────────────────┘  │
│                    │                                           │
│                    ▼                                           │
│         ┌──────────────────────┐                              │
│         │   Logger Service     │                              │
│         │   (lib/logger.ts)    │                              │
│         └──────────┬───────────┘                              │
│                    │                                           │
│         ┌──────────┴──────────┐                               │
│         │                     │                               │
│         ▼                     ▼                               │
│  ┌─────────────┐      ┌─────────────┐                        │
│  │   Native    │      │     Web     │                        │
│  │  Platform   │      │  Platform   │                        │
│  └──────┬──────┘      └──────┬──────┘                        │
│         │                    │                                │
└─────────┼────────────────────┼────────────────────────────────┘
          │                    │
          ▼                    ▼
   ┌─────────────┐      ┌──────────────┐
   │ File System │      │ localStorage │
   │             │      │              │
   │ logs/       │      │ apex_logs    │
   │ app-*.log   │      │ (JSON array) │
   └─────────────┘      └──────────────┘
```

## Data Flow

### Native Platform (iOS/Android)

```
User Action / Error
       │
       ▼
logger.error("message", context)
       │
       ▼
Format log entry
  • Timestamp
  • Level
  • Message
  • Context
  • Stack trace
       │
       ▼
expo-file-system
       │
       ▼
Write to file
{DocumentDirectory}/logs/app-2026-05-09_14-30-45.log
       │
       ▼
Automatic cleanup
(Delete logs > 30 days)
```

### Web Platform

```
User Action / Error
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
logger.error()                    console.error()
       │                                 │
       │                    (Intercepted by logger)
       │                                 │
       └─────────────┬───────────────────┘
                     │
                     ▼
           Format log entry
             • Timestamp
             • Level
             • Message
             • Context
                     │
                     ▼
           Get existing logs
           from localStorage
                     │
                     ▼
           Append new entry
                     │
                     ▼
           Keep last 1000
           (Remove oldest)
                     │
                     ▼
           Save to localStorage
           key: "apex_logs"
```

## Component Integration

### Error Boundary Flow

```
React Component Error
       │
       ▼
ErrorBoundary.componentDidCatch()
       │
       ├─── Log error with context
       │    logger.error("React Error", {...})
       │
       ├─── Update state
       │    { hasError: true, error, errorInfo }
       │
       └─── Render fallback UI
            • Error message
            • Stack trace
            • "Try Again" button
```

### Manual Logging Flow

```typescript
// In any component or function

try {
  await fetchData();
  logger.info("Data fetched successfully");
} catch (error) {
  logger.error("Failed to fetch data", {
    error: error.message,
    stack: error.stack,
    endpoint: "/api/nutrition"
  });
  // Handle error...
}
```

## Log Viewer Architecture

```
┌────────────────────────────────────────┐
│      View Logs Modal                   │
│      (app/modals/view-logs.tsx)        │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Header                          │ │
│  │  • Close button                  │ │
│  │  • Title                         │ │
│  │  • Share button                  │ │
│  │  • Clear button (web only)       │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Log Content (ScrollView)        │ │
│  │                                  │ │
│  │  [2026-05-09T14:30:45] [INFO]   │ │
│  │  App starting                    │ │
│  │                                  │ │
│  │  [2026-05-09T14:30:46] [ERROR]  │ │
│  │  Failed to load data             │ │
│  │  Context: {...}                  │ │
│  │  Stack: ...                      │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Refresh Button                  │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

## Storage Structure

### Native File System

```
{DocumentDirectory}/
└── logs/
    ├── app-2026-05-09_14-30-45.log
    ├── app-2026-05-09_16-20-10.log
    ├── app-2026-05-10_09-15-30.log
    └── ...
    
Each file contains:
[2026-05-09T14:30:45.123Z] [INFO] App starting
[2026-05-09T14:30:45.456Z] [ERROR] Database error
Context: {"table": "food_logs", "error": "..."}
Stack: Error: ...
    at function (file.ts:123)
    ...
```

### Web localStorage

```json
{
  "apex_logs": [
    {
      "timestamp": "2026-05-09T14:30:45.123Z",
      "level": "info",
      "message": "App starting"
    },
    {
      "timestamp": "2026-05-09T14:30:46.456Z",
      "level": "error",
      "message": "Failed to load data",
      "context": {
        "endpoint": "/api/nutrition",
        "statusCode": 500
      }
    }
  ]
}
```

## Error Capture Points

### 1. React Component Errors
```
Component render/lifecycle error
       ↓
ErrorBoundary.componentDidCatch()
       ↓
logger.error()
       ↓
Storage
```

### 2. Async Operation Errors
```
try/catch in async function
       ↓
catch block
       ↓
logger.error()
       ↓
Storage
```

### 3. Unhandled Errors (Web)
```
window.addEventListener("error")
       ↓
logger.error()
       ↓
localStorage
```

### 4. Unhandled Promise Rejections (Web)
```
window.addEventListener("unhandledrejection")
       ↓
logger.error()
       ↓
localStorage
```

### 5. Console Interception (Web)
```
console.error() called
       ↓
Intercepted by logger
       ↓
Original console.error() + logger.error()
       ↓
localStorage
```

## Access Patterns

### Reading Logs

```
User taps "View App Logs"
       │
       ▼
Load logs based on platform
       │
       ├─── Native: Read from file
       │    FileSystem.readAsStringAsync()
       │
       └─── Web: Read from localStorage
            localStorage.getItem("apex_logs")
       │
       ▼
Display in ScrollView
```

### Exporting Logs

```
User taps Share icon
       │
       ▼
Platform check
       │
       ├─── Native: Use Share API
       │    Share.share({ message: logs })
       │
       └─── Web: Download as file
            Blob → URL → <a download>
```

## Performance Considerations

### Native
- ✅ Async file writes (non-blocking)
- ✅ Automatic cleanup (30-day retention)
- ✅ Minimal memory footprint
- ⚠️ File I/O on every log (acceptable for mobile)

### Web
- ✅ Synchronous localStorage (fast)
- ✅ Automatic size management (1000 entries)
- ✅ No network requests
- ⚠️ localStorage quota limits (~5-10MB)

## Security & Privacy

### What's Logged
- ✅ Error messages
- ✅ Stack traces
- ✅ User actions (non-sensitive)
- ✅ API endpoints
- ✅ Timestamps

### What's NOT Logged
- ❌ Passwords
- ❌ Auth tokens
- ❌ Personal information
- ❌ Credit card data
- ❌ Health data (unless explicitly needed)

### Storage Security
- **Native**: Files stored in app's document directory (sandboxed)
- **Web**: localStorage (not encrypted, same-origin policy)
- **Network**: No logs sent to remote servers

## Future Enhancements

### Potential Additions
1. **Remote Logging**: Send logs to backend
2. **Log Filtering**: Filter by level, date, component
3. **Search**: Full-text search in logs
4. **Analytics**: Aggregate error patterns
5. **Performance Metrics**: Track app performance
6. **Crash Reporting**: Integrate with Sentry/Crashlytics
7. **Log Rotation**: Compress old logs
8. **Export Formats**: JSON, CSV, PDF

### Scalability
- Current: Single log file per session (native)
- Future: Rotate by size or time
- Current: 1000 entries (web)
- Future: Configurable limit

---

**Architecture Version**: 1.0  
**Last Updated**: May 9, 2026  
**Status**: Production Ready ✅
