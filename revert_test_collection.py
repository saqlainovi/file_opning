import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace expenses collection listener
text = text.replace(
    "onSnapshot(query(collection(db, 'test'), where('docType', '==', 'expense'))",
    "onSnapshot(collection(db, 'expenses')"
)
# Replace expenses addDoc
text = text.replace(
    "await addDoc(collection(db, 'test'), {\n        docType: 'expense',",
    "await addDoc(collection(db, 'expenses'), {"
)
text = text.replace(
    "await addDoc(collection(db, 'test'), {\\n        docType: 'expense',",
    "await addDoc(collection(db, 'expenses'), {"
)

# Replace expenses deleteDoc
text = text.replace(
    "deleteDoc(doc(db, 'test', id));",
    "deleteDoc(doc(db, 'expenses', id));"
)

# Replace budgets collection listener
text = text.replace(
    "onSnapshot(query(collection(db, 'test'), where('docType', '==', 'budget'))",
    "onSnapshot(collection(db, 'budgets')"
)
# Replace budgets addDoc
text = text.replace(
    "await addDoc(collection(db, 'test'), {\n        docType: 'budget',",
    "await addDoc(collection(db, 'budgets'), {"
)
text = text.replace(
    "await addDoc(collection(db, 'test'), {\\n        docType: 'budget',",
    "await addDoc(collection(db, 'budgets'), {"
)
# Replace budgets deleteDoc
text = text.replace(
    "deleteDoc(doc(db, 'test', id));",
    "deleteDoc(doc(db, 'budgets', id));"
)

# Also fix the doc reference in notes
text = text.replace(
    "doc(db, type === 'file' ? 'files' : type === 'memo' ? 'memos' : 'test', id)",
    "doc(db, type === 'file' ? 'files' : type === 'memo' ? 'memos' : 'budgets', id)"
)
text = text.replace(
    "doc(db, noteType === 'file' ? 'files' : noteType === 'memo' ? 'memos' : 'test', noteRecordId)",
    "doc(db, noteType === 'file' ? 'files' : noteType === 'memo' ? 'memos' : 'budgets', noteRecordId)"
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
