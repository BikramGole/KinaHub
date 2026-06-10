# 🛍️ KinaHub

KinaHub is a modern, local-first e-commerce and CRM platform designed to bridge the gap between local seller stores and customers. Built as an On-the-Job Training (OJT) project, it supports multi-seller storefronts, localized delivery estimations, full customer relationship dashboards, and client-side AI integration to assist shopping decisions.

---

## 📽️ Project Video Demo

https://github.com/user-attachments/assets/410296e2-23d3-401f-85bc-2aef7b2b1a85

---

## 👤 Creator

**Bikram Gole** (Project Developer & Maintainer)

- GitHub: [@DevXtechnic](https://github.com/DevXtechnic)

---

## 🚀 Key Features

### 🛒 Customer Storefront & Navigation

- **Localized Product Feeds:** Shop products based on local areas and nearby stores.
- **Advanced Filtering:** Filter and sort by category, price, and ratings.
- **Dynamic Cart & Checkout:** Multi-item cart with automated delivery fee calculations.

### 🤖 Kina AI Shopping Assistant

- **OpenRouter Integration:** Chat assistant powered by free state-of-the-art models (Gemma, Nemotron, etc.).
- **AI Insight Panels:** Rule-based product summaries, buy signals, and cart optimization tips (e.g., suggesting bundling items from the same store to reduce delivery splits).
- **Confidence Ranking:** Highlights best-value and high-confidence product picks.

### 💼 Seller & CRM Dashboard

- **Store Customization:** Sellers manage store details, banners, logos, and delivery rules.
- **Product & Stock Management:** Full CRUD system for product listings.
- **AI CRM Briefings:** Stock alerts for high-performing items running low.
- **Performance Tracking:** Revenue, sales, and order analytics dashboard.

---

## 🛠️ Technology Stack

- **Backend:** Django (Python), Django REST Framework  
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Framer Motion  
- **Database:** SQLite3  
- **AI Engine:** OpenRouter API (client-side LLM integration)

---

## ⚙️ How It Works

KinaHub runs on a decoupled client-server architecture:

1. **Django Backend API**
	- Handles authentication (JWT-based)
	- Manages products, stores, orders, and cart logic
	- Provides seeding utilities

2. **React Frontend**
	- SPA built with Vite
	- Communicates with backend via Axios/fetch

3. **AI Orchestration**
	- Rule-based local insights (cart optimization, seller grouping)
	- Optional conversational AI using OpenRouter model routing

---

## 🏃 Getting Started

### Linux / macOS

```bash
chmod +x start.sh
./start.sh
```

### Windows

```cmd
start.bat
```

These scripts automatically:

- Start Django API server  
- Install npm dependencies  
- Launch Vite dev server  
- Open `http://localhost:5173`

---

## 🧠 Project Status

Solo-built project by **Bikram Gole**.  
Maintained and developed independently.

