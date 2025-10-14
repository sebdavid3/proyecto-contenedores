const API_URL = 'http://localhost:4000/api';
const VERIFY_TOKEN_URL = "https://roble-api.openlab.uninorte.edu.co/auth/microservicios_87085b17b4/verify-token/";
let currentMicroservices = [];

// ==================== LOGOUT ====================

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("username");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("email");
  window.location.href = "index.html";
});

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadMicroservices();
  setupCreateForm();
});

// ==================== TABS ====================

function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// ==================== FUNCIÓN PARA VERIFICAR TOKEN ====================

async function verifyToken() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    showNotification("Su sesión ha expirado, por favor vuelva a iniciar sesión.", "error");
    redirectToLogin();
    return false;
  }

  try {
    const response = await fetch(VERIFY_TOKEN_URL, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      showNotification("Su sesión ha expirado, por favor vuelva a iniciar sesión.", "error");
      redirectToLogin();
      return false;
    }

    const data = await response.json();

    if (data.valid) {
      
      return true;
    } else {
      showNotification("Su sesión ha expirado, por favor vuelva a iniciar sesión.", "error");
      redirectToLogin();
      return false;
    }
  } catch (error) {
    console.error("Error verificando token:", error);
    showNotification("Su sesión ha expirado, por favor vuelva a iniciar sesión.", "error");
    redirectToLogin();
    return false;
  }
}

function redirectToLogin() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("username");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("email");
  setTimeout(() => {
    window.location.href = "index.html";
  }, 1500);
}

// ==================== MICROSERVICIOS ====================

async function loadMicroservices() {
  if (!(await verifyToken())) return;

  const container = document.getElementById('microservices-list');
  container.innerHTML = '<div class="loading">⏳ Cargando microservicios...</div>';

  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/microservices`, {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      currentMicroservices = data.microservices;
      renderMicroservices(data.microservices);
    } else {
      throw new Error(data.error || 'Error al cargar microservicios');
    }
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h3>❌ Error</h3><p>${error.message}</p></div>`;
  }
}

function renderMicroservices(microservices) {
  const container = document.getElementById('microservices-list');

  if (microservices.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>📦 No hay microservicios</h3>
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
        <button class="btn btn-primary btn-sm" onclick="viewDetails('${ms.id}')">👁️ Ver Detalles</button>
        ${ms.status === 'running' ? `
          <button class="btn btn-warning btn-sm" onclick="controlMicroservice('${ms.id}', 'stop')">⏸️ Detener</button>
        ` : `
          <button class="btn btn-success btn-sm" onclick="controlMicroservice('${ms.id}', 'start')">▶️ Iniciar</button>
        `}
        <button class="btn btn-secondary btn-sm" onclick="controlMicroservice('${ms.id}', 'restart')">🔄 Reiniciar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMicroservice('${ms.id}')">🗑️ Eliminar</button>
      </div>
    </div>
  `).join('');
}

async function controlMicroservice(id, action) {
  if (!(await verifyToken())) return;

  const actionText = { start: 'iniciando', stop: 'deteniendo', restart: 'reiniciando' }[action];
  if (!confirm(`¿Estás seguro de ${actionText} este microservicio?`)) return;

  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/microservices/${id}/${action}`, {
      method: 'POST',
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      showNotification(`✅ Microservicio ${action} exitosamente`, 'success');
      loadMicroservices();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    showNotification(`❌ Error: ${error.message}`, 'error');
  }
}

async function deleteMicroservice(id) {
  if (!(await verifyToken())) return;

  if (!confirm('⚠️ ¿Estás seguro de eliminar este microservicio? Esta acción no se puede deshacer.')) return;

  try {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/microservices/${id}`, {
      method: 'DELETE',
      headers: { "Authorization": `Bearer ${token}` }
    });

    const data = await response.json();

    if (data.success) {
      showNotification('✅ Microservicio eliminado exitosamente', 'success');
      loadMicroservices();
      closeModal();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    showNotification(`❌ Error: ${error.message}`, 'error');
  }
}

// ==================== CREAR MICROSERVICIO ====================

function setupCreateForm() {
  const form = document.getElementById('create-form');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!(await verifyToken())) return;

    const token = localStorage.getItem("accessToken");
    const statusDiv = document.getElementById('create-status');
    statusDiv.style.display = 'block';
    statusDiv.className = 'status-message status-loading';
    statusDiv.textContent = '⏳ Creando y desplegando microservicio...';

    const depsText = document.getElementById('ms-dependencies').value;
    const dependencies = depsText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const formData = {
      name: document.getElementById('ms-name').value,
      description: document.getElementById('ms-description').value,
      code: document.getElementById('ms-code').value,
      dependencies,
      baseImage: document.getElementById('ms-base-image').value || 'node:18-alpine',
      env: getEnvVars()
    };

    try {
      const response = await fetch(`${API_URL}/microservices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        statusDiv.className = 'status-message status-success';
        statusDiv.innerHTML = `✅ ¡Microservicio creado exitosamente!`;
        form.reset();
        loadMicroservices();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      statusDiv.className = 'status-message status-error';
      statusDiv.textContent = `❌ Error: ${error.message}`;
    }
  });
}

function getEnvVars() {
  const env = {};
  document.querySelectorAll('#env-vars .env-var-row').forEach(row => {
    const key = row.querySelector('.env-key').value.trim();
    const value = row.querySelector('.env-value').value.trim();
    if (key && value) env[key] = value;
  });
  return env;
}

// ==================== PROBAR ENDPOINT ====================

async function testEndpoint(msId, path, method, requiresAuth) {
  if (!(await verifyToken())) return;

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
          <input type="text" id="test-token" placeholder="Tu access token de Roble" value="${localStorage.getItem("accessToken") || ''}" required>
        </div>
      ` : ''}
      <div class="form-group">
        <label>Body (JSON) - opcional:</label>
        <textarea id="test-body" rows="4" placeholder='{"campo": "valor"}'></textarea>
      </div>
      <button type="submit" class="btn btn-success">🚀 Enviar Petición</button>
    </form>
    <div id="test-result" style="display: none;"></div>
  `;

  document.getElementById('test-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!(await verifyToken())) return;

    const endpoint = document.getElementById('test-endpoint').value;
    const testMethod = document.getElementById('test-method').value;
    const body = document.getElementById('test-body').value;
    const token = document.getElementById('test-token')?.value;

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resultDiv = document.getElementById('test-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="loading">⏳ Enviando petición...</div>';

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
        <h3>📊 Respuesta</h3>
        <div class="test-response">
          <div><strong>Status:</strong> ${data.status}</div>
          <pre>${JSON.stringify(data.data, null, 2)}</pre>
        </div>
      `;
    } catch (error) {
      resultDiv.innerHTML = `<div class="status-message status-error">❌ Error: ${error.message}</div>`;
    }
  });

  document.getElementById('test-modal').classList.add('active');
}

// ==================== UTILIDADES ====================

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

// ==================== MODALES ====================

function closeModal() {
  document.getElementById('modal').classList.remove('active');
}
function closeTestModal() {
  document.getElementById('test-modal').classList.remove('active');
}
window.onclick = function(event) {
  const modal = document.getElementById('modal');
  const testModal = document.getElementById('test-modal');
  if (event.target === modal) closeModal();
  if (event.target === testModal) closeTestModal();
};
