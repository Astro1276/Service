// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==========================================
// Reemplaza estos valores con la URL y la "anon key" de tu proyecto en Supabase
const SUPABASE_URL = 'TUS_DATOS_DE_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'TUS_DATOS_DE_SUPABASE_ANON_KEY';

// Inicializar el cliente de Supabase (asegúrate de incluir el script CDN de Supabase en tu HTML)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. REFERENCIAS A LOS ELEMENTOS DEL DOM
// ==========================================
// Ajusta estos selectores según los IDs o clases reales de tu formulario en HTML
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessageDiv = document.getElementById('error-message');
const submitButton = document.getElementById('submit-btn');

// ==========================================
// 3. LÓGICA DE INICIO DE SESIÓN
// ==========================================
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Limpiar errores previos y dar feedback visual de carga
        if (errorMessageDiv) errorMessageDiv.textContent = '';
        submitButton.disabled = true;
        submitButton.textContent = 'Iniciando sesión...';

        try {
            // Llamada oficial a Supabase Auth para iniciar sesión
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw error;
            }

            // Si el login es exitoso, Supabase guarda la sesión automáticamente en localStorage.
            // Redirigimos al usuario a su panel de administración (admin.html)
            window.location.href = 'admin.html';

        } catch (error) {
            // Manejo de errores amigable para el usuario
            console.error('Error en el login:', error.message);
            if (errorMessageDiv) {
                errorMessageDiv.textContent = 'Correo o contraseña incorrectos. Por favor, verifica.';
            }
            submitButton.disabled = false;
            submitButton.textContent = 'Entrar';
        }
    });
}

// ==========================================
// 4. VERIFICACIÓN DE SESIÓN (Opcional pero útil)
// ==========================================
// Si el usuario ya está logueado y por alguna razón vuelve a entrar a la página de login,
// podemos redirigirlo automáticamente al admin para ahorrarle pasos.
async function checkExistingSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'admin.html';
    }
}

// Ejecutar al cargar la página de login
checkExistingSession();
  
