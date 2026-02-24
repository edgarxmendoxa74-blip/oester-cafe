import React, { useState, useEffect, useMemo } from 'react';
import {
    ShoppingBag,
    Plus,
    Minus,
    X,
    MessageSquare,
    MapPin,
    Phone,
    Info,
    Facebook,
    Star,
    Coffee,
    UtensilsCrossed,
    Clock,
    User,
    Trash2,
    Copy,
    CreditCard,
    ChevronLeft,
    ChevronRight,
    Truck,
    Utensils
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { categories as initialCategories, menuItems } from '../data/MenuData';
import { supabase } from '../supabaseClient';
import { useCart } from '../context/CartContext';

const Home = () => {
    const {
        cart,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
        addToCart: globalAddToCart,
        removeFromCart,
        deleteFromCart,
        cartTotal,
        cartCount
    } = useCart();

    const [items, setItems] = useState(menuItems || []);
    const [categories, setCategories] = useState(initialCategories || []);
    const [activeCategory, setActiveCategory] = useState(''); // Initialize empty to force valid selection on load
    const [paymentSettings, setPaymentSettings] = useState([]);
    const [orderTypes, setOrderTypes] = useState([
        { id: 'dine-in', name: 'Dine-in' },
        { id: 'pickup', name: 'Take Out' },
        { id: 'delivery', name: 'Delivery' }
    ]);
    const [storeSettings, setStoreSettings] = useState({
        manual_status: 'auto',
        open_time: '10:00',
        close_time: '01:00',
        store_name: '',
        address: 'Poblacion, El Nido, Palawan',
        contact: '09563713967',
        logo_url: '',
        banner_images: []
    });

    const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
    const [menuLoading, setMenuLoading] = useState(false); // Start false to show default/cached items instantly
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    const isStoreOpen = () => {
        if (storeSettings.manual_status === 'open') return true;
        if (storeSettings.manual_status === 'closed') return false;

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const [openH, openM] = (storeSettings.open_time || '16:00').split(':').map(Number);
        const [closeH, closeM] = (storeSettings.close_time || '01:00').split(':').map(Number);

        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        if (closeMinutes < openMinutes) {
            // Overnights (e.g., 4 PM to 1 AM)
            return currentTime >= openMinutes || currentTime < closeMinutes;
        }
        return currentTime >= openMinutes && currentTime < closeMinutes;
    };

    const isOpen = isStoreOpen();

    // Smart sanitizer to fix QuotaExceededError (same as AdminDashboard)
    const sanitizeItems = (items) => {
        if (!Array.isArray(items)) return items;
        return items.map(item => {
            const isBase64 = typeof item.image === 'string' && item.image.startsWith('data:');
            // If it's a huge base64 string, don't cache it locally.
            if (isBase64 && item.image.length > 2000) {
                return { ...item, image: null };
            }
            return item;
        });
    };

    const safeSetItem = (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn(`Error writing ${key} to localStorage`, e);
        }
    };

    // Load data from Supabase (Stale-While-Revalidate pattern)
    useEffect(() => {
        // 1. Initial Load from LocalStorage (Instant UI)
        const loadFromLocal = () => {
            try {
                const savedCats = localStorage.getItem('categories');
                const savedItems = localStorage.getItem('menuItems');
                const savedStore = localStorage.getItem('storeSettings');
                const savedPayments = localStorage.getItem('paymentSettings');
                const savedOrderTypes = localStorage.getItem('orderTypes');

                if (savedCats) {
                    const parsed = JSON.parse(savedCats);
                    if (Array.isArray(parsed)) {
                        const validCats = parsed.filter(c => c && typeof c === 'object' && c.id);
                        if (validCats.length > 0) {
                            setCategories(validCats);
                            if (!activeCategory || !validCats.find(c => c.id === activeCategory)) {
                                if (validCats[0]) setActiveCategory(validCats[0].id);
                            }
                        }
                    }
                }

                if (savedItems) {
                    const parsed = JSON.parse(savedItems);
                    if (Array.isArray(parsed)) {
                        const validItems = parsed.filter(i => i && typeof i === 'object' && i.id);
                        if (validItems.length > 0) {
                            setItems(validItems);
                        }
                    }
                }

                if (savedStore) {
                    const parsed = JSON.parse(savedStore);
                    if (parsed && typeof parsed === 'object') setStoreSettings(prev => ({ ...prev, ...parsed }));
                }

                if (savedPayments) {
                    const parsed = JSON.parse(savedPayments);
                    setPaymentSettings(Array.isArray(parsed) ? parsed.filter(p => p && p.id) : []);
                }

                if (savedOrderTypes) {
                    const parsed = JSON.parse(savedOrderTypes);
                    if (Array.isArray(parsed)) setOrderTypes(parsed.filter(t => t && t.id));
                }

                // If we have no categories at all (rare), then we show the loader
                if (categories.length === 0) {
                    setMenuLoading(true);
                } else {
                    setMenuLoading(false);
                }
            } catch (err) {
                console.error("Error loading from local storage", err);
            }
        };

        loadFromLocal();

        const fetchData = async () => {
            setIsRefreshing(true);
            try {
                // Fetch all data in parallel
                const [
                    { data: catData, error: catErr },
                    { data: itemData, error: itemErr },
                    { data: payData },
                    { data: typeData },
                    { data: storeData }
                ] = await Promise.all([
                    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
                    supabase.from('menu_items').select('*').order('sort_order', { ascending: true }),
                    supabase.from('payment_settings').select('*').eq('is_active', true),
                    supabase.from('order_types').select('*').eq('is_active', true),
                    supabase.from('store_settings').select('*').limit(1).single()
                ]);

                if (catErr) console.warn('Supabase Categories Error:', catErr);
                if (itemErr) console.warn('Supabase Items Error:', itemErr);

                // Update state and cache
                // MERGE STRATEGY: Combine remote data with local hardcoded data to ensure new items show up
                let finalCategories = [...(initialCategories || [])];
                if (catData && Array.isArray(catData)) {
                    // Update existing or add new from DB
                    catData.forEach(remoteCat => {
                        if (!remoteCat || !remoteCat.id) return;
                        const idx = finalCategories.findIndex(c => c && c.id === remoteCat.id);
                        if (idx >= 0) finalCategories[idx] = remoteCat;
                        else finalCategories.push(remoteCat);
                    });
                }
                const filteredCategories = finalCategories.filter(c => c && c.name && c.name !== 'Order Map' && c.id !== 'full-menu');
                setCategories(filteredCategories);
                safeSetItem('categories', filteredCategories);

                if (!activeCategory || !filteredCategories.find(c => c && c.id === activeCategory)) {
                    if (filteredCategories.length > 0) {
                        setActiveCategory(filteredCategories[0].id);
                    }
                }

                let finalItems = [...(menuItems || [])];
                if (itemData && Array.isArray(itemData)) {
                    // Update existing or add new from DB
                    itemData.forEach(remoteItem => {
                        if (!remoteItem || !remoteItem.id) return;
                        const idx = finalItems.findIndex(i => i && i.id === remoteItem.id);
                        if (idx >= 0) finalItems[idx] = remoteItem;
                        else finalItems.push(remoteItem);
                    });
                }
                const validFinalItems = finalItems.filter(i => i && i.id);
                setItems(validFinalItems);

                // SANITIZE before saving to localStorage to prevent quota errors
                const sanitizedForCache = sanitizeItems(validFinalItems);
                safeSetItem('menuItems', sanitizedForCache);


                if (payData && Array.isArray(payData)) {
                    const validPay = payData.filter(p => p && p.id);
                    setPaymentSettings(validPay);
                    safeSetItem('paymentSettings', validPay);
                }

                if (typeData && Array.isArray(typeData)) {
                    const validType = typeData.filter(t => t && t.id);
                    setOrderTypes(validType);
                    safeSetItem('orderTypes', validType);
                } else {
                    // Fallback to defaults if DB is empty but we want them to show
                    const defaults = [
                        { id: 'dine-in', name: 'Dine-in' },
                        { id: 'pickup', name: 'Take Out' },
                        { id: 'delivery', name: 'Delivery' }
                    ];
                    setOrderTypes(defaults);
                    safeSetItem('orderTypes', defaults);
                }

                if (storeData) {
                    setStoreSettings(prev => ({ ...prev, ...storeData }));
                    safeSetItem('storeSettings', storeData);
                }
            } catch (error) {
                console.error('Error fetching fresh data:', error);
            } finally {
                setMenuLoading(false);
                setIsRefreshing(false);
            }
        };

        fetchData();
    }, []);

    // Slideshow functions
    const nextBanner = () => {
        const count = (storeSettings.banner_images || []).length;
        if (count > 0) setCurrentBannerIndex(prev => (prev + 1) % count);
    };

    const prevBanner = () => {
        const count = (storeSettings.banner_images || []).length;
        if (count > 0) setCurrentBannerIndex(prev => (prev - 1 + count) % count);
    };

    useEffect(() => {
        const bannerCount = (storeSettings.banner_images || []).length;
        if (bannerCount === 0) return;
        const timer = setInterval(nextBanner, 5000);
        return () => clearInterval(timer);
    }, [storeSettings.banner_images]);

    // Selection state for products with options
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectionOptions, setSelectionOptions] = useState({
        variation: null,
        selectedVariations: [],
        flavors: [],
        addons: []
    });

    const openProductSelection = (item) => {
        const firstVariation = (item.variations || []).find(v => !v.disabled);
        const catName = categories.find(c => c.id === item.category_id)?.name?.toLowerCase() || '';
        const isMulti = item.allow_multiple ||
            catName.includes('milk tea') ||
            catName.includes('fruit tea') ||
            catName.includes('series') ||
            catName.includes('milktea');

        setSelectedProduct(item);
        setSelectionOptions({
            variation: isMulti ? null : (firstVariation || null),
            selectedVariations: [],
            flavors: [],
            addons: []
        });
    };

    const addToCart = (item, options) => {
        // Handle Multiple Variations (Milktea/Fruit Series)
        const isMulti = item.allow_multiple ||
            item.category_id?.toLowerCase().includes('milktea') ||
            item.category_id?.toLowerCase().includes('fruit') ||
            categories.find(c => c.id === item.category_id)?.name?.toLowerCase().includes('milk tea') ||
            categories.find(c => c.id === item.category_id)?.name?.toLowerCase().includes('fruit');

        if (isMulti && options.selectedVariations && options.selectedVariations.length > 0) {
            options.selectedVariations.forEach(variation => {
                globalAddToCart(item, { ...options, variation });
            });
        } else {
            globalAddToCart(item, options);
        }
        setSelectedProduct(null);
        setIsCartOpen(true);
    };

    const handleQuickAdd = (item) => {
        const hasVariations = item.variations && item.variations.length > 0;
        const hasFlavors = item.flavors && item.flavors.length > 0;
        const hasAddons = item.addons && item.addons.length > 0;

        if (!hasVariations && !hasFlavors && !hasAddons) {
            addToCart(item, {
                variation: null,
                selectedVariations: [],
                flavors: [],
                addons: [],
                quantity: 1
            });
        } else {
            openProductSelection(item);
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${minutes} ${ampm}`;
    };

    const filteredItems = useMemo(() => {
        return items.filter(item => item.category_id === activeCategory);
    }, [items, activeCategory]);

    return (
        <div className="page-wrapper">
            <div className="category-nav-wrapper" style={{ position: 'sticky', top: isOpen ? '90px' : '125px', zIndex: 90, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}>
                <div className="container">
                    <div className="category-slider">
                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                className={`category-item ${activeCategory === cat.id ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveCategory(cat.id);
                                    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                            >
                                {cat.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <section className="hero-section" style={{ overflow: 'hidden' }}>
                <div className="container hero-split">
                    <div className="hero-content animate-fade-up">
                        <h1>Quality in <span style={{ color: 'var(--accent)' }}>every bite</span></h1>
                        <p>Experience our specialty dishes and coffee. We bring you the best flavors and a welcoming atmosphere.</p>
                        {/* Explore Menu button removed */}
                    </div>
                    <div className="hero-image-container">
                        {(storeSettings.banner_images || []).map((url, i) => (
                            <img
                                key={i}
                                src={url}
                                alt={`Hero Banner ${i + 1}`}
                                className="hero-image"
                                style={{
                                    position: i === 0 ? 'relative' : 'absolute',
                                    top: 0,
                                    left: 0,
                                    opacity: currentBannerIndex === i ? 1 : 0,
                                    transition: 'opacity 1s ease-in-out',
                                    zIndex: currentBannerIndex === i ? 1 : 0
                                }}
                            />
                        ))}
                        <button onClick={prevBanner} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', zIndex: 10 }}><ChevronLeft size={24} color="var(--primary)" /></button>
                        <button onClick={nextBanner} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.7)', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', zIndex: 10 }}><ChevronRight size={24} color="var(--primary)" /></button>
                    </div>
                </div>
            </section>


            <main className="container" id="menu" style={{ padding: '40px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '2.2rem', marginBottom: '5px', color: 'var(--primary)' }}>Our Menu</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Pick your favorites and add them to your cart.</p>
                </div>


                <div className="menu-grid">
                    {filteredItems.map(item => (
                        <div className="menu-item-card" key={item.id} style={{ opacity: item.out_of_stock ? 0.6 : 1 }}>
                            <div style={{ position: 'relative' }}>
                                <img src={item.image} alt={item.name} className="menu-item-image" loading="lazy" />
                                {item.promo_price && <span style={{ position: 'absolute', top: '10px', left: '10px', background: '#ef4444', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>PROMO</span>}
                                {item.out_of_stock && <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, borderRadius: '20px' }}>OUT OF STOCK</span>}
                            </div>
                            <div className="menu-item-info">
                                <h3 className="menu-item-name">{item.name}</h3>
                                <p className="menu-item-desc">{item.description}</p>
                                <div className="menu-item-footer">
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {item.promo_price ? (
                                            <>
                                                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.8rem' }}>₱{item.price}</span>
                                                <span className="menu-item-price" style={{ color: '#ef4444' }}>₱{item.promo_price}</span>
                                            </>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                {item.variations && item.variations.length > 0 && (
                                                    <span className="price-start-text">Starts at</span>
                                                )}
                                                <span className="menu-item-price">
                                                    ₱{item.variations && item.variations.length > 0
                                                        ? Math.min(...item.variations.map(v => v.price))
                                                        : item.price}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        className="btn-primary btn-add-sm"
                                        disabled={item.out_of_stock || !isOpen}
                                        onClick={() => handleQuickAdd(item)}
                                        style={{ opacity: (item.out_of_stock || !isOpen) ? 0.5 : 1 }}
                                    >
                                        <Plus size={12} style={{ marginRight: '3px' }} /> Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Selection Modal (Simplified for brevity, assumes logic same as before) */}
            {
                selectedProduct && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ background: 'white', maxWidth: '500px', width: '100%', borderRadius: '24px', padding: '30px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                            <button onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                                <img src={selectedProduct.image} style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover' }} alt="" />
                                <div><h2 style={{ margin: 0 }}>{selectedProduct.name}</h2><p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{selectedProduct.description}</p></div>
                            </div>

                            {selectedProduct.variations && selectedProduct.variations.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <label style={{ fontWeight: 700, display: 'block' }}>
                                            Select Options
                                            {(selectedProduct.allow_multiple ||
                                                selectedProduct.category_id?.toLowerCase().includes('milktea') ||
                                                categories.find(c => c.id === selectedProduct.category_id)?.name?.toLowerCase().includes('milk tea') ||
                                                categories.find(c => c.id === selectedProduct.category_id)?.name?.toLowerCase().includes('fruit')) &&
                                                <span style={{ color: 'var(--accent)', marginLeft: '10px', fontSize: '0.8rem' }}>(You can choose multiple)</span>
                                            }
                                        </label>
                                    </div>
                                    <div className="variation-list">
                                        {selectedProduct.variations.map(v => {
                                            const isMulti = selectedProduct.allow_multiple ||
                                                selectedProduct.category_id?.toLowerCase().includes('milktea') ||
                                                categories.find(c => c.id === selectedProduct.category_id)?.name?.toLowerCase().includes('milk tea') ||
                                                categories.find(c => c.id === selectedProduct.category_id)?.name?.toLowerCase().includes('fruit');

                                            const isSelected = isMulti
                                                ? selectionOptions.selectedVariations.some(sv => sv.name === v.name)
                                                : selectionOptions.variation?.name === v.name;

                                            return (
                                                <div
                                                    key={v.name}
                                                    className={`variation-option ${isSelected ? 'active' : ''} ${v.disabled ? 'disabled' : ''}`}
                                                    onClick={() => {
                                                        if (v.disabled) return;
                                                        if (isMulti) {
                                                            const exists = selectionOptions.selectedVariations.find(sv => sv.name === v.name);
                                                            if (exists) {
                                                                setSelectionOptions({ ...selectionOptions, selectedVariations: selectionOptions.selectedVariations.filter(sv => sv.name !== v.name) });
                                                            } else {
                                                                setSelectionOptions({ ...selectionOptions, selectedVariations: [...selectionOptions.selectedVariations, v] });
                                                            }
                                                        } else {
                                                            setSelectionOptions({ ...selectionOptions, variation: v });
                                                        }
                                                    }}
                                                    style={{ opacity: v.disabled ? 0.5 : 1, cursor: v.disabled ? 'not-allowed' : 'pointer' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '18px', height: '18px',
                                                            borderRadius: isMulti ? '4px' : '50%',
                                                            border: '2px solid var(--primary)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            {isSelected && <div style={{
                                                                width: '10px', height: '10px',
                                                                borderRadius: isMulti ? '2px' : '50%',
                                                                background: 'var(--primary)'
                                                            }}></div>}
                                                        </div>
                                                        <span className="variation-name">{v.name} {v.disabled && '(Out of Stock)'}</span>
                                                    </div>
                                                    <span className="variation-price-tag">₱{v.price}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Addons logic */}
                            {selectedProduct.addons && selectedProduct.addons.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontWeight: 700, display: 'block', marginBottom: '10px' }}>Add-ons (Optional)</label>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {selectedProduct.addons.map(a => (
                                            <button
                                                key={a.name}
                                                disabled={a.disabled}
                                                onClick={() => {
                                                    const exists = selectionOptions.addons.find(x => x.name === a.name);
                                                    if (exists) {
                                                        setSelectionOptions({ ...selectionOptions, addons: selectionOptions.addons.filter(x => x.name !== a.name) });
                                                    } else {
                                                        setSelectionOptions({ ...selectionOptions, addons: [...selectionOptions.addons, a] });
                                                    }
                                                }}
                                                style={{
                                                    padding: '8px 15px', borderRadius: '10px', border: '1px solid var(--primary)',
                                                    background: selectionOptions.addons.find(x => x.name === a.name) ? 'var(--primary)' : 'white',
                                                    color: selectionOptions.addons.find(x => x.name === a.name) ? 'white' : 'var(--primary)',
                                                    cursor: a.disabled ? 'not-allowed' : 'pointer',
                                                    opacity: a.disabled ? 0.3 : 1
                                                }}
                                            >
                                                + {a.name} (₱{a.price}) {a.disabled && '(Out of Stock)'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {selectedProduct.flavors && selectedProduct.flavors.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontWeight: 700, display: 'block', marginBottom: '10px' }}>
                                        Select Flavors
                                        {selectedProduct.allow_multiple && <span style={{ color: 'var(--accent)', marginLeft: '10px', fontSize: '0.8rem' }}>(Multiple allowed)</span>}
                                    </label>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {selectedProduct.flavors.map(f => {
                                            const name = typeof f === 'string' ? f : f.name;
                                            const price = typeof f === 'object' ? (f.price || 0) : 0;
                                            const disabled = typeof f === 'object' ? f.disabled : false;

                                            if (disabled) return null;

                                            const isSelected = selectionOptions.flavors.includes(name);

                                            return (
                                                <button
                                                    key={name}
                                                    onClick={() => {
                                                        let newFlavors;
                                                        if (isSelected) {
                                                            newFlavors = selectionOptions.flavors.filter(x => x !== name);
                                                        } else {
                                                            if (selectedProduct.allow_multiple) {
                                                                newFlavors = [...selectionOptions.flavors, name];
                                                            } else {
                                                                newFlavors = [name];
                                                            }
                                                        }
                                                        setSelectionOptions({ ...selectionOptions, flavors: newFlavors });
                                                    }}
                                                    style={{
                                                        padding: '8px 15px', borderRadius: '10px',
                                                        border: '1px solid var(--primary)',
                                                        background: isSelected ? 'var(--primary)' : 'white',
                                                        color: isSelected ? 'white' : 'var(--primary)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 600 }}>{name}</span>
                                                    {price > 0 && <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>+₱{price}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {(() => {
                                const catName = categories.find(c => c.id === selectedProduct.category_id)?.name?.toLowerCase() || '';
                                const isMulti = selectedProduct.allow_multiple ||
                                    catName.includes('milk tea') ||
                                    catName.includes('fruit tea') ||
                                    catName.includes('series') ||
                                    catName.includes('milktea');

                                const basePrice = Number(selectedProduct.promo_price || selectedProduct.price);
                                const addonsPrice = selectionOptions.addons.reduce((sum, a) => sum + Number(a.price), 0);
                                const flavorsPrice = selectionOptions.flavors.reduce((sum, fName) => {
                                    const flavorObj = (selectedProduct.flavors || []).find(f => (typeof f === 'string' ? f : f.name) === fName);
                                    return sum + (flavorObj?.price || 0);
                                }, 0);

                                let totalPrice = 0;
                                let canAdd = false;

                                if (isMulti) {
                                    const varPriceTotal = selectionOptions.selectedVariations.reduce((sum, v) => sum + Number(v.price), 0);
                                    totalPrice = varPriceTotal + (addonsPrice + flavorsPrice) * selectionOptions.selectedVariations.length;
                                    canAdd = selectionOptions.selectedVariations.length > 0;
                                } else {
                                    const varPrice = selectionOptions.variation ? Number(selectionOptions.variation.price) : basePrice;
                                    totalPrice = varPrice + addonsPrice + flavorsPrice;
                                    canAdd = !!(selectionOptions.variation || !selectedProduct.variations?.length);
                                }

                                return (
                                    <button
                                        className="btn-primary"
                                        style={{ width: '100%', padding: '18px', fontWeight: 800, fontSize: '1.2rem', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
                                        onClick={() => addToCart(selectedProduct, selectionOptions)}
                                        disabled={!canAdd}
                                    >
                                        Add to Cart - ₱{totalPrice}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default Home;
