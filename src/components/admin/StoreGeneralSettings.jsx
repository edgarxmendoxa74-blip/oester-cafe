import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Clock, FileText, Camera, Plus, X, ImageIcon } from 'lucide-react';
import { inputStyle } from './Shared';

const StoreGeneralSettings = ({ storeSettings, setStoreSettings, showMessage }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updateData = {
            store_name: formData.get('storeName'),
            address: formData.get('address'),
            contact: formData.get('contact'),
            open_time: formData.get('openTime'),
            close_time: formData.get('closeTime'),
            manual_status: formData.get('manualStatus')
        };

        setIsProcessing(true);
        const payload = storeSettings.id ? { id: storeSettings.id, ...updateData } : updateData;
        const { data, error } = await supabase.from('store_settings').upsert(payload).select().single();
        setIsProcessing(false);

        if (error) {
            console.error(error);
            showMessage(`Error saving: ${error.message}`);
            return;
        }
        setStoreSettings(data);
        showMessage('General settings saved!');
    };

    const handleBannerUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const newBanners = [...(storeSettings.banner_images || []), reader.result];
                let error;
                if (storeSettings.id) {
                    const res = await supabase.from('store_settings').update({ banner_images: newBanners }).eq('id', storeSettings.id);
                    error = res.error;
                } else {
                    const res = await supabase.from('store_settings').upsert({ banner_images: newBanners }).select().single();
                    error = res.error;
                    if (res.data) setStoreSettings(res.data);
                }
                if (error) {
                    console.error(error);
                    showMessage(`Error saving banner: ${error.message}`);
                    return;
                }
                if (storeSettings.id) setStoreSettings({ ...storeSettings, banner_images: newBanners });
                showMessage('Banner uploaded!');
            };
            reader.readAsDataURL(file);
        }
    };

    const removeBanner = async (index) => {
        const newBanners = (storeSettings.banner_images || []).filter((_, i) => i !== index);
        if (!storeSettings.id) {
            setStoreSettings({ ...storeSettings, banner_images: newBanners });
            return;
        }
        const { error } = await supabase.from('store_settings').update({ banner_images: newBanners }).eq('id', storeSettings.id);
        if (error) {
            console.error(error);
            showMessage(`Error removing: ${error.message}`);
            return;
        }
        setStoreSettings({ ...storeSettings, banner_images: newBanners });
        showMessage('Banner removed.');
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const logo_url = reader.result;
                let error;
                if (storeSettings.id) {
                    const res = await supabase.from('store_settings').update({ logo_url }).eq('id', storeSettings.id);
                    error = res.error;
                } else {
                    const res = await supabase.from('store_settings').upsert({ logo_url }).select().single();
                    error = res.error;
                    if (res.data) setStoreSettings(res.data);
                }
                if (error) {
                    console.error(error);
                    showMessage(`Error saving logo: ${error.message}`);
                    return;
                }
                if (storeSettings.id) setStoreSettings({ ...storeSettings, logo_url });
                showMessage('Logo updated!');
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
            <h2 style={{ marginBottom: '30px' }}>Store Settings</h2>

            <form onSubmit={handleSave}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Clock size={20} /> Store Availability
                        </h3>
                        <div style={{ display: 'grid', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Manual Status Toggle</label>
                                <select name="manualStatus" defaultValue={storeSettings.manual_status} style={inputStyle}>
                                    <option value="auto">Auto (Based on Hours)</option>
                                    <option value="open">Always Open</option>
                                    <option value="closed">Always Closed</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Opening Time</label>
                                    <input name="openTime" type="time" defaultValue={storeSettings.open_time} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Closing Time</label>
                                    <input name="closeTime" type="time" defaultValue={storeSettings.close_time} style={inputStyle} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={20} /> Store Information
                        </h3>
                        <div style={{ display: 'grid', gap: '15px' }}>
                            <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Store Name</label><input name="storeName" defaultValue={storeSettings.store_name} style={inputStyle} /></div>
                            <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Address</label><input name="address" defaultValue={storeSettings.address} style={inputStyle} /></div>
                            <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Contact Number</label><input name="contact" defaultValue={storeSettings.contact} style={inputStyle} /></div>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Camera size={20} /> Store Logo
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {storeSettings.logo_url && <img src={storeSettings.logo_url} style={{ width: '120px', height: '120px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '10px' }} />}
                            <input type="file" accept="image/*" onChange={handleLogoUpload} style={inputStyle} />
                        </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ImageIcon size={20} /> Hero Slideshow Banners
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            {(storeSettings.banner_images || []).map((url, i) => (
                                <div key={i} style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow)' }}>
                                    <img src={url} style={{ width: '100%', height: '140px', objectFit: 'cover' }} alt={`Banner ${i}`} />
                                    <button
                                        type="button"
                                        onClick={() => removeBanner(i)}
                                        style={{
                                            position: 'absolute',
                                            top: '10px',
                                            right: '10px',
                                            background: 'rgba(239, 68, 68, 0.9)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '32px',
                                            height: '32px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <X size={18} />
                                    </button>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '5px 10px', fontSize: '0.7rem', textAlign: 'center' }}>
                                        Banner {i + 1}
                                    </div>
                                </div>
                            ))}
                            <label style={{
                                height: '140px',
                                border: '3px dashed var(--primary)',
                                borderRadius: '16px',
                                background: '#fff5f5',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                transition: 'all 0.3s',
                                fontWeight: 700
                            }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = 'var(--primary-dark)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                            >
                                <Plus size={32} />
                                <span style={{ fontSize: '0.9rem' }}>Add New Banner</span>
                                <input type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isProcessing}
                    className={`btn-primary ${isProcessing ? 'btn-loading' : ''}`}
                    style={{ marginTop: '40px', width: '100%', padding: '15px' }}
                >
                    {isProcessing ? 'Saving All Settings...' : 'Save All Settings'}
                </button>
            </form>
        </div>
    );
};

export default StoreGeneralSettings;
