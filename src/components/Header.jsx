import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, Clock } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { supabase } from '../supabaseClient';

const Header = () => {
    const { cartCount, setIsCartOpen } = useCart();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [storeSettings, setStoreSettings] = useState({
        logo_url: '',
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
            <header className="app-header" style={{ top: isOpen ? 0 : '35px' }}>
                <div className="container header-container">
                    <Link to="/" className="brand">
                        <img src={storeSettings.logo_url || "/logo.png"} alt="Oesters" style={{ height: '50px' }} />
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="header-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                        <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>Contact</Link>

                        <button className="btn-accent" onClick={() => setIsCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShoppingBag size={18} />
                            <span>Cart ({cartCount})</span>
                        </button>
                    </nav>

                    {/* Mobile Toggle */}
                    <button className="mobile-menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: 'var(--primary)' }}>
                        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="mobile-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '15px', zIndex: 1000 }}>
                        <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="nav-link">Contact</Link>
                        <button className="btn-accent" onClick={() => { setIsCartOpen(true); setIsMenuOpen(false); }} style={{ width: '100%', justifyContent: 'center' }}>
                            <ShoppingBag size={18} style={{ marginRight: '8px' }} />
                            Cart ({cartCount})
                        </button>
                    </div>
                )}
            </header>

            <style>{`
                @media (max-width: 768px) {
                    .header-nav-desktop { display: none !important; }
                    .mobile-menu-toggle { display: block !important; }
                }
                .nav-link.active { color: var(--primary); border-bottom: 2px solid var(--primary); }
            `}</style>
        </>
    );
};

export default Header;
