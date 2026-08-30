with open('firestore.rules', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin';",
    "(exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Admin');"
)

text = text.replace(
    "get(/databases/$(database)/documents/users/$(request.auth.uid)).data.designation == 'Super Admin';",
    "(exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.designation == 'Super Admin');"
)

with open('firestore.rules', 'w', encoding='utf-8') as f:
    f.write(text)
