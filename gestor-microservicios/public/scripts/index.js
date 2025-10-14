const API_URL = "https://roble-api.openlab.uninorte.edu.co/auth/microservicios_87085b17b4/login";

if (localStorage.getItem("isLoggedIn") === "true") {
  window.location.href = "app.html";
}

const form = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  // Limpiar mensaje previo
  errorMsg.textContent = "";
  errorMsg.style.display = "none";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // ✅ Login exitoso: guardar datos en localStorage
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("username", data.user.name || email);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      // Redirigir a la app
      window.location.href = "app.html";
    } else {
      // ❌ Errores controlados por la API (401 con mensajes específicos)
      let mensaje = "Error desconocido. Inténtalo nuevamente.";

      if (data && data.message) {
        if (data.message.includes("Usuario no verificado")) {
          mensaje = "El usuario no existe o no ha sido verificado.";
        } else if (data.message.includes("Contraseña incorrecta")) {
          mensaje = "La contraseña ingresada es incorrecta.";
        } else {
          mensaje = data.message;
        }
      }

      errorMsg.textContent = mensaje;
      errorMsg.style.display = "block";

      setTimeout(() => {
        errorMsg.textContent = "";
        errorMsg.style.display = "none";
      }, 3500);
    }

  } catch (error) {
    console.error("Error de conexión con la API:", error);
    errorMsg.textContent = "No se pudo conectar con el servidor. Revisa tu conexión.";
    errorMsg.style.display = "block";

    setTimeout(() => {
      errorMsg.textContent = "";
      errorMsg.style.display = "none";
    }, 3500);
  }
});
