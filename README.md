# 💊 Medikamententagebuch

Eine App zur Erfassung der Einnahme von Medizin und deren Auswirkungen. Verwalten Sie Tagebucheinträge, sehen Sie Statistiken und passen Sie Ihre Daten an.

## ✨ Features

- **Tagebuch:** Erfassen Sie Einnahmen mit Datum, Uhrzeit, Stimmung, Präparat, Dosierung, Effekten und Notizen.
- **Statistiken:** Visualisieren Sie, welche Präparate am häufigsten verwendet werden und wie sie sich auf Stimmungen und Effekte auswirken.
- **Anpassbar:** Verwalten Sie Ihre eigenen Stimmungen, Effekte, Hersteller, Präparate und mehr.
- **Daten-Hoheit:** Exportieren und importieren Sie Ihre gesamten Daten als JSON-Datei.
- **Sicherheit:** Schützen Sie Ihre Daten mit einer PIN-Sperre und biometrischer Authentifizierung (Fingerabdruck).
- **Mehrsprachig:** Verfügbar in Deutsch und Englisch.
- **Cross-Platform:** Läuft im Webbrowser und als native Android-App.
- **Dark Mode:** Wechseln Sie zwischen hellem und dunklem Design.

## 🛠️ Tech Stack

- **Framework:** Angular v18+
- **Styling:** Tailwind CSS
- **State Management:** Angular Signals
- **Native Platform:** Capacitor
- **Build-System:** Angular CLI, Gradle (für Android)

## 🚀 Getting Started

### Web-Version

1.  **Abhängigkeiten installieren:**
    ```bash
    npm install
    ```
2.  **Entwicklungsserver starten:**
    ```bash
    npm start
    ```
    Die App ist unter `http://localhost:4200` erreichbar.

### Android-Version

Stellen Sie sicher, dass Sie eine Android-Entwicklungsumgebung eingerichtet haben. Das `setup_android_dev.sh`-Skript kann dabei helfen (getestet auf Ubuntu 22.04).

1.  **Abhängigkeiten installieren:**
    ```bash
    npm install
    ```
2.  **Android APK erstellen:**
    ```bash
    ./build_apk.sh
    ```
    Die fertige `Medikamententagebuch.apk` finden Sie im Hauptverzeichnis des Projekts.

## 📜 Verfügbare Skripte

- `npm start`: Startet den lokalen Entwicklungsserver.
- `npm run build`: Baut die Web-Anwendung für die Produktion in das `www`-Verzeichnis.
- `npm run android`: Baut die Web-App und führt sie auf einem verbundenen Android-Gerät/Emulator aus.
- `./build_apk.sh`: Führt den kompletten Build-Prozess für die Android APK aus.
- `./setup_android_dev.sh`: Hilfsskript zur Einrichtung der Android-Entwicklungsumgebung auf Ubuntu.

## ⚙️ Benutzte Werkzeuge
- AI Studio (Gemini 2.5 Pro)
- git
- GitHub & GitHub Actions
- Visual Studio Code (GPT-5 mini)