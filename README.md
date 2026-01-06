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

    Create a `.env.local` file in the root of the project and add your Supabase and Gemini API keys:
    ```
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_GEMINI_API_KEY=your_gemini_api_key
    ```
    *Note: You can find your Supabase URL and Anon Key in your Supabase project settings under API.*

4.  **Database Setup:**
    Run the following SQL in your Supabase SQL Editor to create the profiles table:
    ```sql
    create table profiles (
      id uuid references auth.users not null primary key,
      updated_at timestamp with time zone,
      name text,
      company_name text,
      phone text,
      email text,
      country text,
      job_role text,
      category_specialization text,
      yearly_est_revenue text
    );

    -- Enable Row Level Security (RLS)
    alter table profiles enable row level security;

    -- Create policies to allow users to manage their own data
    create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
    create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
    create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
    ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.
