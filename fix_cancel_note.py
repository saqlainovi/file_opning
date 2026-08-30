import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "{editingFileType === 'file' ? 'Cancel' : 'বাতিল'}",
    "{noteType === 'file' ? 'Cancel' : 'বাতিল'}"
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
