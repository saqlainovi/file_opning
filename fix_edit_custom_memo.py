import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    """    } else {
      setEditReceiver(record.receiver || '');
      setEditMemoNote(record.note || '');
      setEditMemoNumber(record.memoNumber || '');
      setIsEditCustomDept(!DEPARTMENTS.includes(record.department));
      setEditCustomDept(!DEPARTMENTS.includes(record.department) ? record.department : '');
      setIsEditCustomSubject(!SUBJECTS_BY_DEPT[record.department]?.includes(record.subject));
      setEditCustomSubject(!SUBJECTS_BY_DEPT[record.department]?.includes(record.subject) ? record.subject : '');
      setIsEditCustomResponsiblePerson(!RESPONSIBLE_PERSONS.includes(record.responsiblePerson));
      setEditCustomResponsiblePerson(!RESPONSIBLE_PERSONS.includes(record.responsiblePerson) ? record.responsiblePerson : '');
      setIsEditCustomDesignation(!DESIGNATIONS.includes(record.designation));
      setEditCustomDesignation(!DESIGNATIONS.includes(record.designation) ? record.designation : '');
    }""",
    """    } else {
      setEditReceiver(record.receiver || '');
      setEditMemoNote(record.note || '');
      setEditMemoNumber(record.memoNumber || '');
      setIsEditCustomDept(!MEMO_DEPARTMENTS.includes(record.department));
      setEditCustomDept(!MEMO_DEPARTMENTS.includes(record.department) ? record.department : '');
      setIsEditCustomSubject(!MEMO_SUBJECTS.includes(record.subject));
      setEditCustomSubject(!MEMO_SUBJECTS.includes(record.subject) ? record.subject : '');
      setIsEditCustomResponsiblePerson(!MEMO_RESPONSIBLE_PERSONS.includes(record.responsiblePerson));
      setEditCustomResponsiblePerson(!MEMO_RESPONSIBLE_PERSONS.includes(record.responsiblePerson) ? record.responsiblePerson : '');
      setIsEditCustomDesignation(!MEMO_DESIGNATIONS.includes(record.designation));
      setEditCustomDesignation(!MEMO_DESIGNATIONS.includes(record.designation) ? record.designation : '');
    }"""
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
