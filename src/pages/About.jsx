import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Coffee, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const About = () => {
    const [storeSettings, setStoreSettings] = useState({
        store_name: 'Oesters',
        logo_url: '/logo.png'
    });

    useEffect(() => {
        const fetchStoreSettings = async () => {
            const { data } = await supabase.from('store_settings').select('*').limit(1).single();
            if (data) setStoreSettings(data);
        };
        fetchStoreSettings();
    }, []);

    return (
        <div className="page-wrapper">

            <main className="container" style={{ padding: '80px 0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center', marginBottom: '80px' }}>
                    <div>
                        <h2 style={{ fontSize: '2.5rem', marginBottom: '30px', color: 'var(--primary)' }}>Where Seafood Meets Soul</h2>
                        <p style={{ marginBottom: '20px', lineHeight: '1.8' }}>
                            {storeSettings.store_name} began with a simple idea: that high-quality seafood shouldn't be a luxury reserved only for the coast. Our founders, passionate foodies with a love for vibrant culture, set out to create a space where people could enjoy great food alongside artisanal coffee.
                        </p>
                        <p style={{ lineHeight: '1.8' }}>
                            Every oyster we serve is hand-selected and handled with the utmost care, ensuring that every bite is as fresh as the day it was harvested. Our coffee is equally curated, with beans sourced from local growers and expertly prepared by our baristas.
                        </p>
                    </div>
                    <img src="https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80" alt="Cafe Interior" style={{ width: '100%', borderRadius: '20px', boxShadow: 'var(--shadow-lg)' }} />
                </div>

            </main>
        </div >
    );
};

export default About;
