import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    '  CheckCircle\n} from \'lucide-react\';',
    '  CheckCircle,\n  MoreVertical,\n  Settings\n} from \'lucide-react\';'
)

text = text.replace(
    "  const [lang, setLang] = useState<'BN' | 'EN'>('BN');",
    "  const [lang, setLang] = useState<'BN' | 'EN'>('BN');\n  const [isMenuOpen, setIsMenuOpen] = useState(false);\n  const [isSettingsOpen, setIsSettingsOpen] = useState(false);"
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
