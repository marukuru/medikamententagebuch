#!/bin/bash
set -e

# --- Build script for creating the Android APK ---

echo "🚀 Starting APK build process for Medikamententagebuch..."

# 1. Install dependencies
echo "📦 Step 1/6: Installing project dependencies..."
npm install

# 2. Build the web application
echo "🏗️ Step 2/6: Building the Angular web app with Angular CLI..."
npm run build

# 3. Initialize Capacitor and add Android platform (if not already present)
if [ ! -d "android" ]; then
  echo "🤖 Step 3/6: Initializing Capacitor and adding Android platform..."
  npx cap init "Medikamententagebuch" "com.medikamententagebuch.app" --web-dir "www"
  npx cap add android
else
  echo "🤖 Step 3/6: Android platform already exists. Skipping initialization."
fi

# 4. Generate App Icons and Splash Screens from SVG
if [ -f "icon.svg" ]; then
    echo "🎨 Step 4/6: Generating app icons from icon.svg..."
    # Capacitor Assets requires the package to be installed, let's ensure it is.
    npm install @capacitor/assets -D
    npx capacitor-assets generate --iconPath icon.svg --splashPath icon.svg --android
else
    echo "⚠️ Step 4/6: icon.svg not found. Skipping icon generation."
fi


# 5. Sync web assets with the native Android project
echo "🔄 Step 5/6: Syncing web assets to Android project..."
npx cap sync android

# 6. Build the debug APK using Gradle
echo "🛠️ Step 6/6: Building the APK with Gradle..."
cd android
./gradlew assembleDebug
cd ..

# Find the APK and copy it to the root directory
APK_PATH=$(find android/app/build/outputs/apk/debug -name "*.apk" | head -n 1)

if [ -f "$APK_PATH" ]; then
  cp "$APK_PATH" ./Medikamententagebuch.apk
  echo ""
  echo "✅ Build successful! 🎉"
  echo "👉 Your APK is ready: Medikamententagebuch.apk"
else
  echo "❌ Build failed. Could not find the generated APK."
  exit 1
fi