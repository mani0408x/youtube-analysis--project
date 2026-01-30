# Deployment Guide for Render

This guide outlines the steps to deploy the YouTube Analytics & Insight Dashboard to [Render](https://render.com/).

## 1. Prerequisites

*   A [Render](https://render.com/) account.
*   This project pushed to a GitHub or GitLab repository.
*   Required API Keys:
    *   Google Cloud Console Credentials (Client ID, Client Secret, YouTube Data API Key).
    *   Hugging Face API Key.
    *   (Optional) External Database URI (e.g., Render PostgreSQL, Supabase, or other MySQL provider).

## 2. Quick Start with `render.yaml` (Blueprint)

This project includes a `render.yaml` file for Infrastructure as Code (IaC) deployment.

1.  In the Render Dashboard, go to **Blueprints**.
2.  Click **New Blueprint Instance**.
3.  Connect your repository.
4.  Render will detect the `render.yaml` and prompt for the following environment variables:
    *   `GOOGLE_CLIENT_ID`
    *   `GOOGLE_CLIENT_SECRET`
    *   `YOUTUBE_API_KEY`
    *   `HUGGINGFACE_API_KEY`
    *   `DATABASE_URI` (See Section 4 regarding Database)

## 3. Manual Deployment (Web Service)

If you prefer to configure manually:

1.  Create a new **Web Service** on Render.
2.  Connect your repository.
3.  **Name**: `youtube-analytics` (or your choice).
4.  **Runtime**: `Python 3`.
5.  **Build Command**: `pip install -r requirements.txt`
6.  **Start Command**: `gunicorn run:app --bind 0.0.0.0:$PORT`
7.  **Environment Variables**:
    *   `PYTHON_VERSION`: `3.10.0`
    *   `FLASK_APP`: `run.py`
    *   `SECRET_KEY`: (Generate a random string)
    *   Plus the API keys listed in Section 2.
    *   **Note**: The project includes a `.python-version` file to ensure Render uses Python 3.10.12, which is required for compatibility.

## 4. Database Configuration

The application supports both SQLite (default) and external databases (MySQL/PostgreSQL).

*   **SQLite**: By default, the app uses a local `database.db` file.
    *   **Warning**: On Render's free tier, the filesystem is **ephemeral**. This means every time you redeploy or the server restarts, **all data in `database.db` will be lost.**
    *   This is fine for testing but **not recommended for production**.

*   **External Database (Recommended)**:
    *   Provision a PostgreSQL database on Render (or use an external MySQL provider).
    *   Get the **Internal Connection URL** (if on Render) or the full connection string.
    *   Set the `DATABASE_URI` environment variable to this connection string.
    *   **Note**: If using PostgreSQL, you may need to install `psycopg2-binary`. The current project uses `PyMySQL` for MySQL. If you choose Render's PostgreSQL, add `psycopg2-binary` to `requirements.txt` and update the Protocol in the URI to `postgresql+psycopg2://...`.
    *   **Stick to MySQL** if you want to avoid code changes, or update `requirements.txt` to include the appropriate driver for your DB choice.

## 5. Google OAuth Configuration

Since the domain will change after deployment:

1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Navigate to **APIs & Services > Credentials**.
3.  Edit your **OAuth 2.0 Client ID**.
4.  Add your Render URL to **Authorized JavaScript origins**:
    *   `https://your-app-name.onrender.com`
5.  Add the callback URL to **Authorized redirect URIs**:
    *   `https://your-app-name.onrender.com/google/auth/callback` (or whatever your callback route is configured as).
    *   *Check `backend/routes/auth.py` if unsure of the exact callback path.*

## 6. Project Structure Overview

*   **`run.py`**: The entry point for the application.
*   **`backend/`**: Contains the Flask app, API routes, and logic.
*   **`frontend/public/`**: Contains static HTML/CSS/JS files served by Flask.
*   **`render.yaml`**: Configuration for Render Blueprints.

## 7. Troubleshooting

*   **Build Failed**: Check the logs to see if a dependency failed to install. Ensure `requirements.txt` is correct.
*   **Application Error**: Check the **Logs** tab in Render. Common issues include missing environment variables or database connection failures.
*   **Quota Exceeded**: If the AI features stop working, check your API quotas (Gemini/Hugging Face).
*   **OAuth Error: "doesn't comply with Google's OAuth 2.0 policy"**: This means your Render URL is not in the "Authorized JavaScript origins". Go to Google Cloud Console > APIs & Services > Credentials, edit your Client ID, and add `https://your-app-name.onrender.com` (no trailing slash) to **Authorized JavaScript origins**.
