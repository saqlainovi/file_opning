import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace handleDeleteFile alert
text = re.sub(
    r"alert\(\s*lang === 'BN'\s*\?\s*\"দুঃখিত, রেকর্ড ডিলিট করার ক্ষমতা শুধুমাত্র সুপার এডমিনের \(ovi.it\) জন্য সংরক্ষিত।\"\s*\:\s*\"Sorry, only the Super Admin \(ovi.it\) has permission to delete records\.\"\s*\);",
    r'alert("Sorry, only the Super Admin (ovi.it) has permission to delete records.");',
    text,
    count=1
)

# Replace handleDeleteMemo alert
text = re.sub(
    r"alert\(\s*lang === 'BN'\s*\?\s*\"দুঃখিত, রেকর্ড ডিলিট করার ক্ষমতা শুধুমাত্র সুপার এডমিনের \(ovi.it\) জন্য সংরক্ষিত।\"\s*\:\s*\"Sorry, only the Super Admin \(ovi.it\) has permission to delete records\.\"\s*\);",
    r'alert("দুঃখিত, রেকর্ড ডিলিট করার ক্ষমতা শুধুমাত্র সুপার এডমিনের (ovi.it) জন্য সংরক্ষিত।");',
    text,
    count=1
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
