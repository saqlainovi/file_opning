import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "const [part, setPart] = useState('None');",
    "const [part, setPart] = useState('None');\n  const [fileNote, setFileNote] = useState('');"
)

text = text.replace(
    "const [editPart, setEditPart] = useState('None');",
    "const [editPart, setEditPart] = useState('None');\n  const [editFileNote, setEditFileNote] = useState('');"
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
