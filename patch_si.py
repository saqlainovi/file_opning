import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix File SI
text = text.replace("const finalSI = useAutoSI ? nextSI : manualSI.padStart(3, '0');", "const finalSI = fileContext.targetSI;")

# Fix Memo SI
text = text.replace("const finalSI = useMemoAutoSI ? nextMemoSI : manualMemoSI.padStart(3, '0');", "const finalSI = memoContext.targetSI;")

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
