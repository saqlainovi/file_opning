import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix imports
text = text.replace(
    "import { FileEntry, MemoEntry, DEPARTMENTS, SUBJECTS_BY_DEPT, DESIGNATIONS, RESPONSIBLE_PERSONS, MEMO_DEPARTMENTS, MEMO_SUBJECTS } from '../types';",
    "import { FileEntry, MemoEntry, DEPARTMENTS, SUBJECTS_BY_DEPT, DESIGNATIONS, RESPONSIBLE_PERSONS, MEMO_DEPARTMENTS, MEMO_SUBJECTS, MEMO_DESIGNATIONS, MEMO_RESPONSIBLE_PERSONS } from '../types';"
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
