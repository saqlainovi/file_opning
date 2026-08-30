import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("{'Letter Details'}", "{'পত্রের বিস্তারিত বিষয়'}")

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
