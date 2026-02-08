import React from 'react';

export const SectionLabel = ({ title, onAdd }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px solid #eee' }}>
        <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{title}</label>
        <button type="button" onClick={onAdd} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>+ Add</button>
    </div>
);

export const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.95rem' };
