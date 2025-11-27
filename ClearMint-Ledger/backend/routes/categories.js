const express = require('express');
const router = express.Router();
const { all, get, run, transactional } = require('../db/database');
const { validateCategory } = require('../util/validation');

router.get('/', async (req, res, next) => {
  try {
    const categories = await all('SELECT * FROM categories ORDER BY name ASC');
    res.json({ data: categories });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const errors = validateCategory(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const exists = await get('SELECT id FROM categories WHERE lower(name) = lower(?)', [req.body.name.trim()]);
    if (exists) return res.status(400).json({ errors: ['Category name already exists.'] });

    const result = await run('INSERT INTO categories (name, color) VALUES (?, ?)', [req.body.name.trim(), req.body.color]);
    const saved = await get('SELECT * FROM categories WHERE id = ?', [result.id]);
    res.status(201).json({ data: saved });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const errors = validateCategory(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const exists = await get('SELECT id FROM categories WHERE id = ?', [id]);
    if (!exists) return res.status(404).json({ error: 'Category not found' });

    await run('UPDATE categories SET name = ?, color = ? WHERE id = ?', [req.body.name.trim(), req.body.color, id]);
    const updated = await get('SELECT * FROM categories WHERE id = ?', [id]);
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const replacementId = req.query.replacement ? Number(req.query.replacement) : null;

    const target = await get('SELECT id FROM categories WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'Category not found' });

    const transactionCount = await get('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?', [id]);

    if (transactionCount.count > 0 && !replacementId) {
      return res.status(400).json({ error: 'Replacement category required', needsReplacement: true });
    }

    if (replacementId) {
      const replacement = await get('SELECT id FROM categories WHERE id = ?', [replacementId]);
      if (!replacement) return res.status(400).json({ error: 'Replacement category not found' });
    }

    await transactional(async ({ run }) => {
      if (transactionCount.count > 0 && replacementId) {
        await run('UPDATE transactions SET category_id = ? WHERE category_id = ?', [replacementId, id]);
      }
      await run('DELETE FROM categories WHERE id = ?', [id]);
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
