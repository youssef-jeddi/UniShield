import json
import os
import sys
from pyfiglet import Figlet
import protected_data

# ⚠️ Your Python code will be run in a python v3.8.3 environment

IEXEC_OUT = os.getenv('IEXEC_OUT')

computed_json = {}

try:
    messages = []

    args = sys.argv[1:]
    print(f"Received {len(args)} args")
    if len(args) > 0:
        messages.append(" ".join(args))

    try:
        # The protected data mock created for the purpose of this Hello World journey
        # contains an object with a key "secretText" which is a string
        protected_text = protected_data.getValue('secretText', 'string')
        print('Found a protected data')
        messages.append(protected_text)
    except Exception as e:
        print('It seems there is an issue with your protected data:', e)

    IEXEC_APP_DEVELOPER_SECRET = os.getenv("IEXEC_APP_DEVELOPER_SECRET")
    if IEXEC_APP_DEVELOPER_SECRET:
        # Replace all characters with '*'
        redacted_app_secret = '*' * len(IEXEC_APP_DEVELOPER_SECRET)
        print(f"Got an app secret ({redacted_app_secret})!")
    else:
        print("App secret is not set")

    # Transform input text into an ASCII Art text
    txt = f"Hello, {' '.join(messages) if len(messages) > 0 else 'World'}!"
    ascii_art_text = Figlet().renderText(txt)

    print(ascii_art_text)

    with open(IEXEC_OUT + '/result.txt', 'w') as f:
        f.write(ascii_art_text)
    computed_json = {'deterministic-output-path': IEXEC_OUT + '/result.txt'}
except Exception as e:
    print(e)
    computed_json = {'deterministic-output-path': IEXEC_OUT,
                     'error-message': 'Oops something went wrong'}
finally:
    with open(IEXEC_OUT + '/computed.json', 'w') as f:
        json.dump(computed_json, f)
