// ==========================================
// 1. IMPORTACIÓN Y CONFIGURACIÓN DE SUPABASE
// ==========================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bmiweaeaznxxidlyaftu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_n7R-U2YdVX7fSYVQN1E_Fw_m4atV42Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales del restaurante actual
let currentRestaurant = null;

// ==========================================
// 2. VERIFICACIÓN DE SESIÓN (SEGURIDAD DE RUTA)
// ==========================================
async function checkAuthAndLoadData() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        // Si no hay sesión activa, expulsar al usuario de vuelta al inicio
        window.location.href = 'index.html';
        return;
    }

    // Cargar la información del restaurante vinculado a este usuario (`auth.uid()`)
    await loadRestaurantData(session.user.id);
    await loadProducts(session.user.id);
}

// ==========================================
// 3. CARGAR DATOS DEL RESTAURANTE
// ==========================================
async function loadRestaurantData(userId) {
    try {
        const { data, error } = await supabase
            .from('restaurants')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        currentRestaurant = data;

        // Inyectar datos en el Header y Estadísticas del Panel
        document.getElementById('restaurantTitle').textContent = data.name;
        document.getElementById('restaurantSlug').textContent = `qrdely.com/menu/${data.slug}`;
        document.getElementById('restaurantWhatsappDisplay').textContent = data.whatsapp || 'No configurado';
        
        // Configurar enlace del menú público
        const publicLink = document.getElementById('publicMenuLink');
        publicLink.href = `menu.html?slug=${data.slug}`; // (Vista pública que haremos después)

        // Mostrar el plan actual con diseño distintivo
        const planBadge = document.getElementById('planBadge');
        if (data.plan === 'free') {
            planBadge.textContent = 'Plan Gratuito (Máx 15 productos)';
            planBadge.className = 'text-xl font-bold text-slate-300';
        } else if (data.plan === 'emprendedor') {
            planBadge.textContent = 'Plan Emprendedor (Ilimitado)';
            planBadge.className = 'text-xl font-bold text-emerald-400';
        } else {
            planBadge.textContent = 'Plan Pro Total';
            planBadge.className = 'text-xl font-bold text-teal-400';
        }

    } catch (error) {
        console.error('Error al cargar datos del restaurante:', error.message);
        alert('No se pudo cargar la información del local.');
    }
}

// ==========================================
// 4. CARGAR PRODUCTOS Y APLICAR LIMITACIONES
// ==========================================
async function loadProducts(restaurantId) {
    const tableBody = document.getElementById('productsTableBody');
    const productCountBadge = document.getElementById('productCount');

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        productCountBadge.textContent = products.length;

        if (products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="p-8 text-center text-slate-500">
                        Aún no tienes platos en tu menú. ¡Haz clic en "+ Nuevo Plato" para empezar!
                    </td>
                </tr>`;
            return;
        }

        // Renderizar tabla de productos
        tableBody.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-800/60 hover:bg-slate-900/40 transition';
            
            row.innerHTML = `
                <td class="p-4 flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center text-lg font-bold text-slate-400">
                        ${product.image_url ? `<img src="${product.image_url}" class="w-full h-full object-cover">` : '🍔'}
                    </div>
                    <div>
                        <div class="font-semibold text-slate-200">${product.name}</div>
                        <div class="text-xs text-slate-400 truncate max-w-xs">${product.description || 'Sin descripción'}</div>
                    </div>
                </td>
                <td class="p-4 font-mono font-medium text-emerald-400">$${Number(product.price).toFixed(2)}</td>
                <td class="p-4">
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" class="sr-only peer availability-toggle" data-id="${product.id}" ${product.is_available ? 'checked' : ''}>
                        <div class="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        <span class="ml-3 text-xs font-medium text-slate-300 status-text">${product.is_available ? 'Disponible' : 'Agotado'}</span>
                    </label>
                </td>
                <td class="p-4 text-right">
                    <button class="text-red-400 hover:text-red-300 text-xs font-semibold px-3 py-1.5 bg-red-500/10 rounded-lg border border-red-500/20 delete-btn" data-id="${product.id}">
                        Eliminar
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Activar eventos para los interruptores de "Agotado"
        attachProductEvents(products.length);

    } catch (error) {
        console.error('Error al cargar productos:', error.message);
        tableBody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-400">Error al cargar la carta.</td></tr>`;
    }
}

// ==========================================
// 5. EVENTOS DE PRODUCTOS (INTERRUPTOR AGOTADO Y LÍMITES DE PLAN)
// ==========================================
function attachProductEvents(currentProductCount) {
    // 1. Interruptor de disponibilidad (Agotado / Disponible)
    document.querySelectorAll('.availability-toggle').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            const productId = e.target.dataset.id;
            const isAvailable = e.target.checked;
            const statusText = e.target.parentElement.querySelector('.status-text');

            statusText.textContent = isAvailable ? 'Disponible' : 'Agotado';

            const { error } = await supabase
                .from('products')
                .update({ is_available: isAvailable })
                .eq('id', productId);

            if (error) {
                console.error('Error al actualizar disponibilidad:', error.message);
                alert('No se pudo actualizar el estado del plato.');
                e.target.checked = !isAvailable; // Revertir visualmente si falla
                statusText.textContent = !isAvailable ? 'Disponible' : 'Agotado';
            }
        });
    });

    // 2. Control de límite de plan en el botón de "+ Nuevo Plato"
    const newProductBtn = document.querySelector('button[onclick*="Nuevo Plato"]');
    if (newProductBtn) {
        // Reemplazar onclick por evento limpio
        newProductBtn.removeAttribute('onclick');
        newProductBtn.onclick = () => {
            // Validar restricción del Plan Gratuito (Máximo 15 productos)
            if (currentRestaurant.plan === 'free' && currentProductCount >= 15) {
                alert('⚠️ Has alcanzado el límite de 15 productos de tu Plan Gratuito. ¡Actualiza al Plan Emprendedor por solo $5/mes para tener productos ilimitados!');
                return;
            }
            openProductModal();
        };
    }
}

// Función temporal para simular la apertura del modal de creación de producto
function openProductModal() {
    const productName = prompt('Nombre del nuevo plato:');
    if (!productName) return;
    const productPrice = prompt('Precio (Ej: 8.50):');
    if (!productPrice) return;

    createProduct(productName, productPrice);
}

// Función rápida para insertar el producto respetando el multi-tenant (`restaurant_id`)
async function createProduct(name, price) {
    try {
        const { error } = await supabase
            .from('products')
            .insert([{
                restaurant_id: currentRestaurant.id,
                name: name,
                price: parseFloat(price),
                is_available: true
            }]);

        if (error) throw error;

        // Recargar la lista de productos
        await loadProducts(currentRestaurant.id);
    } catch (error) {
        console.error('Error al crear producto:', error.message);
        alert('Hubo un error al agregar el plato.');
    }
}

// ==========================================
// 6. CERRAR SESIÓN
// ==========================================
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// Inicializar verificación al cargar la página del admin
checkAuthAndLoadData();
      
