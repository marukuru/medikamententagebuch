#!/bin/bash
set -e

# --- Build script for creating the Android APK ---
# Dieses Skript automatisiert den gesamten Prozess von der Installation der
# Abhängigkeiten über den Web-Build bis hin zur Erstellung der finalen APK-Datei.

echo "🚀 Starting APK build process for Medikamententagebuch..."

# 1. Node.js-Abhängigkeiten installieren
# Stellt sicher, dass alle für den Angular-Build benötigten Pakete vorhanden sind.
echo "📦 Step 1/6: Installing project dependencies..."
npm install

# 2. Die Web-Anwendung bauen
# `npm run build` führt das in `package.json` definierte Build-Skript aus,
# das `ng build` aufruft und die Web-Assets im `www`-Verzeichnis ablegt.
echo "🏗️ Step 2/6: Building the Angular web app with Angular CLI..."
npm run build

# 3. Capacitor initialisieren und Android-Plattform hinzufügen
# Dieser Schritt wird nur ausgeführt, wenn das `android`-Verzeichnis noch nicht existiert.
if [ ! -d "android" ]; then
  echo "🤖 Step 3/6: Initializing Capacitor and adding Android platform..."
  # `cap init` erstellt die Capacitor-Konfigurationsdateien.
  npx cap init "Medikamententagebuch" "com.medikamententagebuch.app" --web-dir "www/browser"
  # `cap add android` erstellt das native Android-Projekt.
  npx cap add android
else
  echo "🤖 Step 3/6: Android platform already exists. Skipping initialization."
fi

# 4. App-Icons und Splash-Screens aus der SVG-Datei generieren
# Verwendet das `@capacitor/assets`-Tool, um alle benötigten Icon-Größen zu erstellen.
if [ -f "icon.svg" ]; then
    echo "🎨 Step 4/6: Generating app icons from icon.svg..."
    # Stellt sicher, dass das Tool installiert ist.
    npm install @capacitor/assets -D
    npx capacitor-assets generate --assetPath . --android
else
    echo "⚠️ Step 4/6: icon.svg not found. Skipping icon generation."
fi


# 5. Web-Assets mit dem nativen Android-Projekt synchronisieren
# `cap sync` kopiert die gebauten Web-Assets (HTML, JS, CSS) in das Android-Projekt.
echo "🔄 Step 5/6: Syncing web assets to Android project..."
npx cap sync android

# 6. Die Debug-APK mit Gradle bauen
# Gradle ist das Build-System für Android. Dieser Befehl kompiliert den
# Java/Kotlin-Code und paketiert alles zu einer installierbaren APK.
echo "🛠️ Step 6/6: Building the APK with Gradle..."
cd android
./gradlew assembleDebug
cd ..

# Die erstellte APK finden und ins Hauptverzeichnis kopieren
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