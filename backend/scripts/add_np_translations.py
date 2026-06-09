import os
import json

np_dir = "/home/neo/Project/kina_ai/frontend/src/i18n/messages/np"

translations = {
  "checkout.json": {
    "geoNotSupported": "तपाईंको ब्राउजरले जियोलोकेसन समर्थन गर्दैन",
    "geoFetchFailed": "तपाईंको स्थानको लागि ठेगाना प्राप्त गर्न सकिएन",
    "geoReverseFailed": "स्थान रिभर्स जियोकोड गर्न असफल भयो",
    "geoDenied": "स्थान अनुमति अस्वीकार गरियो। कृपया यसलाई तपाईंको ब्राउजर सेटिङहरूमा सक्षम गर्नुहोस्।",
    "geoError": "तपाईंको स्थान प्राप्त गर्न असमर्थ",
    "useCurrentLocation": "हालको स्थान प्रयोग गर्नुहोस्",
    "freeDelivery": "नि:शुल्क",
    "calculating": "हिसाब गर्दै...",
    "etaSummary": "अनुमानित समय",
    "dynamicDeliveryLabel": "डाइनामिक डेलिभरी",
    "pendingEta": "प्रतीक्षामा..."
  },
  "products.json": {
    "loadingMore": "थप उत्पादनहरू लोड गर्दै...",
    "reviewRequired": "पहिले तपाईंको नाम र समीक्षा थप्नुहोस्।",
    "reviewSubmitError": "अहिले समीक्षा बुझाउन सकिएन।",
    "recentlyViewed": "भर्खरै हेरिएको",
    "recentlyViewedHint": "तपाईंले पहिले हेर्नुभएका उत्पादनहरूमा फर्कनुहोस्।",
    "browseAll": "सबै ब्राउज गर्नुहोस्",
    "reviewsTitle": "मूल्याङ्कन र समीक्षाहरू",
    "reviewsWord": "समीक्षाहरू",
    "noReviewsYet": "अहिलेसम्म कुनै समीक्षा छैन। पहिलो समीक्षा लेख्नुहोस्।",
    "writeReview": "समीक्षा लेख्नुहोस्",
    "yourName": "तपाईंको नाम",
    "rating": "मूल्याङ्कन",
    "reviewTitle": "शीर्षक",
    "reviewTitlePlaceholder": "छोटो सारांश",
    "reviewComment": "समीक्षा",
    "reviewCommentPlaceholder": "उत्पादनको बारेमा अरूलाई बताउनुहोस्।",
    "submitReview": "समीक्षा बुझाउनुहोस्",
    "similarProducts": "यस्तै उत्पादनहरू",
    "similarProductsHint": "वर्ग, ब्रान्ड, स्टोर, र मूल्य अनुसार सिफारिस गरिएको।",
    "noSimilarProducts": "अहिले यस्तै उत्पादनहरू भेटिएन।"
  },
  "common.json": {
    "saving": "सुरक्षित गर्दै..."
  },
  "store.json": {
    "notFound": "स्टोर फेला परेन",
    "localSeller": "स्थानीय बिक्रेता स्टोर",
    "shopInfo": "पसल जानकारी",
    "productsListed": "सूचीबद्ध उत्पादनहरू",
    "openMap": "नक्सा खोल्नुहोस्",
    "storeProducts": "स्टोर उत्पादनहरू",
    "fulfilledByStore": "यस बिक्रेताद्वारा सूचीबद्ध र पूरा गरिएका उत्पादनहरू।",
    "noProducts": "अहिलेसम्म कुनै उत्पादन छैन"
  },
  "home.json": {
    "trendingNow": "अहिले ट्रेन्डिङमा",
    "recommendedForYou": "तपाईंको लागि सिफारिस गरिएको",
    "exploreMore": "सबै उत्पादनहरू अन्वेषण गर्नुहोस्"
  },
  "footer.json": {
    "account": "ड्यासबोर्ड",
    "orders": "अर्डरहरू"
  }
}

for filename, trans_dict in translations.items():
    file_path = os.path.join(np_dir, filename)
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {}
    
    for k, v in trans_dict.items():
        data[k] = v
        
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

print("Translations injected into np files.")
