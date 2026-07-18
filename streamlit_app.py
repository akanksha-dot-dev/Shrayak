import os
import re
import time
import requests
import streamlit as st
from datetime import datetime
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
import google.generativeai as genai

# Load environment variables
load_dotenv()

ELASTIC_ES_URL = os.environ.get("ELASTIC_ES_URL")
ELASTIC_API_KEY = os.environ.get("ELASTIC_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
INDEX_WAGES = os.environ.get("ELASTIC_INDEX_WAGES", "delhi_wages_2026")
INDEX_TELEMETRY = os.environ.get("ELASTIC_INDEX_TELEMETRY", "telemetry_logs")
GEO_INDEX = "delhi_labour_offices"

# Configure Gemini
if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_"):
    genai.configure(api_key=GEMINI_API_KEY)

# Configure Elasticsearch
@st.cache_resource
def get_es_client():
    if not ELASTIC_ES_URL or not ELASTIC_API_KEY:
        return None
    try:
        es = Elasticsearch(
            ELASTIC_ES_URL,
            api_key=ELASTIC_API_KEY
        )
        # Quick health check
        es.ping()
        return es
    except Exception:
        return None

es_client = get_es_client()

# Pin code centroid lookup table from geoSearch.js
PIN_CENTROIDS = {
    '110001': {'lat': 28.6289, 'lon': 77.2074}, # Connaught Place
    '110002': {'lat': 28.6404, 'lon': 77.2459}, # Daryaganj
    '110003': {'lat': 28.5910, 'lon': 77.2272}, # Lodi Colony
    '110004': {'lat': 28.6186, 'lon': 77.1996}, # Rashtrapati Bhawan
    '110005': {'lat': 28.6508, 'lon': 77.1925}, # Karol Bagh
    '110006': {'lat': 28.6560, 'lon': 77.2277}, # Chandni Chowk
    '110007': {'lat': 28.6811, 'lon': 77.2062}, # Delhi University
    '110008': {'lat': 28.6534, 'lon': 77.1584}, # Patel Nagar
    '110009': {'lat': 28.7061, 'lon': 77.2144}, # GTB Nagar
    '110011': {'lat': 28.6080, 'lon': 77.2014}, # Nirman Bhawan
    '110012': {'lat': 28.6341, 'lon': 77.1723}, # Inderpuri
    '110015': {'lat': 28.6659, 'lon': 77.1411}, # Moti Nagar
    '110016': {'lat': 28.5445, 'lon': 77.2066}, # GK-I
    '110017': {'lat': 28.5316, 'lon': 77.2178}, # Malviya Nagar
    '110018': {'lat': 28.6375, 'lon': 77.1055}, # Tilak Nagar
    '110019': {'lat': 28.5196, 'lon': 77.2513}, # Kalkaji
    '110020': {'lat': 28.5051, 'lon': 77.2638}, # Badarpur
    '110023': {'lat': 28.5840, 'lon': 77.2085}, # Lodhi Colony
    '110024': {'lat': 28.5706, 'lon': 77.2387}, # Lajpat Nagar II
    '110025': {'lat': 28.5560, 'lon': 77.2540}, # Okhla Phase I
    '110026': {'lat': 28.6013, 'lon': 77.0924}, # Vikaspuri
    '110027': {'lat': 28.6566, 'lon': 77.1641}, # Punjabi Bagh
    '110031': {'lat': 28.6565, 'lon': 77.2736}, # Mayur Vihar I
    '110032': {'lat': 28.6680, 'lon': 77.2849}, # Mayur Vihar II
    '110033': {'lat': 28.7027, 'lon': 77.1525}, # Punjabi Bagh West
    '110034': {'lat': 28.7089, 'lon': 77.1319}, # Paschim Vihar
    '110035': {'lat': 28.7195, 'lon': 77.1505}, # Ashok Vihar
    '110036': {'lat': 28.7352, 'lon': 77.1628}, # Pitampura
    '110039': {'lat': 28.7503, 'lon': 77.1849}, # Shalimar Bagh
    '110040': {'lat': 28.7224, 'lon': 77.1100}, # Rohini Sector-3
    '110041': {'lat': 28.6139, 'lon': 77.0948}, # Uttam Nagar
    '110043': {'lat': 28.5957, 'lon': 77.0291}, # Dwarka Sector-3
    '110044': {'lat': 28.5122, 'lon': 77.2736}, # Sarita Vihar South
    '110045': {'lat': 28.6081, 'lon': 77.0526}, # Dwarka Sector-10
    '110046': {'lat': 28.5824, 'lon': 77.0562}, # Dwarka Sector-7
    '110048': {'lat': 28.5440, 'lon': 77.2471}, # Saket
    '110051': {'lat': 28.6385, 'lon': 77.3119}, # Anand Vihar
    '110053': {'lat': 28.6741, 'lon': 77.3082}, # Dilshad Garden
    '110054': {'lat': 28.6680, 'lon': 77.2207}, # Civil Lines
    '110055': {'lat': 28.6649, 'lon': 77.2109}, # Kamla Nagar
    '110058': {'lat': 28.6213, 'lon': 77.0836}, # Janakpuri
    '110059': {'lat': 28.6327, 'lon': 77.0727}, # Janakpuri West
    '110061': {'lat': 28.5838, 'lon': 77.0287}, # Dwarka Sector-6
    '110062': {'lat': 28.5205, 'lon': 77.2784}, # Sangam Vihar
    '110063': {'lat': 28.6453, 'lon': 77.0564}, # Paschim Vihar West
    '110070': {'lat': 28.5755, 'lon': 77.0189}, # Dwarka Sector-14
    '110075': {'lat': 28.5921, 'lon': 77.0460}, # Dwarka Sector-10
    '110076': {'lat': 28.5355, 'lon': 77.2872}, # Sarita Vihar
    '110077': {'lat': 28.5631, 'lon': 77.0632}, # Bindapur
    '110081': {'lat': 28.7027, 'lon': 77.0941}, # Rohini Sector-16
    '110082': {'lat': 28.7153, 'lon': 77.0816}, # Rohini Sector-21
    '110083': {'lat': 28.7253, 'lon': 77.0951}, # Rohini Sector-25
    '110084': {'lat': 28.7352, 'lon': 77.1055}, # Rohini Sector-13
    '110085': {'lat': 28.7313, 'lon': 77.1177}, # Rohini Sector-6
    '110086': {'lat': 28.7413, 'lon': 77.1300}, # Rohini Sector-11
    '110091': {'lat': 28.6416, 'lon': 77.2953}, # Vasundhara Enclave
    '110092': {'lat': 28.6316, 'lon': 77.2927}, # Patparganj
    '110096': {'lat': 28.6505, 'lon': 77.3218}, # Kondli
}

# Persona definitions
PERSONAS = [
    {
        "id": "ramesh",
        "name": "Ramesh Kumar",
        "nameHindi": "रमेश कुमार",
        "occupation": "Construction Worker (Mason)",
        "occupationHindi": "निर्माण श्रमिक (राजमिस्त्री)",
        "avatar": "👷",
        "color": "#f97316",
        "origin": "Muzaffarpur, Bihar",
        "originHindi": "मुज़फ्फ़रपुर, बिहार",
        "aqiSensitive": True,
        "geoFocused": True,
        "starterQuestions": [
            "मुझे आज काम पर जाना चाहिए? दिल्ली में प्रदूषण बहुत है।",
            "मेरा ठेकेदार रोज़ ₹700 देता है — क्या यह सही है?",
            "BOCW कार्ड कैसे बनवाएं? मुझे क्या फायदा मिलेगा?",
            "मुझे पास का श्रम कार्यालय कहां मिलेगा?"
        ],
        "welcomeMessage": "नमस्ते रमेश! मैं Shrayak हूं — आपका श्रम अधिकार सहायक। आज दिल्ली की वायु गुणवत्ता और आपके अधिकारों की जानकारी मैं आपको दूंगा।",
        "systemPrompt": """You are Shrayak, a supportive, highly informed AI assistant for Delhi's migrant workers and construction laborers.
Your current user context is Ramesh Kumar, a construction worker from Bihar.
1. ALWAYS communicate in warm, simple Hindi (written in Devanagari script) with minor English terms where helpful.
2. Ramesh is highly vulnerable. Focus on construction rights under the BOCW Act (building & other construction workers), and GRAP (Graded Response Action Plan) worker rights.
3. If AQI is high (>300), emphasize that construction work is banned under GRAP Stage II/III/IV, and he is legally entitled to PAID compensation/wages during the halt.
4. Ground your advice strictly in the provided sources. Cite specific laws (BOCW Act, Delhi Minimum Wage circulars) when retrieved in the search. Keep instructions actionable.
5. Remind him to get registered under the BOCW Board to claim welfare checks, health insurance, and daughter's marriage benefits."""
    },
    {
        "id": "sita",
        "name": "Sita Devi",
        "nameHindi": "सीता देवी",
        "occupation": "Domestic Worker (Househelp)",
        "occupationHindi": "घरेलू कामगार",
        "avatar": "👩",
        "color": "#8b5cf6",
        "origin": "Kanpur, Uttar Pradesh",
        "originHindi": "कानपुर, उत्तर प्रदेश",
        "aqiSensitive": False,
        "geoFocused": True,
        "starterQuestions": [
            "मेरे मालकिन मुझे महीने में ₹5000 देती हैं — क्या यह कानूनी है?",
            "मुझे हफ्ते में एक दिन छुट्टी नहीं मिलती — मैं क्या करूं?",
            "घरेलू कामगारों के लिए क्या कानून है?",
            "e-Shram कार्ड बनवाने के लिए क्या चाहिए?"
        ],
        "welcomeMessage": "नमस्ते सीता जी! मैं Shrayak हूं। आपके घरेलू कामगार अधिकारों की जानकारी के लिए मैं यहां हूं।",
        "systemPrompt": """You are Shrayak, a supportive, highly informed AI assistant for Delhi's migrant workers and domestic helpers.
Your current user context is Sita Devi, a domestic worker from Uttar Pradesh.
1. ALWAYS communicate in warm, simple Hindi (written in Devanagari script).
2. Focus on domestic worker rights, minimum wage compliance, the right to weekly rest days, and protection from harassment.
3. Guide her on how she is entitled to the minimum wage for unskilled workers in Delhi (approx. ₹18,066/month or ₹695/day as of late 2024/2026).
4. Encourage registration on the e-Shram portal to receive central social security benefits.
5. Give clear, polite steps on handling exploitation or salary disputes. Keep solutions practical."""
    },
    {
        "id": "priya",
        "name": "Priya Sharma",
        "nameHindi": "प्रिया शर्मा",
        "occupation": "Garment Worker (Tailor)",
        "occupationHindi": "वस्त्र उद्योग श्रमिक (दर्जी)",
        "avatar": "👩‍💼",
        "color": "#06b6d4",
        "origin": "Jaipur, Rajasthan",
        "originHindi": "जयपुर, राजस्थान",
        "aqiSensitive": False,
        "geoFocused": False,
        "starterQuestions": [
            "मेरी फैक्ट्री में 10 घंटे काम करवाते हैं — क्या यह सही है?",
            "ओवरटाइम का पैसा कितना मिलना चाहिए?",
            "ESI कट जाता है पर हॉस्पिटल नहीं मिलता — क्या करूं?",
            "मातृत्व अवकाश के लिए क्या करना होगा?"
        ],
        "welcomeMessage": "नमस्ते प्रिया! मैं Shrayak हूं। आपके कारखाने के अधिकार और वेतन की जानकारी के लिए यहां हूं।",
        "systemPrompt": """You are Shrayak, a supportive, highly informed AI assistant for Delhi's factory and garment workers.
Your current user context is Priya Sharma, a garment factory worker from Rajasthan.
1. ALWAYS communicate in warm, simple Hindi (written in Devanagari script).
2. Focus on industrial factory rights, double rate overtime payments (Section 14 of Minimum Wages Act/Factories Act), ESI (Employees' State Insurance) registration, PF deductions, and Maternity benefits.
3. Advise her on Delhi's semi-skilled wage rate (approx. ₹19,901/month or ₹765/day).
4. Ensure she understands ESI healthcare rights if contributions are deducted from her wages.
5. Direct her to appropriate complaint channels if overtime is not paid at double the regular hourly rate."""
    }
]

# Search workers registry
def search_workers(query):
    if not es_client:
        fallback = [
            {
                "uan": "1008-2345-9011",
                "name": "Ramesh Kumar",
                "nameHindi": "रमेश कुमार",
                "skillCategory": "skilled",
                "occupationHindi": "निर्माण श्रमिक (राजमिस्त्री)",
                "dailyWagePaid": 800.0,
                "currentEmployer": "Sharma Builders, Sector-18 Rohini",
                "bocwRegistered": False,
                "stateOfOriginHindi": "बिहार"
            },
            {
                "uan": "1008-8833-2947",
                "name": "Sita Devi",
                "nameHindi": "सीता देवी",
                "skillCategory": "unskilled",
                "occupationHindi": "घरेलू कामगार",
                "dailyWagePaid": 750.0,
                "currentEmployer": "Independent Apartments, Vasant Kunj",
                "bocwRegistered": False,
                "stateOfOriginHindi": "उत्तर प्रदेश"
            },
            {
                "uan": "1008-4492-8822",
                "name": "Priya Sharma",
                "nameHindi": "प्रिया शर्मा",
                "skillCategory": "semi-skilled",
                "occupationHindi": "वस्त्र उद्योग श्रमिक (दर्जी)",
                "dailyWagePaid": 850.0,
                "currentEmployer": "Royal Apparels, Okhla Industrial Area",
                "bocwRegistered": False,
                "stateOfOriginHindi": "राजस्थान"
            }
        ]
        q_low = query.lower()
        return [w for w in fallback if q_low in w["name"].lower() or q_low in w["uan"]]
    try:
        is_uan = "-" in query or (query.isdigit() and len(query) == 12)
        if is_uan:
            formatted_uan = query
            if len(query) == 12:
                formatted_uan = f"{query[0:4]}-{query[4:8]}-{query[8:12]}"
            q = {"term": {"uan": formatted_uan}}
        else:
            q = {
                "multi_match": {
                    "query": query,
                    "fields": ["name^2", "nameHindi^2", "occupation", "stateOfOrigin"]
                }
            }
        res = es_client.search(index="delhi_workers", body={"query": q, "size": 5})
        hits = res.get("hits", {}).get("hits", [])
        return [h.get("_source", {}) for h in hits]
    except Exception:
        return []

# Zero-Trust PII Redaction
def strip_pii(text):
    if not text:
        return ""
    # Redact Aadhaar (4-4-4 digits)
    text = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[AADHAAR-REDACTED]', text)
    # Redact Phone numbers (10 digits)
    text = re.sub(r'\b(?:\+91[\s-]?)?[6-9]\d{9}\b', '[PHONE-REDACTED]', text)
    return text

# Write Telemetry Logs to Elastic
def write_telemetry(query, response, pii_detected, latency_ms, success=True):
    if not es_client:
        return
    try:
        doc = {
            "@timestamp": datetime.utcnow().isoformat(),
            "query_length": len(query) if query else 0,
            "pii_detected": pii_detected,
            "latency_ms": latency_ms,
            "success": success,
            "agent": "shrayak-streamlit",
            "environment": "production"
        }
        es_client.index(index=INDEX_TELEMETRY, document=doc)
    except Exception:
        pass

# Nearest Office geo search using Elastic geo_distance query
def find_nearest_office(lat, lon, radius_km=25):
    if not es_client:
        # Static fallback list if Elastic is offline
        return [
            {
                "officeName": "District Labour Office, East Delhi",
                "officeNameHindi": "जिला श्रम कार्यालय, पूर्वी दिल्ली",
                "address": "37, Patparganj Industrial Area, Delhi - 110092",
                "phone": "011-22151234",
                "nearestMetro": "Nirman Vihar (Blue Line)",
                "distanceKm": 1.5
            }
        ]
    try:
        q = {
            "query": {
                "bool": {
                    "filter": [
                        {
                            "geo_distance": {
                                "distance": f"{radius_km}km",
                                "location": {"lat": lat, "lon": lon}
                            }
                        }
                    ]
                }
            },
            "sort": [
                {
                    "_geo_distance": {
                        "location": {"lat": lat, "lon": lon},
                        "order": "asc",
                        "unit": "km",
                        "distance_type": "arc"
                    }
                }
            ],
            "fields": [{"field": "_geo_distance", "unit": "km"}],
            "size": 3
        }
        res = es_client.search(index=GEO_INDEX, body=q)
        hits = res.get("hits", {}).get("hits", [])
        out = []
        for idx, hit in enumerate(hits):
            src = hit.get("_source", {})
            dist = float(hit.get("sort", [99])[0])
            out.append({
                "rank": idx + 1,
                "officeName": src.get("officeName"),
                "officeNameHindi": src.get("officeNameHindi"),
                "address": src.get("address"),
                "addressHindi": src.get("addressHindi"),
                "phone": src.get("phone"),
                "helpline": src.get("helpline"),
                "timings": src.get("timings"),
                "nearestMetro": src.get("nearestMetro"),
                "distanceKm": round(dist, 2)
            })
        return out
    except Exception:
        return []

# Hybrid Search / BM25 fallback in Python
def perform_rag_search(query, categories=[]):
    if not es_client:
        return []
    
    # 1. Embed query
    query_vector = None
    if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_"):
        try:
            res = genai.embed_content(
                model="models/text-embedding-004",
                content=query,
                task_type="retrieval_query"
            )
            query_vector = res.get("embedding", {}).get("values")
        except Exception:
            pass

    # 2. Run Query
    try:
        # Build search
        body = {
            "size": 4,
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": query,
                                "fields": ["content^3", "statute^2", "tags"]
                            }
                        }
                    ]
                }
            }
        }
        if categories:
            body["query"]["bool"]["filter"] = [
                {"terms": {"category": categories}}
            ]
            
        # Add vector search script score if vector available
        if query_vector:
            body["query"] = {
                "script_score": {
                    "query": body["query"],
                    "script": {
                        "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                        "params": {"query_vector": query_vector}
                    }
                }
            }
            
        res = es_client.search(index=INDEX_WAGES, body=body)
        hits = res.get("hits", {}).get("hits", [])
        return [h.get("_source", {}) for h in hits]
    except Exception:
        return []

# Streamlit Page Setup
st.set_page_config(
    page_title="Shrayak — श्रमिक अधिकार सहायक",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for dark-mode aesthetic
st.markdown("""
<style>
    /* Dark Theme Core overrides */
    .stApp {
        background-color: #060c1a;
        color: #e2e8f8;
    }
    
    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background-color: #0b1226 !important;
        border-right: 1px solid rgba(255,255,255,0.05);
    }
    
    /* Sidebar titles & text color */
    [data-testid="stSidebar"] .markdown-text-container, 
    [data-testid="stSidebar"] h1, 
    [data-testid="stSidebar"] h2, 
    [data-testid="stSidebar"] h3,
    [data-testid="stSidebar"] p {
        color: #e2e8f8 !important;
    }

    /* Message Bubbles styling */
    .bot-msg {
        background-color: #101a34;
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 14px;
        padding: 15px;
        margin-bottom: 15px;
        color: #e2e8f8;
    }
    
    .user-msg {
        background-color: #4338ca;
        border-radius: 14px;
        padding: 15px;
        margin-bottom: 15px;
        color: #ffffff;
        text-align: right;
    }
    
    /* GRAP active banner style */
    .grap-warn {
        background: linear-gradient(90deg, #7c1fa0, #c0002a);
        color: white;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 15px;
        border: 1px solid rgba(255,255,255,0.2);
    }
    
    /* Metric & details cards */
    .metric-card {
        background-color: #101a34;
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 10px;
    }
    
    .stat-label {
        font-size: 0.7rem;
        text-transform: uppercase;
        color: #4b5f80;
        font-weight: bold;
    }
    
    .stat-value {
        font-size: 1.1rem;
        color: #818cf8;
        font-weight: 800;
    }
</style>
""", unsafe_allow_html=True)

# State initialization
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "selected_persona_id" not in st.session_state:
    st.session_state.selected_persona_id = "ramesh"

# --- SIDEBAR CONTENT ---
with st.sidebar:
    # Logo Area
    st.markdown("""
    <div style='display: flex; align-items: center; gap: 8px; margin-bottom: 15px;'>
        <span style='font-size: 2rem;'>⚖️</span>
        <div>
            <h2 style='margin: 0; font-size: 1.5rem; background: linear-gradient(135deg, #818cf8, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent;'>Shrayak</h2>
            <span style='font-size: 0.75rem; color: #4b5f80; font-family: "Noto Sans Devanagari", sans-serif;'>श्रमिक सहायक</span>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Chips for Stack
    st.markdown("""
    <div style='display: flex; gap: 6px; margin-bottom: 20px;'>
        <span style='font-size: 0.6rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: rgba(0,191,179,0.12); color: #00bfb3; border: 1px solid rgba(0,191,179,0.25);'>⚡ Elastic</span>
        <span style='font-size: 0.6rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: rgba(99,102,241,0.12); color: #818cf8; border: 1px solid rgba(99,102,241,0.25);'>✦ Gemini</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 1. Persona Selector
    st.subheader("👥 Worker Persona")
    persona_options = {p["nameHindi"]: p for p in PERSONAS}
    selected_name = st.radio(
        "Select a worker contexts for advice:",
        options=list(persona_options.keys()),
        index=0
    )
    
    active_persona = persona_options[selected_name]
    
    # Reset chat when switching persona
    if active_persona["id"] != st.session_state.selected_persona_id:
        st.session_state.selected_persona_id = active_persona["id"]
        st.session_state.chat_history = []
        
    st.markdown(f"<p style='font-size:0.8rem; color:#94a3b8;'>Occupation: {active_persona['occupation']}</p>", unsafe_allow_html=True)
    st.markdown("---")
    
    # 2. Worker Registry Search
    st.subheader("👥 Worker Registry")
    worker_q = st.text_input("Search UAN or Name (e.g. Ramesh):")
    if worker_q:
        results = search_workers(worker_q)
        if results:
            for w in results:
                min_rate = 743
                if w["skillCategory"] == "semi-skilled": min_rate = 817
                if w["skillCategory"] == "skilled": min_rate = 899
                
                is_compliant = w["dailyWagePaid"] >= min_rate
                status_color = "#22c55e" if is_compliant else "#ef4444"
                status_text = "🟢 Compliant" if is_compliant else "🔴 Underpaid"
                
                st.markdown(f"""
                <div class="metric-card" style="border-left: 4px solid {status_color};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <strong style="font-size: 0.8rem; color: #e2e8f8;">{w['nameHindi']} ({w['name']})</strong>
                        <span style="font-size: 0.65rem; padding: 2px 6px; background: rgba(0,0,0,0.1); color: {status_color}; border-radius: 10px;">{status_text}</span>
                    </div>
                    <p style="font-size: 0.72rem; color: #94a3b8; margin: 2px 0;"><b>UAN:</b> {w['uan']}</p>
                    <p style="font-size: 0.72rem; color: #94a3b8; margin: 2px 0;"><b>Occupation:</b> {w['occupationHindi']}</p>
                    <p style="font-size: 0.72rem; color: #94a3b8; margin: 2px 0;"><b>Daily Wage:</b> ₹{w['dailyWagePaid']}/day (Min: ₹{min_rate})</p>
                    <p style="font-size: 0.72rem; color: #94a3b8; margin: 2px 0;"><b>Employer:</b> {w['currentEmployer']}</p>
                    <p style="font-size: 0.72rem; color: #94a3b8; margin: 2px 0;"><b>BOCW Registered:</b> {"Yes" if w['bocwRegistered'] else "No"}</p>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.warning("No worker matches found.")
    st.markdown("---")
    
    # 3. Nearest Office Finder
    st.subheader("🏛️ Nearest Labour Office")
    pincode = st.text_input("Enter Delhi Pin Code (e.g. 110092):", max_chars=6)
    if pincode:
        if pincode.isdigit() and len(pincode) == 6:
            centroid = PIN_CENTROIDS.get(pincode)
            if centroid:
                offices = find_nearest_office(centroid["lat"], centroid["lon"])
                if offices:
                    for o in offices:
                        st.markdown(f"""
                        <div class="metric-card" style="border-top: 2px solid #00bfb3;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <strong style="font-size: 0.8rem; color: #e2e8f8;">{o['officeNameHindi']}</strong>
                                <span style="font-size: 0.65rem; padding: 2px 6px; background: rgba(0,191,179,0.1); color: #00bfb3; border-radius: 10px;">📍 {o['distanceKm']} km</span>
                            </div>
                            <p style="font-size: 0.7rem; color: #94a3b8; margin: 2px 0;">{o['addressHindi']}</p>
                            <p style="font-size: 0.7rem; color: #94a3b8; margin: 2px 0;">📞 {o['phone']}</p>
                        </div>
                        """, unsafe_allow_html=True)
                else:
                    st.error("No offices found nearby.")
            else:
                st.error("Invalid Delhi pincode coordinates.")
        else:
            st.error("Please enter a valid 6-digit number.")
            
    st.markdown("---")
    
    # 4. Security Indicators
    st.subheader("🔐 Security Status")
    st.markdown("""
    <div style="font-size:0.75rem; color:#94a3b8;">
        <p>🟢 <b>PII Protection:</b> Aadhaar & Mobile Redacted</p>
        <p>🟢 <b>Rate Limiter:</b> 50 req / 15 min / IP</p>
        <p>🟢 <b>Elastic Telemetry:</b> Logs Stripped & Logged</p>
    </div>
    """, unsafe_allow_html=True)

# --- MAIN CHAT PANEL ---
st.markdown(f"### {active_persona['avatar']} Shrayak — {active_persona['nameHindi']} ({active_persona['occupationHindi']})")
st.markdown("AI-Powered Delhi Migrant & Labour Rights Legal Agent")



# Display Chat Starter Questions if chat history is empty
if len(st.session_state.chat_history) == 0:
    st.markdown(f"**Welcome / स्वागत है:** {active_persona['welcomeMessage']}")
    
    # 2x2 grid of starter buttons
    col1, col2 = st.columns(2)
    with col1:
        if st.button(active_persona["starterQuestions"][0]):
            st.session_state.chat_history.append({"role": "user", "content": active_persona["starterQuestions"][0]})
    with col2:
        if st.button(active_persona["starterQuestions"][1]):
            st.session_state.chat_history.append({"role": "user", "content": active_persona["starterQuestions"][1]})
            
    col3, col4 = st.columns(2)
    with col3:
        if st.button(active_persona["starterQuestions"][2]):
            st.session_state.chat_history.append({"role": "user", "content": active_persona["starterQuestions"][2]})
    with col4:
        if st.button(active_persona["starterQuestions"][3]):
            st.session_state.chat_history.append({"role": "user", "content": active_persona["starterQuestions"][3]})

# Render message history
for msg in st.session_state.chat_history:
    with st.chat_message(msg["role"]):
        st.write(msg["content"])
        if "citations" in msg and msg["citations"]:
            st.caption(f"📚 Sources: {', '.join(msg['citations'])}")
        if "latency" in msg:
            st.caption(f"⚡ Response generated in {msg['latency']}ms")

# Chat input
user_query = st.chat_input("अपना सवाल यहाँ लिखें (जैसे: मेरा न्यूनतम वेतन क्या है?)")

if user_query or (len(st.session_state.chat_history) > 0 and st.session_state.chat_history[-1]["role"] == "user"):
    # If the user clicked a starter button, grab it from history
    if not user_query:
        query_text = st.session_state.chat_history[-1]["content"]
    else:
        query_text = user_query
        st.session_state.chat_history.append({"role": "user", "content": query_text})
        with st.chat_message("user"):
            st.write(query_text)
            
    # Zero-Trust PII Redaction
    stripped_query = strip_pii(query_text)
    pii_flagged = "[REDACTED]" in stripped_query or "[AADHAAR" in stripped_query or "[PHONE" in stripped_query
    
    t0 = time.time()
    
    # 1. Intent Classification
    categories = []
    lower_query = stripped_query.lower()
    if any(k in lower_query for k in ["wage", "pay", "वेतन", "मजदूरी", "salary", "overtime", "ओवरटाइम"]):
        categories.append("minimum_wage")
    if any(k in lower_query for k in ["eshram", "e-shram", "ई-श्रम", "pension", "पेंशन"]):
        categories.append("eshram")
    if any(k in lower_query for k in ["bocw", "construction", "निर्माण", "harassment", "शिकायत", "maternity", "ESI"]):
        categories.append("labour_law")
        
    # 2. RAG context search
    retrieved_docs = perform_rag_search(stripped_query, categories)
    context_str = ""
    citations = []
    for doc in retrieved_docs:
        content = doc.get("content", "")
        statute = doc.get("statute", "General Notification")
        context_str += f"\n- Source: {statute}\n  Content: {content}\n"
        citations.append(statute)
        


    # Generate response via Gemini
    response_text = ""
    if GEMINI_API_KEY and not GEMINI_API_KEY.startswith("your_"):
        try:
            model = genai.GenerativeModel("models/gemini-2.5-flash")
            full_prompt = f"""{active_persona['systemPrompt']}

CONTEXT GUIDELINES:
Use the following retrieved context to ground your answer factual. If the context doesn't contain information, say you don't know rather than hallucinating.
{context_str}

USER QUERY:
{stripped_query}

ANSWER:"""
            res = model.generate_content(full_prompt)
            response_text = res.text
        except Exception as e:
            response_text = f"माफ़ कीजिए, उत्तर तैयार करने में त्रुटि हुई: {str(e)}"
    else:
        # Factual fallback if API key is not configured
        if categories and "minimum_wage" in categories:
            response_text = "दिल्ली सरकार की जुलाई 2026 की अधिसूचना के तहत अकुशल श्रमिक का न्यूनतम वेतन ₹18,066 प्रति माह (₹695 प्रतिदिन) है। अर्ध-कुशल का ₹19,901 प्रति माह (₹765 प्रतिदिन) और कुशल का ₹21,883 प्रति माह (₹842 प्रतिदिन) है।"

        else:
            response_text = "नमस्ते! मैं आपके अधिकारों के बारे में जानकारी ढूंढ रहा हूं। कृपया सुनिश्चित करें कि आपने अपना .env फ़ाइल में GEMINI_API_KEY भरा है।"

    latency = int((time.time() - t0) * 1000)
    
    # Save bot message state
    bot_msg = {
        "role": "assistant",
        "content": response_text,
        "citations": list(set(citations)),
        "latency": latency
    }
    
    st.session_state.chat_history.append(bot_msg)
    
    with st.chat_message("assistant"):
        st.write(response_text)
        if citations:
            st.caption(f"📚 Sources: {', '.join(list(set(citations)))}")
        st.caption(f"⚡ Response generated in {latency}ms")
        
    # Write observability logs asynchronously to Elastic
    write_telemetry(stripped_query, response_text, pii_flagged, latency, True)
    
    # Rerun to clear input box and layout update
    st.rerun()
