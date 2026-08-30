import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace expenses collection listener
text = text.replace(
    "onSnapshot(collection(db, 'expenses')",
    "onSnapshot(query(collection(db, 'test'), where('docType', '==', 'expense'))"
)
# Replace expenses addDoc
text = text.replace(
    "await addDoc(collection(db, 'expenses')",
    "await addDoc(collection(db, 'test') /* expenses */"
)
# We need to add docType: 'expense' to the addDoc call.
# It looks like:
#      await addDoc(collection(db, 'test') /* expenses */, {
#        budgetCode,
text = text.replace(
    "await addDoc(collection(db, 'test') /* expenses */, {",
    "await addDoc(collection(db, 'test'), {\n        docType: 'expense',"
)

# Replace expenses deleteDoc
text = text.replace(
    "deleteDoc(doc(db, 'expenses'",
    "deleteDoc(doc(db, 'test'"
)

# Replace budgets collection listener
text = text.replace(
    "onSnapshot(collection(db, 'budgets')",
    "onSnapshot(query(collection(db, 'test'), where('docType', '==', 'budget'))"
)
# Replace budgets addDoc
text = text.replace(
    "await addDoc(collection(db, 'budgets')",
    "await addDoc(collection(db, 'test') /* budgets */"
)
text = text.replace(
    "await addDoc(collection(db, 'test') /* budgets */, {",
    "await addDoc(collection(db, 'test'), {\n        docType: 'budget',"
)
# Replace budgets deleteDoc
text = text.replace(
    "deleteDoc(doc(db, 'budgets'",
    "deleteDoc(doc(db, 'test'"
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
