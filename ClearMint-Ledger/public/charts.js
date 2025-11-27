const chartManager = (() => {
  const cache = {};

  function buildChart(ctxId, config) {
    if (cache[ctxId]) {
      cache[ctxId].data = config.data;
      cache[ctxId].options = config.options;
      cache[ctxId].update();
      return cache[ctxId];
    }
    const ctx = document.getElementById(ctxId);
    if (!ctx) return null;
    cache[ctxId] = new Chart(ctx, config);
    return cache[ctxId];
  }

  function pie(ctxId, labels, values, colors, title) {
    return buildChart(ctxId, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom' },
          title: { display: !!title, text: title }
        },
        animation: { animateRotate: true, animateScale: true }
      }
    });
  }

  function bar(ctxId, labels, values, title) {
    return buildChart(ctxId, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: title,
          data: values,
          backgroundColor: 'rgba(76, 175, 134, 0.7)',
          borderRadius: 12
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          title: { display: !!title, text: title }
        },
        scales: {
          y: { beginAtZero: true }
        },
        animation: { duration: 500 }
      }
    });
  }

  return { pie, bar };
})();

window.chartManager = chartManager;
