const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const ROBLE_BASE_URL = process.env.ROBLE_BASE_URL || 'https://roble-api.openlab.uninorte.edu.co';
const PROJECT_ID = process.env.ROBLE_PROJECT_ID || 'pc2_3e6afe53f1';

// Middleware para validar el token
const validateToken = (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticación requerido. Use: Authorization: Bearer <token>'
    });
  }
  
  req.token = token.split(' ')[1];
  next();
};

// Endpoint para leer todos los registros de una tabla
app.get('/api/tabla/:tableName', validateToken, async (req, res) => {
  const { tableName } = req.params;
  
  try {
    const response = await axios.get(
      `${ROBLE_BASE_URL}/database/${PROJECT_ID}/read`,
      {
        params: { tableName },
        headers: {
          'Authorization': `Bearer ${req.token}`
        }
      }
    );
    
    res.json({
      success: true,
      tableName,
      totalRecords: response.data.length,
      data: response.data
    });
  } catch (error) {
    handleRobleError(error, res);
  }
});

// Endpoint para leer un registro por ID
app.get('/api/tabla/:tableName/:id', validateToken, async (req, res) => {
  const { tableName, id } = req.params;
  
  try {
    const response = await axios.get(
      `${ROBLE_BASE_URL}/database/${PROJECT_ID}/read`,
      {
        params: { 
          tableName,
          _id: id
        },
        headers: {
          'Authorization': `Bearer ${req.token}`
        }
      }
    );
    
    res.json({
      success: true,
      tableName,
      recordId: id,
      data: response.data
    });
  } catch (error) {
    handleRobleError(error, res);
  }
});

// Endpoint para insertar registros en una tabla
app.post('/api/tabla/:tableName', validateToken, async (req, res) => {
  const { tableName } = req.params;
  const records = req.body.records || [req.body];
  
  if (!records || records.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Debe proporcionar al menos un registro para insertar',
      ejemplo: '{ "records": [{ "campo1": "valor1", "campo2": "valor2" }] }'
    });
  }
  
  try {
    const response = await axios.post(
      `${ROBLE_BASE_URL}/database/${PROJECT_ID}/insert`,
      {
        tableName,
        records
      },
      {
        headers: {
          'Authorization': `Bearer ${req.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      success: true,
      tableName,
      message: 'Registros insertados correctamente',
      insertedRecords: response.data.inserted?.length || 0,
      data: response.data
    });
  } catch (error) {
    handleRobleError(error, res);
  }
});

// Endpoint para actualizar un registro
app.put('/api/tabla/:tableName/:id', validateToken, async (req, res) => {
  const { tableName, id } = req.params;
  const updates = req.body;
  
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Debe proporcionar los campos a actualizar',
      ejemplo: '{ "campo1": "nuevo_valor", "campo2": "otro_valor" }'
    });
  }
  
  try {
    const response = await axios.put(
      `${ROBLE_BASE_URL}/database/${PROJECT_ID}/update`,
      {
        tableName,
        idColumn: '_id',
        idValue: id,
        updates
      },
      {
        headers: {
          'Authorization': `Bearer ${req.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      success: true,
      tableName,
      recordId: id,
      message: 'Registro actualizado correctamente',
      data: response.data
    });
  } catch (error) {
    handleRobleError(error, res);
  }
});

// Endpoint para eliminar un registro
app.delete('/api/tabla/:tableName/:id', validateToken, async (req, res) => {
  const { tableName, id } = req.params;
  
  try {
    const response = await axios.delete(
      `${ROBLE_BASE_URL}/database/${PROJECT_ID}/delete`,
      {
        data: {
          tableName,
          idColumn: '_id',
          idValue: id
        },
        headers: {
          'Authorization': `Bearer ${req.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      success: true,
      tableName,
      recordId: id,
      message: 'Registro eliminado correctamente',
      data: response.data
    });
  } catch (error) {
    handleRobleError(error, res);
  }
});

// Función para manejar errores de Roble
function handleRobleError(error, res) {
  console.error('Error al comunicarse con Roble:', error.message);
  
  if (error.response) {
    // Error de respuesta de Roble
    const status = error.response.status;
    const data = error.response.data;
    
    if (status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido o expirado',
        details: data
      });
    }
    
    if (status === 403) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
        details: data
      });
    }
    
    return res.status(status).json({
      success: false,
      error: 'Error al procesar la solicitud en Roble',
      details: data
    });
  }
  
  // Error de red o conexión
  res.status(500).json({
    success: false,
    error: 'Error interno al conectar con Roble',
    message: error.message
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Roble Database Manager',
    robleUrl: ROBLE_BASE_URL,
    projectId: PROJECT_ID
  });
});

// Endpoint de información
app.get('/api/info', (req, res) => {
  res.json({
    service: 'Microservicio de Manejo de Tablas en Roble',
    version: '1.0.0',
    endpoints: [
      {
        method: 'GET',
        path: '/api/tabla/:tableName',
        description: 'Obtener todos los registros de una tabla'
      },
      {
        method: 'GET',
        path: '/api/tabla/:tableName/:id',
        description: 'Obtener un registro específico por ID'
      },
      {
        method: 'POST',
        path: '/api/tabla/:tableName',
        description: 'Insertar nuevos registros en una tabla'
      },
      {
        method: 'PUT',
        path: '/api/tabla/:tableName/:id',
        description: 'Actualizar un registro por ID'
      },
      {
        method: 'DELETE',
        path: '/api/tabla/:tableName/:id',
        description: 'Eliminar un registro por ID'
      }
    ],
    authentication: 'Requerido: Authorization: Bearer <token>',
    robleConfig: {
      baseUrl: ROBLE_BASE_URL,
      projectId: PROJECT_ID
    }
  });
});

app.listen(PORT, () => {
  console.log(`Microservicio Roble DB corriendo en puerto ${PORT}`);
  console.log(`Conectado a Roble: ${ROBLE_BASE_URL}`);
  console.log(`Project ID: ${PROJECT_ID}`);
});
