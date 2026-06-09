import os
import re
import json

src_dir = "/home/neo/Project/kina_ai/frontend/src"
np_dir = "/home/neo/Project/kina_ai/frontend/src/i18n/messages/np"

pattern = re.compile(r"t\(['\"]([^'\"]+)['\"]\s*,\s*\{\s*defaultValue:\s*['\"]([^'\"]+)['\"]")

found_keys = {}

for root, _, files in os.walk(src_dir):
    for f in files:
        if f.endswith(".tsx") or f.endswith(".ts"):
            with open(os.path.join(root, f), "r") as file:
                content = file.read()
                matches = pattern.findall(content)
                for key, default_val in matches:
                    found_keys[key] = default_val

# Now check which ones are missing in np json files
missing = {}
for key, default_val in found_keys.items():
    if '.' in key:
        ns, subkey = key.split('.', 1)
        json_path = os.path.join(np_dir, f"{ns}.json")
        
        if not os.path.exists(json_path):
            missing[key] = default_val
        else:
            with open(json_path, "r") as jf:
                data = json.load(jf)
            # handle nested keys
            parts = subkey.split('.')
            current = data
            is_missing = False
            for p in parts:
                if p not in current:
                    is_missing = True
                    break
                current = current[p]
            
            if is_missing:
                missing[key] = default_val

print(f"Found {len(missing)} missing translations in NP:")
for k, v in missing.items():
    print(f"  {k}: {v}")

