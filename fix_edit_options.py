import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the arrays being mapped in Edit Modal
text = text.replace(
    """{departmentOptions.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}""",
    """{(editingFileType === 'memo' ? memoDepartmentOptions : departmentOptions).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}"""
)

text = text.replace(
    """{subjectOptions.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}""",
    """{(editingFileType === 'memo' ? memoSubjectOptions : subjectOptions).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}"""
)

text = text.replace(
    """{responsiblePersonOptions.map(person => (
                        <option key={person} value={person}>{person}</option>
                      ))}""",
    """{(editingFileType === 'memo' ? memoResponsiblePersonOptions : responsiblePersonOptions).map(person => (
                        <option key={person} value={person}>{person}</option>
                      ))}"""
)

text = text.replace(
    """{designationOptions.map(dsg => (
                        <option key={dsg} value={dsg}>{dsg}</option>
                      ))}""",
    """{(editingFileType === 'memo' ? memoDesignationOptions : designationOptions).map(dsg => (
                        <option key={dsg} value={dsg}>{dsg}</option>
                      ))}"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
