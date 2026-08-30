import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add note field to newFile
text = text.replace(
    """        part: part,
        createdBy: userProfile?.uid || '',""",
    """        part: part,
        note: fileNote.trim(),
        createdBy: userProfile?.uid || '',"""
)

# Reset fileNote in the two places
text = text.replace(
    """        setPart('None');
        logAction('FILE_CREATE',""",
    """        setPart('None');
        setFileNote('');
        logAction('FILE_CREATE',"""
)

text = text.replace(
    """      setCustomDesignation('');
      setPart('None');
      logAction('FILE_CREATE',""",
    """      setCustomDesignation('');
      setPart('None');
      setFileNote('');
      logAction('FILE_CREATE',"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
