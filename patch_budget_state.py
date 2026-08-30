import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

states_to_add = """
  // Budgets state
  const [budgets, setBudgets] = useState<any[]>([]);
  const [isAddBudgetModalOpen, setIsAddBudgetModalOpen] = useState(false);
  const [budgetErrorMsg, setBudgetErrorMsg] = useState('');
"""
text = re.sub(r'(const \[expenses, setExpenses\] = useState<ExpenseEntry\[\]>\(\[\]\);)', states_to_add + r'\n  \1', text)

listener_code = """
      const unsubscribeBudgets = onSnapshot(collection(db, 'budgets'), (snapshot) => {
        const budgetData: any[] = [];
        snapshot.forEach((doc) => {
          budgetData.push({ id: doc.id, ...doc.data() });
        });
        setBudgets(budgetData.sort((a, b) => Number(a.sl) - Number(b.sl)));
      });
"""
text = re.sub(r'(const unsubscribeExpenses = onSnapshot.*?setExpenses.*?\}\);)', listener_code + r'\n\1', text, flags=re.DOTALL)

text = re.sub(r'(unsubscribeExpenses\(\);)', r'unsubscribeBudgets();\n      \1', text)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
