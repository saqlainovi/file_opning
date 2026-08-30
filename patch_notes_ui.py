import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "{noteType === 'file' ? 'File Note' : 'Memo Note'}",
    "{noteType === 'file' ? 'File Note' : noteType === 'memo' ? 'Memo Note' : 'Budget Note'}"
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
