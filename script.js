// ==========================================
// 1. CONFIGURACIÓN DE SUPABASE
// ==========================================
// Reemplaza con tus credenciales reales de tu proyecto en Supabase
const SUPABASE_URL = 'https://bmiweaeaznxxidlyaftu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_n7R-U2YdVX7fSYVQN1E_Fw_m4atV42Q';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. CONTROL DEL MENÚ MÓVIL
// ==========================================
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}

// ==========================================
// 3. CONTROL DEL MODAL DE AUTENTICACIÓN (LOGIN / REGISTRO)
// ==========================================
const authModal = document.getElementById('authModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');

let isRegisterMode = false; // Estado para saber si estamos en Login o Registro

// Función para abrir el modal
function openModal(registerMode = false) {
    isRegisterMode = registerMode;
    if (authModal) {
        authModal.classList.remove('hidden');
        authModal.classList.add('flex');
    }

    if (isRegisterMode) {
        modalTitle.textContent = 'Registrar mi Local';
        modalSubtitle.textContent = 'Crea tu cuenta y comienza a usar tu menú digital.';
        authSubmitBtn.textContent = 'Crear Cuenta Gratis';
    } else {
        modalTitle.textContent = 'Iniciar Sesión';
        modalSubtitle.textContent = 'Accede a tu panel de restaurante.';
        authSubmitBtn.textContent = 'Entrar';
    }
}

// Función para cerrar el modal
function closeModal() {
    if (authModal) {
        authModal.classList.add('hidden');
        authModal.classList.remove('flex');
        authForm.reset();
    }
}

// Event Listeners para abrir y cerrar botones (Escritorio y Móvil)
document.getElementById('openLoginBtn')?.addEventListener('click', () => openModal(false));
document.getElementById('mobileLoginBtn')?.addEventListener('click', () => {
    mobileMenu.classList.add('hidden');
    openModal(false);
});

document.getElementById('openRegisterBtn')?.addEventListener('click', () => openModal(true));
document.getElementById('mobileRegisterBtn')?.addEventListener('click', () => {
    mobileMenu.classList.add('hidden');
    openModal(true);
});

closeModalBtn?.addEventListener('click', closeModal);
authModal?.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal();
});

// ==========================================
// 4. LÓGICA DE AUTENTICACIÓN CON SUPABASE
// ==========================================
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = authEmail.value.trim();
        const password = authPassword.value.trim();

        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = isRegisterMode ? 'Registrando...' : 'Iniciando sesión...';

        try {
            if (isRegisterMode) {
                // Registro de nuevo usuario (El Trigger de la base de datos creará el restaurante automáticamente)
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                alert('¡Cuenta creada con éxito! Revisa tu correo si requiere confirmación o inicia sesión.');
                openModal(false); // Cambiar a modo login
            } else {
                // Inicio de sesión normal
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                // Redirigir al panel de administración del restaurante
                window.location.href = 'admin.html';
            }
        } catch (error) {
            console.error('Error de autenticación:', error.message);
            alert('Hubo un error: ' + error.message);
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isRegisterMode ? 'Crear Cuenta Gratis' : 'Entrar';
        }
    });
}

// ==========================================
// 5. VERIFICACIÓN AUTOMÁTICA DE SESIÓN
// ==========================================
async function checkExistingSession() {
    const { data: { session } } = await supabase.auth.getSession();
    // Si ya hay una sesión activa y estamos en la landing, podemos opcionalmente guiarlo al admin
    if (session && window.location.pathname.includes('index.html')) {
        // Opcional: window.location.href = 'admin.html';
    }
}

checkExistingSession();
