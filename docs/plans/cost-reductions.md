# Plan: Cost Reductions & Expense Direction

> **Status: Not implemented.** This requires schema migration.

## Problem

Currently, all expenses are undirected — there's no distinction between money going out (expense) and money coming in (income or refund). This means:
- Returns/refunds inflate income figures
- No way to link a refund to the original expense
- Analytics can't show net spending per category

## Proposed schema changes

Add to the `expenses` table:

| Field | Type | Purpose |
|---|---|---|
| `direction` | enum: `outflow`, `inflow` | Which way money moved |
| `type` | enum: `expense`, `income`, `cost_reduction` | Classification |
| `linkedExpenseId` | FK to expenses (nullable) | Links a cost reduction to its original expense |
| `categoryId` | FK to categories (nullable) | Proper FK replacing the denormalized `category` varchar |

### Why `direction` + `type` as separate fields

`direction` is a fact: money went in or out. `type` is a classification: was that inflow income or a return? This separation allows the rule engine to match on direction (a fact from the bank) and set type (a judgment).

### Why `categoryId` as a proper FK

The current `category` varchar is denormalized — renaming a category doesn't update existing expenses. Adding `categoryId` as a FK enables:
- Category renames propagate automatically
- Analytics can roll up the hierarchy via joins
- The varchar `category` field can be kept temporarily for backwards compatibility, then dropped

## Analytics impact

- **Expenses**: `direction = outflow AND type = expense`
- **Income**: `direction = inflow AND type = income`
- **Cost reductions**: `direction = inflow AND type = cost_reduction` — subtracted from the linked expense's category total, not added to income
- **Net per category**: sum of expenses minus sum of cost reductions in that category

## Example

1. Buy jacket: 400 PLN outflow, type=expense, category=Shopping > Clothing
2. Return jacket: 400 PLN inflow, type=cost_reduction, linkedExpenseId=step1
3. Net for Shopping > Clothing: 0 PLN. Income: unchanged.

## Migration strategy

1. Add columns with defaults (`direction='outflow'`, `type='expense'`, both nullable initially)
2. Backfill existing expenses: all get `direction='outflow'`, `type='expense'`
3. Make columns non-nullable
4. Add `categoryId` FK (nullable), backfill by matching `category` varchar to categories table
5. Update API to accept and return new fields
6. Update dashboard and analytics to use direction/type
7. Eventually drop the `category` varchar column
