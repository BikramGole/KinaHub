# KinaHub 🛍️

KinaHub is a modern, local-first e-commerce and CRM platform designed to bridge the gap between local seller stores and customers. Built as an On-the-Job Training (OJT) project, it supports multi-seller storefronts, localized delivery estimations, full customer relations dashboards, and client-side AI integration to guide customer shopping decisions.

---

## 📽️ Project Video Demo

> [!NOTE]
> *A video demonstration of the project walkthrough will be added here soon.*

---

## 👥 The Team

Meet the developers behind **KinaHub**:

*   **Bikram Gole** (Project Leader) 
    *   GitHub: [@DevXtechnic](https://github.com/DevXtechnic)
*   **Roshan Tamang** 
    *   GitHub: [@Rockyffgod](https://github.com/Rockyffgod)    
*   **Roshan Ghimire** 
    *   GitHub: [@rudragod6-beep](https://github.com/rudragod6-beep)
*   **Ashok Thing** 
    *   GitHub: [@ashokthing](https://github.com/ashokthing)

---

## 🚀 Key Features

### 🛒 Customer Storefront & Navigation
*   **Localized Product Feeds:** Shop products based on local areas and nearby stores.
*   **Advanced Filtering:** Filter and sort by category, price, and customer ratings.
*   **Dynamic Cart & Checkout:** Seamless multi-item cart management with automated delivery fee calculations.

### 🤖 Kina AI Shopping Assistant
*   **OpenRouter Integration:** Interactive chat assistant using OpenRouter APIs to query free state-of-the-art models (like Gemma, Nemotron, etc.).
*   **AI Insight Panels:** Smart, rule-based product summaries, buy signals, and cart optimization tips (e.g., advising users to bundle items from a single store to reduce delivery splits).
*   **Confidence Ranking:** Automatically scans and suggests the best-value items and highest-rated confidence picks.

### 💼 Seller & CRM Dashboard
*   **Store Customization:** Sellers can manage store details, banners, logos, and specific delivery criteria.
*   **Product & Stock Management:** Complete CRUD system for seller listings.
*   **AI CRM Briefings:** Automated stock alerts warning sellers when high-performing items are running low.
*   **CRM Performance Tracking:** Visualize revenue records, units sold, and orders fulfilled.

---

## 🛠️ Technology Stack

*   **Backend:** Django (Python), Django REST Framework
*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion
*   **Database:** SQLite3
*   **AI Engine:** OpenRouter API (client-side LLM inference)

---

## ⚙️ How It Works

KinaHub operates on a decoupled client-server architecture:
1.  **Django Backend API:** Handles all user authentication (JWT-based), relational data (products, stores, orders, cart details), and seeding utilities.
2.  **React Frontend:** Standard SPA powered by Vite. Communicates with Django endpoints using Axios/fetch.
3.  **AI Orchestration:**
    *   When browsing, rule-based algorithms generate insights locally (e.g., analyzing cart totals and seller concentrations).
    *   For conversational shopping, the assistant utilizes a failover list of free LLM models on OpenRouter, authenticating client-side using a configured API key.

---

## 🏃 Getting Started

We have provided convenient scripts to launch the entire project concurrently:

### On Linux / macOS
Make the script executable (if not already) and run it:
```bash
./start.sh
```

### On Windows
Double-click the batch file:
```cmd
start.bat
```

*These scripts automatically launch the Django API server, perform npm installations, boot up the Vite dev server, and open `http://localhost:5173` in your default browser.*
