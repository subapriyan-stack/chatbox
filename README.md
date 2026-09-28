# ChatGPT-Like AI Chat UI connected to n8n Webhook

A ChatGPT-style interface built with **HTML5, Vanilla CSS, and JavaScript**, seamlessly integrated with your **n8n AI agent pipeline** and **OpenRouter LLM**.

---

## 🚀 Features

- **ChatGPT Visual Experience**:
  - OpenAI-style dark mode (default), OLED Midnight Black, and Clean Light themes with instant toggle & persistence.
  - Collapsible sidebar with chat history, smart conversation titling, rename, delete, and real-time search.
  - Welcome hero with categorized prompt suggestion cards.
  - Floating bottom input pill with auto-growing textarea and send/stop toggle button.
  
- **Live n8n Backend Integration**:
  - Connected out-of-the-box to:
    ```
    https://james1233387.app.n8n.cloud/webhook/chat
    ```
  - Sends requests with standard fields:
    ```json
    {
      "chatInput": "user query",
      "message": "user query",
      "sessionId": "chat_session_id"
    }
    ```
  - Robust response parsing for both direct markdown strings and JSON structures (`output`, `text`, `response`, `message`).
  - Built-in "Test Ping" button in the Settings and model header dropdown to verify your connection in 1 click.

- **Markdown & Code Block Engine**:
  - Headers, bold, italics, blockquotes, lists, tables, and links.
  - Dark-themed code blocks with language indicators and 1-click **"Copy code"** buttons with checkmark feedback.
  - Word-by-word **typewriter streaming simulation** for that authentic ChatGPT generation feel.

- **Voice & Audio**:
  - 🎤 **Voice Dictation**: Click the microphone icon to speak your prompt using browser speech recognition.
  - 🔊 **Read Aloud**: Click the speaker button on any assistant message to listen via speech synthesis.
  - 🔔 **Synthesized Sound Effects**: Built with the Web Audio API for subtle, clean UI feedback (no external sound files required).

- **Data Management**:
  - Automatic `localStorage` persistence of all conversations.
  - Export chat history to **Markdown (`.md`)** or **JSON (`.json`)**.
  - File/document attachment preview.

---

## 📁 File Structure

```
chatbox/
├── index.html     # Semantic UI layout, SVG icons, and modal templates
├── style.css      # Vanilla CSS design system, themes, and animations
├── app.js         # Chat logic, n8n client, streaming, voice, and audio
├── server.ps1     # Optional lightweight local web server
└── README.md      # Documentation and setup guide
```

---

## 🏃‍♂️ How to Run

### Method 1: Direct File
Double-click `index.html` or open it directly in Google Chrome, Microsoft Edge, or Firefox.

### Method 2: Local HTTP Server (PowerShell)
Right-click `server.ps1` and select **Run with PowerShell**, or in terminal:
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```
This opens `http://127.0.0.1:8080/` in your browser.

---

## ⚙️ Configuration & n8n Setup

1. In the chat interface, click the **Settings (Gear)** icon in the sidebar or header.
2. Verify or update your production webhook URL.
3. Click **Test Ping** to confirm your n8n workflow is responding.
4. Customize your assistant name and preferred theme.
"# chatbox" 
