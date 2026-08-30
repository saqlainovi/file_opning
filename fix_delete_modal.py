import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace lang === 'BN' in the delete modal
text = text.replace(
    "{lang === 'BN' ? \"রেকর্ড ডিলিট নিশ্চিতকরণ\" : \"Confirm Record Deletion\"}",
    "{deleteConfirm.type === 'file' ? 'Confirm Record Deletion' : 'রেকর্ড ডিলিট নিশ্চিতকরণ'}"
)
text = text.replace(
    "{lang === 'BN' ? \"এই অ্যাকশনটি পরিবর্তন করা সম্ভব নয়\" : \"This action is irreversible\"}",
    "{deleteConfirm.type === 'file' ? 'This action is irreversible' : 'এই অ্যাকশনটি পরিবর্তন করা সম্ভব নয়'}"
)
text = text.replace(
    "{lang === 'BN' ? \"বাতিল করুন\" : \"Cancel\"}",
    "{deleteConfirm.type === 'file' ? 'Cancel' : 'বাতিল করুন'}"
)
text = text.replace(
    "{lang === 'BN' ? \"নিশ্চিত করুন\" : \"Yes, Delete\"}",
    "{deleteConfirm.type === 'file' ? 'Yes, Delete' : 'নিশ্চিত করুন'}"
)
text = text.replace(
    "{lang === 'BN' ? (",
    "{deleteConfirm.type !== 'file' ? ("
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
