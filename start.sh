#!/bin/bash

# --- Setup Colors & Formatting ---
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'
DIM='\033[2m'

# --- Argument Parsing ---
OPEN_BROWSER=true
OFFLINE_MODE=false
RESET_KEY=false

for arg in "$@"; do
    case $arg in
        --no-browser) OPEN_BROWSER=false ;;
        --offline) OFFLINE_MODE=true ;;
        --reset-api-key) RESET_KEY=true ;;
    esac
done

# --- UI Header ---
clear
echo -e "${CYAN}┌─────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                 ${BOLD}KINA DEV${NC}${CYAN}                   │${NC}"
echo -e "${CYAN}│ ${DIM}Student-built ecommerce platform 🇳🇵${NC}${CYAN}         │${NC}"
echo -e "${CYAN}└─────────────────────────────────────────────┘${NC}\n"

# --- Create Logs Directory ---
mkdir -p logs

# --- Kill Stale Processes ---
kill_stale_processes() {
    local port=$1
    local name=$2
    if command -v lsof &> /dev/null; then
        PID=$(lsof -ti:$port)
        if [ ! -z "$PID" ]; then
            kill -9 $PID 2>/dev/null
            echo -e "${DIM}  Killed stale $name process on port $port${NC}"
        fi
    fi
}
kill_stale_processes 8000 "Backend"
kill_stale_processes 5173 "Frontend"

# --- AI Configuration ---
echo -e "🤖 ${BOLD}AI Configuration${NC}"
echo -e "${DIM}─────────────────────────────────────────────${NC}"

ENV_FILE="frontend/.env.local"
CURRENT_KEY=""
if [ -f "$ENV_FILE" ]; then
    CURRENT_KEY=$(grep VITE_OPENROUTER_API_KEY "$ENV_FILE" | cut -d '=' -f2)
fi

if [ "$OFFLINE_MODE" = true ]; then
    echo -e "API Key: ${DIM}Skipped (--offline)${NC}"
    echo "VITE_OPENROUTER_API_KEY=" > "$ENV_FILE"
    echo -e "${GREEN}✓ Offline mode configured${NC}\n"
    AI_STATUS="OFFLINE"
else
    if [ "$RESET_KEY" = true ] || [ -z "$CURRENT_KEY" ]; then
        echo -e "${DIM}OpenRouter API Key (optional)${NC}"
        echo -e "${DIM}Press Enter for offline mode${NC}"
        read -p "API Key: " NEW_KEY
        
        if [ -z "$NEW_KEY" ]; then
            echo "VITE_OPENROUTER_API_KEY=" > "$ENV_FILE"
            echo -e "${GREEN}✓ Configuration saved (Offline)${NC}\n"
            AI_STATUS="OFFLINE"
        else
            echo "VITE_OPENROUTER_API_KEY=$NEW_KEY" > "$ENV_FILE"
            echo -e "${GREEN}✓ Configuration saved${NC}\n"
            AI_STATUS="OPENROUTER"
            CURRENT_KEY=$NEW_KEY
        fi
    else
        # Mask the key for display
        MASKED_KEY=$(echo "$CURRENT_KEY" | sed 's/^\(sk-[^-]*-[^-]*-\).*/\1••••••••••••••••/')
        echo -e "API Key: ${CYAN}$MASKED_KEY${NC}"
        echo -e "${GREEN}✓ Configuration loaded from .env.local${NC}\n"
        AI_STATUS="OPENROUTER"
    fi
fi

# --- Local OAuth Fallbacks ---
export VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-dummy-client-id}"
export GOOGLE_OAUTH2_CLIENT_ID="${GOOGLE_OAUTH2_CLIENT_ID:-dummy-client-id}"
echo -e "Google OAuth: ${DIM}Local demo fallback enabled${NC}\n"

# --- Start Services ---
echo -e "🚀 ${BOLD}Starting Services${NC}"
echo -e "${DIM}─────────────────────────────────────────────${NC}\n"

START_TIME=$(date +%s.%N)

# 1. Backend
echo -e "${BOLD}[1/2] Backend (Django)${NC}"
cd backend || exit

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}  Creating virtual environment and installing dependencies...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt > ../logs/backend_install.log 2>&1
    echo -e "${GREEN}  ✓ Dependencies installed${NC}"
else
    source venv/bin/activate
fi
python manage.py runserver > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait briefly for backend to initialize
sleep 1
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Running on http://127.0.0.1:8000${NC}\n"
    BACKEND_STATUS="${GREEN}ONLINE${NC}"
else
    echo -e "${RED}✗ Failed to start${NC}"
    echo -e "${DIM}See logs/backend.log${NC}\n"
    BACKEND_STATUS="${RED}FAILED${NC}"
fi

# 2. Frontend
echo -e "${BOLD}[2/2] Frontend (Vite)${NC}"
cd frontend || exit
npm install > ../logs/frontend.log 2>&1
npm run dev >> ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait briefly for frontend to initialize
sleep 2
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${GREEN}✓ Running on http://localhost:5173${NC}\n"
    FRONTEND_STATUS="${GREEN}ONLINE${NC}"
else
    echo -e "${RED}✗ Failed to start${NC}"
    echo -e "${DIM}See logs/frontend.log${NC}\n"
    FRONTEND_STATUS="${RED}FAILED${NC}"
fi

# --- Open Browser ---
if [ "$OPEN_BROWSER" = true ] && [ "$FRONTEND_STATUS" = "${GREEN}ONLINE${NC}" ]; then
    echo -e "🌐 ${BOLD}Opening browser...${NC}"
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5173" > /dev/null 2>&1
        echo -e "${GREEN}✓ Browser opened${NC}\n"
    elif command -v open &> /dev/null; then
        open "http://localhost:5173" > /dev/null 2>&1
        echo -e "${GREEN}✓ Browser opened${NC}\n"
    else
        echo -e "${YELLOW}⚠ Could not detect default browser.${NC}\n"
    fi
fi

# --- Cleanup Trap ---
cleanup() {
    echo -e "\n${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓ Dukan stopped cleanly.${NC}"
    exit
}
trap cleanup SIGINT SIGTERM

# --- Final Summary Dashboard ---
END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc | awk '{printf "%.1f", $1}')

echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "✅ ${BOLD}Dukan is ready!${NC}\n"
echo -e "Backend  ● $BACKEND_STATUS"
echo -e "Frontend ● $FRONTEND_STATUS"
if [ "$AI_STATUS" = "OFFLINE" ]; then
    echo -e "AI       ● ${YELLOW}$AI_STATUS${NC}\n"
else
    echo -e "AI       ● ${CYAN}$AI_STATUS${NC}\n"
fi
echo -e "Frontend: ${CYAN}http://localhost:5173${NC}"
echo -e "Backend : ${CYAN}http://127.0.0.1:8000${NC}\n"
echo -e "${DIM}Started in ${DURATION}s${NC}"
echo -e "\n${DIM}Press Ctrl+C to stop all services.${NC}"
echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Wait for background processes
wait $BACKEND_PID $FRONTEND_PID
