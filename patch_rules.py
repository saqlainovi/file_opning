import re

with open('firestore.rules', 'r', encoding='utf-8') as f:
    text = f.read()

expenses_rules = """
    // Expenses Rules
    match /expenses/{expenseId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
"""

if "// Expenses Rules" not in text:
    text = text.replace("    // Test connection path", expenses_rules + "\\n    // Test connection path")
    with open('firestore.rules', 'w', encoding='utf-8') as f:
        f.write(text)
