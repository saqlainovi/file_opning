import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update file collision check
old_file_col = """    const collision = files.find(f => f.si === finalSI);
    if (collision) {
      setErrorMsg(`Serial Number ${finalSI} is already registered as ${collision.fileName}.`);
      return;
    }"""
new_file_col = """    const collision = files.find(f => f.fileName === generatedFileName);
    if (collision) {
      setErrorMsg(`The file name ${generatedFileName} is already registered.`);
      return;
    }"""
text = text.replace(old_file_col, new_file_col)


# 2. Update memo collision check
old_memo_col = """    const collision = memos.find(m => m.si === finalSI);
    if (collision) {
      setMemoErrorMsg(`Serial Number ${finalSI} is already registered as ${collision.memoNumber}.`);
      return;
    }"""
new_memo_col = """    const collision = memos.find(m => m.memoNumber === generatedMemoNumber);
    if (collision) {
      setMemoErrorMsg(`The memo number ${generatedMemoNumber} is already registered.`);
      return;
    }"""
text = text.replace(old_memo_col, new_memo_col)


with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
