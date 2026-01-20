#!/bin/bash
set -e

# --- Script to set up Android development environment on Ubuntu 22.04 ---

echo "🚀 Starting Android development environment setup..."

# 1. Update package lists
sudo apt-get update

# 2. Install dependencies for Android SDK
echo "📦 Installing necessary dependencies..."
sudo apt-get install -y wget unzip curl git openjdk-17-jdk

# 3. Install Node.js using NVM (Node Version Manager)
echo "📦 Installing Node.js via NVM..."
if [ ! -d "$HOME/.nvm" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
else
  echo "NVM is already installed."
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

nvm install 20
nvm use 20
nvm alias default 20

echo "✅ Node.js version $(node -v) installed."

# 4. Set up Android SDK
echo "📦 Setting up Android SDK..."
export ANDROID_HOME=$HOME/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
ANDROID_CMD_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"

# Create SDK directory
mkdir -p $ANDROID_HOME

# Download and unzip command line tools
wget -O cmdline-tools.zip $ANDROID_CMD_TOOLS_URL
unzip -q cmdline-tools.zip -d $ANDROID_HOME
mv $ANDROID_HOME/cmdline-tools $ANDROID_HOME/cmdline-tools-unstable # temporary name
mkdir -p $ANDROID_HOME/cmdline-tools/latest
mv $ANDROID_HOME/cmdline-tools-unstable/* $ANDROID_HOME/cmdline-tools/latest
rm -rf $ANDROID_HOME/cmdline-tools-unstable
rm cmdline-tools.zip

echo "✅ Android command line tools installed."

# 5. Add environment variables to .bashrc
echo "🔧 Configuring environment variables in .bashrc..."
touch ~/.bashrc
if ! grep -q "export ANDROID_HOME" ~/.bashrc; then
  echo '' >> ~/.bashrc
  echo '# Android SDK' >> ~/.bashrc
  echo 'export ANDROID_HOME=$HOME/Android/sdk' >> ~/.bashrc
  echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.bashrc
  echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bashrc
fi

# Source .bashrc to apply changes for the current session
source ~/.bashrc

# 6. Install SDK packages
echo "📦 Installing Android SDK platforms and build-tools..."
# The `yes` command automatically accepts licenses
yes | sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"

# 7. Install Capacitor CLI globally
echo "📦 Installing Capacitor CLI..."
npm install -g @capacitor/cli

echo "✅ Setup complete! 🎉"
echo "👉 Please restart your terminal or run 'source ~/.bashrc' for all changes to take effect."
