import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "const [noteType, setNoteType] = useState<'file' | 'memo'>('file');",
    "const [noteType, setNoteType] = useState<'file' | 'memo' | 'budget'>('file');"
)

text = text.replace(
    "const handleOpenNotes = async (type: 'file' | 'memo', id: string, name: string) => {",
    "const handleOpenNotes = async (type: 'file' | 'memo' | 'budget', id: string, name: string) => {"
)
text = text.replace(
    "const recordRef = doc(db, type === 'file' ? 'files' : 'memos', id);",
    "const recordRef = doc(db, type === 'file' ? 'files' : type === 'memo' ? 'memos' : 'test', id);"
)
text = text.replace(
    "const handleSaveNote = async () => {",
    "const handleSaveNote = async () => {"
)
text = text.replace(
    "const recordRef = doc(db, noteType === 'file' ? 'files' : 'memos', noteRecordId);",
    "const recordRef = doc(db, noteType === 'file' ? 'files' : noteType === 'memo' ? 'memos' : 'test', noteRecordId);"
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
