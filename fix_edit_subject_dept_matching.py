import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    """                      if (!isEditCustomDept) {
                        const matchedDept = Object.keys(SUBJECTS_BY_DEPT).find(dept => 
                          SUBJECTS_BY_DEPT[dept].includes(selectedSub)
                        );
                        if (matchedDept) {
                          setEditDepartment(matchedDept);
                        }
                      }""",
    """                      if (!isEditCustomDept && editingFileType === 'file') {
                        const matchedDept = Object.keys(SUBJECTS_BY_DEPT).find(dept => 
                          SUBJECTS_BY_DEPT[dept].includes(selectedSub)
                        );
                        if (matchedDept) {
                          setEditDepartment(matchedDept);
                        }
                      }"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
