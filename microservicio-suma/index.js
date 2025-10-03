const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Endpoint para sumar dos números (GET con query params)
app.get('/api/suma', (req, res) => {
  const { num1, num2 } = req.query;
  
  // Validar que los parámetros sean números
  const numero1 = parseFloat(num1);
  const numero2 = parseFloat(num2);
  
  if (isNaN(numero1) || isNaN(numero2)) {
    return res.status(400).json({
      success: false,
      error: 'Los parámetros num1 y num2 deben ser números válidos',
      ejemplo: '/api/suma?num1=5&num2=10'
    });
  }
  
  const resultado = numero1 + numero2;
  
  res.json({
    success: true,
    operacion: 'suma',
    num1: numero1,
    num2: numero2,
    resultado: resultado,
    formula: `${numero1} + ${numero2} = ${resultado}`,
    timestamp: new Date().toISOString()
  });
});

// Endpoint para sumar dos números (POST con body)
app.post('/api/suma', (req, res) => {
  const { num1, num2 } = req.body;
  
  // Validar que los parámetros sean números
  const numero1 = parseFloat(num1);
  const numero2 = parseFloat(num2);
  
  if (isNaN(numero1) || isNaN(numero2)) {
    return res.status(400).json({
      success: false,
      error: 'Los campos num1 y num2 deben ser números válidos',
      ejemplo: '{ "num1": 5, "num2": 10 }'
    });
  }
  
  const resultado = numero1 + numero2;
  
  res.json({
    success: true,
    operacion: 'suma',
    num1: numero1,
    num2: numero2,
    resultado: resultado,
    formula: `${numero1} + ${numero2} = ${resultado}`,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'Suma de Números' });
});

app.listen(PORT, () => {
  console.log(`Microservicio Suma corriendo en puerto ${PORT}`);
});
