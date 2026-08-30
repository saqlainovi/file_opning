import re

with open('firestore.rules', 'r', encoding='utf-8') as f:
    text = f.read()

budgets_rules = """
    // Budgets Rules
    match /budgets/{budgetId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated();
    }
"""

if "// Budgets Rules" not in text:
    text = text.replace("    // Test connection path", budgets_rules + "\\n    // Test connection path")
    with open('firestore.rules', 'w', encoding='utf-8') as f:
        f.write(text)
