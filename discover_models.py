
import os
import requests
import json
import sys

def discover_gemini_models():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # Fallback if no key (should not happen in prod)
        print(json.dumps({
            "high": "google/gemini-1.5-pro",
            "low": "google/gemini-1.5-flash", 
            "error": "No GEMINI_API_KEY found"
        }))
        return

    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        response = requests.get(url, timeout=10)
        
        if response.status_code != 200:
             # Fallback on API error
            print(json.dumps({
                "high": "google/gemini-1.5-pro",
                "low": "google/gemini-1.5-flash",
                "error": f"API returned {response.status_code}"
            }))
            return

        models = response.json().get('models', [])
        
        # Filter for models that support content generation
        # STRATEGY: Look for 'gemini-3' first. If not found (it's 2026, but maybe the key has limits or region issues),
        # fallback to 'gemini-2' or 'gemini-1.5'.
        
        # For the purpose of this script as requested:
        # "Filter op de nieuwste 3-serie generatieve modellen"
        
        # We will try to find Gemini 3. If empty, we might want to fallback to 2.0 or 1.5 to be safe 
        # specifically to avoid "Model not found" crashing the bot.
        
        model_list = [m for m in models if "generateContent" in m['supportedGenerationMethods']]
        
        gemini_3_models = [m for m in model_list if "gemini-3" in m['name']]
        
        if not gemini_3_models:
             # Fallback logic if Gemini 3 is not yet available to this key/region
             # Try Gemini 2.0
             gemini_3_models = [m for m in model_list if "gemini-2.0" in m['name']]
        
        if not gemini_3_models:
             # Fallback to 1.5
             gemini_3_models = [m for m in model_list if "gemini-1.5" in m['name']]

        # Sorteer op 'Pro' (High) en 'Flash' (Low)
        # We pakken de laatste uit de lijst (meestal de nieuwste/preview versie)
        # API returns names like "models/gemini-1.5-pro". We need to strip "models/" or ensure the bot handles it.
        # Clawdbot usually expects "google/gemini-..." or just "gemini-...". 
        # The user's prompt implies we should return the name. 
        # Let's clean up "models/" prefix if present, as standard clients usually just want the ID.
        
        high_tier_list = [m for m in gemini_3_models if "pro" in m['name'].lower()]
        low_tier_list = [m for m in gemini_3_models if "flash" in m['name'].lower()]
        
        # Sort by name to get "latest" usually (versions tend to be increasingly numbered/dated)
        high_tier_list.sort(key=lambda x: x['name'])
        low_tier_list.sort(key=lambda x: x['name'])

        # Logic for high: preferably gemini-3-pro or gemini-2.0-pro or 1.5-pro
        high_model = high_tier_list[-1]['name'].replace("models/", "google/") if high_tier_list else "google/gemini-1.5-pro"
        
        # Logic for low: preferably gemini-3-flash or gemini-2.0-flash or 1.5-flash
        low_model = low_tier_list[-1]['name'].replace("models/", "google/") if low_tier_list else "google/gemini-1.5-flash"
        
        # Ensure correct formatting if not present
        if not high_model.startswith("google/"): high_model = "google/" + high_model.replace("models/","")
        if not low_model.startswith("google/"): low_model = "google/" + low_model.replace("models/","")

        # Output JSON
        print(json.dumps({
            "high": high_model,
            "low": low_model
        }))
        
    except Exception as e:
        print(json.dumps({
            "high": "google/gemini-1.5-pro",
            "low": "google/gemini-1.5-flash",
            "error": str(e)
        }))

if __name__ == "__main__":
    discover_gemini_models()
