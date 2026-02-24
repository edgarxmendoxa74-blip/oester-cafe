import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
    LayoutDashboard,
    LogOut,
    Plus,
    Package,
    Tag,
    Settings,
    X,
    List,
    CreditCard,
    ShoppingBag
} from 'lucide-react';
import { categories as initialCategories, menuItems as initialItems } from '../data/MenuData';

// Sub-components
import MenuManager from '../components/admin/MenuManager';
import CategoryManager from '../components/admin/CategoryManager';
import OrderHistory from '../components/admin/OrderHistory';
import OrderTypeManager from '../components/admin/OrderTypeManager';
import PaymentSettings from '../components/admin/PaymentSettings';
import StoreGeneralSettings from '../components/admin/StoreGeneralSettings';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('menu'); // menu, categories, orders, payment, orderTypes, settings
    const [message, setMessage] = useState('');

    // --- STATE MANAGEMENT ---

    // Helper for safe localStorage access
    const safeGetItem = (key, fallback) => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : fallback;
        } catch (e) {
            console.error(`Error reading ${key} from localStorage`, e);
            return fallback;
        }
    };

    const safeSetItem = (key, value, sanitizer = null) => {
        try {
            const valToStore = sanitizer ? sanitizer(value) : value;
            localStorage.setItem(key, JSON.stringify(valToStore));
        } catch (e) {
            console.warn(`Error writing ${key} to localStorage`, e);
        }
    };

    // Smart sanitizer to prevent QuotaExceededError
    // Strips out large Base64 images from local cache, keeping only text/URLs
    const sanitizeItems = (items) => {
        if (!Array.isArray(items)) return items;
        return items.map(item => {
            const isBase64 = typeof item.image === 'string' && item.image.startsWith('data:');
            // If it's a huge base64 string, don't cache it locally. Use placeholder or keep it if small.
            // 2000 chars is roughly 1.5KB. Most base64 images are 50KB+.
            if (isBase64 && item.image.length > 2000) {
                return { ...item, image: null }; // or a lightweight placeholder
            }
            return item;
        });
    };

    // Logic: Load cached (sanitized) data first for instant render, then let Supabase update with full images.
    const [items, setItems] = useState(() => safeGetItem('menuItems', initialItems));
    const [categories, setCategories] = useState(() => safeGetItem('categories', initialCategories));
    const [orders, setOrders] = useState(() => safeGetItem('orders', []));

    const [orderTypes, setOrderTypes] = useState(() => safeGetItem('orderTypes', []));

    const [paymentSettings, setPaymentSettings] = useState(() => safeGetItem('paymentSettings', []));

    const [storeSettings, setStoreSettings] = useState(() => safeGetItem('storeSettings', {
        manual_status: 'auto', // auto, open, closed
        open_time: '10:00',
        close_time: '01:00',
        store_name: '',
        address: 'Poblacion, El Nido, Palawan',
        contact: '09563713967',
        banner_images: [
            'https://images.unsplash.com/photo-1517701604599-bb29b565094d?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?auto=format&fit=crop&w=1200&q=80',
            'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80'
        ],
        logo_url: ''
    }));

    // --- SYNC TO LOCAL STORAGE ---
    // We sanitize heavy items to avoid crashing the browser storage
    useEffect(() => { safeSetItem('menuItems', items, sanitizeItems); }, [items]);
    useEffect(() => { safeSetItem('categories', categories); }, [categories]);
    useEffect(() => { safeSetItem('orders', orders); }, [orders]);
    useEffect(() => { safeSetItem('storeSettings', storeSettings); }, [storeSettings]);
    useEffect(() => { safeSetItem('orderTypes', orderTypes); }, [orderTypes]);
    useEffect(() => { safeSetItem('paymentSettings', paymentSettings); }, [paymentSettings]);

    // --- FETCH DATA FROM SUPABASE ---
    useEffect(() => {
        const fetchAdminData = async () => {
            if (!supabase) return;
            try {
                const { data: catData, error: catError } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
                if (catError) console.warn('Categories fetch error:', catError);
                if (catData && Array.isArray(catData)) {
                    setCategories(catData.filter(c => c && c.name && c.name !== 'Order Map' && c.id !== 'full-menu'));
                }

                const { data: itemData, error: itemError } = await supabase.from('menu_items').select('*').order('sort_order', { ascending: true });
                if (itemError) console.warn('Menu items fetch error:', itemError);
                if (itemData && Array.isArray(itemData)) setItems(itemData.filter(i => i && i.id));

                const { data: payData, error: payError } = await supabase.from('payment_settings').select('*');
                if (payError) console.warn('Payment settings fetch error:', payError);
                if (payData && Array.isArray(payData)) setPaymentSettings(payData.filter(p => p && p.id));

                const { data: typeData, error: typeError } = await supabase.from('order_types').select('*');
                if (typeError) console.warn('Order types fetch error:', typeError);
                if (typeData && Array.isArray(typeData)) setOrderTypes(typeData.filter(t => t && t.id));

                const { data: storeData, error: storeError } = await supabase.from('store_settings').select('*').limit(1).single();
                if (storeError && storeError.code !== 'PGRST116') console.warn('Store settings fetch error:', storeError);
                if (storeData) setStoreSettings(prev => ({ ...prev, ...storeData }));

                const { data: orderData, error: orderError } = await supabase.from('orders').select('*').order('timestamp', { ascending: false });
                if (orderError) console.warn('Orders fetch error:', orderError);
                if (orderData && Array.isArray(orderData)) setOrders(orderData.filter(o => o && o.id));
            } catch (err) {
                console.error('Error in fetchAdminData:', err);
                showMessage(`Error loading data: ${err.message || 'Unknown error'}`);
            }
        };
        fetchAdminData();
    }, []);

    // --- HELPERS ---
    const showMessage = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('admin_bypass');
        navigate('/admin');
    };

    // --- MAIN RENDER ---
    return (
        <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter' }}>
            {/* Sidebar */}
            <aside style={{ width: '260px', background: 'var(--primary)', color: 'white', padding: '30px 20px', position: 'fixed', height: '100vh' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '50px', paddingLeft: '10px' }}>
                    <Package size={28} color="var(--accent)" />
                    <span style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Playfair Display' }}>Oesters</span>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <SidebarItem icon={<List size={20} />} label="Menu Items" active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} />
                    <SidebarItem icon={<Tag size={20} />} label="Categories" active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} />
                    <SidebarItem icon={<ShoppingBag size={20} />} label="Orders" active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
                    <SidebarItem icon={<Settings size={20} />} label="Order Types" active={activeTab === 'orderTypes'} onClick={() => setActiveTab('orderTypes')} />
                    <SidebarItem icon={<CreditCard size={20} />} label="Payment Methods" active={activeTab === 'payment'} onClick={() => setActiveTab('payment')} />
                    <SidebarItem icon={<LayoutDashboard size={20} />} label="General Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                </nav>

                <button onClick={handleLogout} style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '12px', width: '100%', borderRadius: '10px', cursor: 'pointer', position: 'absolute', bottom: '30px', left: '20px', width: 'calc(100% - 40px)' }}>
                    <LogOut size={20} /> Sign Out
                </button>
            </aside>

            {/* Main Content */}
            <main style={{ marginLeft: '260px', flex: 1, padding: '40px', maxWidth: '1200px' }}>
                {message && (
                    <div style={{
                        position: 'fixed',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: message.toLowerCase().includes('error') ? '#ef4444' : '#10b981',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        zIndex: 5000,
                        fontWeight: 700,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        animation: 'slideDown 0.3s ease-out forwards'
                    }}>
                        {message.toLowerCase().includes('error') ? <X size={18} /> : <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: '2px' }}><Plus size={16} style={{ transform: 'rotate(45deg)' }} /></div>}
                        {message}
                        <style>{`
                            @keyframes slideDown {
                                0% { transform: translate(-50%, -100%); opacity: 0; }
                                80% { transform: translate(-50%, 10px); }
                                100% { transform: translate(-50%, 0); opacity: 1; }
                            }
                        `}</style>
                    </div>
                )}

                {activeTab === 'menu' && <MenuManager items={items} setItems={setItems} categories={categories} showMessage={showMessage} />}
                {activeTab === 'categories' && <CategoryManager categories={categories} setCategories={setCategories} items={items} showMessage={showMessage} />}
                {activeTab === 'orders' && <OrderHistory orders={orders} setOrders={setOrders} storeSettings={storeSettings} showMessage={showMessage} />}
                {activeTab === 'orderTypes' && <OrderTypeManager orderTypes={orderTypes} setOrderTypes={setOrderTypes} showMessage={showMessage} />}
                {activeTab === 'payment' && <PaymentSettings paymentSettings={paymentSettings} setPaymentSettings={setPaymentSettings} showMessage={showMessage} />}
                {activeTab === 'settings' && <StoreGeneralSettings storeSettings={storeSettings} setStoreSettings={setStoreSettings} showMessage={showMessage} />}
            </main>
        </div>
    );
};

const SidebarItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? 'var(--primary)' : 'rgba(255,255,255,0.7)',
        border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
        textAlign: 'left', width: '100%', transition: 'all 0.2s'
    }}>
        {icon} {label}
    </button>
);

export default AdminDashboard;
