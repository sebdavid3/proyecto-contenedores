# Roble Microservices Platform

Plataforma de gestión dinámica de microservicios para Universidad del Norte, integrada con [Roble](https://roble.openlab.uninorte.edu.co).

## Características

- **Gestión dinámica de microservicios** - Crea, despliega y administra microservicios desde un dashboard web
- **API Gateway integrado** - Todos los servicios accesibles desde un único puerto (4000)
- **Código personalizado** - Pega tu propio código, sin templates predefinidos
- **Integración con Roble** - Acceso a base de datos y autenticación de Roble
- **Docker SDK** - Control completo de contenedores mediante Dockerode

## Estructura del Proyecto

```
Roble/
├── gestor-microservicios/     # Dashboard y API de gestión
├── microservicio-hola-mundo/  # Ejemplo: servicio simple
├── microservicio-suma/         # Ejemplo: calculadora REST
├── microservicio-roble-db/     # Ejemplo: CRUD con Roble
└── docker-compose.yml          # Orquestación del gestor
```


## Cómo compartir y ejecutar este proyecto en cualquier PC

1. **Requisitos previos:**
   - Tener instalado [Docker Desktop](https://www.docker.com/products/docker-desktop/) y Docker Compose.

2. **Clona este repositorio:**
   ```bash
   git clone <url-del-repo>
   cd <carpeta-del-repo>
   ```

3. **Crea la red Docker (solo la primera vez):**
   ```bash
   docker network create microservices-network
   ```
   > Si la red ya existe, este comando no hace nada.

4. **Levanta el gestor:**
   ```bash
   docker-compose up --build
   ```

5. **Abre el dashboard:**
   [http://localhost:4000](http://localhost:4000)

6. **Crea y accede a microservicios:**
   - Todos los microservicios solo son accesibles a través del proxy del gestor.
   - Ejemplo de acceso:
     ```
     http://localhost:4000/services/{nombre-del-servicio}/api/hello
     ```
   - **Nunca se expone el puerto 3000 al host.**

---

## Inicio Rápido (resumen)

1. **Levantar el gestor:**
   ```bash
   docker-compose up -d
   ```

2. **Abrir el dashboard:**
   [http://localhost:4000](http://localhost:4000)

3. **Crear un microservicio:**
   - Pega tu código Node.js
   - Define dependencias (una por línea)
   - Configura variables de entorno
   - Deploy!

## API Gateway

Todos los microservicios son accesibles mediante:
```
http://localhost:4000/services/{nombre-del-servicio}/*
```

Ejemplo:
```bash
curl http://localhost:4000/services/calculadora-abc123/api/suma?num1=5&num2=3
```

## Ejemplos Incluidos

### Hola Mundo
Servicio básico que responde "Hola Mundo"

### Calculadora (Suma)
API REST con operaciones matemáticas
- `GET /api/suma?num1=X&num2=Y`
- `POST /api/suma` con body JSON

### Roble Database
CRUD completo para tablas de Roble
- `GET /api/tabla/:tableName` - Leer registros
- `POST /api/tabla/:tableName` - Insertar registros
- `PUT /api/tabla/:tableName/:id` - Actualizar registro
- `DELETE /api/tabla/:tableName/:id` - Eliminar registro

## Autenticación con Roble

Para usar el microservicio de Roble Database:

1. Obtén tu access token de Roble
2. Envíalo en cada request:
   ```
   Authorization: Bearer {tu-token}
   ```

## Tecnologías

- **Docker & Docker Compose** - Containerización y orquestación
- **Node.js & Express** - Runtime y framework web
- **Dockerode** - Docker SDK para Node.js
- **http-proxy-middleware** - API Gateway dinámico

