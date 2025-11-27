const express = require('express');
const router = express.Router();
const { get, run, all, transactional } = require('../db/database');
const { validateSettings } = require('../util/validation');

router.get('/', async (req, res, next) => {
  try {
    const settings = await get('SELECT * FROM settings WHERE id = 1');
    res.json({ data: settings });
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const errors = validateSettings(req.body);
    if (errors.length) return res.status(400).json({ errors });

    await run('UPDATE settings SET currency = ?, animations_enabled = ? WHERE id = 1', [
      req.body.currency.trim(),
      req.body.animations_enabled ? 1 : 0
    ]);
    const updated = await get('SELECT * FROM settings WHERE id = 1');
    res.json({ data: updated });
  } catch (error) {
    next(error);
  }
});

router.post('/backup', async (req, res, next) => {
  try {
    const [settings, categories, transactions] = await Promise.all([
      get('SELECT * FROM settings WHERE id = 1'),
      all('SELECT * FROM categories'),
      all('SELECT * FROM transactions')
    ]);
    res.json({
      data: {
        settings,
        categories,
        transactions
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { settings, categories, transactions } = req.body;
    if (!settings || !Array.isArray(categories) || !Array.isArray(transactions)) {
      return res.status(400).json({ error: 'Invalid backup structure' });
    }

    await transactional(async ({ run }) => {
      await run('DELETE FROM transactions');
      await run('DELETE FROM categories');
      await run('DELETE FROM settings');

      await run('INSERT INTO settings (id, currency, animations_enabled) VALUES (1, ?, ?)', [
        settings.currency || '$',
        settings.animations_enabled ? 1 : 0
      ]);

      for (const category of categories) {
        await run('INSERT INTO categories (id, name, color) VALUES (?, ?, ?)', [
          category.id,
          category.name,
          category.color
        ]);
      }

      for (const txn of transactions) {
        await run(
          'INSERT INTO transactions (id, type, amount, category_id, date, description) VALUES (?, ?, ?, ?, ?, ?)',
          [txn.id, txn.type, txn.amount, txn.category_id, txn.date, txn.description]
        );
      }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/reset', async (req, res, next) => {
  try {
    const { confirm, confirmAgain } = req.body;
    if (!confirm || !confirmAgain) {
      return res.status(400).json({ error: 'Double confirmation required' });
    }

    await transactional(async ({ run }) => {
      await run('DELETE FROM transactions');
      await run('DELETE FROM categories');
      await run('DELETE FROM settings');
      await run("INSERT INTO settings (id, currency, animations_enabled) VALUES (1, '$', 1)");
      await run("INSERT INTO categories (id, name, color) VALUES (1, 'General', '#7bcfa7')");
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
