import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// User registration
app.post('/make-server-b4e89827/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Registration error for ${email}: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ user: data.user }, 201);
  } catch (error) {
    console.log(`Registration server error: ${error}`);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// Get user expenses
app.get('/make-server-b4e89827/expenses', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id || authError) {
      console.log(`Auth error getting expenses: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const expenses = await kv.getByPrefix(`expense:${user.id}:`);
    const parsedExpenses = expenses.map(exp => JSON.parse(exp.value));
    
    // Sort by date descending
    parsedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return c.json({ expenses: parsedExpenses });
  } catch (error) {
    console.log(`Error fetching expenses: ${error}`);
    return c.json({ error: 'Failed to fetch expenses' }, 500);
  }
});

// Add expense
app.post('/make-server-b4e89827/expenses', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id || authError) {
      console.log(`Auth error adding expense: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { amount, category, date, description } = await c.req.json();
    const expenseId = crypto.randomUUID();
    
    const expense = {
      id: expenseId,
      userId: user.id,
      amount: parseFloat(amount),
      category,
      date,
      description,
      createdAt: new Date().toISOString()
    };

    await kv.set(`expense:${user.id}:${expenseId}`, JSON.stringify(expense));
    
    return c.json({ expense }, 201);
  } catch (error) {
    console.log(`Error adding expense: ${error}`);
    return c.json({ error: 'Failed to add expense' }, 500);
  }
});

// Update expense
app.put('/make-server-b4e89827/expenses/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id || authError) {
      console.log(`Auth error updating expense: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const expenseId = c.req.param('id');
    const { amount, category, date, description } = await c.req.json();
    
    const existingKey = `expense:${user.id}:${expenseId}`;
    const existingExpense = await kv.get(existingKey);
    
    if (!existingExpense) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    const parsedExpense = JSON.parse(existingExpense);
    const updatedExpense = {
      ...parsedExpense,
      amount: parseFloat(amount),
      category,
      date,
      description,
      updatedAt: new Date().toISOString()
    };

    await kv.set(existingKey, JSON.stringify(updatedExpense));
    
    return c.json({ expense: updatedExpense });
  } catch (error) {
    console.log(`Error updating expense: ${error}`);
    return c.json({ error: 'Failed to update expense' }, 500);
  }
});

// Delete expense
app.delete('/make-server-b4e89827/expenses/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id || authError) {
      console.log(`Auth error deleting expense: ${authError?.message}`);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const expenseId = c.req.param('id');
    const key = `expense:${user.id}:${expenseId}`;
    
    const existingExpense = await kv.get(key);
    if (!existingExpense) {
      return c.json({ error: 'Expense not found' }, 404);
    }

    await kv.del(key);
    
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting expense: ${error}`);
    return c.json({ error: 'Failed to delete expense' }, 500);
  }
});

Deno.serve(app.fetch);