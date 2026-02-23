# Sentinel Prep Tracker

A high-tech, cybersecurity-themed career preparation and tracking dashboard built with Vanilla Web Technologies (HTML, CSS, JS) and Firebase. It features an integrated "Command Center" Operations Panel, dynamic LeetCode statistics tracking, and an AI-powered aptitude assessment engine using Google's Gemini API.

![Sentinel Prep Tracker Overview](https://via.placeholder.com/800x400?text=Sentinel+Prep+Tracker+Dashboard)

## Features

*   **⚡ 3-Tier Authentication System:** 
    *   **Standard Users:** Register and log in via Email/Password to track personal progress.
    *   **Guest Mode:** Sandboxed, read-only environment to explore the platform without creating an account.
    *   **Admin Command Center:** Hidden login portal (`/admin-login.html`) utilizing a custom ID Card (e.g., `90AS23`) and a secret passphrase to bypass standard authentication.
*   **🧠 AI Assessment Engine:** Uses Google's Gemini Flash `v1beta` API to dynamically generate 5-question multiple-choice quizzes on chosen subjects (Data Structures, Aptitude, Cybersecurity). Falls back gracefully to an offline Question Bank if the API key is missing or quota is exhausted.
*   **💻 Programming Tracker:** Live integration with the LeetCode ALFA API to pull and display your solved problem counts (Easy, Medium, Hard) and synchronize them directly to your Firestore Database.
*   **📅 Daily Operations:** A study schedule tracker to create daily tasks and calculate an overall "Placement Readiness" score.
*   **🛡️ SOC Terminal Logging:** The Command Center features a live Security Operations Center (SOC) Terminal that intercepts global `fetch` requests and records platform activity in a scrolling, retro-green terminal interface.
*   **🌙 Futuristic UI:** Built natively without heavy frameworks, utilizing sleek dark themes, CSS glassmorphism, and responsive CSS grids.

## Installation (Local Development)

Because this project is built entirely on native web standards, getting it running locally takes seconds.

### Prerequisites
*   [Node.js](https://nodejs.org/) installed (for running a simple local server) or a tool like VS Code's "Live Server" extension.
*   A Firebase Account (for database/authentication).

### Setup Steps
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/jeevamp6/sentinel-prep-tracker.git
    cd sentinel-prep-tracker
    ```
2.  **Start a Local Server:**
    Because the application uses ES6 JavaScript Modules (`type="module"`), you cannot simply double-click the HTML files. You must serve them over HTTP.
    
    Using Python:
    ```bash
    python -m http.server 8080
    ```
    Or using Node's `http-server`:
    ```bash
    npx http-server -p 8080
    ```
3.  **Open in Browser:** Navigate to `http://localhost:8080`

## Live Deployment (Vercel)

This project is perfectly suited for zero-config global deployment on Vercel.

1.  Push your code to a GitHub repository.
2.  Log into [Vercel](https://vercel.com).
3.  Click "Add New" -> "Project" and import your GitHub repository.
4.  Leave all settings as default (Framework Preset: Build, Root Directory: `./`).
5.  Click **Deploy**. Your site will be live securely over HTTPS in under 30 seconds.

## How to Set Up the AI Assessment Engine

To enable dynamic quiz generation, you need a free Google AI API Key.
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Log into the Sentinel **Command Center** using your Admin ID Card  and Secret Passphrase  at `/admin-login.html`.
3. In the "AI Assessment Engine Configuration" panel, inject your new API Key and click **Save Global Key**.
4. The system will automatically upgrade the Tests & Quizzes page from "OFFLINE MODE" to the Green "AI SYSTEM READY" state for all users.
