# Update App Icon Instructions

## Icon Files to Replace

You need to replace these files in the `assets/` folder:

1. **icon.png** (1024x1024) - Main app icon
2. **adaptive-icon.png** (1024x1024) - Android adaptive icon (foreground)
3. **splash-icon.png** (1024x1024) - Splash screen icon
4. **favicon.png** (48x48 or larger) - Web favicon

## Steps to Update Icon

### 1. Save Your Icon Image
Save the icon image you provided (the green circular design with heart, star, and curved shapes) as a PNG file.

### 2. Create Different Sizes

You'll need to create these sizes:

#### For icon.png and adaptive-icon.png:
- **1024x1024 pixels**
- PNG format
- Transparent background (optional but recommended)

#### For splash-icon.png:
- **1024x1024 pixels**
- PNG format
- This will be shown on the splash screen

#### For favicon.png:
- **48x48 pixels** (or larger, will be scaled down)
- PNG format

### 3. Replace the Files

Copy your new icon files to:
```
c:\Users\chava\Desktop\Nutrition OS\apex\assets\
```

Replace:
- `icon.png`
- `adaptive-icon.png`
- `splash-icon.png`
- `favicon.png`

### 4. Quick Way (If you have the image)

If you have the icon image saved:

1. Open it in an image editor (Photoshop, GIMP, Figma, etc.)
2. Resize to 1024x1024
3. Export as PNG
4. Save 3 copies:
   - `icon.png`
   - `adaptive-icon.png`
   - `splash-icon.png`
5. Resize to 48x48 for `favicon.png`
6. Copy all to the `assets/` folder

### 5. Online Tool (Easiest)

Use an online tool like:
- https://www.appicon.co/
- https://easyappicon.com/
- https://icon.kitchen/

Upload your icon and it will generate all sizes needed.

### 6. After Replacing Icons

Run a new build:
```bash
eas build --platform android --profile preview
```

The new icon will be used in the next build.

## Current Icon Description

Your icon design:
- Light green/mint background
- Dark teal/navy circular segments
- Heart shape (top right)
- Star/diamond shape (bottom left)
- Two curved segments forming a circle

This is a great, modern design that represents health and fitness well!

## Notes

- The adaptive icon is used on Android 8.0+ devices
- The regular icon is used on older Android versions and iOS
- The splash icon is shown when the app first launches
- Make sure the icon looks good at small sizes (48x48)

---

**After you replace the icons, commit and rebuild:**
```bash
git add assets/
git commit -m "update: new app icon"
eas build --platform android --profile preview
```
