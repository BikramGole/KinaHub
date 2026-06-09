import json
import os

en_path = "/home/neo/Project/kina_ai/frontend/src/i18n/messages/en/ai.json"
np_path = "/home/neo/Project/kina_ai/frontend/src/i18n/messages/np/ai.json"

widget_en = {
    "greeting": "Ask me about products, delivery, seller stores, checkout, or your cart.",
    "promptSummarize": "Summarize my cart",
    "promptDeals": "Find best deals",
    "promptDelivery": "Explain delivery",
    "promptSellers": "How sellers work",
    "title": "Kinu AI",
    "subtitle": "Local commerce assistant",
    "ready": "Ready",
    "newChat": "New chat",
    "placeholder": "Ask KinaHub AI",
    "error": "Sorry, something went wrong. Please try again."
}

widget_np = {
    "greeting": "मलाई उत्पादनहरू, डेलिभरी, विक्रेता पसलहरू, चेकआउट वा तपाईंको कार्टको बारेमा सोध्नुहोस्।",
    "promptSummarize": "मेरो कार्ट संक्षेप गर्नुहोस्",
    "promptDeals": "उत्कृष्ट सम्झौताहरू खोज्नुहोस्",
    "promptDelivery": "डेलिभरी व्याख्या गर्नुहोस्",
    "promptSellers": "विक्रेताहरू कसरी काम गर्छन्",
    "title": "Kinu AI",
    "subtitle": "स्थानीय वाणिज्य सहायक",
    "ready": "तयार",
    "newChat": "नयाँ च्याट",
    "placeholder": "KinaHub AI लाई सोध्नुहोस्",
    "error": "माफ गर्नुहोस्, केहि गलत भयो। कृपया फेरि प्रयास गर्नुहोस्।"
}

def update_json(path, new_data):
    if os.path.exists(path):
        with open(path, "r") as f:
            data = json.load(f)
    else:
        data = {}
    
    data["widget"] = new_data
    
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

update_json(en_path, widget_en)
update_json(np_path, widget_np)
print("Updated ai.json")
