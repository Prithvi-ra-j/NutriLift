# Quick Test Checklist ✓

## 🚀 CRITICAL PATH (15 min) - DO THIS FIRST

### App Launch
- [ ] App opens without crash
- [ ] Loading screen shows
- [ ] Database initializes
- [ ] Home screen appears

### Navigation
- [ ] All 6 tabs work (Home, Nutrition, Workout, Progress, Coach, More)
- [ ] Tab switching smooth
- [ ] Icons highlight correctly

### Barcode Scanning - Basic
- [ ] Tap Scan button → Camera opens
- [ ] Reticle visible (green frame)
- [ ] Scan a product → Detects barcode
- [ ] Product info appears
- [ ] All macros filled
- [ ] Quality badge shows

### Logging Food
- [ ] Can edit food name
- [ ] Can edit macros
- [ ] Can change quantity
- [ ] Can select meal
- [ ] Tap "Log Food" → Success
- [ ] Food appears in meal list
- [ ] Totals update

### Data Persistence
- [ ] Close app completely
- [ ] Reopen app
- [ ] Logged food still there
- [ ] Totals still correct

**✅ If all above pass → Core functionality works!**

---

## ⚡ ESSENTIAL FEATURES (30 min) - DO THIS NEXT

### All Input Modes
- [ ] Type button works
- [ ] Voice button works
- [ ] Paste button works
- [ ] Scan button works
- [ ] All open correct screens

### Scanner Features
- [ ] Close button (X) works
- [ ] Torch button toggles on/off
- [ ] Manual entry button works
- [ ] Can type barcode manually
- [ ] Manual lookup works

### Scan Results
- [ ] ✅ Verified badge (complete data)
- [ ] ⚠️ Partial badge (missing data)
- [ ] ⚠️ Suspect badge (inconsistent data)
- [ ] Warning messages display
- [ ] Can edit suspect values

### Offline Mode
- [ ] Scan product with internet
- [ ] Turn off WiFi
- [ ] Scan same product
- [ ] Works from cache
- [ ] "Cached data" indicator

### Error Handling
- [ ] Scan invalid barcode → "Not found"
- [ ] Can retry
- [ ] Manual entry option
- [ ] No crash

### Meal Management
- [ ] Foods in correct meals
- [ ] Can expand/collapse meals
- [ ] Can delete foods
- [ ] Totals recalculate

### Logs Viewer
- [ ] More → Settings → View App Logs
- [ ] Logs display
- [ ] Can scroll
- [ ] Can export/share
- [ ] Timestamps correct

**✅ If all above pass → All features work!**

---

## 🔍 DETAILED TESTING (1-2 hours) - DO THIS LAST

### Scanner UI
- [ ] Header shows "Scan Barcode"
- [ ] Reticle animates (scanning line)
- [ ] Status messages update
- [ ] Colors change (green/yellow/red)
- [ ] Icons appear (checkmark/X)

### Torch
- [ ] Torch turns on
- [ ] Light visible
- [ ] Torch turns off
- [ ] Icon updates
- [ ] After 3 fails → Torch suggestion

### Manual Entry
- [ ] Entry screen appears
- [ ] Keyboard is number pad
- [ ] Can type barcode
- [ ] Cancel works
- [ ] Lookup works
- [ ] Not found → Alert with options

### Nutrition Card
- [ ] Food name editable
- [ ] Brand editable (if present)
- [ ] All 5 macro fields editable
- [ ] Quantity adjustable
- [ ] 4 meal buttons work
- [ ] Only one meal selected
- [ ] Log button works

### Validation
- [ ] Empty name → Error alert
- [ ] Invalid numbers → Error alert
- [ ] Valid data → Logs successfully
- [ ] Success alert appears
- [ ] Returns to Nutrition tab

### Data Quality
- [ ] Macro-calorie consistency checked
- [ ] Missing fields flagged
- [ ] Impossible values flagged
- [ ] Quality score calculated
- [ ] Warnings accurate

### Multiple Products
- [ ] Scan 5 different products
- [ ] All log correctly
- [ ] No data mixing
- [ ] Totals accurate
- [ ] Cache works for all

### Performance
- [ ] Scan detection < 2 sec
- [ ] API lookup < 3 sec
- [ ] Total time < 5 sec
- [ ] UI responsive
- [ ] No lag

### Memory
- [ ] Open/close scanner 10x
- [ ] No slowdown
- [ ] Camera releases
- [ ] No memory leak

### Permissions
- [ ] Camera permission requested
- [ ] Deny → Shows settings option
- [ ] Grant → Scanner works
- [ ] Manual entry always available

### Edge Cases
- [ ] Damaged barcode → Fails gracefully
- [ ] No internet → Cache or manual
- [ ] API timeout → Fallback works
- [ ] Duplicate scan → Handled
- [ ] Background/foreground → Resumes

### Integration
- [ ] Scan → Edit → Log → View → Delete
- [ ] Multiple meals in one day
- [ ] Mix scan + manual entry
- [ ] All data flows correctly

### Regression
- [ ] Old features still work
- [ ] Type input not broken
- [ ] Voice input not broken
- [ ] Paste input not broken
- [ ] Workout tab not broken
- [ ] Progress tab not broken

**✅ If all above pass → Production ready!**

---

## 📊 TEST RESULTS

### Date: ___________
### Tester: ___________
### Device: ___________
### OS Version: ___________

### Results:
- **Critical Path**: _____ / 5 sections ✅
- **Essential Features**: _____ / 7 sections ✅
- **Detailed Testing**: _____ / 15 sections ✅

### Issues Found:
1. ___________________________________
2. ___________________________________
3. ___________________________________

### Severity:
- **Critical** (app crashes): _____
- **Major** (feature broken): _____
- **Minor** (cosmetic): _____

### Status:
- [ ] ✅ Ready for production
- [ ] ⚠️ Needs minor fixes
- [ ] ❌ Needs major fixes

### Notes:
_____________________________________
_____________________________________
_____________________________________

---

## 🎯 TESTING TIPS

### Before Testing
1. Have 5-10 products with barcodes ready
2. Test in good lighting first
3. Have internet connection
4. Clear app data for fresh start (optional)

### During Testing
1. Check logs after each major action
2. Note any delays or lag
3. Try to break things (edge cases)
4. Test both success and failure paths

### After Testing
1. Document all issues
2. Rate severity (Critical/Major/Minor)
3. Take screenshots of bugs
4. Note device/OS info

### Products to Test
- ✅ Protein powder (ON Whey, MyProtein)
- ✅ Cereal (Kellogg's, Nestle)
- ✅ Packaged snacks (chips, cookies)
- ✅ Dairy (milk, yogurt)
- ✅ Bread (packaged)
- ✅ Energy bars
- ✅ Supplements
- ✅ Canned goods
- ✅ Frozen foods
- ❌ Fresh produce (usually no barcode)

---

## 🚨 STOP TESTING IF:

- [ ] App crashes repeatedly
- [ ] Data loss occurs
- [ ] Critical security issue found
- [ ] Major functionality broken

**Report immediately and don't continue!**

---

## ✅ SIGN-OFF

### Tested By: ___________
### Date: ___________
### Signature: ___________

### Approved By: ___________
### Date: ___________
### Signature: ___________

---

**Print this checklist and check off items as you test!** ✓
