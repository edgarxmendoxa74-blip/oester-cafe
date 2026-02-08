import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Plus, X, Copy, Edit2, Trash2 } from 'lucide-react';
import { inputStyle } from './Shared';

const PaymentSettings = ({ paymentSettings, setPaymentSettings, showMessage }) => {
    const [editingMethodId, setEditingMethodId] = useState(null);
    const [showAddMethod, setShowAddMethod] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileUpload = async (e, methodId) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const qr_url = reader.result;
                const { error } = await supabase.from('payment_settings').update({ qr_url }).eq('id', methodId);
                if (error) {
                    console.error(error);
                    showMessage(`Error saving QR code: ${error.message}`);
                    return;
                }
                setPaymentSettings(prev => prev.map(m => m.id === methodId ? { ...m, qr_url } : m));
                showMessage('QR code updated!');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveMethod = async (e, methodId) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updateData = {
            name: formData.get('name'),
            account_number: formData.get('accountNumber'),
            account_name: formData.get('accountName'),
        };
        setIsProcessing(true);
        const { data, error } = await supabase.from('payment_settings').update(updateData).eq('id', methodId).select().single();
        setIsProcessing(false);
        if (error) { console.error(error); showMessage(`Error updating: ${error.message}`); return; }
        setPaymentSettings(paymentSettings.map(m => m.id === methodId ? data : m));
        setEditingMethodId(null);
        showMessage('Payment method updated!');
    };

    const handleAddMethod = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newMethod = {
            name: formData.get('name'),
            account_number: formData.get('accountNumber'),
            account_name: formData.get('accountName'),
            qr_url: ''
        };
        setIsProcessing(true);
        const { data, error } = await supabase.from('payment_settings').insert([newMethod]).select().single();
        setIsProcessing(false);
        if (error) { console.error(error); showMessage(`Error adding: ${error.message}`); return; }
        setPaymentSettings([...paymentSettings, data]);
        setShowAddMethod(false);
        showMessage('Payment method added!');
    };

    const deleteMethod = async (id) => {
        if (window.confirm('Delete this payment method?')) {
            const { error } = await supabase.from('payment_settings').delete().eq('id', id);
            if (error) { console.error(error); showMessage(`Error deleting: ${error.message}`); return; }
            setPaymentSettings(paymentSettings.filter(m => m.id !== id));
            showMessage('Payment method deleted.');
        }
    };

    return (
        <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0 }}>Payment Methods Management</h2>
                <button onClick={() => setShowAddMethod(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px' }}>
                    <Plus size={18} /> Add Method
                </button>
            </div>

            {showAddMethod && (
                <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Add New Payment Method</h3>
                        <button onClick={() => setShowAddMethod(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
                    </div>
                    <form onSubmit={handleAddMethod} style={{ display: 'grid', gap: '15px' }}>
                        <input name="name" placeholder="Method Name (e.g. Bank Transfer, GCash)" required style={inputStyle} />
                        <input name="accountNumber" placeholder="Account Number" required style={inputStyle} />
                        <input name="accountName" placeholder="Account Name" required style={inputStyle} />
                        <button type="submit" disabled={isProcessing} className={`btn-primary ${isProcessing ? 'btn-loading' : ''}`}>
                            {isProcessing ? 'Saving...' : 'Save Method'}
                        </button>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gap: '20px' }}>
                {paymentSettings.map(method => (
                    <div key={method.id} style={{ background: '#f8fafc', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                        {editingMethodId === method.id ? (
                            <form onSubmit={(e) => handleSaveMethod(e, method.id)} style={{ display: 'grid', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <h3 style={{ margin: 0 }}>Edit {method.name}</h3>
                                    <button type="button" onClick={() => setEditingMethodId(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={20} /></button>
                                </div>
                                <input name="name" defaultValue={method.name} placeholder="Method Name" required style={inputStyle} />
                                <input name="accountNumber" defaultValue={method.account_number} placeholder="Account Number" required style={inputStyle} />
                                <input name="accountName" defaultValue={method.account_name} placeholder="Account Name" required style={inputStyle} />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>QR Code Image (Optional)</label>
                                    {method.qr_url && <img src={method.qr_url} style={{ width: '100px', height: '100px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #ddd' }} />}
                                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, method.id)} style={inputStyle} />
                                </div>

                                <button type="submit" disabled={isProcessing} className={`btn-primary ${isProcessing ? 'btn-loading' : ''}`}>
                                    {isProcessing ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {method.name}
                                        </h3>
                                        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{method.account_number}</span>
                                            <button onClick={() => { navigator.clipboard.writeText(method.account_number); showMessage('Number copied!'); }} style={{ border: 'none', background: '#e2e8f0', color: 'var(--primary)', borderRadius: '5px', padding: '5px', cursor: 'pointer' }} title="Copy Number">
                                                <Copy size={16} />
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '5px' }}>{method.account_name}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setEditingMethodId(method.id)} style={{ color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer' }}><Edit2 size={20} /></button>
                                        <button onClick={() => deleteMethod(method.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={20} /></button>
                                    </div>
                                </div>
                                {method.qr_url && (
                                    <div style={{ marginTop: '15px' }}>
                                        <img src={method.qr_url} style={{ width: '150px', height: '150px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0' }} alt="QR Code" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PaymentSettings;
