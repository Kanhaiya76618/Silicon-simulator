const health = document.querySelector('#health');
fetch('http://localhost:8080/health').then((response) => response.json())
  .then((body) => { health.textContent = `${body.status} — ${body.service}`; })
  .catch(() => { health.textContent = 'API unavailable'; });
