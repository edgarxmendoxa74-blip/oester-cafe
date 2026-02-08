import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Utensils, ShoppingBag, Truck } from 'lucide-react';

const OrderTypeManager = ({ orderTypes, setOrderTypes, showMessage }) => {
    const FIXED_TYPES = [
        { id: 'dine-in', name: 'Dine-in', defaultActive: true },
        { id: 'pickup', name: 'Take Out', defaultActive: true },
        { id: 'delivery', name: 'Delivery', defaultActive: true }
    ];

    const [localTypes, setLocalTypes] = useState([]);

    useEffect(() => {
        // Merge fixed types with db state
        const merged = FIXED_TYPES.map(ft => {
            const existing = orderTypes.find(t => t.id === ft.id);
            return existing ? existing : { ...ft, is_active: ft.defaultActive };
        });
        setLocalTypes(merged);
    }, [orderTypes]);

    const toggleType = async (type) => {
        const newStatus = !type.is_active;

        // Optimistic update
        const updated = localTypes.map(t => t.id === type.id ? { ...t, is_active: newStatus, name: type.name } : t);
        setLocalTypes(updated);
        setOrderTypes(updated);

        // Update DB
        const { error } = await supabase.from('order_types').upsert({
            id: type.id,
            name: type.name, // Ensure name is saved (e.g. "Take Out")
            is_active: newStatus
        });

        if (error) {
            console.error(error);
            showMessage(`Error updating: ${error.message}`);
            // Revert on error would go here
        } else {
            showMessage(`${type.name} is now ${newStatus ? 'Active' : 'Inactive'}`);
        }
    };

    return (
        <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
            <h2 style={{ marginBottom: '10px' }}>Order Types Management</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Manage the availability of service options.</p>

            <div style={{ display: 'grid', gap: '15px' }}>
                {localTypes.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: t.is_active ? 'var(--primary)' : '#cbd5e1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white'
                            }}>
                                {t.id === 'dine-in' && <Utensils size={20} />}
                                {t.id === 'pickup' && <ShoppingBag size={20} />}
                                {t.id === 'delivery' && <Truck size={20} />}
                            </div>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: '1.1rem', display: 'block' }}>{t.name}</span>
                                <span style={{ fontSize: '0.85rem', color: t.is_active ? '#166534' : 'var(--text-muted)' }}>
                                    {t.is_active ? 'Currently Available' : 'Unavailable'}
                                </span>
                            </div>
                        </div>

                        <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={t.is_active !== false}
                                onChange={() => toggleType(t)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: t.is_active ? 'var(--primary)' : '#ccc',
                                transition: '.4s', borderRadius: '34px'
                            }}></span>
                            <span style={{
                                position: 'absolute', content: '""', height: '20px', width: '20px', left: '3px', bottom: '3px',
                                backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                                transform: t.is_active ? 'translateX(24px)' : 'translateX(0)'
                            }}></span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OrderTypeManager;
