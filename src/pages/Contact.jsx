import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, Facebook, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Contact = () => {
    const [storeSettings, setStoreSettings] = useState({
        store_name: 'Oesters',
        address: 'Philippines',
        contact: '09563713967',
        open_time: '10:00',
        close_time: '01:00',
        logo_url: '/logo.png'
    });

    useEffect(() => {
        const fetchStoreSettings = async () => {
            const { data } = await supabase.from('store_settings').select('*').limit(1).single();
            if (data) setStoreSettings(data);
        };
        fetchStoreSettings();
    }, []);

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${minutes} ${ampm}`;
    };

    return (
        <div className="page-wrapper">
            <header className="app-header">
                <div className="container header-container">
                    <Link to="/" className="brand">
                        <img src={storeSettings.logo_url || "/logo.png"} alt="Oesters Logo" style={{ height: '50px' }} />

                    </Link>
                    <nav className="header-nav" style={{ display: 'flex', gap: '20px' }}>
                        <Link to="/" className="nav-link">Home</Link>

                        <Link to="/contact" className="nav-link">Contact</Link>
                    </nav>
                </div>
            </header>

            <main className="container" style={{ padding: '80px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h1 style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '15px' }}>Visit Us</h1>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginBottom: '60px' }}>
                    <div style={{ background: 'white', padding: '40px', borderRadius: '20px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ background: 'var(--bg)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--accent)' }}>
                            <MapPin size={28} />
                        </div>
                        <h3 style={{ marginBottom: '12px' }}>Our Location</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            {storeSettings.address}
                        </p>
                    </div>

                    <div style={{ background: 'white', padding: '40px', borderRadius: '20px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ background: 'var(--bg)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--accent)' }}>
                            <Phone size={28} />
                        </div>
                        <h3 style={{ marginBottom: '12px' }}>Contact</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            {storeSettings.contact}
                        </p>
                    </div>

                    <div style={{ background: 'white', padding: '40px', borderRadius: '20px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ background: 'var(--bg)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--accent)' }}>
                            <Clock size={28} />
                        </div>
                        <h3 style={{ marginBottom: '12px' }}>Hours</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Open daily from:<br />
                            {formatTime(storeSettings.open_time)} - {formatTime(storeSettings.close_time)}
                        </p>
                    </div>
                </div>

                {/* Social Media Section */}
                <div style={{ background: 'var(--primary)', color: 'white', borderRadius: '30px', padding: '60px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '20px' }}>Stay Connected</h2>
                    <p style={{ marginBottom: '40px', color: 'rgba(255,255,255,0.8)' }}>Follow us on social media for daily specials and events.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                        <a href="https://www.facebook.com/oesterscafeandresto" target="_blank" rel="noopener noreferrer" style={{ background: 'white', color: 'var(--primary)', padding: '15px 30px', borderRadius: '50px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Facebook size={20} />
                            Facebook
                        </a>
                        <a href="mailto:contact@oesters.com" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '15px 30px', borderRadius: '50px', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Mail size={20} />
                            Email Us
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Contact;
