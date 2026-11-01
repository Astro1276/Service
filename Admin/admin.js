// ==========================================
// 1. IMPORTACIÓN Y CONFIGURACIÓN DE SUPABASE
// ==========================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://bmiweaeaznxxidlyaftu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_n7R-U2YdVX7fSYVQN1E_Fw_m4atV42Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentRestaurant = null;
let currentProductsCount = 0;

// ==========================================
// 2. VERIFICACIÓN DE SESIÓN (SEGURIDAD)
// ==========================================
async function checkAuthAndLoadData() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        window.location.href = 'index.html';
        return;
    }

    await loadRestaurantData(session.user.id);
    await loadCategories(session.user.id);
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

        document.getElementById('restaurantTitle').textContent = data.name;
        document.getElementById('restaurantSlug').textContent = `qrdely.com/menu/${data.slug}`;
        document.getElementById('restaurantWhatsappDisplay').textContent = data.whatsapp || 'No configurado';
        
        const publicLink = document.getElementById('publicMenuLink');
        publicLink.href = `menu.html?slug=${data.slug}`;

        const planBadge = document.getElementById('planBadge');
        if (data.plan === 'free') {
            planBadge.textContent = 'Plan Gratuito (Máx 15 productos)';
            planBadge.className = 'text-xl font-bold text-slate-300';
        } else {
            planBadge.textContent = 'Plan Emprendedor (Ilimitado)';
            planBadge.className = 'text-xl font-bold text-emerald-400';
        }
    } catch (error) {
        console.error('Error al cargar datos del restaurante:', error.message);
    }
}

// ==========================================
// 4. CARGAR CATEGORÍAS EN EL SELECTOR DEL MODAL
// ==========================================
async function loadCategories(restaurantId) {
    const categorySelect = document.getElementById('prodCategory');
    if (!categorySelect) return;

    const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('display_order', { ascending: true });

    if (!error && categories) {
        categorySelect.innerHTML = '<option value="">Sin categoría principal</option>';
        categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    }
}

// ==========================================
// 5. CARGAR PRODUCTOS Y APLICAR LIMITACIONES
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

        currentProductsCount = products.length;
        productCountBadge.textContent = currentProductsCount;

        if (products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="p-8 text-center text-slate-500">
                        Aún no tienes platos en tu menú. ¡Haz clic en "+ Nuevo Plato" para empezar!
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = '';
        products.forEach(product => {
            const row = document.createElement('tr');
            row.className = 'border-b border-slate-800/60 hover:bg-slate-900/40 transition';
            
            row.innerHTML = `
                <td class="p-4 flex items-center gap-3">
                    <div class="w-10 h-10 bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center text-lg font-bold text-slate-400 shrink-0">
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

        attachProductEvents();

    } catch (error) {
        console.error('Error al cargar productos:', error.message);
    }
}

// ==========================================
// 6. CONTROL DEL MODAL Y EVENTOS DE PRODUCTOS
// ==========================================
const productModal = document.getElementById('productModal');
const closeProductModalBtn = document.getElementById('closeProductModalBtn');
const productForm = document.getElementById('productForm');

// Conectar botón "+ Nuevo Plato" del HTML principal
document.addEventListener('click', (e) => {
    if (e.target && e.target.textContent.includes('Nuevo Plato')) {
        if (currentRestaurant.plan === 'free' && currentProductsCount >= 15) {
            alert('⚠️ Has alcanzado el límite de 15 productos de tu Plan Gratuito. ¡Actualiza al Plan Emprendedor para tener productos ilimitados!');
            return;
        }
        productModal.classList.remove('hidden');
        productModal.classList.add('flex');
    }
});

closeProductModalBtn?.addEventListener('click', () => {
    productModal.classList.add('hidden');
    productModal.classList.remove('flex');
    productForm.reset();
});

// Enviar formulario de creación de producto
if (productForm) {
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('prodName').value.trim();
        const price = parseFloat(document.getElementById('prodPrice').value);
        const category_id = document.getElementById('prodCategory').value || null;
        const description = document.getElementById('prodDesc').value.trim();
        const image_url = document.getElementById('prodImage').value.trim();

        try {
            const { error } = await supabase
                .from('products')
                .insert([{
                    restaurant_id: currentRestaurant.id,
                    category_id: category_id,
                    name: name,
                    price: price,
                    description: description,
                    image_url: image_url || null,
                    is_available: true
                }]);

            if (error) throw error;

            productModal.classList.add('hidden');
            productModal.classList.remove('flex');
            productForm.reset();

            await loadProducts(currentRestaurant.id);
        } catch (error) {
            console.error('Error al crear el plato:', error.message);
            alert('Hubo un error al guardar el plato.');
        }
    });
}

function attachProductEvents() {
    // 1. Interruptor Agotado / Disponible
    document.querySelectorAll('.availability-toggle').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            const productId = e.target.dataset.id;
            const isAvailable = e.target.checked;
            const statusText = e.target.parentElement.querySelector('.status-text');

            statusText.textContent = isAvailable ? 'Disponible' : 'Agotado';

            await supabase
                .from('products')
                .update({ is_available: isAvailable })
                .eq('id', productId);
        });
    });

    // 2. Botón Eliminar Plato
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('¿Estás seguro de eliminar este plato de tu menú?')) return;
            const productId = e.target.dataset.id;

            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (!error) {
                await loadProducts(currentRestaurant.id);
            } else {
                alert('No se pudo eliminar el plato.');
            }
        });
    });
}

// ==========================================
// 7. CERRAR SESIÓN
// ==========================================
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// Inicializar
checkAuthAndLoadData();
