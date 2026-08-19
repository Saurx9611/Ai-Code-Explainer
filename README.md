# 🚀 AI Code Explainer & Refactorer

<div align="center">

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)

**Elevate Your Code Quality With AI-Powered Static Analysis**

[**Live Demo**](#) • [**Report a Bug**](#)
</div>

---

## 🎯 What it does

The **AI Code Explainer & Refactorer** is an elite, full-stack static analysis tool. It parses your source code and leverages the Gemini API to detect anti-patterns, security flaws, and performance bottlenecks before they hit production. 

> **Key Features:**
> * **🧠 AST Analysis:** Deep semantic understanding of your code structure.
> * **⏱️ Big-O Complexity Checks:** Pinpoints exponential recursion, nested loops, and memory leaks.
> * **🛡️ Security Audits:** Detects SQL injections, path traversals, and unhandled exceptions instantly.

## 🏗️ Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React + Vite | Blazing fast, Monaco-editor powered IDE interface. |
| **Backend** | FastAPI + Python | High-performance async API gateway. |
| **Intelligence** | Gemini API | Deep-learning model for semantic code reasoning. |

## 💻 Local Setup

Get the application running locally in less than 2 minutes.

### 1. Clone & Environment

```bash
git clone https://github.com/your-username/ai-code-explainer.git
cd ai-code-explainer
```

Ensure you have your Gemini API key ready. Create a `.env` in the `Backend` directory:
```env
GEMINI_API_KEY=your_api_key_here
```

### 2. Run the Backend (FastAPI)

```bash
cd Backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*API will be live at `http://localhost:8000`*

### 3. Run the Frontend (Vite)

Open a new terminal window:
```bash
cd Frontend
npm install
npm run dev
```
*App will be live at `http://localhost:5173`*
