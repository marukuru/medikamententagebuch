#!/bin/bash
set -e

# --- Script to set up Android development environment on Ubuntu 22.04 ---
# Dieses Skript automatisiert die Installation und Konfiguration aller
# notwendigen Werkzeuge, um Android-Apps mit Capacitor zu entwickeln.

echo "🚀 Starting Android development environment setup..."

# 1. Paketlisten aktualisieren
# Stellt sicher, dass wir die neuesten Informationen über verfügbare Pakete haben.
echo "📦 Step 1/7: Updating package lists..."
sudo apt-get update

# 2. Notwendige Abhängigkeiten installieren
# wget, unzip, curl, git: Standard-Werkzeuge für Downloads und Versionskontrolle.
# openjdk-17-jdk: Das Java Development Kit, das für den Android-Build-Prozess benötigt wird.
echo "📦 Step 2/7: Installing necessary dependencies..."
sudo apt-get install -y wget unzip curl git openjdk-17-jdk

# 3. Node.js über NVM (Node Version Manager) installieren
# NVM ermöglicht die einfache Verwaltung mehrerer Node.js-Versionen.
echo "📦 Step 3/7: Installing Node.js via NVM..."
if [ ! -d "$HOME/.nvm" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
else
  echo "NVM is already installed."
fi

# NVM für die aktuelle Shell-Sitzung verfügbar machen.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Die neueste Node.js LTS-Version (oder eine spezifische Version) installieren und als Standard festlegen.
nvm install 22
nvm alias default 22
nvm use default

echo "✅ Node.js version $(node -v) installed."

# 4. Android SDK einrichten
echo "📦 Step 4/7: Setting up Android SDK..."
export ANDROID_HOME=$HOME/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
ANDROID_CMD_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"

# SDK-Verzeichnis erstellen
mkdir -p $ANDROID_HOME

# Kommandozeilen-Werkzeuge herunterladen und entpacken
# Die Verzeichnisstruktur muss genau stimmen, damit `sdkmanager` funktioniert.
wget -O cmdline-tools.zip $ANDROID_CMD_TOOLS_URL
unzip -q cmdline-tools.zip -d $ANDROID_HOME
mv $ANDROID_HOME/cmdline-tools $ANDROID_HOME/cmdline-tools-unstable
mkdir -p $ANDROID_HOME/cmdline-tools/latest
mv $ANDROID_HOME/cmdline-tools-unstable/* $ANDROID_HOME/cmdline-tools/latest
rm -rf $ANDROID_HOME/cmdline-tools-unstable
rm cmdline-tools.zip

echo "✅ Android command line tools installed."

# 5. Umgebungsvariablen zur .bashrc hinzufügen
# Dies macht die Android-Werkzeuge in zukünftigen Terminalsitzungen verfügbar.
echo "🔧 Step 5/7: Configuring environment variables in .bashrc..."
touch ~/.bashrc
if ! grep -q "export ANDROID_HOME" ~/.bashrc; then
  echo '' >> ~/.bashrc
  echo '# Android SDK' >> ~/.bashrc
  echo 'export ANDROID_HOME=$HOME/Android/sdk' >> ~/.bashrc
  echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.bashrc
  echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bashrc
fi

# Änderungen für die aktuelle Sitzung übernehmen
source ~/.bashrc

# 6. SDK-Pakete installieren
# `sdkmanager` wird verwendet, um die eigentliche Android-Plattform und die Build-Tools herunterzuladen.
# Der `yes`-Befehl akzeptiert automatisch alle Lizenzen.
echo "📦 Step 6/7: Installing Android SDK platforms and build-tools..."
yes | sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"

# 7. Capacitor CLI global installieren
# Das Capacitor Command Line Interface wird zur Verwaltung der nativen Projekte benötigt.
echo "📦 Step 7/7: Installing Capacitor CLI..."
npm install -g @capacitor/cli

echo "✅ Setup complete! 🎉"
echo "👉 Please restart your terminal or run 'source ~/.bashrc' for all changes to take effect."