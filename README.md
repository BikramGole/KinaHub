# 🛍️ KinaHub

**KinaHub** is a modern, scalable e-commerce and CRM platform designed to connect local sellers with customers through intelligent, location-aware shopping experiences. Originally developed as an On-the-Job Training (OJT) project, it has evolved into a fully deployed full-stack application with cloud-native infrastructure.

---

## 🌐 Live Architecture

KinaHub is now fully deployed using a modern distributed stack:

* Frontend hosted on [Vercel](https://vercel.com?utm_source=chatgpt.com)
* Backend API hosted on [Render](https://render.com?utm_source=chatgpt.com)
* PostgreSQL database powered by [Neon](https://neon.tech?utm_source=chatgpt.com)
* Media storage handled by [Cloudinary](https://cloudinary.com?utm_source=chatgpt.com)

This setup ensures scalability, performance, and reliability while remaining cost-efficient using free-tier services.

---

## 📽️ Project Demo

https://github.com/user-attachments/assets/410296e2-23d3-401f-85bc-2aef7b2b1a85

---

## 👤 Creator

**Bikram Gole**
Project Developer & Maintainer

* GitHub: https://github.com/DevXtechnic

---

## 🚀 Core Features

### 🛒 Customer Experience

* **Location-Based Shopping:** Discover products from nearby sellers for faster delivery.
* **Advanced Filtering System:** Sort by category, price, and product ratings.
* **Smart Cart System:** Automatic delivery fee calculation and multi-item checkout.

---

### 🤖 Kina AI Assistant

* **LLM-Powered Chat Assistant:** Integrated via OpenRouter for intelligent shopping help.
* **AI Insight Panels:** Product summaries, recommendations, and buying signals.
* **Cart Optimization:** Suggests bundling items from the same store to minimize delivery costs.
* **Confidence Ranking:** Highlights high-value and reliable product choices.

---

### 💼 Seller & CRM Dashboard

* **Store Management:** Customize store branding, delivery zones, and rules.
* **Inventory Control:** Full CRUD functionality for product listings.
* **AI CRM Insights:** Alerts for trending products and low stock levels.
* **Analytics Dashboard:** Track revenue, sales performance, and order metrics.

---

## 🧱 Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Framer Motion

### Backend

* Django
* Django REST Framework

### Database

* PostgreSQL (Neon Cloud)

### AI Integration

* OpenRouter API (client-side LLM orchestration)

### Cloud & Infrastructure

* Vercel (Frontend Hosting)
* Render (Backend Hosting)
* Neon (Database)
* Cloudinary (Media Storage)

---

## ⚙️ System Architecture

KinaHub follows a **decoupled client-server architecture**:

### 1. Backend (Django API)

* JWT-based authentication system
* Handles products, stores, orders, and cart logic
* RESTful API endpoints

### 2. Frontend (React SPA)

* Built with Vite for fast performance
* Communicates with backend via Axios / Fetch
* Fully responsive UI with smooth animations

### 3. AI Layer

* Rule-based optimization engine (cart + seller grouping)
* Optional conversational AI via OpenRouter

---

## 🏃 Local Development Setup

### Linux / macOS

```bash
chmod +x start.sh
./start.sh
```

### Windows

```cmd
start.bat
```

### What the scripts do:

* Start Django backend server
* Install frontend dependencies
* Launch Vite development server
* Open http://localhost:5173

---

## 🧠 Project Status

* Fully functional and deployed
* Independently built and maintained by a solo developer
* Actively evolving with new AI and scalability features

---

## 📌 Vision

KinaHub aims to become a **localized commerce ecosystem**, empowering small businesses with tools typically available only to large-scale platforms—enhanced by AI-driven decision support.

---
