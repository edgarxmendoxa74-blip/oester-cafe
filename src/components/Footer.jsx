import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { supabase } from '../supabaseClient';

const Footer = () => {
    const location = useLocation();
    const [storeSettings, setStoreSettings] = useState({
        store_name: 'Oesters Cafe and Resto',
        address: 'Poblacion, El Nido, Palawan',
        contact: '09563713967',
        logo_url: ''
    });

    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('store_settings').select('*').limit(1).single();
            if (data) setStoreSettings(data);
        };
        fetchSettings();
    }, []);

    const isAdminPage = location.pathname.startsWith('/admin');
    if (isAdminPage) return null;

    return (
        <footer style={{ background: 'var(--primary)', color: 'white', padding: '80px 0 40px' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '60px' }}>
                {/* Brand Section */}
                <div>
                    <Link to="/" className="brand" style={{ marginBottom: '25px', display: 'inline-block' }}>
                        <img src={storeSettings.logo_url || "/logo.png"} alt="Oesters" style={{ height: '60px', filter: 'brightness(0) invert(1)' }} />
                    </Link>
                    <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: '1.8', marginBottom: '30px' }}>
                        Freshness in every shell. Experience the best seafood and specialty coffee in town.
                    </p>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <a href="https://www.facebook.com/oesterscafeandresto" target="_blank" rel="noopener noreferrer" style={{ color: 'white', background: 'rgba(255,255,255,0.1)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s' }}>
                            <Facebook size={20} />
                        </a>
                        <a href="#" style={{ color: 'white', background: 'rgba(255,255,255,0.1)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s' }}>
                            <Instagram size={20} />
                        </a>
                    </div>
                </div>

                {/* Quick Links */}
                <div>
                    <h4 style={{ fontSize: '1.2rem', marginBottom: '25px', position: 'relative', paddingBottom: '10px' }}>
                        Quick Links
                        <span style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '2px', background: 'var(--accent)' }}></span>
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <li><Link to="/" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Home</Link></li>
                        <li><Link to="/about" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>About Us</Link></li>
                        <li><Link to="/contact" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Contact</Link></li>
                        <li><Link to="/admin" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Admin Login</Link></li>
                    </ul>
                </div>

                {/* Contact Info */}
                <div>
                    <h4 style={{ fontSize: '1.2rem', marginBottom: '25px', position: 'relative', paddingBottom: '10px' }}>
                        Contact Us
                        <span style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '2px', background: 'var(--accent)' }}></span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                            <MapPin size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>{storeSettings.address}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <Phone size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>{storeSettings.contact}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <Mail size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>contact@oesters.com</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container" style={{ marginTop: '60px', paddingTop: '30px', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>
                <p>&copy; {new Date().getFullYear()} {storeSettings.store_name}. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
