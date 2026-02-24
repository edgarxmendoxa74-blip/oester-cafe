import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Clock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { supabase } from '../supabaseClient';

const Header = () => {
    const { cartCount, setIsCartOpen, categories, activeCategory, setActiveCategory } = useCart();
    const [storeSettings, setStoreSettings] = useState({
        open_time: '10:00',
        close_time: '01:00',
        manual_status: 'auto'
    });
    const location = useLocation();

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('store_settings').select('*').limit(1).single();
            if (data) setStoreSettings(data);
        };
        fetchSettings();
    }, []);

    const isStoreOpen = () => {
        if (storeSettings.manual_status === 'open') return true;
        if (storeSettings.manual_status === 'closed') return false;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [openH, openM] = (storeSettings.open_time || '10:00').split(':').map(Number);
        const [closeH, closeM] = (storeSettings.close_time || '01:00').split(':').map(Number);

        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        if (closeMinutes < openMinutes) {
            return currentTime >= openMinutes || currentTime < closeMinutes;
        }
        return currentTime >= openMinutes && currentTime < closeMinutes;
    };

    const isOpen = isStoreOpen();
    const isAdminPage = location.pathname.startsWith('/admin');

    if (isAdminPage) return null;

    return (
        <>
            {!isOpen && (
                <div style={{ background: '#ef4444', color: 'white', textAlign: 'center', padding: '10px', position: 'sticky', top: 0, zIndex: 1200, fontWeight: 700, fontSize: '0.85rem' }}>
                    <Clock size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    WE ARE CURRENTLY CLOSED. Orders are disabled.
                </div>
            )}
            <header className="app-header" style={{ top: isOpen ? 0 : '35px', paddingBottom: '0' }}>
                <div className="container header-container">
                    <Link to="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                        {storeSettings.logo_url ? (
                            <img src={storeSettings.logo_url} alt={storeSettings.store_name || 'Oesters Logo'} style={{ height: '45px', width: 'auto', objectFit: 'contain' }} />
                        ) : (
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'Playfair Display, serif' }}>
                                {storeSettings.store_name || 'Oesters'}
                            </span>
                        )}
                    </Link>

                    {/* Navigation */}
                    <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>Contact</Link>

                        <button className="btn-accent" onClick={() => setIsCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShoppingBag size={18} />
                            <span>Cart ({cartCount})</span>
                        </button>
                    </nav>

                </div>

                {/* Categories Row (Merged in Header) */}
                {location.pathname === '/' && categories.length > 0 && (
                    <div className="category-nav-wrapper" style={{ borderTop: '1px solid var(--border)', background: '#fff' }}>
                        <div className="container">
                            <div className="category-slider" style={{ padding: '10px 0' }}>
                                {categories.map(cat => (
                                    <div
                                        key={cat.id}
                                        className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveCategory(cat.id);
                                            document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }}
                                    >
                                        {cat.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </header>

            <style>{`
                .nav-link.active { color: var(--primary); border-bottom: 2px solid var(--primary); }
                
                .category-slider {
                    display: flex;
                    gap: 10px;
                    overflow-x: auto;
                    scroll-behavior: smooth;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .category-slider::-webkit-scrollbar {
                    display: none;
                }
                .category-item {
                    flex: 0 0 auto;
                    padding: 6px 15px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.3s;
                    border: 1px solid var(--border);
                }
                .category-item.active {
                    background: var(--primary);
                    color: white;
                    border-color: var(--primary);
                }
            `}</style>
        </>
    );
};

export default Header;
