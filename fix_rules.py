with open('firestore.rules', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("\\n", "\n")

with open('firestore.rules', 'w', encoding='utf-8') as f:
    f.write(text)
