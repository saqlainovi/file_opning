import re

with open('src/components/FileRegister.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

listener_code = """
    // Firestore Sync for Budgets
    const budgetsUnsubscribe = onSnapshot(collection(db, 'budgets'), (snapshot) => {
      const budgetData: any[] = [];
      snapshot.forEach((doc) => {
        budgetData.push({ id: doc.id, ...doc.data() });
      });
      setBudgets(budgetData.sort((a, b) => Number(a.sl) - Number(b.sl)));
    }, (error) => {
      console.error("Error reading budgets:", error);
    });

    // Firestore Sync for Expenses
    const expensesUnsubscribe = onSnapshot(query(collection(db, 'expenses'), orderBy('createdAt', 'desc')), (snapshot) => {
      const expenseData: any[] = [];
      snapshot.forEach((doc) => {
        expenseData.push({ id: doc.id, ...doc.data() });
      });
      setExpenses(expenseData);
    }, (error) => {
      console.error("Error reading expenses:", error);
    });
"""

text = text.replace(
    "const logsUnsubscribe = onSnapshot(logsQuery, (snapshot) => {",
    listener_code + "\n    const logsUnsubscribe = onSnapshot(logsQuery, (snapshot) => {"
)

cleanup_code = """
      pinsUnsubscribe();
      adminUsersUnsubscribe();
      logsUnsubscribe();
      budgetsUnsubscribe();
      expensesUnsubscribe();
"""
text = text.replace(
    "pinsUnsubscribe();\n      adminUsersUnsubscribe();\n      logsUnsubscribe();",
    cleanup_code
)

with open('src/components/FileRegister.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
