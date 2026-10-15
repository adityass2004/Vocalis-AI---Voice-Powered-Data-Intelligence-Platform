# Vocalis AI --- Voice-Powered Data Intelligence Platform

> **Ask your data. Hear the insights. Make smarter decisions.**

Vocalis AI is a voice-driven data intelligence and conversational
analytics platform. Upload a CSV or Excel dataset, ask questions using
voice or text, explore statistical summaries and correlations, generate
interactive visualizations, and listen to AI-generated insights.

## Table of Contents

-   [Overview](#overview)
-   [Key Features](#key-features)
-   [System Architecture](#system-architecture)
-   [Technology Stack](#technology-stack)
-   [Getting Started](#getting-started)
-   [Docker Deployment](#docker-deployment)
-   [How to Use](#how-to-use)
-   [API Reference](#api-reference)
-   [Project Structure](#project-structure)
-   [Configuration](#configuration)
-   [Troubleshooting](#troubleshooting)
-   [Security Notes](#security-notes)
-   [Roadmap Ideas](#roadmap-ideas)
-   [License](#license)

------------------------------------------------------------------------

## Overview

Vocalis AI brings together conversational AI, voice interaction, and
exploratory data analysis in one interface. It is designed to make
common data questions easier to ask and easier to understand without
requiring users to manually build every chart or calculate every
statistic.

### Typical workflow

1.  Upload a CSV or Excel file, or select a sample dataset.
2.  Inspect the dataset overview, column types, missing values, and
    sample records.
3.  Ask a question using text or the microphone.
4.  Let the backend interpret the request and perform relevant data
    analysis.
5.  Review the response, statistics, and suggested visualizations.
6.  Listen to the response using text-to-speech.

## Key Features

### 🎙️ Voice and conversational interaction

-   **Speech input:** Use the browser's Web Speech Recognition support
    where available.
-   **Text-to-speech:** Generate spoken responses using the configured
    backend TTS engine, such as gTTS or pyttsx3.
-   **Voice activity feedback:** Animated visualizer and status
    indicators communicate listening and response states.
-   **Conversation context:** Retain conversation history and dataset
    context to support follow-up questions.

> Browser speech-recognition support varies by browser and operating
> system. Microphone access generally requires permission and a secure
> context; localhost is commonly treated as a secure development
> context.

### 📊 Data analytics

-   **File ingestion:** Upload CSV, `.xlsx`, and `.xls` datasets (the
    application describes a 50 MB limit).
-   **Dataset overview:** View row counts, columns, inferred types, and
    sample records.
-   **Descriptive statistics:** Mean, median, standard deviation, range,
    quartiles, and interquartile range (IQR).
-   **Data quality:** Identify missing values, column completeness, and
    schema information.
-   **Correlation analysis:** Explore Pearson correlations between
    numerical columns.
-   **Interactive charts:** Generate bar, line, scatter, and area charts
    with Recharts.

### 🧠 Gemini-powered assistance

-   Natural-language question interpretation and dataset-aware answers.
-   Structured responses for displaying insights and chart options.
-   Model fallback logic across supported Gemini Flash models, depending
    on backend configuration.

**Model configuration note:** The supplied project description names
`gemini-3.5-flash-lite`. Confirm that this exact model ID is available
to your Google AI Studio API key and supported by the installed SDK.
Keep the model ID configurable rather than assuming it is universally
available.

### 🎨 User interface

-   React + Vite frontend.
-   Tailwind CSS and custom glassmorphism styling.
-   Outfit and Inter typography.
-   Framer Motion animations for interface transitions and interactions.

## System Architecture

The diagram below describes the main logical flow from the browser to
the Flask backend and its AI, data-processing, and speech services.

``` mermaid
flowchart TD
    U[User] --> UI[React + Vite UI]
    UI --> IN{Input type}
    IN -->|Voice| STT[Browser Web Speech Recognition]
    IN -->|Text| Q[Text query]
    STT --> Q
    UI -->|CSV / Excel upload| API[Flask REST API]
    Q --> API

    API --> ROUTES[AI routes and data routes]
    ROUTES --> DATA[Data service<br/>Pandas / SciPy]
    ROUTES --> GEMINI[Gemini service]
    ROUTES --> TTS[TTS service<br/>gTTS / pyttsx3]

    DATA --> RESULT[Structured analysis results]
    GEMINI --> ANSWER[Conversational response]
    RESULT --> RESP[API response]
    ANSWER --> RESP
    RESP --> UI
    UI --> CHARTS[Recharts visualizations]
    UI -->|Text to synthesize| TTS
    TTS --> AUDIO[Generated audio]
    AUDIO --> UI
```

### Component responsibilities

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  **React + Vite frontend**           User interface, dataset
                                      interactions, chat, voice controls,
                                      and rendering results

  **Browser Web Speech API**          Converts spoken questions to text
                                      where supported

  **Flask API**                       Exposes REST endpoints and
                                      coordinates requests

  **Data service**                    Loads tabular data and calculates
                                      dataset statistics, quality
                                      information, and query results

  **Gemini service**                  Interprets natural-language
                                      requests and generates
                                      conversational responses

  **TTS service**                     Converts response text into audio
                                      using the configured synthesis
                                      engine

  **Recharts**                        Renders interactive charts in the
                                      browser
  -----------------------------------------------------------------------

The diagram is a logical architecture based on the described repository
structure. Exact request sequencing and the selected TTS engine should
be verified against the current source code.

## Technology Stack

  Layer                   Technologies
  ----------------------- -------------------------------------------------
  Frontend                React, Vite, JavaScript
  Styling and animation   Tailwind CSS, custom CSS, Framer Motion
  Charts                  Recharts
  Backend                 Python, Flask
  Data processing         Pandas, SciPy
  Conversational AI       Google Gemini API
  Speech input            Browser Web Speech Recognition API
  Speech output           gTTS and/or pyttsx3, according to configuration
  Deployment              Docker Compose

## Getting Started

### Prerequisites

-   Node.js **18 or newer**
-   Python **3.11 or newer**
-   A Google Gemini API key from [Google AI
    Studio](https://aistudio.google.com/)
-   Git
-   Optional: Docker and Docker Compose

### 1. Clone the repository

``` bash
git clone https://github.com/charan22640/voice-ai-data-analyst.git
cd voice-ai-data-analyst
```

### 2. Configure the backend

``` bash
cd backend
python -m venv venv
```

Activate the virtual environment:

**Windows PowerShell**

``` powershell
.\venv\Scripts\Activate.ps1
```

**Windows Command Prompt**

``` bat
venv\Scripts\activate
```

**Linux / macOS**

``` bash
source venv/bin/activate
```

Install dependencies:

``` bash
pip install -r requirements.txt
```

Create `backend/.env`:

``` dotenv
GEMINI_API_KEY=replace_with_your_gemini_api_key
FLASK_DEBUG=True
PORT=5000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

Replace the placeholder with your own key. **Do not commit `.env` files
or API keys to Git.**

### 3. Configure the frontend

Open a second terminal from the repository root:

``` bash
cd frontend
npm install
```

Create `frontend/.env.local`:

``` dotenv
VITE_API_URL=http://localhost:5000
```

Vite exposes variables prefixed with `VITE_` to browser code. Do not put
secret keys in frontend environment variables.

### 4. Run the application

**Terminal 1 --- backend**

``` bash
cd backend
# Activate the virtual environment if it is not already active
python app.py
```

**Terminal 2 --- frontend**

``` bash
cd frontend
npm run dev
```

Open the development URL printed by Vite, typically:

-   `http://localhost:5173`

The frontend configuration also mentions port `3000`; use it only if the
frontend is configured to run on that port.

## Docker Deployment

If the repository's Docker Compose configuration is complete and
configured, you can build and start the services with:

``` bash
docker compose up --build
```

Before starting, provide the Gemini API key through the backend
environment configuration expected by `docker-compose.yml`. Do not place
real secrets in the Compose file or commit them to source control.

To stop the services:

``` bash
docker compose down
```

**Deployment check:** Confirm the published frontend/backend ports,
environment-file paths, health checks, and service names in
`docker-compose.yml` before deploying. Those details can vary by
repository version.

## How to Use

1.  **Upload a dataset:** Choose a CSV or Excel file, or select a
    built-in sample dataset such as Sales Data, Employee Data, or Web
    Traffic.
2.  **Review the overview:** Inspect row and column counts, sample rows,
    inferred types, and missing values.
3.  **Explore statistics:** Review mean, median, standard deviation,
    range, quartiles, and IQR for applicable numeric columns.
4.  **Inspect correlations:** Use the Pearson correlation matrix to
    explore linear relationships between numeric variables.
5.  **Create visualizations:** Choose suitable columns and render a bar,
    line, scatter, or area chart.
6.  **Ask a question:** Type a question or use the microphone if browser
    speech recognition is supported.
7.  **Listen to the response:** Use the available audio control to hear
    the synthesized answer.

### Example questions

-   "Summarize this dataset."
-   "What is the revenue trend over time?"
-   "Which region has the highest sales?"
-   "Are there missing values in employee salaries?"
-   "Show the relationship between visitors and conversions."
-   "Compare the average salary across departments."

The exact queries supported depend on the active dataset and the backend
query implementation.

## API Reference

The following endpoints are described by the project. Request schemas
and response bodies should be confirmed against the current Flask route
implementations.

### AI endpoints --- `/api/ai`

  ----------------------------------------------------------------------------------------------------------
  Method            Endpoint           Purpose           Example request
  ----------------- ------------------ ----------------- ---------------------------------------------------
  `POST`            `/api/ai/chat`     Send a message to `{"message":"Summarize dataset","context":"..."}`
                                       the AI assistant  

  `POST`            `/api/ai/tts`      Generate speech   `{"text":"Total revenue is 50000"}`
                                       audio from text   

  `GET`             `/api/ai/status`   Check AI          No body
                                       service/API       
                                       status            
  ----------------------------------------------------------------------------------------------------------

### Data endpoints --- `/api/data`

  -------------------------------------------------------------------------------------------------
  Method            Endpoint               Purpose           Request
  ----------------- ---------------------- ----------------- --------------------------------------
  `POST`            `/api/data/upload`     Upload a CSV or   `multipart/form-data`, field name as
                                           Excel file        expected by backend

  `POST`            `/api/data/query`      Query the active  `{"query":"Show revenue by region"}`
                                           dataset           

  `GET`             `/api/data/info`       Retrieve active   No body
                                           dataset metadata  

  `GET`             `/api/data/insights`   Retrieve          No body
                                           generated dataset 
                                           insights          
  -------------------------------------------------------------------------------------------------

### Example: TTS request

``` bash
curl -X POST http://localhost:5000/api/ai/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Total revenue is 50000"}'
```

The response content type and audio encoding depend on the Flask route
implementation. Check `backend/routes/ai.py` for the exact response
contract.

## Project Structure

``` text
voice-ai-data-analyst/
├── backend/
│   ├── app.py
│   ├── routes/
│   │   ├── ai.py
│   │   └── data.py
│   ├── services/
│   │   ├── gemini_service.py
│   │   ├── data_service.py
│   │   └── tts_service.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── index.css
│   │   └── App.jsx
│   ├── tailwind.config.js
│   └── package.json
└── docker-compose.yml
```

## Configuration

  -----------------------------------------------------------------------
  Variable                Used by                 Description
  ----------------------- ----------------------- -----------------------
  `GEMINI_API_KEY`        Backend                 Secret key for Gemini
                                                  API access

  `FLASK_DEBUG`           Backend                 Enables/disables Flask
                                                  debug behavior

  `PORT`                  Backend                 Port used by the Flask
                                                  server, if read by
                                                  `app.py`

  `CORS_ORIGINS`          Backend                 Allowed frontend
                                                  origins, if wired into
                                                  Flask CORS
                                                  configuration

  `VITE_API_URL`          Frontend                Base URL for backend
                                                  API requests
  -----------------------------------------------------------------------

Only variables actually read by the application have an effect. Check
the source code and deployment configuration if a value appears to be
ignored.

## Troubleshooting

### 1. "API key not valid"

-   Check that `GEMINI_API_KEY` is set in the backend environment.
-   Confirm the key is valid and the corresponding API is enabled for
    your project.
-   Restart the Flask process after changing environment variables.
-   Verify that the configured Gemini model ID is available to your
    account.

### 2. `500 Internal Server Error` during file upload

-   Read the Flask traceback in the backend terminal.
-   Confirm that the uploaded file is a supported CSV or Excel format.
-   Check installed dependencies and Excel reader support.
-   Validate file size, encoding, column types, and malformed rows.
-   Avoid returning sensitive server tracebacks to production users.

### 3. Microphone or Web Speech API does not work

-   Grant microphone permission in the browser.
-   Try a browser with Web Speech Recognition support.
-   Use localhost or HTTPS rather than an insecure remote origin.
-   Check browser console errors and confirm the recognition event
    handlers are wired correctly.
-   Remember that browser support and language availability vary.

### 4. Frontend cannot reach Flask

-   Confirm the backend is running on the configured port.
-   Check `VITE_API_URL`.
-   Verify CORS allowed origins include the frontend's actual
    development URL.
-   Restart Vite after changing `.env.local`.

### 5. TTS audio is not returned or played

-   Inspect the `/api/ai/tts` response and content type.
-   Confirm the selected TTS engine and its system dependencies are
    installed.
-   Check browser autoplay restrictions; user interaction may be
    required to play audio.

## Security Notes

-   Keep Gemini API keys on the backend and out of browser bundles.
-   Add upload size limits, file-type validation, and robust error
    handling.
-   Treat uploaded datasets as untrusted input.
-   Apply authentication and authorization if the application is exposed
    beyond local development.
-   Restrict CORS to trusted origins in production.
-   Avoid logging private dataset rows, secrets, or full user prompts
    unnecessarily.
-   Disable Flask debug mode in production.
-   Review dependency versions and container configuration before public
    deployment.

## Roadmap Ideas

Potential enhancements, depending on project requirements:

-   Add automated tests for data processing, API routes, and voice
    workflows.
-   Evaluate ASR quality and response latency on a documented test set.
-   Improve handling of large files through chunked processing or
    background jobs.
-   Add exportable reports and reproducible analysis summaries.
-   Add multilingual speech input/output where supported.
-   Add authentication, dataset isolation, and multi-user workspaces if
    needed.

## License

The project description states that Vocalis AI is distributed under the
**MIT License**. See the repository's `LICENSE` file for the
authoritative license text.
