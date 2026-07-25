# Comprehensive End-to-End Test Guide

## 🎯 Complete Testing Checklist

This guide covers **every button, every screen, every feature** to ensure nothing is missed.

---

## Pre-Testing SetupWARN  Method getInfoAsync imported from "expo-file-system" is deprecated.
You can migrate to the new filesystem API using "File" and "Directory" classes or import the legacy API from "expo-file-system/legacy".
API reference and examples are available in the filesystem docs: https://docs.expo.dev/versions/v54.0.0/sdk/filesystem/
 WARN  [expo-av]: Expo AV has been deprecated and will be removed in SDK 54. Use the `expo-audio` and `expo-video` packages to replace the required functionality.
 INFO  [INFO] App starting - initializing database
 ERROR  Failed to initialize logger: [Error: Method getInfoAsync imported from "expo-file-system" is deprecated.
You can migrate to the new filesystem API using "File" and "Directory" classes or import the legacy API from "expo-file-system/legacy".
API reference and examples are available in the filesystem docs: https://docs.expo.dev/versions/v54.0.0/sdk/filesystem/]

Call Stack
  errorOnLegacyMethodUse (node_modules\expo-file-system\src\legacyWarnings.ts)
  getInfoAsync (node_modules\expo-file-system\src\legacyWarnings.ts)
  next (<native>)
  asyncGeneratorStep (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  _next (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  Promise$argument_0 (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  tryCallTwo (address at (InternalBytecode.js:1:1222)
  doResolve (address at (InternalBytecode.js:1:2541)
  Promise (address at (InternalBytecode.js:1:1318)
  <anonymous> (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  apply (<native>)
  <global> (node_modules\expo-file-system\src\legacyWarnings.ts)
  apply (<native>)
  getInfoAsync (node_modules\expo-file-system\src\legacyWarnings.ts)
  Logger#initialize (lib\logger.ts)
  next (<native>)
  asyncGeneratorStep (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  _next (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  Promise$argument_0 (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  tryCallTwo (address at (InternalBytecode.js:1:1222)
  doResolve (address at (InternalBytecode.js:1:2541)
  Promise (address at (InternalBytecode.js:1:1318)
  <anonymous> (node_modules\@babel\runtime\helpers\asyncToGenerator.js)
  apply (<native>)
  Logger#initialize (lib\logger.ts)
  Logger#constructor (lib\logger.ts)
  <global> (lib\logger.ts)
  loadModuleImplementation (node_modules\expo\node_modules\@expo\cli\build\metro-require\require.js)
  guardedLoadModule (node_modules\expo\node_modules\@expo\cli\build\metro-require\require.js)
  metroRequire (node_modules\expo\node_modules\@expo\cli\build\metro-require\require.js)
  <global> (components\ErrorBoundary.tsx)
  loadModuleImplementation (node_modules\expo\node_modules\@expo\cli\build\metro-require\require.js)
  guardedLoadModule (node_modules\expo\node_modules\@expo\cli\build\metro-require\require.js)
  metroRequire (node_modules\expo\node_modules\@expo\cli\build\metro-require\require.js)
  <global> (app\_layout.tsx)
  loadModuleImplementation (node_modules\expo\node_modules\@expo\cli\build\metro-require\require.js)
  guardedLoadModule (node_modules\expo\node_modules\@expo\cli\build\metro-require\require.js)
  metroRequire (node_modules\expo\node_modules\@expo\cli\build\metro-require\require.js)
  Object.defineProperties$argument_1._layoutTsx.get (app)
  metroContext (app)
  node.loadRoute (node_modules\expo-router\build\getRoutesCore.js)
  getDirectoryTree (node_modules\expo-router\build\getRoutesCore.js)
  getDirectoryTree (node_modules\expo-router\build\getRoutesCore.js)
  getRoutes (node_modules\expo-router\build\getRoutesCore.js)
  getRoutes (node_modules\expo-router\build\getRoutes.js)
  useStore (node_modules\expo-router\build\global-state\router-store.js)
  ContextNavigator (node_modules\expo-router\build\ExpoRoot.js)
  callComponent.reactStackBottomFrame (node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  renderWithHooks (node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  updateFunctionComponent (node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)       
  beginWork (node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  runWithFiberInDEV (node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  performUnitOfWork (node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  workLoopSync (node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  renderRootSync (node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  performWorkOnRoot (node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
  performWorkOnRootViaSchedulerTask (node_modules\react-native\Libraries\Renderer\implementations\ReactFabric-dev.js)
 INFO  [INFO] Database migrations completed successfully

### ✅ Setup Checklist
- [ ] App installed on device/emulator
- [ ] Internet connection available
- [ ] Camera permission granted
- [ ] Have test products with barcodes ready
- [ ] Logs viewer accessible (More → Settings → View App Logs)

---

## 1. APP LAUNCH & INITIALIZATION

### Test Case 1.1: First Launch
**Steps**:
1. Fresh install app
2. Launch app
3. Wait for initialization

**Expected**:
- [ ] Loading screen appears
- [ ] "Initializing Apex..." message shows
- [ ] Database migrations run successfully
- [ ] App loads to Home screen
- [ ] No crashes or errors
- [ ] Check logs: "Database migrations completed successfully"

### Test Case 1.2: Subsequent Launches
**Steps**:
1. Close app completely
2. Reopen app

**Expected**:
- [ ] App opens quickly (< 2 seconds)
- [ ] Last viewed tab is shown
- [ ] Data persists from previous session
- [ ] No initialization delay

### Test Case 1.3: Permissions
**Steps**:
1. Check app permissions in device settings

**Expected**:
- [ ] Camera permission requested (when scanning)
- [ ] Storage permission granted (for logs)
- [ ] No unnecessary permissions requested

---

## 2. NAVIGATION & TABS

### Test Case 2.1: Bottom Navigation
**Steps**:
1. Tap each tab in bottom navigation

**Expected**:
- [ ] **Home** tab - Opens home screen
- [ ] **Nutrition** tab - Opens nutrition screen
- [ ] **Workout** tab - Opens workout screen
- [ ] **Progress** tab - Opens progress screen
- [ ] **Coach** tab - Opens coach screen
- [ ] **More** tab - Opens more screen
- [ ] Active tab highlighted correctly
- [ ] Tab icons change color when active
- [ ] Smooth transitions between tabs

### Test Case 2.2: Tab Persistence
**Steps**:
1. Navigate to Nutrition tab
2. Close app
3. Reopen app

**Expected**:
- [ ] App remembers last tab (Nutrition)
- [ ] Tab state preserved

---

## 3. NUTRITION TAB - MAIN SCREEN

### Test Case 3.1: Daily Summary Card
**Steps**:
1. Open Nutrition tab
2. View daily summary at top

**Expected**:
- [ ] Today's date displayed
- [ ] Total calories shown
- [ ] Total protein shown
- [ ] Total carbs shown
- [ ] Total fat shown
- [ ] Progress bars visible
- [ ] Target values shown
- [ ] Percentage of target calculated correctly

### Test Case 3.2: Input Mode Buttons
**Steps**:
1. View the 4 input buttons

**Expected**:
- [ ] **Type** button visible (pencil icon)
- [ ] **Voice** button visible (mic icon)
- [ ] **Paste** button visible (clipboard icon)
- [ ] **Scan** button visible (camera icon) ← NEW
- [ ] All buttons same size
- [ ] Icons clearly visible
- [ ] Labels readable

### Test Case 3.3: Meal Sections
**Steps**:
1. View meal sections (Breakfast, Lunch, Snack, Dinner)

**Expected**:
- [ ] All 4 meal sections visible
- [ ] Meal icons correct (sunrise, sun, coffee, moon)
- [ ] Meal totals calculated correctly
- [ ] Empty meals show "No items logged"
- [ ] Expandable/collapsible works

### Test Case 3.4: Refresh
**Steps**:
1. Pull down to refresh

**Expected**:
- [ ] Refresh animation appears
- [ ] Data reloads
- [ ] Updated values shown
- [ ] No errors

---

## 4. BARCODE SCANNING - COMPLETE FLOW

### Test Case 4.1: Open Scanner
**Steps**:
1. Tap **Scan** button

**Expected**:
- [ ] Camera permission requested (first time)
- [ ] Scanner screen opens full-screen
- [ ] Camera preview visible
- [ ] Reticle (scanning frame) visible
- [ ] Reticle is green/teal color
- [ ] "Align barcode within frame" text shown
- [ ] Close button (X) visible top-left
- [ ] Torch button visible top-right
- [ ] "Can't scan? Enter barcode manually" button at bottom

### Test Case 4.2: Scanner UI Elements
**Steps**:
1. In scanner screen, check all UI elements

**Expected**:
- [ ] Header shows "Scan Barcode"
- [ ] Close button (X) works
- [ ] Torch button toggles on/off
- [ ] Reticle animates (scanning line moves)
- [ ] Manual entry button accessible
- [ ] All text readable on camera background

### Test Case 4.3: Successful Scan - Complete Product
**Steps**:
1. Scan a well-known product (e.g., ON Whey, Kellogg's cereal)
2. Wait for detection

**Expected**:
- [ ] Reticle turns yellow (detecting)
- [ ] "Looking up product..." message shows
- [ ] Spinner/loading indicator appears
- [ ] Reticle turns green (found)
- [ ] "Product found!" message shows
- [ ] Checkmark icon appears
- [ ] Automatically navigates to Nutrition Card
- [ ] Product name displayed
- [ ] Brand name displayed
- [ ] All macros filled (calories, protein, carbs, fat)
- [ ] Quality badge shows "Verified" (green checkmark)
- [ ] No warnings displayed

### Test Case 4.4: Successful Scan - Incomplete Product
**Steps**:
1. Scan a product with incomplete data

**Expected**:
- [ ] Product found
- [ ] Navigates to Nutrition Card
- [ ] Some fields may be empty
- [ ] Quality badge shows "Partial Data" (amber warning)
- [ ] Warning message: "Missing: [fields] — entry may be incomplete"
- [ ] Can still edit and log

### Test Case 4.5: Successful Scan - Suspect Data
**Steps**:
1. Scan a product with inconsistent data

**Expected**:
- [ ] Product found
- [ ] Quality badge shows "Suspect Data" (red warning)
- [ ] Warning banner displayed
- [ ] Warning text: "Calorie count inconsistent with macros — verify label"
- [ ] Values highlighted in red/amber
- [ ] Can edit before logging

### Test Case 4.6: Failed Scan - Product Not Found
**Steps**:
1. Scan an obscure/local product not in database

**Expected**:
- [ ] Reticle turns red
- [ ] "Product not found" message shows
- [ ] X icon appears
- [ ] Message stays for 2 seconds
- [ ] Returns to scanning mode
- [ ] Can try again
- [ ] After 3 failed scans, torch suggestion appears

### Test Case 4.7: Torch Toggle
**Steps**:
1. In scanner, tap torch button
2. Tap again to turn off

**Expected**:
- [ ] First tap: Torch turns ON
- [ ] Icon changes to "flash" (filled)
- [ ] Light visible on device
- [ ] Second tap: Torch turns OFF
- [ ] Icon changes to "flash-off" (outline)
- [ ] Light turns off

### Test Case 4.8: Torch Auto-Suggest
**Steps**:
1. Fail to scan 3 products in a row

**Expected**:
- [ ] After 3rd failure, alert appears
- [ ] Alert title: "Having trouble?"
- [ ] Alert message: "Try turning on the torch for better lighting."
- [ ] Two buttons: "Turn on Torch" and "Continue"
- [ ] "Turn on Torch" enables torch
- [ ] "Continue" dismisses alert

### Test Case 4.9: Manual Barcode Entry
**Steps**:
1. In scanner, tap "Can't scan? Enter barcode manually"
2. Type barcode number
3. Tap "Lookup"

**Expected**:
- [ ] Manual entry screen appears
- [ ] Title: "Enter Barcode"
- [ ] Subtitle: "Type the barcode number from the product package"
- [ ] Input field visible
- [ ] Keyboard opens automatically
- [ ] Number pad keyboard (not full keyboard)
- [ ] Placeholder text: "e.g., 8901234567890"
- [ ] "Cancel" button works
- [ ] "Lookup" button works
- [ ] Lookup searches database
- [ ] If found, shows Nutrition Card
- [ ] If not found, shows "Not found" alert with manual entry option

### Test Case 4.10: Cancel Scanning
**Steps**:
1. Open scanner
2. Tap X (close) button

**Expected**:
- [ ] Scanner closes immediately
- [ ] Returns to Nutrition tab
- [ ] Camera stops
- [ ] No memory leaks

### Test Case 4.11: Scan Multiple Products
**Steps**:
1. Scan product A
2. Log it
3. Return to Nutrition tab
4. Scan product B
5. Log it

**Expected**:
- [ ] Both products logged separately
- [ ] Both appear in meal list
- [ ] Totals updated correctly
- [ ] No data mixing between products

### Test Case 4.12: Offline Scanning (Cached)
**Steps**:
1. Scan a product with internet ON
2. Log it
3. Turn OFF WiFi/data
4. Scan same product again

**Expected**:
- [ ] Product found from cache
- [ ] "Cached data" badge or indicator
- [ ] All data same as before
- [ ] Can log successfully
- [ ] No "No internet" error

### Test Case 4.13: Offline Scanning (Not Cached)
**Steps**:
1. Turn OFF WiFi/data
2. Scan a new product (not scanned before)

**Expected**:
- [ ] Lookup fails gracefully
- [ ] Message: "No connection — checking cached products..."
- [ ] Then: "Product not found"
- [ ] Option to enter manually
- [ ] No crash

### Test Case 4.14: API Timeout
**Steps**:
1. Scan product with very slow internet

**Expected**:
- [ ] Lookup times out after 8 seconds
- [ ] Falls back to Nutritionix API
- [ ] If both timeout, shows "Lookup failed"
- [ ] Option to try again or enter manually

### Test Case 4.15: Camera Permission Denied
**Steps**:
1. Deny camera permission
2. Tap Scan button

**Expected**:
- [ ] Permission denied screen appears
- [ ] Icon: Camera with slash
- [ ] Title: "Camera Access Denied"
- [ ] Message: "Camera permission is required to scan barcodes."
- [ ] "Open Settings" button
- [ ] "Enter Barcode Manually" button
- [ ] "Cancel" button
- [ ] All buttons work correctly

---

## 5. NUTRITION CARD - CONFIRMATION SCREEN

### Test Case 5.1: Nutrition Card Layout
**Steps**:
1. Scan a product or enter manually
2. View Nutrition Card

**Expected**:
- [ ] Header with "Confirm Food" title
- [ ] Close button (X) top-left
- [ ] Data quality badge visible
- [ ] Source indicator (Scanned/Manual)
- [ ] Food name field (editable)
- [ ] Brand field (if available)
- [ ] "NUTRITION (PER 100G)" section
- [ ] All macro fields visible
- [ ] Quantity section
- [ ] Meal selector
- [ ] "Log Food" button at bottom

### Test Case 5.2: Data Quality Badges
**Steps**:
1. Scan different products to see different badges

**Expected**:
- [ ] **Verified** (green checkmark): All data complete and validated
- [ ] **Partial Data** (amber warning): Some fields missing
- [ ] **Suspect Data** (red warning): Data inconsistencies
- [ ] **User Entered** (gray info): Manual entry
- [ ] Badge color matches severity
- [ ] Icon appropriate for each type

### Test Case 5.3: Warning Banners
**Steps**:
1. Scan product with warnings
2. View warning banner

**Expected**:
- [ ] Warning banner visible (amber background)
- [ ] Warning icon (⚠️) shown
- [ ] Warning text readable
- [ ] Multiple warnings listed separately
- [ ] Examples:
  - [ ] "Calorie count inconsistent with macros"
  - [ ] "Missing: protein, fiber"
  - [ ] "Protein value seems too high"
  - [ ] "Macros exceed 100g"

### Test Case 5.4: Edit Food Name
**Steps**:
1. Tap food name field
2. Edit text
3. Save

**Expected**:
- [ ] Keyboard appears
- [ ] Can type/edit text
- [ ] Text updates in real-time
- [ ] Placeholder: "Enter food name"
- [ ] Required field (can't log without name)

### Test Case 5.5: Edit Brand
**Steps**:
1. Tap brand field (if visible)
2. Edit text

**Expected**:
- [ ] Can edit brand name
- [ ] Optional field
- [ ] Can leave empty

### Test Case 5.6: Edit Macros
**Steps**:
1. Tap each macro field (Calories, Protein, Carbs, Fat, Fiber)
2. Edit values

**Expected**:
- [ ] Number keyboard appears
- [ ] Can enter decimal values (e.g., 24.5)
- [ ] Values update in real-time
- [ ] Unit labels visible (kcal, g)
- [ ] All fields editable
- [ ] Fiber is optional (can be empty)

### Test Case 5.7: Quantity Adjustment
**Steps**:
1. Change quantity value
2. Try different amounts

**Expected**:
- [ ] Can enter any positive number
- [ ] Decimal values allowed (e.g., 150.5)
- [ ] Unit shows "grams"
- [ ] Default is 100g
- [ ] Calculated values update (not shown yet, but logged correctly)

### Test Case 5.8: Meal Selection
**Steps**:
1. Tap each meal button

**Expected**:
- [ ] 4 meal options: Breakfast, Lunch, Snack, Dinner
- [ ] Selected meal highlighted (teal background)
- [ ] Unselected meals gray
- [ ] Only one meal selected at a time
- [ ] Default is Breakfast

### Test Case 5.9: Log Food - Success
**Steps**:
1. Fill all required fields
2. Tap "Log Food" button

**Expected**:
- [ ] Validation passes
- [ ] Food logged to database
- [ ] Success alert: "Food logged successfully!"
- [ ] Alert has "OK" button
- [ ] Tapping OK closes Nutrition Card
- [ ] Returns to Nutrition tab
- [ ] Food appears in selected meal section
- [ ] Totals updated correctly
- [ ] Check logs: "Food logged" entry

### Test Case 5.10: Log Food - Missing Name
**Steps**:
1. Leave name field empty
2. Tap "Log Food"

**Expected**:
- [ ] Validation fails
- [ ] Alert: "Please enter a food name"
- [ ] Stays on Nutrition Card
- [ ] Can fix and retry

### Test Case 5.11: Log Food - Invalid Numbers
**Steps**:
1. Enter non-numeric values in macro fields
2. Tap "Log Food"

**Expected**:
- [ ] Validation fails
- [ ] Alert: "Please enter valid numbers for all fields"
- [ ] Stays on Nutrition Card
- [ ] Can fix and retry

### Test Case 5.12: Cancel/Close
**Steps**:
1. Open Nutrition Card
2. Tap X (close) button

**Expected**:
- [ ] Nutrition Card closes
- [ ] Returns to previous screen
- [ ] No data logged
- [ ] No errors

### Test Case 5.13: Back Navigation
**Steps**:
1. Scan product → Nutrition Card
2. Use device back button

**Expected**:
- [ ] Goes back to Nutrition tab
- [ ] Scanner also closes
- [ ] No data logged

---

## 6. EXISTING INPUT MODES (Type, Voice, Paste)

### Test Case 6.1: Type Input
**Steps**:
1. Tap **Type** button
2. Enter food manually

**Expected**:
- [ ] Log Food modal opens
- [ ] Type mode selected
- [ ] Can enter food details
- [ ] Works as before (not broken by new Scan feature)

### Test Case 6.2: Voice Input
**Steps**:
1. Tap **Voice** button
2. Use voice input

**Expected**:
- [ ] Voice input modal opens
- [ ] Microphone works
- [ ] Voice recognition works
- [ ] Not affected by new Scan feature

### Test Case 6.3: Paste Input
**Steps**:
1. Tap **Paste** button
2. Paste food data

**Expected**:
- [ ] Paste modal opens
- [ ] Can paste text
- [ ] Parsing works
- [ ] Not affected by new Scan feature

---

## 7. FOOD LOGS & MEAL SECTIONS

### Test Case 7.1: View Logged Foods
**Steps**:
1. Log several foods
2. View in meal sections

**Expected**:
- [ ] Foods appear in correct meal
- [ ] Food name displayed
- [ ] Calories shown
- [ ] Protein shown
- [ ] Carbs shown
- [ ] Fat shown
- [ ] Source indicator (barcode icon if scanned)

### Test Case 7.2: Expand/Collapse Meals
**Steps**:
1. Tap meal header to expand
2. Tap again to collapse

**Expected**:
- [ ] Meal expands to show items
- [ ] Meal collapses to hide items
- [ ] Chevron icon rotates
- [ ] Smooth animation

### Test Case 7.3: Delete Food
**Steps**:
1. Long-press or swipe on food item
2. Confirm deletion

**Expected**:
- [ ] Delete confirmation appears
- [ ] "Remove [food name]?" message
- [ ] "Cancel" and "Delete" buttons
- [ ] Delete removes food
- [ ] Totals update immediately
- [ ] Food disappears from list

### Test Case 7.4: Empty Meal State
**Steps**:
1. View meal with no items

**Expected**:
- [ ] "No items logged" message
- [ ] Empty state icon/illustration
- [ ] Meal totals show 0

---

## 8. DAILY TOTALS & PROGRESS

### Test Case 8.1: Calorie Tracking
**Steps**:
1. Log foods with known calories
2. Check daily total

**Expected**:
- [ ] Total calories calculated correctly
- [ ] Progress bar updates
- [ ] Percentage of target shown
- [ ] Color changes based on progress (green/amber/red)

### Test Case 8.2: Protein Tracking
**Steps**:
1. Log high-protein foods
2. Check protein total

**Expected**:
- [ ] Total protein calculated correctly
- [ ] Progress bar updates
- [ ] Target comparison shown
- [ ] Protein goal highlighted

### Test Case 8.3: Macro Breakdown
**Steps**:
1. Log various foods
2. View macro breakdown

**Expected**:
- [ ] Carbs total correct
- [ ] Fat total correct
- [ ] Fiber total correct (if tracked)
- [ ] All calculations accurate

---

## 9. LOGS VIEWER

### Test Case 9.1: Access Logs
**Steps**:
1. Go to More tab
2. Tap Settings
3. Tap "View App Logs"

**Expected**:
- [ ] Logs modal opens
- [ ] Logs displayed in chronological order
- [ ] Timestamps visible
- [ ] Log levels shown (INFO, WARN, ERROR)
- [ ] Scrollable

### Test Case 9.2: Log Entries
**Steps**:
1. View logs after scanning

**Expected**:
- [ ] "App starting" entry
- [ ] "Database migrations completed" entry
- [ ] "Barcode scanned" entries
- [ ] "Barcode found" or "not found" entries
- [ ] "Food logged" entries
- [ ] All with timestamps

### Test Case 9.3: Export Logs
**Steps**:
1. In logs viewer, tap share icon

**Expected**:
- [ ] Share sheet appears (native)
- [ ] Can share via email, messages, etc.
- [ ] Logs exported as text file
- [ ] File name includes date

### Test Case 9.4: Refresh Logs
**Steps**:
1. Tap "Refresh Logs" button

**Expected**:
- [ ] Logs reload
- [ ] New entries appear
- [ ] No duplicates

---

## 10. ERROR HANDLING & EDGE CASES

### Test Case 10.1: Network Errors
**Steps**:
1. Turn off internet mid-scan

**Expected**:
- [ ] Graceful error message
- [ ] No crash
- [ ] Option to retry
- [ ] Falls back to cache

### Test Case 10.2: API Failures
**Steps**:
1. Scan when APIs are down (simulate)

**Expected**:
- [ ] Timeout after 8 seconds
- [ ] Fallback to second API
- [ ] If both fail, manual entry option
- [ ] No crash

### Test Case 10.3: Invalid Barcodes
**Steps**:
1. Scan damaged/unreadable barcode

**Expected**:
- [ ] Detection fails gracefully
- [ ] Can retry
- [ ] Manual entry option
- [ ] No crash

### Test Case 10.4: Duplicate Scans
**Steps**:
1. Scan same product twice quickly

**Expected**:
- [ ] Second scan ignored while first is processing
- [ ] No duplicate entries
- [ ] No race conditions

### Test Case 10.5: Memory Leaks
**Steps**:
1. Open/close scanner 10 times
2. Scan 20 products

**Expected**:
- [ ] App remains responsive
- [ ] No slowdown
- [ ] Memory usage stable
- [ ] Camera releases properly

### Test Case 10.6: Low Storage
**Steps**:
1. Test with low device storage

**Expected**:
- [ ] Cache writes fail gracefully
- [ ] Warning message shown
- [ ] App continues to work
- [ ] No crash

### Test Case 10.7: Background/Foreground
**Steps**:
1. Open scanner
2. Switch to another app
3. Return to scanner

**Expected**:
- [ ] Camera resumes
- [ ] Scanner still works
- [ ] No crash
- [ ] State preserved

### Test Case 10.8: Rotation
**Steps**:
1. Open scanner
2. Rotate device

**Expected**:
- [ ] Scanner adapts to orientation
- [ ] UI remains usable
- [ ] No layout issues
- [ ] Camera adjusts

---

## 11. DATA PERSISTENCE

### Test Case 11.1: Food Logs Persist
**Steps**:
1. Log several foods
2. Close app completely
3. Reopen app

**Expected**:
- [ ] All logged foods still visible
- [ ] Totals correct
- [ ] No data loss

### Test Case 11.2: Cache Persists
**Steps**:
1. Scan product with internet
2. Close app
3. Reopen app offline
4. Scan same product

**Expected**:
- [ ] Product found from cache
- [ ] Works offline
- [ ] Data identical

### Test Case 11.3: Database Integrity
**Steps**:
1. Log 50+ foods over several days
2. Check database

**Expected**:
- [ ] All data intact
- [ ] No corruption
- [ ] Queries fast
- [ ] No duplicates

---

## 12. PERFORMANCE

### Test Case 12.1: Scan Speed
**Steps**:
1. Time barcode detection

**Expected**:
- [ ] Barcode detected in < 2 seconds
- [ ] API lookup in < 3 seconds
- [ ] Total time < 5 seconds
- [ ] Feels instant

### Test Case 12.2: App Launch Speed
**Steps**:
1. Time app launch

**Expected**:
- [ ] Cold start < 3 seconds
- [ ] Warm start < 1 second
- [ ] No lag

### Test Case 12.3: UI Responsiveness
**Steps**:
1. Navigate between tabs quickly
2. Scroll food lists

**Expected**:
- [ ] 60 FPS animations
- [ ] No stuttering
- [ ] Smooth scrolling
- [ ] Instant tap response

### Test Case 12.4: Large Data Sets
**Steps**:
1. Log 100+ foods
2. Test performance

**Expected**:
- [ ] Lists scroll smoothly
- [ ] Search is fast
- [ ] No slowdown
- [ ] Memory efficient

---

## 13. ACCESSIBILITY

### Test Case 13.1: Text Size
**Steps**:
1. Increase device text size
2. Check app

**Expected**:
- [ ] Text scales appropriately
- [ ] No text cutoff
- [ ] Layout adapts
- [ ] Readable

### Test Case 13.2: Color Contrast
**Steps**:
1. Check all text/background combinations

**Expected**:
- [ ] Sufficient contrast
- [ ] Readable in bright light
- [ ] Readable in dark
- [ ] Color-blind friendly

### Test Case 13.3: Touch Targets
**Steps**:
1. Check button sizes

**Expected**:
- [ ] All buttons > 44x44 points
- [ ] Easy to tap
- [ ] No accidental taps
- [ ] Proper spacing

---

## 14. INTEGRATION TESTS

### Test Case 14.1: Complete User Journey
**Steps**:
1. Open app
2. Go to Nutrition tab
3. Tap Scan
4. Scan product
5. Edit values
6. Select meal
7. Log food
8. View in meal list
9. Check totals
10. View logs

**Expected**:
- [ ] All steps work smoothly
- [ ] No errors at any point
- [ ] Data flows correctly
- [ ] UI updates properly

### Test Case 14.2: Multiple Foods in One Session
**Steps**:
1. Scan and log 5 different products
2. Mix meals (breakfast, lunch, snack)
3. Check totals

**Expected**:
- [ ] All foods logged correctly
- [ ] Appear in correct meals
- [ ] Totals accurate
- [ ] No data mixing

### Test Case 14.3: Daily Workflow
**Steps**:
1. Morning: Log breakfast (3 items)
2. Noon: Log lunch (4 items)
3. Evening: Log snack (2 items)
4. Night: Log dinner (5 items)
5. Review day

**Expected**:
- [ ] All 14 items logged
- [ ] Correct meal assignments
- [ ] Daily totals accurate
- [ ] Progress tracking works

---

## 15. REGRESSION TESTS

### Test Case 15.1: Existing Features Still Work
**Steps**:
1. Test all features that existed before Scan was added

**Expected**:
- [ ] Type input works
- [ ] Voice input works
- [ ] Paste input works
- [ ] Workout logging works
- [ ] Progress tracking works
- [ ] More tab features work
- [ ] Nothing broken by new feature

### Test Case 15.2: Database Migrations
**Steps**:
1. Check database schema

**Expected**:
- [ ] New tables created (barcode_cache, personal_foods, etc.)
- [ ] Old tables intact
- [ ] No data loss
- [ ] Migrations successful

---

## 16. SECURITY & PRIVACY

### Test Case 16.1: API Keys
**Steps**:
1. Check if API keys are exposed

**Expected**:
- [ ] Keys in .env file (not committed)
- [ ] Keys not visible in logs
- [ ] Keys not in error messages
- [ ] Secure storage

### Test Case 16.2: Camera Privacy
**Steps**:
1. Check camera usage

**Expected**:
- [ ] Camera only active when scanner open
- [ ] Camera stops when scanner closes
- [ ] No background camera access
- [ ] Permission requested properly

### Test Case 16.3: Data Privacy
**Steps**:
1. Check what data is stored

**Expected**:
- [ ] Only nutrition data stored
- [ ] No personal info collected
- [ ] No tracking
- [ ] Local storage only

---

## 17. CROSS-PLATFORM (If Applicable)

### Test Case 17.1: Android Specific
**Steps**:
1. Test on Android device

**Expected**:
- [ ] Back button works correctly
- [ ] Camera works
- [ ] Permissions work
- [ ] UI looks correct

### Test Case 17.2: iOS Specific
**Steps**:
1. Test on iOS device

**Expected**:
- [ ] Swipe gestures work
- [ ] Camera works
- [ ] Permissions work
- [ ] UI looks correct

---

## 18. FINAL VALIDATION

### Test Case 18.1: Clean Install
**Steps**:
1. Uninstall app completely
2. Reinstall
3. Test from scratch

**Expected**:
- [ ] Fresh install works
- [ ] Database created
- [ ] Migrations run
- [ ] All features work

### Test Case 18.2: Update Scenario
**Steps**:
1. Install old version (if available)
2. Update to new version
3. Test

**Expected**:
- [ ] Update successful
- [ ] Old data preserved
- [ ] New features available
- [ ] No data loss

---

## TEST SUMMARY TEMPLATE

After completing all tests, fill this out:

### ✅ Passed Tests: _____ / _____

### ❌ Failed Tests:
1. Test Case #: _____ - Issue: _____
2. Test Case #: _____ - Issue: _____

### ⚠️ Issues Found:
- **Critical**: _____
- **Major**: _____
- **Minor**: _____

### 📊 Overall Status:
- [ ] Ready for production
- [ ] Needs fixes
- [ ] Needs more testing

### 📝 Notes:
_____

---

## QUICK TEST CHECKLIST (Minimal)

If you don't have time for full testing, do these critical tests:

### Critical Path (15 minutes)
- [ ] App launches
- [ ] Scan button opens camera
- [ ] Scan a product successfully
- [ ] Product data appears correctly
- [ ] Can log food
- [ ] Food appears in meal list
- [ ] Totals update correctly
- [ ] No crashes

### Essential Features (30 minutes)
- [ ] All 4 input modes work (Type, Voice, Paste, Scan)
- [ ] Manual barcode entry works
- [ ] Torch works
- [ ] Offline cache works
- [ ] Data quality badges show
- [ ] Warnings display correctly
- [ ] Logs viewer works
- [ ] App persists data

### Full Testing (2-3 hours)
- [ ] Complete all 18 sections above
- [ ] Document all issues
- [ ] Verify all fixes

---

**Total Test Cases**: 100+  
**Estimated Time**: 2-3 hours for complete testing  
**Priority**: Start with Critical Path, then Essential, then Full

Good luck testing! 🚀
