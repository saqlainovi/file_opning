import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    """  const memoDesignationOptions = useMemo(() => {
    const fromDB = memos.map(m => m.designation).filter(Boolean);
    const combined = Array.from(new Set([...DESIGNATIONS, ...fromDB]));
    return combined.sort();
  }, [memos]);""",
    """  const memoDesignationOptions = useMemo(() => {
    const fromDB = memos.map(m => m.designation).filter(Boolean);
    const combined = Array.from(new Set([...MEMO_DESIGNATIONS, ...fromDB]));
    return combined.sort();
  }, [memos]);"""
)

text = text.replace(
    """  const memoResponsiblePersonOptions = useMemo(() => {
    const fromDB = memos.map(m => m.responsiblePerson).filter(Boolean);
    const combined = Array.from(new Set([...RESPONSIBLE_PERSONS, ...fromDB]));
    return combined.sort();
  }, [memos]);""",
    """  const memoResponsiblePersonOptions = useMemo(() => {
    const fromDB = memos.map(m => m.responsiblePerson).filter(Boolean);
    const combined = Array.from(new Set([...MEMO_RESPONSIBLE_PERSONS, ...fromDB]));
    return combined.sort();
  }, [memos]);"""
)

# And in edit modal, we have:
# setIsEditCustomResponsiblePerson(!RESPONSIBLE_PERSONS.includes(record.responsiblePerson));
# we should fix it to use MEMO_... based on editingFileType!

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
