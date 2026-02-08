import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, X } from 'lucide-react';
import { SectionLabel, inputStyle } from './Shared';

const MenuManager = ({ items, setItems, categories, showMessage }) => {
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [tempVariations, setTempVariations] = useState([]);
    const [tempFlavors, setTempFlavors] = useState([]);
    const [tempAddons, setTempAddons] = useState([]);

    useEffect(() => {
        if (editingItem) {
            setTempVariations(editingItem.variations || []);
            setTempFlavors(editingItem.flavors || []);
            setTempAddons(editingItem.addons || []);
        }
    }, [editingItem]);

    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const itemData = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: Number(formData.get('price')),
            promo_price: formData.get('promoPrice') ? Number(formData.get('promoPrice')) : null,
            category_id: formData.get('categoryId'),
            image: editingItem.image || 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=500&q=80',
            variations: tempVariations,
            flavors: tempFlavors,
            addons: tempAddons,
            out_of_stock: formData.get('outOfStock') === 'on',
            allow_multiple: formData.get('allowMultiple') === 'on'
        };

        setIsProcessing(true);
        try {
            let finalItem;
            let result;

            // Attempt save
            if (editingItem.id === 'new') {
                if (!itemData.category_id) { showMessage('Please select a category first.'); setIsProcessing(false); return; }
                result = await supabase.from('menu_items').insert([itemData]).select().single();
            } else {
                result = await supabase.from('menu_items').update(itemData).eq('id', editingItem.id).select().single();
            }

            // Fallback for missing 'allow_multiple' column
            if (result.error && result.error.message.includes('allow_multiple')) {
                console.warn("Column 'allow_multiple' missing, retrying without it...");
                const { allow_multiple, ...fallbackData } = itemData;
                if (editingItem.id === 'new') {
                    result = await supabase.from('menu_items').insert([fallbackData]).select().single();
                } else {
                    result = await supabase.from('menu_items').update(fallbackData).eq('id', editingItem.id).select().single();
                }
            }

            if (result.error) throw result.error;
            finalItem = result.data;

            setItems(prev => {
                const exists = prev.find(i => i.id === finalItem.id);
                if (exists) return prev.map(i => i.id === finalItem.id ? finalItem : i);
                return [...prev, finalItem];
            });

            setEditingItem(null);
            setSearchTerm('');
            setFilterCategory('all');
            showMessage('Product saved successfully!');
        } catch (error) {
            console.error(error);
            showMessage(`Error saving: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const deleteItem = async (id) => {
        if (window.confirm('Delete this product?')) {
            const { error } = await supabase.from('menu_items').delete().eq('id', id);
            if (error) { console.error(error); showMessage(`Error deleting: ${error.message}`); return; }
            setItems(items.filter(i => i.id !== id));
            showMessage('Product deleted.');
        }
    };

    const moveItem = async (id, direction) => {
        if (isProcessing) return;

        // Reordering should be relative to the current filtered/sorted view for USABILITY
        // but must update the GLOBAL sort_order.
        const index = items.findIndex(i => i.id === id);
        if (index === -1) return;

        // Find items in the SAME category to move relative to them
        const currentItem = items[index];
        const catItems = items
            .filter(i => i.category_id === currentItem.category_id)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const catIndex = catItems.findIndex(i => i.id === id);
        const newCatIndex = direction === 'up' ? catIndex - 1 : catIndex + 1;

        if (newCatIndex < 0 || newCatIndex >= catItems.length) return;

        setIsProcessing(true);
        try {
            const otherItem = catItems[newCatIndex];
            const currentOrder = currentItem.sort_order || 0;
            const otherOrder = otherItem.sort_order || 0;

            // Swap sort_orders
            const { error } = await supabase.from('menu_items').upsert([
                { id: currentItem.id, sort_order: otherOrder },
                { id: otherItem.id, sort_order: currentOrder }
            ]);

            if (error) throw error;

            // Update local state
            setItems(prev => prev.map(item => {
                if (item.id === currentItem.id) return { ...item, sort_order: otherOrder };
                if (item.id === otherItem.id) return { ...item, sort_order: currentOrder };
                return item;
            }).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));

            showMessage(`Moved ${direction === 'up' ? 'up' : 'down'}`);
        } catch (err) {
            console.error(err);
            showMessage('Error reordering items');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory;
        return matchesSearch && matchesCategory;
    });

    // Render List
    if (!editingItem) return (
        <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Menu Items</h2>
                <div style={{ display: 'flex', gap: '10px', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ ...inputStyle, width: '250px' }}
                    />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={{ ...inputStyle, width: '180px' }}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={() => setEditingItem({ id: 'new', category_id: categories[0]?.id })} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px' }}>
                        <Plus size={18} /> Add Product
                    </button>
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}><th style={{ padding: '10px' }}>Product</th><th style={{ padding: '10px' }}>Category</th><th style={{ padding: '10px' }}>Price</th><th style={{ padding: '10px' }}>Actions</th></tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => (
                            <tr key={item.id} style={{ background: '#f8fafc' }}>
                                <td style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                                    <img src={item.image} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                                </td>
                                <td style={{ padding: '15px' }}>
                                    <span style={{ padding: '4px 10px', background: '#e2e8f0', borderRadius: '20px', fontSize: '0.8rem' }}>
                                        {categories.find(c => c.id === item.category_id)?.name || 'Uncategorized'}
                                    </span>
                                </td>
                                <td style={{ padding: '15px' }}>
                                    {item.promo_price ? (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.8rem' }}>₱{item.price}</span>
                                            <span style={{ color: '#ef4444', fontWeight: 700 }}>₱{item.promo_price}</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 700 }}>₱{item.price}</span>
                                            {item.variations && item.variations.length > 0 && (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--primary)', background: '#fff5f5', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '4px', fontWeight: 700 }}>
                                                    {item.variations.length} Options
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '15px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => moveItem(item.id, 'up')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Move Up"><ChevronUp size={18} /></button>
                                        <button onClick={() => moveItem(item.id, 'down')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Move Down"><ChevronDown size={18} /></button>
                                        <button onClick={() => setEditingItem(item)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)' }} title="Edit"><Edit2 size={18} /></button>
                                        <button onClick={() => deleteItem(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }} title="Delete"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Render Editor (Simplified for brevity but functional)
    return (
        <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3>{editingItem.id === 'new' ? 'New Product' : 'Edit Product'}</h3>
                <button onClick={() => setEditingItem(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X /></button>
            </div>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                    <input name="name" defaultValue={editingItem.name} placeholder="Product Name" required style={inputStyle} />
                    <textarea name="description" defaultValue={editingItem.description} placeholder="Description" style={inputStyle} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input name="price" type="number" defaultValue={editingItem.price} placeholder="Price" required style={inputStyle} />
                        <input name="promoPrice" type="number" defaultValue={editingItem.promo_price} placeholder="Promo Price (Optional)" style={inputStyle} />
                    </div>
                    <select name="categoryId" defaultValue={editingItem.category_id} style={inputStyle}>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ fontWeight: 600 }}>Product Image</label>
                        {editingItem.image && <img src={editingItem.image} style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover' }} />}
                        <input type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setEditingItem({ ...editingItem, image: reader.result });
                                reader.readAsDataURL(file);
                            }
                        }} style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input name="outOfStock" type="checkbox" defaultChecked={editingItem.out_of_stock} style={{ width: '20px', height: '20px' }} />
                            <label style={{ fontWeight: 600 }}>Out of Stock</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input name="allowMultiple" type="checkbox" defaultChecked={editingItem.allow_multiple} style={{ width: '20px', height: '20px' }} />
                            <label style={{ fontWeight: 600 }}>Allow Multiple Flavors/Variations</label>
                        </div>
                    </div>
                </div>

                {/* Variations */}
                <SectionLabel title="Variations" onAdd={() => setTempVariations([...tempVariations, { name: 'Size', price: 0 }])} />
                {tempVariations.map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                        <input value={v.name} onChange={e => { const n = [...tempVariations]; n[i].name = e.target.value; setTempVariations(n); }} placeholder="Name" style={inputStyle} />
                        <input type="number" value={v.price} onChange={e => { const n = [...tempVariations]; n[i].price = Number(e.target.value); setTempVariations(n); }} placeholder="Price" style={inputStyle} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={v.disabled} onChange={e => { const n = [...tempVariations]; n[i].disabled = e.target.checked; setTempVariations(n); }} />
                            <label style={{ fontSize: '0.75rem' }}>Disabled</label>
                        </div>
                        <button type="button" onClick={() => setTempVariations(tempVariations.filter((_, idx) => idx !== i))} style={{ color: 'red', border: 'none', background: 'none' }}><X size={18} /></button>
                    </div>
                ))}

                {/* Flavors */}
                <SectionLabel title="Flavors" onAdd={() => setTempFlavors([...tempFlavors, { name: '', price: 0, disabled: false }])} />
                {tempFlavors.map((f, i) => {
                    const name = typeof f === 'string' ? f : f.name;
                    const price = typeof f === 'object' ? (f.price || 0) : 0;
                    const disabled = typeof f === 'object' ? f.disabled : false;
                    return (
                        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                            <input
                                value={name}
                                onChange={e => {
                                    const n = [...tempFlavors];
                                    if (typeof n[i] === 'string') n[i] = { name: e.target.value, price: 0, disabled: false };
                                    else n[i] = { ...n[i], name: e.target.value };
                                    setTempFlavors(n);
                                }}
                                placeholder="Flavor Name"
                                style={inputStyle}
                            />
                            <input
                                type="number"
                                value={price}
                                onChange={e => {
                                    const n = [...tempFlavors];
                                    const p = Number(e.target.value);
                                    if (typeof n[i] === 'string') n[i] = { name: n[i], price: p, disabled: false };
                                    else n[i] = { ...n[i], price: p };
                                    setTempFlavors(n);
                                }}
                                placeholder="Price"
                                style={{ ...inputStyle, width: '100px' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                <input
                                    type="checkbox"
                                    checked={disabled}
                                    onChange={e => {
                                        const n = [...tempFlavors];
                                        if (typeof n[i] === 'string') n[i] = { name: n[i], price: 0, disabled: e.target.checked };
                                        else n[i] = { ...n[i], disabled: e.target.checked };
                                        setTempFlavors(n);
                                    }}
                                />
                                <label style={{ fontSize: '0.75rem' }}>Disabled</label>
                            </div>
                            <button type="button" onClick={() => setTempFlavors(tempFlavors.filter((_, idx) => idx !== i))} style={{ color: 'red', border: 'none', background: 'none' }}><X size={18} /></button>
                        </div>
                    );
                })}

                {/* Addons */}
                <SectionLabel title="Add-ons" onAdd={() => setTempAddons([...tempAddons, { name: 'Addon', price: 0 }])} />
                {tempAddons.map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                        <input value={v.name} onChange={e => { const n = [...tempAddons]; n[i].name = e.target.value; setTempAddons(n); }} placeholder="Name" style={inputStyle} />
                        <input type="number" value={v.price} onChange={e => { const n = [...tempAddons]; n[i].price = Number(e.target.value); setTempAddons(n); }} placeholder="Price" style={inputStyle} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={v.disabled} onChange={e => { const n = [...tempAddons]; n[i].disabled = e.target.checked; setTempAddons(n); }} />
                            <label style={{ fontSize: '0.75rem' }}>Disabled</label>
                        </div>
                        <button type="button" onClick={() => setTempAddons(tempAddons.filter((_, idx) => idx !== i))} style={{ color: 'red', border: 'none', background: 'none' }}><X size={18} /></button>
                    </div>
                ))}

                <button
                    type="submit"
                    disabled={isProcessing}
                    className={`btn-primary ${isProcessing ? 'btn-loading' : ''}`}
                    style={{ width: '100%', marginTop: '20px' }}>
                    {isProcessing ? 'Saving...' : 'Save Product'}
                </button>
            </form>
        </div>
    );
};

export default MenuManager;
