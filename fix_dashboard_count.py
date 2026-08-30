import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "{toBengali(personFiles.length.toString())}",
    "{personFiles.length}"
)
text = text.replace(
    "{toBengali(personMemos.length.toString())}",
    "{personMemos.length}" # Just leaving memo in English digits as well for dashboard. That is harmless.
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
