const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db/database');
const { validateTransaction } = require('../util/validation');

const sortWhitelist = ['date', 'amount', 'type', 'category'];

router.get('/', async (req, res, next) => {
  try {
    const { type, categoryId, startDate, endDate, search, sort } = req.query;
    const clauses = [];
    const params = [];

    if (type && ['income', 'expense'].includes(type)) {
      clauses.push('t.type = ?');
      params.push(type);
    }
    if (categoryId && !Number.isNaN(Number(categoryId))) {
      clauses.push('t.category_id = ?');
      params.push(Number(categoryId));
    }
    if (startDate) {
      clauses.push('date(t.date) >= date(?)');
      params.push(startDate);
    }
    if (endDate) {
      clauses.push('date(t.date) <= date(?)');
      params.push(endDate);
    }
    if (search) {
      clauses.push('(t.description LIKE ? OR c.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sortColumn = sortWhitelist.includes(sort) ? sort : 'date';
    const sortField = sortColumn === 'category' ? 'c.name' : `t.${sortColumn}`;

    const transactions = await all(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       ${where}
       ORDER BY ${sortField} DESC, t.id DESC`,
      params
    );

    res.json({ data: transactions });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body;
    const errors = validateTransaction(payload);
    if (errors.length) return res.status(400).json({ errors });

    const category = await get('SELECT id FROM categories WHERE id = ?', [payload.category_id]);
    if (!category) return res.status(400).json({ errors: ['Category does not exist.'] });

    const result = await run(
      'INSERT INTO transactions (type, amount, category_id, date, description) VALUES (?, ?, ?, ?, ?)',
      [payload.type, Number(payload.amount), Number(payload.category_id), payload.date, payload.description.trim()]
    );

    const saved = await get(
      `SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t
       JOIN categories c ON t.category_id = c.id WHERE t.id = ?`,
      [result.id]
    );

    res.status(201).json({ data: saved });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const errors = validateTransaction(payload);
    if (errors.length) return res.status(400).json({ errors });

    const exists = await get('SELECT id FROM transactions WHERE id = ?', [id]);
    if (!exists) return res.status(404).json({ error: 'Transaction not found' });

    const category = await get('SELECT id FROM categories WHERE id = ?', [payload.category_id]);
    if (!category) return res.status(400).json({ errors: ['Category does not exist.'] });

    await run(
      'UPDATE transactions SET type = ?, amount = ?, category_id = ?, date = ?, description = ? WHERE id = ?',
      [payload.type, Number(payload.amount), Number(payload.category_id), payload.date, payload.description.trim(), id]
    );

    const updated = await get(
      `SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t
       JOIN categories c ON t.category_id = c.id WHERE t.id = ?`,
      [id]
    );
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const exists = await get('SELECT id FROM transactions WHERE id = ?', [id]);
    if (!exists) return res.status(404).json({ error: 'Transaction not found' });

    await run('DELETE FROM transactions WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
