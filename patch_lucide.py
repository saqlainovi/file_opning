import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add missing icons
text = text.replace("Settings\n} from 'lucide-react';", "Settings,\n  Trash2,\n  AlertCircle,\n  Save\n} from 'lucide-react';")

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
