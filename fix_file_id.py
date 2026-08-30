import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    """    const rawFileName = `${currentDeptVal}.${currentSubjectVal}${personSuffix}.${openingYear}-${currentSIVal}`;
    return toBengali(rawFileName);""",
    """    const rawFileName = `${currentDeptVal}.${currentSubjectVal}${personSuffix}.${openingYear}-${currentSIVal}`;
    return rawFileName;"""
)

text = text.replace(
    """      const recomputedFileName = toBengali(rawFileName);""",
    """      const recomputedFileName = rawFileName;"""
)

text = text.replace(
    """                      return toBengali(`${finalDept}.${finalSubject}${personSuffix}.${editOpeningYear}-${editSI}`);""",
    """                      return `${finalDept}.${finalSubject}${personSuffix}.${editOpeningYear}-${editSI}`;"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
