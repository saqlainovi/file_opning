import re

with open('src/types.ts', 'r', encoding='utf-8') as f:
    text = f.read()

types_code = """
export interface BudgetEntry {
  id: string;
  sl: string;
  budgetCode: string;
  budgetHead: string;
  responsiblePerson: string;
  budgetFigure: number;
}

export interface ExpenseEntry {
  id: string;
  budgetCode: string;
  amount: number;
  date: string;
  description: string;
  createdBy: string;
  createdAt?: any;
}

"""

if "BudgetEntry" not in text:
    text += types_code
    with open('src/types.ts', 'w', encoding='utf-8') as f:
        f.write(text)

