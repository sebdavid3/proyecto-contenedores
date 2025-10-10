const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Docker = require('dockerode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Docker cliente
const docker = new Docker({ socketPath: process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock' });

// Almacenamiento en memoria de microservicios registrados
let microservices = [];

// Mapa de proxies activos para API Gateway
const activeProxies = new Map();

// Archivo de persistencia
const DATA_FILE = path.join(__dirname, 'data', 'microservices.json');
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      microservices = JSON.parse(data);
      console.log(`✅ Cargados ${microservices.length} microservicios desde archivo`);
      
      // Restaurar proxies para microservicios activos
      microservices.forEach(ms => {
        if (ms.status === 'running' && ms.serviceName && ms.containerName) {
          registerProxy(ms.serviceName, ms.containerName);
        }
      });
    }
  } catch (error) {
    console.error('Error al cargar datos:', error.message);
  }
}

// Guardar datos
function saveData() {
  try {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(microservices, null, 2));
  } catch (error) {
    console.error('Error al guardar datos:', error.message);
  }
}

// Registrar proxy para un microservicio
function registerProxy(serviceName, containerName) {
  const proxyPath = `/services/${serviceName}`;
  
  // Si ya existe un proxy, eliminarlo primero
  if (activeProxies.has(serviceName)) {
    unregisterProxy(serviceName);
  }
  
  // Crear proxy middleware que apunta al contenedor en la red Docker
  const proxyMiddleware = createProxyMiddleware({
    target: `http://${containerName}:3000`,
    changeOrigin: true,
    pathRewrite: {
      [`^/services/${serviceName}`]: '', // Reescribir la ruta removiendo el prefijo
    },
    onError: (err, req, res) => {
      console.error(`❌ Error en proxy para ${serviceName}:`, err.message);
      res.status(503).json({
        success: false,
        error: 'Servicio no disponible',
        service: serviceName
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`🔀 Proxy: ${req.method} ${req.url} → ${containerName}:3000${req.url.replace(proxyPath, '')}`);
    }
  });
  
  // Registrar el middleware en Express
  app.use(proxyPath, proxyMiddleware);
  activeProxies.set(serviceName, proxyMiddleware);
  
  console.log(`✅ Proxy registrado: ${proxyPath} → ${containerName}:3000`);
}

// Desregistrar proxy de un microservicio
function unregisterProxy(serviceName) {
  if (activeProxies.has(serviceName)) {
    // Express no permite eliminar middleware dinámicamente de forma fácil
    // Pero podemos marcarlo como inactivo y manejarlo en el proxy
    activeProxies.delete(serviceName);
    console.log(`🗑️ Proxy desregistrado: /services/${serviceName}`);
  }
}

// ==================== ENDPOINTS API ====================

// Listar todos los microservicios registrados
app.get('/api/microservices', async (req, res) => {
  try {
    // Obtener estado de contenedores Docker
    const containers = await docker.listContainers({ all: true });
    
    // Actualizar estado de cada microservicio
    microservices.forEach(ms => {
      const container = containers.find(c => c.Id === ms.containerId || c.Id.startsWith(ms.containerId));
      if (container) {
        ms.status = container.State;
        // Agregar URL completa para acceder al microservicio
        ms.url = `http://localhost:4000/services/${ms.serviceName}`;
      } else {
        ms.status = 'stopped';
        ms.url = null;
      }
    });
    
    saveData();
    res.json({ success: true, microservices });
  } catch (error) {
    console.error('Error al listar microservicios:', error.message);
    res.json({ success: true, microservices });
  }
});

// Obtener un microservicio específico
app.get('/api/microservices/:id', (req, res) => {
  const { id } = req.params;
  const microservice = microservices.find(ms => ms.id === id);
  
  if (!microservice) {
    return res.status(404).json({
      success: false,
      error: 'Microservicio no encontrado'
    });
  }
  
  res.json({ success: true, microservice });
});

// Crear un nuevo microservicio
app.post('/api/microservices', async (req, res) => {
  const { name, code, dependencies, baseImage, description, env } = req.body;
  
  if (!name || !code || !dependencies || !Array.isArray(dependencies)) {
    return res.status(400).json({
      success: false,
      error: 'Nombre, código y dependencias son requeridos'
    });
  }
  
  try {
    const id = uuidv4();
    const serviceName = `${name.toLowerCase().replace(/\s+/g, '-')}-${id.substring(0, 8)}`;
    const containerName = `ms-${serviceName}`;
    
    // Crear directorio temporal para el microservicio
    const msDir = path.join(__dirname, 'temp', containerName);
    if (!fs.existsSync(msDir)) {
      fs.mkdirSync(msDir, { recursive: true });
    }
    
    // Crear package.json
    const packageJson = {
      name: containerName,
      version: '1.0.0',
      main: 'index.js',
      scripts: { start: 'node index.js' },
      dependencies: {}
    };
    
    // Agregar dependencias con versiones por defecto
    dependencies.forEach(dep => {
      const depName = dep.trim();
      if (depName) {
        // Versiones comunes
        const versions = {
          'express': '^4.18.2',
          'axios': '^1.6.0',
          'dotenv': '^16.0.0',
          'cors': '^2.8.5',
          'body-parser': '^1.20.2'
        };
        packageJson.dependencies[depName] = versions[depName] || 'latest';
      }
    });
    
    fs.writeFileSync(path.join(msDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    
    // Crear index.js con el código del usuario
    fs.writeFileSync(path.join(msDir, 'index.js'), code.trim());
    
    // Crear Dockerfile
    const dockerfile = `FROM ${baseImage || 'node:18-alpine'}
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;
    fs.writeFileSync(path.join(msDir, 'Dockerfile'), dockerfile);
    
    // Construir imagen Docker
    console.log(`📦 Construyendo imagen para ${containerName}...`);
    const stream = await docker.buildImage({
      context: msDir,
      src: ['Dockerfile', 'package.json', 'index.js']
    }, {
      t: containerName
    });
    
    // Esperar a que termine la construcción
    await new Promise((resolve, reject) => {
      docker.modem.followProgress(stream, (err, res) => {
        if (err) reject(err);
        else resolve(res);
      });
    });
    
    // Crear y ejecutar contenedor
    console.log(`🚀 Iniciando contenedor ${containerName}...`);
    const container = await docker.createContainer({
      Image: containerName,
      name: containerName,
      ExposedPorts: { '3000/tcp': {} },
      HostConfig: {
        // NO exponemos puertos externos - solo red interna Docker
        NetworkMode: 'microservices-network',
        RestartPolicy: { Name: 'unless-stopped' }
      },
      Env: [
        `SERVICE_NAME=${name}`,
        `ROBLE_BASE_URL=${env?.ROBLE_BASE_URL || 'https://roble-api.openlab.uninorte.edu.co'}`,
        `ROBLE_PROJECT_ID=${env?.ROBLE_PROJECT_ID || 'pc2_3e6afe53f1'}`,
        ...Object.entries(env || {}).map(([k, v]) => `${k}=${v}`)
      ]
    });
    
    await container.start();
    
    // Registrar proxy para este microservicio
    registerProxy(serviceName, containerName);
    
    // Registrar microservicio
    const microservice = {
      id,
      name,
      serviceName, // Nombre normalizado para routing
      description: description || '',
      containerId: container.id,
      containerName,
      status: 'running',
      url: `http://localhost:4000/services/${serviceName}`, // URL completa para acceder
      createdAt: new Date().toISOString(),
      endpoints: [], // El usuario define sus propios endpoints
      env: env || {},
      baseImage: baseImage || 'node:18-alpine',
      dependencies: dependencies
    };
    
    microservices.push(microservice);
    saveData();
    
    res.json({
      success: true,
      message: 'Microservicio creado y desplegado exitosamente',
      microservice
    });
    
  } catch (error) {
    console.error('Error al crear microservicio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear microservicio: ' + error.message
    });
  }
});

// Actualizar un microservicio
app.put('/api/microservices/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, env } = req.body;
  
  const index = microservices.findIndex(ms => ms.id === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Microservicio no encontrado'
    });
  }
  
  // Actualizar solo metadatos (no reconstruir contenedor)
  if (name) microservices[index].name = name;
  if (description) microservices[index].description = description;
  if (env) microservices[index].env = { ...microservices[index].env, ...env };
  
  microservices[index].updatedAt = new Date().toISOString();
  saveData();
  
  res.json({
    success: true,
    message: 'Microservicio actualizado',
    microservice: microservices[index]
  });
});

// Eliminar un microservicio
app.delete('/api/microservices/:id', async (req, res) => {
  const { id } = req.params;
  
  const index = microservices.findIndex(ms => ms.id === id);
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Microservicio no encontrado'
    });
  }
  
  try {
    const ms = microservices[index];
    
    // Desregistrar proxy
    if (ms.serviceName) {
      unregisterProxy(ms.serviceName);
    }
    
    // Detener y eliminar contenedor
    try {
      const container = docker.getContainer(ms.containerId);
      await container.stop();
      await container.remove();
      console.log(`🗑️ Contenedor ${ms.containerName} eliminado`);
    } catch (error) {
      console.warn('Error al eliminar contenedor:', error.message);
    }
    
    // Eliminar imagen
    try {
      const image = docker.getImage(ms.containerName);
      await image.remove();
      console.log(`🗑️ Imagen ${ms.containerName} eliminada`);
    } catch (error) {
      console.warn('Error al eliminar imagen:', error.message);
    }
    
    // Eliminar directorio temporal
    const msDir = path.join(__dirname, 'temp', ms.containerName);
    if (fs.existsSync(msDir)) {
      fs.rmSync(msDir, { recursive: true, force: true });
    }
    
    microservices.splice(index, 1);
    saveData();
    
    res.json({
      success: true,
      message: 'Microservicio eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('Error al eliminar microservicio:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar microservicio: ' + error.message
    });
  }
});

// Iniciar/Detener un microservicio
app.post('/api/microservices/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  
  const microservice = microservices.find(ms => ms.id === id);
  if (!microservice) {
    return res.status(404).json({
      success: false,
      error: 'Microservicio no encontrado'
    });
  }
  
  try {
    const container = docker.getContainer(microservice.containerId);
    
    if (action === 'start') {
      try {
        await container.start();
        microservice.status = 'running';
        // Re-registrar proxy si es necesario
        if (microservice.serviceName && microservice.containerName) {
          registerProxy(microservice.serviceName, microservice.containerName);
        }
      } catch (err) {
        // Si el contenedor ya está corriendo (error 304), no es un error real
        if (err.statusCode === 304) {
          microservice.status = 'running';
        } else {
          throw err;
        }
      }
    } else if (action === 'stop') {
      await container.stop();
      microservice.status = 'exited';
      // Desregistrar proxy
      if (microservice.serviceName) {
        unregisterProxy(microservice.serviceName);
      }
    } else if (action === 'restart') {
      await container.restart();
      microservice.status = 'running';
      // Re-registrar proxy
      if (microservice.serviceName && microservice.containerName) {
        registerProxy(microservice.serviceName, microservice.containerName);
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Acción no válida'
      });
    }
    
    saveData();
    res.json({
      success: true,
      message: `Microservicio ${action} exitosamente`,
      microservice
    });
    
  } catch (error) {
    console.error(`Error al ${action} microservicio:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Probar un endpoint de microservicio
app.post('/api/microservices/:id/test', async (req, res) => {
  const { id } = req.params;
  const { endpoint, method, headers, body } = req.body;
  
  const microservice = microservices.find(ms => ms.id === id);
  if (!microservice) {
    return res.status(404).json({
      success: false,
      error: 'Microservicio no encontrado'
    });
  }
  
  try {
    const axios = require('axios');
    // Usar la ruta del proxy en lugar del puerto directo
    const url = `http://localhost:4000/services/${microservice.serviceName}${endpoint}`;
    
    const config = {
      method: method || 'GET',
      url,
      headers: headers || {},
      validateStatus: () => true
    };
    
    if (body && (method === 'POST' || method === 'PUT')) {
      config.data = body;
    }
    
    const response = await axios(config);
    
    res.json({
      success: true,
      status: response.status,
      headers: response.headers,
      data: response.data
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Gestor de Microservicios',
    microservicesCount: microservices.length
  });
});

// Iniciar servidor
loadData();

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   🚀 GESTOR DE MICROSERVICIOS INICIADO                ║
║                                                        ║
║   📍 Puerto: ${PORT}                                      ║
║   🌐 Dashboard: http://localhost:${PORT}                 ║
║   📊 Microservicios registrados: ${microservices.length.toString().padEnd(18)}║
╚════════════════════════════════════════════════════════╝
  `);
});
