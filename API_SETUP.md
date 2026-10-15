# Vocalis AI — API Key Configuration Guide

This guide details how to obtain, configure, test, and troubleshoot your Google Gemini API key for **Vocalis AI**.

---

## Step 1: Obtain a Google Gemini API Key

1. Navigate to [Google AI Studio API Keys](https://aistudio.google.com/app/apikey).
2. Log in with your Google account.
3. Click **"Create API Key"** (or choose an existing project).
4. Copy the generated API key (it begins with `AIzaSy...`).

---

## Step 2: Configure Environment File

1. Open or create the `.env` file in the `backend/` directory:
   ```bash
   d:\My_Projects\Voice-AI-Data-Analys\backend\.env
   ```
2. Set your API key in the `GEMINI_API_KEY` variable:
   ```env
   GEMINI_API_KEY=AIzaSy...your_actual_api_key_here
   GEMINI_MODEL=gemini-3.5-flash-lite
   FLASK_DEBUG=True
   PORT=5000
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```
3. Save the file.

> **Note:**
> The backend server automatically loads `.env` on startup using `python-dotenv`. Ensure there are no surrounding quotes or whitespace around your key.

---

## Step 3: Command Line Environment Variables (Optional)

You can also export the environment variable directly in your terminal:

### Windows (PowerShell)
```powershell
$env:GEMINI_API_KEY="AIzaSy...your_actual_key"
cd backend
python app.py
```

### Windows (Command Prompt)
```cmd
set GEMINI_API_KEY=AIzaSy...your_actual_key
cd backend
python app.py
```

### Linux / macOS
```bash
export GEMINI_API_KEY="AIzaSy...your_actual_key"
cd backend
python app.py
```

---

## Step 4: Verify and Test API Endpoints

Start the backend server:
```bash
cd backend
python app.py
```

Verify service status by inspecting the health endpoints:

```bash
# Health Check
curl http://localhost:5000/api/health

# AI Status Check
curl http://localhost:5000/api/ai/status
```

Expected JSON response from `/api/ai/status`:
```json
{
  "api_key_configured": true,
  "available_models": [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
    "gemini-1.5-flash"
  ],
  "current_model": "gemini-3.5-flash-lite",
  "status": "healthy"
}
```

---

## Security Best Practices

* **Do Not Commit Keys**: `backend/.env` and `frontend/.env.local` are included in `.gitignore`.
* **Server Isolation**: The Gemini API key is maintained exclusively on the backend server and is never exposed to browser clients.
* **Key Revocation**: If an API key is accidentally exposed, revoke it immediately in Google AI Studio and issue a new key.
