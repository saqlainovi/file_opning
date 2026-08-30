import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix imports
text = text.replace(
    "DESIGNATIONS, RESPONSIBLE_PERSONS, MEMO_DEPARTMENTS, MEMO_SUBJECTS",
    "DESIGNATIONS, RESPONSIBLE_PERSONS, MEMO_DEPARTMENTS, MEMO_SUBJECTS, MEMO_DESIGNATIONS, MEMO_RESPONSIBLE_PERSONS"
)

# Fix map calls in memo sections
# There are two places: Edit Modal and Add Memo Modal
# Let's just find `RESPONSIBLE_PERSONS.map` and `DESIGNATIONS.map` and if it's in the memo context, change it.

text = text.replace(
    "{RESPONSIBLE_PERSONS.map(person => (",
    "{editingFileType === 'memo' || isAddMemoModalOpen ? MEMO_RESPONSIBLE_PERSONS.map(person => ("
)
# Wait, `isAddMemoModalOpen` isn't accessible in all those scopes exactly like that, it's safer to check the actual block.
