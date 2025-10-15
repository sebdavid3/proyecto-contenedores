const API_URL = 'http://localhost:4000/api';
let currentMicroservices = [];
let authToken = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  checkExistingAuth();
});

function checkExistingAuth() {
  authToken = localStorage.getItem('roble_token');
  
  if (authToken) {
    // Verify token is still valid
    verifyToken(authToken);
  } else {
    showLoginScreen();
  }
}

async function verifyToken(token) {
  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await response.json();
    
    if (data.success && data.valid) {
      currentUser = data.user.user || data.user;
      authToken = token;
      showDashboard();
    } else {
      localStorage.removeItem('roble_token');
      showLoginScreen();
    }
  } catch (error) {
    console.error('Token verification error:', error);
    localStorage.removeItem('roble_token');
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('main-dashboard').style.display = 'none';
  setupLoginForm();
}

function showDashboard() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('main-dashboard').style.display = 'block';
  
  const userEmail = currentUser.email || 'Unknown';
  const userRole = currentUser.role || 'user';
  document.getElementById('user-email').textContent = userEmail;
  document.getElementById('user-role').textContent = userRole;
  document.getElementById('user-role').className = `status-badge status-${userRole === 'admin' ? 'running' : 'stopped'}`;
  
  displayToken();
  setupTabs();
  loadMicroservices();
  setupCreateForm();
}

function displayToken() {
  const tokenContainer = document.getElementById('user-token-container');
  if (!tokenContainer || !authToken) return;
  
  const tokenPreview = authToken.substring(0, 20) + '...' + authToken.substring(authToken.length - 10);
  
  tokenContainer.innerHTML = `
    <div style="margin-top: 10px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 1px solid var(--primary-color);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: var(--primary-color);">Tu Token ROBLE:</strong>
        <button class="btn btn-sm" onclick="copyToken()" style="padding: 4px 12px;">
          Copiar
        </button>
      </div>
      <div style="background: var(--bg-secondary); padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.85rem; word-break: break-all; color: var(--text-light);" id="token-display">
        ${tokenPreview}
      </div>
      <button class="btn btn-sm" onclick="toggleTokenVisibility()" style="margin-top: 8px; padding: 4px 12px; background: var(--bg-secondary);">
        Mostrar completo
      </button>
    </div>
  `;
}

function toggleTokenVisibility() {
  const tokenDisplay = document.getElementById('token-display');
  const button = event.target;
  
  if (tokenDisplay.textContent.includes('...')) {
    tokenDisplay.textContent = authToken;
    button.textContent = 'Ocultar';
  } else {
    const tokenPreview = authToken.substring(0, 20) + '...' + authToken.substring(authToken.length - 10);
    tokenDisplay.textContent = tokenPreview;
    button.textContent = 'Mostrar completo';
  }
}

function copyToken() {
  navigator.clipboard.writeText(authToken).then(() => {
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Copiado!';
    button.style.background = '#10b981';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  }).catch(err => {
    showNotification('Error al copiar el token', 'error');
  });
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const statusDiv = document.getElementById('login-status');
    statusDiv.style.display = 'block';
    statusDiv.className = 'status-message status-loading';
    statusDiv.textContent = 'Iniciando sesión...';
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success && data.token) {
        authToken = data.token;
        currentUser = data.user || {};
        localStorage.setItem('roble_token', authToken);
        
        statusDiv.className = 'status-message status-success';
        statusDiv.textContent = '¡Inicio de sesión exitoso! Redirigiendo...';
        
        setTimeout(() => {
          showDashboard();
        }, 1000);
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      statusDiv.className = 'status-message status-error';
      statusDiv.textContent = `Error: ${error.message}`;
    }
  });
}

function logout() {
  localStorage.removeItem('roble_token');
  authToken = null;
  currentUser = null;
  showLoginScreen();
}

async function authenticatedFetch(url, options = {}) {
  if (!authToken) {
    throw new Error('Not authenticated');
  }
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${authToken}`
  };
  
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    logout();
    throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
  }
  
  return response;
}

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

async function loadMicroservices() {
  const container = document.getElementById('microservices-list');
  container.innerHTML = '<div class="loading">Cargando microservicios...</div>';
  
  try {
    const response = await fetch(`${API_URL}/microservices`);
    const data = await response.json();
    
    if (data.success) {
      currentMicroservices = data.microservices;
      renderMicroservices(data.microservices);
    } else {
      throw new Error(data.error || 'Error al cargar microservicios');
    }
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
  }
}

function renderMicroservices(microservices) {
  const container = document.getElementById('microservices-list');
  
  if (microservices.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No hay microservicios</h3>
        <p>Crea tu primer microservicio en la pestaña "Crear Nuevo"</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = microservices.map(ms => `
    <div class="microservice-card">
      <div class="microservice-header">
        <h3 class="microservice-title">${ms.name}</h3>
        <span class="status-badge status-${ms.status}">${ms.status}</span>
      </div>
      
      <div class="microservice-info">
        <div><strong>Plantilla:</strong> ${ms.template || 'Custom'}</div>
        <div><strong>Creado:</strong> ${new Date(ms.createdAt).toLocaleString()}</div>
        ${ms.description ? `<div><strong>Descripción:</strong> ${ms.description}</div>` : ''}
        ${ms.url ? `<div><strong>URL:</strong> <a href="${ms.url}" target="_blank" style="color: var(--primary-color);">${ms.url}</a></div>` : ''}
      </div>
      
      <div class="microservice-actions">
        <button class="btn btn-primary btn-sm" onclick="viewDetails('${ms.id}')">
          Ver Detalles
        </button>
        ${ms.status === 'running' ? `
          <button class="btn btn-warning btn-sm" onclick="controlMicroservice('${ms.id}', 'stop')">
            Detener
          </button>
        ` : `
          <button class="btn btn-success btn-sm" onclick="controlMicroservice('${ms.id}', 'start')">
            Iniciar
          </button>
        `}
        <button class="btn btn-secondary btn-sm" onclick="controlMicroservice('${ms.id}', 'restart')">
          Reiniciar
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteMicroservice('${ms.id}')">
          Eliminar
        </button>
      </div>
    </div>
  `).join('');
}

async function controlMicroservice(id, action) {
  const actionText = { start: 'iniciando', stop: 'deteniendo', restart: 'reiniciando' }[action];
  
  if (!confirm(`¿Estás seguro de ${actionText} este microservicio?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/microservices/${id}/${action}`, {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification(`Microservicio ${action} exitosamente`, 'success');
      loadMicroservices();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
  }
}

async function deleteMicroservice(id) {
  if (!confirm('¿Estás seguro de eliminar este microservicio? Esta acción no se puede deshacer.')) {
    return;
  }
  
  try {
    const response = await authenticatedFetch(`${API_URL}/microservices/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Microservicio eliminado exitosamente', 'success');
      loadMicroservices();
      closeModal();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
  }
}

async function viewDetails(id) {
  const ms = currentMicroservices.find(m => m.id === id);
  if (!ms) return;
  
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = `
    <h2>${ms.name}</h2>
    <p><strong>Estado:</strong> <span class="status-badge status-${ms.status}">${ms.status}</span></p>
    
    <div style="margin: 20px 0;">
      <h3>Información General</h3>
      <div class="microservice-info">
        <div><strong>ID:</strong> ${ms.id}</div>
        <div><strong>Service Name:</strong> ${ms.serviceName}</div>
        <div><strong>Contenedor:</strong> <code>${ms.containerName}</code></div>
        <div><strong>Creado:</strong> ${new Date(ms.createdAt).toLocaleString()}</div>
        ${ms.description ? `<div><strong>Descripción:</strong> ${ms.description}</div>` : ''}
        ${ms.url ? `<div><strong>URL Base:</strong> <a href="${ms.url}" target="_blank" style="color: var(--primary-color); font-weight: bold;">${ms.url}</a></div>` : ''}
      </div>
    </div>
    
    ${ms.endpoints && ms.endpoints.length > 0 ? `
      <div style="margin: 20px 0;">
        <h3>Endpoints Disponibles</h3>
        <div class="endpoints-list">
          ${ms.endpoints.map(ep => `
            <div class="endpoint-item">
              <div>
                <span class="endpoint-method method-${ep.method}">${ep.method}</span>
                <span class="endpoint-path">${ep.path}</span>
                ${ep.requiresAuth ? '<span style="color: #f59e0b; margin-left: 8px;">Requiere Auth</span>' : ''}
              </div>
              ${ep.description ? `<div class="endpoint-description">${ep.description}</div>` : ''}
              <div style="margin-top: 8px;">
                <button class="btn btn-primary btn-sm" onclick="testEndpoint('${ms.id}', '${ep.path}', '${ep.method}', ${ep.requiresAuth})">
                  Probar
                </button>
                <code style="margin-left: 10px; font-size: 0.8rem;">${ep.url}</code>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    ${Object.keys(ms.env || {}).length > 0 ? `
      <div style="margin: 20px 0;">
        <h3>Variables de Entorno</h3>
        <div class="microservice-info">
          ${Object.entries(ms.env).map(([key, value]) => `
            <div><code>${key}</code> = ${value}</div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
  
  document.getElementById('modal').classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

function setupCreateForm() {
  const form = document.getElementById('create-form');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const statusDiv = document.getElementById('create-status');
    statusDiv.style.display = 'block';
    statusDiv.className = 'status-message status-loading';
    statusDiv.textContent = 'Creando y desplegando microservicio...';
    
    const depsText = document.getElementById('ms-dependencies').value;
    const dependencies = depsText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const formData = {
      name: document.getElementById('ms-name').value,
      description: document.getElementById('ms-description').value,
      code: document.getElementById('ms-code').value,
      dependencies: dependencies,
      baseImage: document.getElementById('ms-base-image').value || 'node:18-alpine',
      env: getEnvVars()
    };
    
    try {
      const response = await authenticatedFetch(`${API_URL}/microservices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        statusDiv.className = 'status-message status-success';
        statusDiv.innerHTML = `
          ¡Microservicio creado exitosamente!<br>
          Nombre: ${data.microservice.name}<br>
          Service: ${data.microservice.serviceName}<br>
          <strong>URL: <a href="${data.microservice.url}" target="_blank" style="color: white; text-decoration: underline;">${data.microservice.url}</a></strong><br>
          <button class="btn btn-primary" onclick="viewDetails('${data.microservice.id}'); document.querySelector('[data-tab=\\'microservices\\']').click();" style="margin-top: 10px;">
            Ver Detalles
          </button>
        `;
        
        form.reset();
        loadMicroservices();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      statusDiv.className = 'status-message status-error';
      statusDiv.textContent = `Error: ${error.message}`;
    }
  });
}

function getEnvVars() {
  const env = {};
  const rows = document.querySelectorAll('#env-vars .env-var-row');
  
  rows.forEach(row => {
    const key = row.querySelector('.env-key').value.trim();
    const value = row.querySelector('.env-value').value.trim();
    if (key && value) {
      env[key] = value;
    }
  });
  
  return env;
}

function addEnvVar() {
  const container = document.getElementById('env-vars');
  const row = document.createElement('div');
  row.className = 'env-var-row';
  row.innerHTML = `
    <input type="text" placeholder="NOMBRE_VAR" class="env-key">
    <input type="text" placeholder="valor" class="env-value">
  `;
  container.appendChild(row);
}

function testEndpoint(msId, path, method, requiresAuth) {
  const ms = currentMicroservices.find(m => m.id === msId);
  if (!ms) return;
  
  const modalBody = document.getElementById('test-modal-body');
  modalBody.innerHTML = `
    <form id="test-form" class="test-form">
      <div class="form-group">
        <label>Endpoint:</label>
        <input type="text" id="test-endpoint" value="${path}" required>
      </div>
      
      <div class="form-group">
        <label>Método:</label>
        <select id="test-method">
          <option value="GET" ${method === 'GET' ? 'selected' : ''}>GET</option>
          <option value="POST" ${method === 'POST' ? 'selected' : ''}>POST</option>
          <option value="PUT" ${method === 'PUT' ? 'selected' : ''}>PUT</option>
          <option value="DELETE" ${method === 'DELETE' ? 'selected' : ''}>DELETE</option>
        </select>
      </div>
      
      ${requiresAuth ? `
        <div class="form-group">
          <label>Token de Autorización (Bearer):</label>
          <input type="text" id="test-token" placeholder="Tu access token de Roble" required>
          <small style="color: var(--text-light); display: block; margin-top: 4px;">
            Obtén tu token desde <a href="https://roble.openlab.uninorte.edu.co" target="_blank">Roble</a>
          </small>
        </div>
      ` : ''}
      
      <div class="form-group">
        <label>Body (JSON) - opcional:</label>
        <textarea id="test-body" rows="4" placeholder='{"campo": "valor"}'></textarea>
      </div>
      
      <button type="submit" class="btn btn-success">Enviar Petición</button>
    </form>
    
    <div id="test-result" style="display: none;"></div>
  `;
  
  document.getElementById('test-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const endpoint = document.getElementById('test-endpoint').value;
    const testMethod = document.getElementById('test-method').value;
    const body = document.getElementById('test-body').value;
    const token = document.getElementById('test-token')?.value;
    
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const resultDiv = document.getElementById('test-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="loading">Enviando petición...</div>';
    
    try {
      const response = await fetch(`${API_URL}/microservices/${msId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint,
          method: testMethod,
          headers,
          body: body ? JSON.parse(body) : undefined
        })
      });
      
      const data = await response.json();
      
      resultDiv.innerHTML = `
        <h3>Respuesta</h3>
        <div class="test-response">
          <div><strong>Status:</strong> ${data.status}</div>
          <div style="margin-top: 10px;"><strong>Data:</strong></div>
          <pre>${JSON.stringify(data.data, null, 2)}</pre>
        </div>
      `;
    } catch (error) {
      resultDiv.innerHTML = `
        <div class="status-message status-error">
          Error: ${error.message}
        </div>
      `;
    }
  });
  
  document.getElementById('test-modal').classList.add('active');
}

function closeTestModal() {
  document.getElementById('test-modal').classList.remove('active');
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `status-message status-${type}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '10000';
  notification.style.minWidth = '300px';
  notification.style.animation = 'slideIn 0.3s';
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

window.onclick = function(event) {
  const modal = document.getElementById('modal');
  const testModal = document.getElementById('test-modal');
  
  if (event.target === modal) {
    closeModal();
  }
  if (event.target === testModal) {
    closeTestModal();
  }
}
