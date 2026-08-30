import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    """        designation: finalDesignation,
        part: editPart,
        fileName: recomputedFileName
      };""",
    """        designation: finalDesignation,
        part: editPart,
        note: editFileNote.trim(),
        fileName: recomputedFileName
      };"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
