import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    """    if (type === 'file') {
      setEditOpeningYear(record.openingYear || '');""",
    """    if (type === 'file') {
      setEditOpeningYear(record.openingYear || '');
      setEditFileNote(record.note || '');"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
