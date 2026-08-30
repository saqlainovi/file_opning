import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the title
text = text.replace('<h3 className="text-sm font-bold text-white">নতুন ফাইল রেজিস্টার করুন</h3>', '<h3 className="text-sm font-bold text-white">Register New File</h3>')

# The text for Part dropdown is in the Add File Modal? Let's check where it is.
