# Quick Commands - Apex App

## 🚀 Complete Setup (Run Once)

```bash
# 1. Login to Expo
eas login

# 2. Initialize EAS project
eas init

# 3. Configure OTA updates
eas update:configure

# 4. Build first APK (takes 10-15 min)
eas build -p android --profile preview
```

---

## 📱 Daily Development Workflow

```bash
# Test locally
npm start

# Push OTA update to phone
eas update --branch preview --message "Your change description"
```

---

## 🔨 Build Commands

```bash
# Build APK for testing
eas build -p android --profile preview

# Check build status
eas build:list

# View specific build
eas build:view <build-id>
```

---

## 🔄 Update Commands

```bash
# Push update
eas update --branch preview --message "Fixed bug"

# View updates
eas update:list

# View update details
eas update:view <update-id>
```

---

## 📊 Project Info

```bash
# View project details
eas project:info

# View credentials
eas credentials

# Logout
eas logout
```

---

## 🎯 What You Need to Do Now

1. Run `eas login` with your Expo credentials
2. Run `eas init` to link the project
3. Run `eas update:configure` to set up OTA
4. Run `eas build -p android --profile preview` to build APK
5. Install APK on your Samsung A52
6. From then on, just use `eas update` for changes!

---

See `docs/EAS_SETUP_COMPLETE.md` for detailed guide.
