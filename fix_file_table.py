import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix table cell rendering in file register (around line 1900)
text = text.replace('{toBengali(file.si)}', '{file.si}')
text = text.replace('{toBengali(file.openingDate)}', '{file.openingDate}')
text = text.replace('{toBengali(file.fileName)}', '{file.fileName}')

# Fix part rendering in file register
text = text.replace(
    "{file.part === 'Part 1' ? 'খণ্ড ১' : file.part === 'Part 2' ? 'খণ্ড ২' : file.part === 'Part 3' ? 'খণ্ড ৩' : file.part === 'Part 4' ? 'খণ্ড ৪' : file.part === 'Part 5' ? 'খণ্ড ৫' : file.part}",
    "{file.part}"
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
