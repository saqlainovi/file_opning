import re

with open('firestore.rules', 'r', encoding='utf-8') as f:
    text = f.read()

# Action Logs Rules
#     match /action_logs/{logId} {
#       allow read: if isAuthenticated();
#       allow write: if isAdmin();
#     }

text = text.replace("allow write: if isAdmin();", "allow write: if isAuthenticated();")

with open('firestore.rules', 'w', encoding='utf-8') as f:
    f.write(text)
