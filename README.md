# 🧠 MediTwin Lite

MediTwin Lite is an ultra-premium, AI-powered medication safety and health analysis platform. Designed with a custom kinetic UI known as **"The Void Engine,"** it bridges the gap between patients and healthcare services by offering real-time drug interaction tracking, automated lab report analysis, and personalized AI medical guidance.

---

## 🚀 Key Features

- 🩺 **AI Clinical Analysis:** Powered by Google Gemini (2.5 Flash), providing clinical-grade rationales, optimized daily medication schedules, and holistic safer regimen recommendations.
- 💊 **Medication Safety Engine:** Automatically detects drug-drug interactions, duplicate therapies, and drug-condition contraindications.
- 📊 **Lab Report Parsing (Multimodal):** Upload lab report PDFs and instantly extract key values, abnormal markers, and get actionable, plain-English summaries.
- 🎙️ **Voice & NLP Parsing:** Speak or type natural language (e.g., "I took a blood thinner") and the AI will automatically map it to structured pharmacological data and health events.
- 🌐 **Live FDA Integration:** Fetches real-time adverse event counts, top reactions, and label snippets directly from the OpenFDA API.
- 📄 **Premium PDF Exports:** Generates Scandinavian-inspired, Apple-style medication safety reports using ReportLab.
- 🎨 **The Void Engine UI:** A deeply immersive, kinetic holographic dark mode interface utilizing "Abyssal Black", bioluminescent purple/neon-cyan accents, and smooth liquid transitions.

---

## 🛠️ Tech Stack

**Frontend (The Void Engine)**
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (Custom Void Engine Design Tokens)
- **Visualizations:** Recharts (Data), React Force Graph 2D (Interaction Networks)
- **Icons:** Lucide React
- **Typography:** Space Grotesk (Headlines) & Inter (Body/Technicals)

**Backend (FastAPI)**
- **Framework:** Python 3.9+ with FastAPI & Uvicorn
- **Data Validation:** Pydantic
- **PDF Generation:** ReportLab
- **Async Requests:** HTTPX (for OpenFDA integrations)

**AI & Machine Learning**
- **LLM:** Google GenAI SDK (`gemini-2.5-flash`) for text, voice parsing, and multimodal PDF vision tasks.

---

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- Python 3.9+
- A Google Gemini API Key

### 1. Backend Setup
Navigate to the root directory and install the Python dependencies:

```bash
# Clone the repository
git clone [https://github.com/your-username/meditwin.git](https://github.com/your-username/meditwin.git)
cd meditwin

# Install Python dependencies
pip install -r requirements.txt

# Create a .env file and add your Google API Key (or pass it via the frontend)
echo "GOOGLE_API_KEY=your_gemini_api_key" > .env

# Run the FastAPI server
uvicorn main:app --reload
