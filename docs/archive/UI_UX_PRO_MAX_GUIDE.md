# UI/UX Pro Max Integration Guide

## Overview

UI/UX Pro Max is now installed in your Nutrition OS project! This AI skill provides intelligent design system generation with 161 industry-specific reasoning rules, 67 UI styles, 161 color palettes, and 57 font pairings.

## Installation Status

✅ **Installed for Kiro** at `.kiro/steering/ui-ux-pro-max/`

The skill will automatically activate when you request UI/UX work in Kiro.

## How to Use

### 1. Workflow Mode (Recommended for Kiro)

Use the slash command to invoke the skill:

```
/ui-ux-pro-max Build a nutrition tracking dashboard
/ui-ux-pro-max Design the workout logging interface
/ui-ux-pro-max Create a progress visualization screen
/ui-ux-pro-max Improve the food logging modal
```

### 2. Natural Language (Auto-activation)

Just describe what you want to build:

```
Build a modern dashboard for tracking macros
Create a workout logging interface with dark mode
Design a progress chart for body composition
Redesign the nutrition card modal
```

## Design System Generation

The skill includes an intelligent reasoning engine that analyzes your requirements and generates a complete design system:

### For Nutrition OS (Health & Fitness App)

Based on the 161 reasoning rules, your app would likely get:

**Recommended Pattern:** Feature-Rich Dashboard
- Conversion: Data-driven with progress tracking
- Key Sections: Dashboard, Nutrition, Workout, Progress, Coach

**Style:** Soft UI Evolution or Minimalism
- Keywords: Clean, data-focused, calming, professional
- Best For: Health, fitness, wellness tracking
- Performance: Excellent | Accessibility: WCAG AA

**Colors:** Health & Wellness Palette
- Primary: Calming blues/greens
- Secondary: Energetic accent colors
- Background: Clean whites or soft grays
- Text: High contrast for readability

**Typography:** Modern sans-serif pairing
- Headings: Bold, clear hierarchy
- Body: Readable, accessible

**Key Effects:**
- Smooth transitions (200-300ms)
- Subtle hover states
- Progress animations
- Chart interactions

**Anti-patterns to Avoid:**
- Overly bright neon colors
- Harsh animations
- Poor contrast ratios
- Cluttered data displays

## Generate Design System for Your App

You can generate a complete design system specifically for Nutrition OS:

```bash
# Generate design system for the entire app
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "fitness nutrition tracking health wellness" --design-system -p "Nutrition OS"

# Generate with Markdown output
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "fitness nutrition tracking" --design-system -f markdown -p "Nutrition OS"

# Persist to design-system/MASTER.md
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "fitness nutrition tracking" --design-system --persist -p "Nutrition OS"
```

### Page-Specific Design Systems

Generate design systems for specific screens:

```bash
# Dashboard page
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "fitness dashboard analytics" --design-system --persist -p "Nutrition OS" --page "dashboard"

# Nutrition tracking page
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "food logging nutrition macros" --design-system --persist -p "Nutrition OS" --page "nutrition"

# Workout logging page
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "workout exercise tracking strength" --design-system --persist -p "Nutrition OS" --page "workout"

# Progress visualization page
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "progress charts body composition" --design-system --persist -p "Nutrition OS" --page "progress"
```

This creates a hierarchical structure:

```
design-system/
├── MASTER.md              # Global design system (colors, typography, spacing)
└── pages/
    ├── dashboard.md       # Dashboard-specific overrides
    ├── nutrition.md       # Nutrition page overrides
    ├── workout.md         # Workout page overrides
    └── progress.md        # Progress page overrides
```

## Domain-Specific Searches

Search specific design domains:

```bash
# Find UI styles
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "minimalism" --domain style
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "dark mode" --domain style

# Find color palettes
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "health wellness" --domain color

# Find typography pairings
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "modern clean" --domain typography

# Find chart types for analytics
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "progress tracking" --domain chart
```

## Stack-Specific Guidelines

Your app uses React Native with Expo. Get stack-specific guidelines:

```bash
# React Native specific patterns
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "mobile navigation" --stack react-native

# Form validation patterns
python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "form validation" --stack react-native
```

## Example Prompts for Nutrition OS

### Dashboard Improvements
```
/ui-ux-pro-max Redesign the main dashboard with better macro visualization
/ui-ux-pro-max Create a more engaging daily summary card
/ui-ux-pro-max Improve the date navigator component
```

### Nutrition Features
```
/ui-ux-pro-max Design a better food logging modal with autocomplete
/ui-ux-pro-max Create a macro ring component with animations
/ui-ux-pro-max Improve the nutrition card display
```

### Workout Features
```
/ui-ux-pro-max Design a workout logging interface with exercise selection
/ui-ux-pro-max Create a PR (personal record) badge component
/ui-ux-pro-max Improve the exercise history view
```

### Progress Tracking
```
/ui-ux-pro-max Design a body composition chart with trend lines
/ui-ux-pro-max Create a monthly progress report modal
/ui-ux-pro-max Improve the InBody data visualization
```

### Coach/AI Features
```
/ui-ux-pro-max Design a chat interface for the AI coach
/ui-ux-pro-max Create a voice input modal for food logging
/ui-ux-pro-max Improve the AI recommendations display
```

## What the Skill Provides

### 67 UI Styles
Including: Minimalism, Glassmorphism, Neumorphism, Dark Mode, Soft UI Evolution, Bento Grid, and more

### 161 Color Palettes
Industry-specific palettes aligned with product types (Health & Wellness, Fitness, etc.)

### 57 Font Pairings
Curated typography combinations with Google Fonts imports

### 25 Chart Types
Recommendations for dashboards and analytics (perfect for your progress tracking)

### 15 Tech Stacks
Including React Native, which you're using!

### 99 UX Guidelines
Best practices, anti-patterns, and accessibility rules

### 161 Reasoning Rules
Industry-specific design system generation for health, fitness, and wellness apps

## Pre-Delivery Checklist

The skill automatically validates against common UI/UX issues:

- ✅ No emojis as icons (use SVG: Heroicons/Lucide)
- ✅ cursor-pointer on all clickable elements
- ✅ Hover states with smooth transitions (150-300ms)
- ✅ Text contrast 4.5:1 minimum (WCAG AA)
- ✅ Focus states visible for keyboard navigation
- ✅ prefers-reduced-motion respected
- ✅ Responsive breakpoints: 375px, 768px, 1024px, 1440px

## Next Steps

1. **Generate Master Design System**
   ```bash
   python3 .kiro/steering/ui-ux-pro-max/scripts/search.py "fitness nutrition tracking health wellness" --design-system --persist -p "Nutrition OS"
   ```

2. **Review the Generated System**
   - Check `design-system/MASTER.md` for your global design rules
   - Use this as the source of truth for all UI work

3. **Start Using the Skill**
   ```
   /ui-ux-pro-max Review our current UI and suggest improvements based on the design system
   ```

4. **Iterate on Specific Screens**
   - Generate page-specific design systems as needed
   - Use the skill to implement improvements

## Resources

- **GitHub:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Website:** https://uupm.cc
- **CLI Docs:** Run `uipro --help` for all commands

## Support

If you find this useful, consider supporting the project:
- **PayPal:** https://paypal.me/uiuxpromax

---

**Installation Date:** May 10, 2026
**Version:** Latest (v2.0+)
**Platform:** Kiro
**Project:** Nutrition OS (React Native + Expo)
