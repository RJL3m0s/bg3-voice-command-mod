# Baldur's Gate 3 Voice Command Mod Tool Guide

This guide will walk you through setting up a system where you can speak commands into your phone, have them converted to text, sent to your PC, and then executed as actions in Baldur's Gate 3.

---

## Important Disclaimer

- **Complexity:** This is an advanced project. While I'll provide detailed steps and code, you will need a good understanding of programming concepts (Python, JavaScript/React Native, Lua), networking, and basic modding principles.
- **BG3 Updates:** Baldur's Gate 3 is actively updated. Game patches can and often do break mods, including Script Extender functionality. Be prepared to update your tools and potentially your mod code after major game updates.
- **Security:** This solution involves opening network ports on your PC. While we'll focus on local communication, always be aware of network security. Do not expose your server to the public internet unless you know what you're doing.
- **Debugging:** Expect to spend significant time debugging. Each component (game, PC server, mobile app) can have its own issues.

---

## Overall Architecture

```
[Mobile Phone App] --(WebSocket/Text)--> [PC Server (Python)] --(Local TCP Socket/Text)--> [BG3 Script Extender (Lua Mod)] --> [Baldur's Gate 3 Game]
   (Voice-to-Text on Phone)                 (Command Parsing)                 (Game Interaction)
```

---

## Phase 0: Prerequisites & Setup

Before diving into code, ensure you have the following installed and configured:

### 0.1. Baldur's Gate 3 (PC)
A legitimate copy of Baldur's Gate 3 installed on your PC.

### 0.2. Python 3 (on your PC)
- Download and install the latest Python 3 version: https://www.python.org/downloads/
- Ensure you check "Add Python to PATH" during installation.

### 0.3. Node.js & npm/Yarn (on your PC for React Native development)
- Download and install Node.js (which includes npm): https://nodejs.org/
- Alternatively, you can use Yarn: `npm install -g yarn`

### 0.4. React Native Development Environment (on your PC)
- Follow the official React Native setup guide for "React Native CLI Quickstart" for your specific OS (Windows/macOS) and target mobile OS (Android/iOS): https://reactnative.dev/docs/environment-setup
- This typically involves installing Android Studio (for Android SDK, emulator) and Xcode (for iOS SDK, simulator if on macOS).
- You’ll need a physical Android or iOS device for real-world testing.

### 0.5. Baldur's Gate 3 Script Extender (on your PC)
This is the foundation for in-game modding.

**Installation (Recommended: using BG3 Mod Manager):**
- Download and install BG3 Mod Manager: https://github.com/LaughingLeader/BG3ModManager/releases
- Go to Tools -> Download & Extract Script Extender.
- Launch BG3 once through Steam to allow the Script Extender to self-install and generate settings.
- Enable Script Extender Console for debugging.

**Manual Installation (Alternative):**
- Download the latest DWrite.dll from Norbyte's Script Extender: https://github.com/Norbyte/bg3se/releases
- Place DWrite.dll into your BG3 bin folder (see guide above for paths).
- Launch BG3 once to generate ScriptExtenderSettings.json.
- Edit ScriptExtenderSettings.json to enable the console and logging (see guide for instructions).

---

## Phase 1: In-Game Mod (Lua Script) - Listener

This script will run inside Baldur's Gate 3 (via Script Extender) and listen for commands from your PC server.

### 1.1. Create Your Mod Folder Structure

- Navigate to your Baldur's Gate 3 Data folder.
- Create a new folder named `MyVoiceMod_XXXX` (replace XXXX with a unique identifier).
- Inside, create: `Mods/MyVoiceMod_XXXX/ScriptExtender/Lua/BootstrapServer.lua`

### 1.2. BootstrapServer.lua (In-Game Mod Script)

See [`mod/BootstrapServer.lua`](mod/BootstrapServer.lua) for the full script.

### 1.3. Activate the Mod

- Open BG3 Mod Manager.
- Drag your mod to the active pane, export order to game.
- Launch BG3; the Script Extender console should pop up and print your mod's messages.

---

## Phase 2: PC Server (Python) - Bridge

This Python script will run on your PC, act as a WebSocket server for your phone, and a TCP client for the in-game mod.

### 2.1. Project Setup

- Create a folder for your server, e.g., `BG3VoiceControlServer`, and inside, create `server.py`.
- Open a terminal in this folder.
- Install necessary Python libraries:
    ```
    pip install websockets
    ```

### 2.2. server.py (Python Server Code)

See [`server/server.py`](server/server.py) for the complete code.

### 2.3. Run the PC Server

- In your terminal, navigate to your server folder.
- Run:
    ```
    python server.py
    ```
- You should see output indicating the server is running and trying to connect to the game mod.

---

## Phase 3: Mobile App (React Native) - Interface

### 3.1. Project Setup

- Open your terminal.
- Navigate to a directory where you want to create your React Native project.
- Run:
    ```
    npx react-native init BG3VoiceApp --template react-native-template-typescript
    cd BG3VoiceApp
    npm install react-native-tcp-socket @react-native-voice/voice socket.io-client
    npx pod-install
    ```
- Configure Android/iOS permissions and cleartext traffic as described in the guide.

### 3.2. App.tsx (React Native Code)

See [`mobile/App.tsx`](mobile/App.tsx) for the complete code.

### 3.3. Run the Mobile App

- Make sure your phone is on the same local Wi-Fi network as your PC.
- Update `PC_SERVER_IP` in App.tsx.
- For Android: Connect your device via USB, enable debugging, run `npm run android`.
- For iOS: Connect device, open project in Xcode, click "Run", or use `npm run ios`.

---

## Phase 4: Integrating Game Logic (Lua Mod Extension)

- Use the `execute_game_command` function in your Lua mod to map voice/text commands to game actions.
- Experiment with Osi/Ext functions, look up UUIDs, and extend command support as needed.

---

## Testing Strategy

1. **Start BG3 with Mod:** Launch Baldur's Gate 3. Ensure Script Extender console appears and shows your mod messages.
2. **Start PC Server:** Run `python server.py`. Confirm it's running and connects to the mod.
3. **Run Mobile App:** Build and run on your phone, ensure connection to PC server.
4. **Test Text Input:** Type commands like "jump" and send, observe logs and game action.
5. **Test Voice Input:** Use the voice feature, speak a command, observe logs and game action.
6. **Iterate and Expand:** Add more commands to your mod and app as needed.

---

## Resources

- BG3 Modding Wiki: [https://bg3.wiki/](https://bg3.wiki/)
- Norbyte's Script Extender: [https://github.com/Norbyte/bg3se](https://github.com/Norbyte/bg3se)
- BG3 Modder's Multitool: [https://github.com/ShinyHobo/BG3-Modders-Multitool](https://github.com/ShinyHobo/BG3-Modders-Multitool)

---

Good luck!