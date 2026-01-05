# Auctave - Garment Sourcing Platform

This project is a comprehensive front-end prototype for **Auctave**, a B2B platform designed to streamline the garment sourcing and manufacturing process. It provides a suite of tools for sourcing managers to find factories, request quotes, manage orders, and track production progress.

The application is built as a single-page application (SPA) and features a rich, interactive user interface with multiple dashboards and AI-powered assistance features.

## ✨ Features

*   **Sourcing Dashboard:** Search, filter, and discover garment factories based on various criteria like specialty, location, rating, and certifications.
*   **AI Sourcing Tools:** Leverage AI (via Google's Gemini API) to:
    *   Generate professional contract briefs.
    *   Draft outreach emails to factories.
    *   Suggest cost, quality, and sustainability optimizations.
    *   Provide negotiation tips and cultural advice.
*   **Factory Profiles:** View detailed factory information, including image galleries, specialties, production capacity, and product catalogs.
*   **Quote Management:** Submit detailed quote requests to factories and manage the negotiation and acceptance process.
*   **CRM Portal:** A multi-view Customer Relationship Management tool to track order progress. Includes:
    *   **Dashboard View:** Visual charts and stats for a high-level overview.
    *   **List & Board Views:** Kanban-style and list-based task management.
    *   **TNA (Time and Action) Calendar:** Detailed timeline of all production tasks.
    *   **Gantt Chart View:** Visual project timeline for order tasks.
*   **Order Tracking:** A step-by-step visual tracker for shipments from production to delivery.
*   **Billing & Escrow:** A dashboard to manage and track order payments held in escrow.
*   **AI Chat Support:** An integrated chatbot ("Auctave Brain") to assist users with sourcing-related queries.

## 🛠 Tech Stack

*   **Framework:** React with Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Icons:** Lucide React
*   **Charting:** Recharts
*   **AI Integration:** Google Gemini API

## 🚀 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/rishitshah12/auctave-user-app.git
    cd auctave-user-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    The application uses the Google Gemini API for its AI features. You will need to get an API key from Google AI Studio.

    Create a `.env.local` file in the root of the project and add your API key:
    ```
    VITE_GEMINI_API_KEY=YOUR_API_KEY_HERE
    ```
    *Note: The code currently has the API key hardcoded as an empty string. To use the AI features, you'll need to modify the `callGeminiAPI` function to read this environment variable.*

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.
