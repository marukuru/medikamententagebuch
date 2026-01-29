# 💊 Medikamententagebuch

Eine App zur Erfassung der Einnahme von Medizin und deren Auswirkungen. Verwalten Sie Tagebucheinträge, sehen Sie Statistiken und passen Sie Ihre Daten an.

## ✨ Features

-   **✍️ Umfassendes Tagebuch:** Erfassen Sie Einnahmen mit allen relevanten Details:
    -   Datum & Uhrzeit
    -   Stimmung
    -   Symptome
    -   Aktivitäten
    -   Präparat & Dosierung
    -   Positive/Negative Effekte
    -   Freitext-Notizen
-   **📊 Aussagekräftige Statistiken:** Visualisieren Sie Ihre Daten, um Muster zu erkennen:
    -   Top 5 der am häufigsten verwendeten Präparate.
    -   Zusammenhänge zwischen Stimmungen und Präparaten.
    -   Analyse von positiven und negativen Effekten pro Präparat.
    -   Auswertung, welche Präparate bei bestimmten Symptomen oder Aktivitäten Linderung verschaffen.
-   **⚙️ Hohe Anpassbarkeit:** Passen Sie die App an Ihre Bedürfnisse an:
    -   **Modulare Ansicht:** Aktivieren oder deaktivieren Sie einzelne Module (Dosierung, Symptome, Effekte etc.), um die Benutzeroberfläche zu vereinfachen.
    -   Verwalten Sie Ihre eigenen Stimmungen, Symptome, Aktivitäten, Effekte, Hersteller, Präparate und mehr.
    -   Fügen Sie eigene Emojis zum Emoji-Picker hinzu.
-   **⏰ Intelligente Erinnerungen:**
    -   Richten Sie tägliche oder wöchentliche Benachrichtigungen ein, um keinen Eintrag zu vergessen.
-   **🔒 Sicherheit & Datenschutz:** Schützen Sie Ihre sensiblen Daten:
    -   Aktivieren Sie eine App-Sperre mit einer 4-stelligen PIN.
    -   Nutzen Sie biometrische Authentifizierung (Fingerabdruck/Face ID) zum schnellen Entsperren.
    -   Konfigurieren Sie einen Auto-Lock-Timer.
-   **🔄 Daten-Hoheit:** Sie haben die volle Kontrolle über Ihre Daten:
    -   Exportieren und importieren Sie Ihre gesamten Daten als lesbare JSON-Datei.
    -   Setzen Sie die App bei Bedarf vollständig auf den Werkszustand zurück.
-   **🌐 Mehrsprachig & Theming:**
    -   Verfügbar in Deutsch und Englisch.
    -   Wechseln Sie nahtlos zwischen einem hellen und einem dunklen Design (Dark Mode).
-   **📱 Cross-Platform:**
    -   Läuft im modernen [Webbrowser](https://marukuru.github.io/medikamententagebuch/) und als native [Android-App](https://github.com/marukuru/medikamententagebuch/releases).

## 📜 Lizenz

Dieses Projekt ist unter der [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International Lizenz (CC BY-NC-SA 4.0)](https://creativecommons.org/licenses/by-nc-sa/4.0/) lizenziert.

Das bedeutet zusammengefasst:

-   **✅ Teilen:** Sie dürfen das Material in jedwedem Format oder Medium vervielfältigen und weiterverbreiten.
-   **✅ Bearbeiten:** Sie dürfen das Material remixen, verändern und darauf aufbauen.
-   **📋 Namensnennung (Attribution):** Sie müssen angemessene Urheber- und Rechteangaben machen, einen Link zur Lizenz beifügen und angeben, ob Änderungen vorgenommen wurden.
-   **❌ Nicht kommerziell (NonCommercial):** Sie dürfen das Material **nicht** für kommerzielle Zwecke nutzen.
-   **🔄 Weitergabe unter gleichen Bedingungen (ShareAlike):** Wenn Sie das Material remixen, verändern oder anderweitig direkt darauf aufbauen, müssen Sie Ihre Beiträge unter derselben Lizenz wie das Original verbreiten.

Die vollständigen Lizenzbedingungen finden Sie in der `LICENSE`-Datei.

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
- Android Studio
- git
- GitHub & GitHub Actions
- Visual Studio Code (GPT-5 mini)
