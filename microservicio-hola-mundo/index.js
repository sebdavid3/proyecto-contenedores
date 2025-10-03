const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Endpoint de prueba: Hola Mundo
app.get('/api/hello', (req, res) => {
  res.json({
    success: true,
    message: '¡Hola Mundo!',
    microservice: 'Hola Mundo',
    timestamp: new Date().toISOString()
  });
});

// Endpoint con parámetro personalizado
app.get('/api/hello/:name', (req, res) => {
  const { name } = req.params;
  res.json({
    success: true,
    message: `¡Hola ${name}!`,
    microservice: 'Hola Mundo',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Hola Mundo' });
});

app.listen(PORT, () => {
  console.log(`Microservicio Hola Mundo corriendo en puerto ${PORT}`);
});
