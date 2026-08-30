import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    """<span>SHOWING {toBengali(filteredFiles.length.toString())} OF {toBengali(files.length.toString())} FILE RECORDS</span>""",
    """<span>SHOWING {filteredFiles.length} OF {files.length} FILE RECORDS</span>"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
