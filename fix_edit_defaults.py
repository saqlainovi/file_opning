import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "setEditResponsiblePerson('Monir');",
    "setEditResponsiblePerson(editingFileType === 'file' ? RESPONSIBLE_PERSONS[0] : MEMO_RESPONSIBLE_PERSONS[0]);"
)

text = text.replace(
    "setEditDesignation('Executive');",
    "setEditDesignation(editingFileType === 'file' ? DESIGNATIONS[0] : MEMO_DESIGNATIONS[0]);"
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
