# Gestor de Microservicios con Docker

Sistema de gestion dinamica de microservicios con interfaz web y API Gateway integrado.

**Video de prueba:** [https://youtu.be/-asvUvA08g4](https://youtu.be/-asvUvA08g4)

## Instalacion Rapida

```bash
# Crear red Docker
docker network create microservices-network

# Iniciar el gestor
docker compose up -d

# Acceder al dashboard
# http://localhost:4000
```

## Ejemplos de Microservicios

### 1. ROBLE Query Service

Consulta tablas de la base de datos ROBLE.

**Codigo:**
```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.post('/api/query', async (req, res) => {
  try {
    const { projectId, token, tableName } = req.body;
    
    if (!projectId || !token || !tableName) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parametros requeridos',
        message: 'Debes enviar: projectId, token y tableName'
      });
    }
    
    const robleUrl = 'https://roble-api.openlab.uninorte.edu.co/database/' + projectId + '/read';
    
    const response = await axios.get(robleUrl, {
      headers: { 'Authorization': 'Bearer ' + token },
      params: { tableName: tableName },
      timeout: 10000
    });
    
    res.json({
      success: true,
      projectId: projectId,
      tableName: tableName,
      totalRecords: response.data.length,
      data: response.data
    });
    
  } catch (error) {
    console.error('Error consultando ROBLE:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        error: 'Error de ROBLE',
        message: error.response.data?.message || error.message,
        statusCode: error.response.status
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error del servidor',
        message: error.message
      });
    }
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'ROBLE Query Service'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('ROBLE Query Service corriendo en puerto ' + PORT);
});
```

**Dependencias:** `express`, `axios`

**Ejemplo de uso:**
```bash
POST http://localhost:4000/services/roble-query/api/query
Content-Type: application/json

{
  "projectId": "pc2_3e6afe53f1",
  "token": "tu_token_aqui",
  "tableName": "tu_tabla"
}
```

### 2. Suma de Numeros

Microservicio que suma dos numeros (GET y POST).

**Codigo:**
```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Endpoint para sumar dos numeros (GET con query params)
app.get('/api/suma', (req, res) => {
  const { num1, num2 } = req.query;
  
  const numero1 = parseFloat(num1);
  const numero2 = parseFloat(num2);
  
  if (isNaN(numero1) || isNaN(numero2)) {
    return res.status(400).json({
      success: false,
      error: 'Los parametros num1 y num2 deben ser numeros validos',
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

// Endpoint para sumar dos numeros (POST con body)
app.post('/api/suma', (req, res) => {
  const { num1, num2 } = req.body;
  
  const numero1 = parseFloat(num1);
  const numero2 = parseFloat(num2);
  
  if (isNaN(numero1) || isNaN(numero2)) {
    return res.status(400).json({
      success: false,
      error: 'Los campos num1 y num2 deben ser numeros validos',
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
  res.json({ status: 'OK', service: 'Suma de Numeros' });
});

app.listen(PORT, () => {
  console.log(`Microservicio Suma corriendo en puerto ${PORT}`);
});
```

**Dependencias:** `express`

**Ejemplos de uso:**
```bash
# GET
http://localhost:4000/services/suma/api/suma?num1=10&num2=20

# POST
POST http://localhost:4000/services/suma/api/suma
Content-Type: application/json

{
  "num1": 10,
  "num2": 20
}
```

### 3. Hola Mundo

Microservicio simple que responde con mensajes de bienvenida.

**Codigo:**
```javascript
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

// Endpoint con parametro personalizado
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
```

**Dependencias:** `express`

**Ejemplos de uso:**
```bash
# Saludo basico
http://localhost:4000/services/hola-mundo/api/hello

# Saludo personalizado
http://localhost:4000/services/hola-mundo/api/hello/Sebastian
```

## Como Crear un Microservicio

1. Accede al dashboard en `http://localhost:4000`
2. Inicia sesion con tus credenciales ROBLE
3. Click en "Nuevo Microservicio"
4. Copia y pega el codigo de ejemplo
5. Agrega las dependencias necesarias
6. Click en "Crear"
7. Espera a que se construya y despliegue
8. Prueba tu microservicio desde el dashboard
