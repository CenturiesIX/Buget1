const express = require('express');
const router = express.Router();
const { all, get } = require('../db/database');

function getMonthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { start, end };
}

router.get('/monthly', async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const { start, end } = getMonthRange(year, month);

    const totals = await get(
      `SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
        MAX(CASE WHEN type = 'expense' THEN amount END) as highest_expense
      FROM transactions WHERE date BETWEEN ? AND ?`,
      [start, end]
    );

    const daily = await all(
      `SELECT date, 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
       FROM transactions
       WHERE date BETWEEN ? AND ?
       GROUP BY date
       ORDER BY date ASC`,
      [start, end]
    );

    const categories = await all(
      `SELECT c.name, c.color,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expense,
        COUNT(t.id) as usage
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id AND t.date BETWEEN ? AND ?
       GROUP BY c.id
       ORDER BY expense DESC`,
      [start, end]
    );

    const avgDailySpending = totals && totals.expense
      ? (totals.expense / Math.max(daily.length, 1))
      : 0;

    const mostUsedCategory = categories.find((c) => c.usage > 0);

    res.json({
      data: {
        period: { year, month },
        totals: {
          income: totals?.income || 0,
          expense: totals?.expense || 0,
          net: (totals?.income || 0) - (totals?.expense || 0),
          highestExpense: totals?.highest_expense || 0,
          averageDailySpending: avgDailySpending,
          mostUsedCategory: mostUsedCategory ? mostUsedCategory.name : null
        },
        daily,
        categories
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/yearly', async (req, res, next) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const months = await all(
      `SELECT strftime('%m', date) as month,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
       FROM transactions
       WHERE strftime('%Y', date) = ?
       GROUP BY month
       ORDER BY month`,
      [String(year)]
    );

    const categories = await all(
      `SELECT c.name, c.color,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expense
       FROM categories c
       LEFT JOIN transactions t ON c.id = t.category_id AND strftime('%Y', t.date) = ?
       GROUP BY c.id
       ORDER BY expense DESC`,
      [String(year)]
    );

    const totals = months.reduce(
      (acc, cur) => {
        acc.income += cur.income || 0;
        acc.expense += cur.expense || 0;
        return acc;
      },
      { income: 0, expense: 0 }
    );

    res.json({
      data: {
        year,
        months,
        categories,
        totals: {
          income: totals.income,
          expense: totals.expense,
          net: totals.income - totals.expense
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
