import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { ChevronUp, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { inputStyle } from './Shared';

const CategoryManager = ({ categories, setCategories, items, showMessage }) => {
    const [newCat, setNewCat] = useState('');
    const [editingCatId, setEditingCatId] = useState(null);
    const [editCatName, setEditCatName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const addCategory = async (e) => {
        e.preventDefault();
        if (!newCat.trim()) return;
        setIsProcessing(true);
        const { data, error } = await supabase.from('categories').insert([{ name: newCat, sort_order: categories.length }]).select().single();
        setIsProcessing(false);
        if (error) { console.error(error); showMessage(`Error adding category: ${error.message}`); return; }
        setCategories([...categories, data]);
        setNewCat('');
        showMessage('Category added!');
    };

    const startEdit = (cat) => {
        setEditingCatId(cat.id);
        setEditCatName(cat.name);
    };

    const saveEdit = async (id) => {
        if (!editCatName.trim()) return;
        setIsProcessing(true);
        const { data, error } = await supabase.from('categories').update({ name: editCatName }).eq('id', id).select().single();
        setIsProcessing(false);
        if (error) { console.error(error); showMessage(`Error updating: ${error.message}`); return; }
        setCategories(categories.map(c => c.id === id ? data : c));
        setEditingCatId(null);
        showMessage('Category updated!');
    };

    const moveCategory = async (id, direction) => {
        const index = categories.findIndex(c => c.id === id);
        if (index === -1) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= categories.length) return;

        const newCats = [...categories];
        const [removed] = newCats.splice(index, 1);
        newCats.splice(newIndex, 0, removed);

        const updatedCats = newCats.map((cat, idx) => ({ ...cat, sort_order: idx }));
        setCategories(updatedCats);

        const { error } = await supabase.from('categories').upsert(updatedCats);
        if (error) {
            console.error('Error syncing order:', error);
            showMessage('Error saving category order.');
        } else {
            showMessage('Category order updated!');
        }
    };

    const deleteCategory = async (id) => {
        if (items.some(i => i.category_id === id)) {
            alert('Cannot delete category because it has products.');
            return;
        }
        if (window.confirm('Delete category?')) {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) { console.error(error); showMessage(`Error deleting: ${error.message}`); return; }
            setCategories(categories.filter(c => c.id !== id));
            showMessage('Category deleted.');
        }
    };

    return (
        <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
            <h2 style={{ marginBottom: '30px' }}>Categories Management</h2>
            <form onSubmit={addCategory} style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New Category Name (e.g. Desserts)" style={{ ...inputStyle, flex: 1 }} />
                <button type="submit" disabled={isProcessing} className={`btn-primary ${isProcessing ? 'btn-loading' : ''}`} style={{ padding: '10px 25px' }}>
                    {isProcessing ? 'Adding...' : 'Add Category'}
                </button>
            </form>
            <div style={{ display: 'grid', gap: '15px' }}>
                {categories.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                        {editingCatId === c.id ? (
                            <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                                <input value={editCatName} onChange={e => setEditCatName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                                <button onClick={() => saveEdit(c.id)} disabled={isProcessing} className={`btn-primary ${isProcessing ? 'btn-loading' : ''}`} style={{ padding: '5px 15px' }}>
                                    {isProcessing ? 'Saving...' : 'Save'}
                                </button>
                                <button onClick={() => setEditingCatId(null)} style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '10px', padding: '5px 15px' }}>Cancel</button>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{c.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{items.filter(i => i.category_id === c.id).length} products</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => moveCategory(c.id, 'up')} style={{ color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }} title="Move Up"><ChevronUp size={20} /></button>
                                    <button onClick={() => moveCategory(c.id, 'down')} style={{ color: 'var(--text-muted)', border: 'none', background: 'none', cursor: 'pointer' }} title="Move Down"><ChevronDown size={20} /></button>
                                    <button onClick={() => startEdit(c)} style={{ color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer' }} title="Edit"><Edit2 size={20} /></button>
                                    <button onClick={() => deleteCategory(c.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }} title="Delete"><Trash2 size={20} /></button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryManager;
