import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

functions_code = """
  const handleAddBudget = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (userProfile?.role !== 'Admin') return;
    
    setBudgetErrorMsg('');
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const sl = formData.get('sl') as string;
    const budgetCode = formData.get('budgetCode') as string;
    const budgetHead = formData.get('budgetHead') as string;
    const responsiblePerson = formData.get('responsiblePerson') as string;
    const budgetFigure = Number(formData.get('budgetFigure'));

    if (!sl || !budgetCode || !budgetHead || !responsiblePerson || !budgetFigure) {
      setBudgetErrorMsg('Please fill all fields');
      return;
    }

    try {
      await addDoc(collection(db, 'budgets'), {
        sl,
        budgetCode,
        budgetHead,
        responsiblePerson,
        budgetFigure,
        createdAt: serverTimestamp(),
        createdBy: userProfile.email,
        note: ''
      });
      setIsAddBudgetModalOpen(false);
    } catch (err: any) {
      setBudgetErrorMsg(err.message || 'Failed to add budget');
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (userProfile?.role !== 'Admin') return;
    if (confirm('Are you sure you want to delete this budget head?')) {
      try {
        await deleteDoc(doc(db, 'budgets', id));
      } catch (err) {
        console.error(err);
      }
    }
  };
"""

text = text.replace('const handleAddExpense = async', functions_code + '\\n  const handleAddExpense = async')

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
