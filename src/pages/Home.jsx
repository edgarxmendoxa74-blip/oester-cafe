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

const Home = () => {
    const [cart, setCart] = useState([]);
    const [items, setItems] = useState(menuItems || []);
    const [categories, setCategories] = useState(initialCategories || []);
    const [activeCategory, setActiveCategory] = useState(''); // Initialize empty to force valid selection on load
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
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

    // Load cart from local storage
    useEffect(() => {
        const savedCart = localStorage.getItem('oesters_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error("Error parsing cart", e);
            }
        }
    }, []);

    // Save cart to local storage
    useEffect(() => {
        localStorage.setItem('oesters_cart', JSON.stringify(cart));
    }, [cart]);

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
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setCategories(parsed);
                        if (!activeCategory || !parsed.find(c => c.id === activeCategory)) {
                            if (parsed[0]) setActiveCategory(parsed[0].id);
                        }
                    }
                }

                if (savedItems) {
                    const parsed = JSON.parse(savedItems);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setItems(parsed);
                    }
                }

                if (savedStore) setStoreSettings(JSON.parse(savedStore));
                if (savedPayments) {
                    const parsed = JSON.parse(savedPayments);
                    setPaymentSettings(Array.isArray(parsed) ? parsed : []);
                }
                if (savedOrderTypes) setOrderTypes(JSON.parse(savedOrderTypes));

                // If we have no categories at all (rare), then we show the loader
                // BUT if we found saved items, we are "not loading" anymore from user perspective
                if (!savedItems && categories.length === 0 && !savedCats) {
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
                if (catData && catData.length > 0) {
                    // Update existing or add new from DB
                    catData.forEach(remoteCat => {
                        const idx = finalCategories.findIndex(c => c.id === remoteCat.id);
                        if (idx >= 0) finalCategories[idx] = remoteCat;
                        else finalCategories.push(remoteCat);
                    });
                }
                const filteredCategories = finalCategories.filter(c => c.name !== 'Order Map' && c.id !== 'full-menu');
                setCategories(filteredCategories);
                safeSetItem('categories', filteredCategories);

                if (!activeCategory || !filteredCategories.find(c => c.id === activeCategory)) {
                    if (filteredCategories.length > 0) {
                        setActiveCategory(filteredCategories[0].id);
                    }
                }

                let finalItems = [...(menuItems || [])];
                if (itemData && itemData.length > 0) {
                    // Update existing or add new from DB
                    itemData.forEach(remoteItem => {
                        const idx = finalItems.findIndex(i => i.id === remoteItem.id);
                        if (idx >= 0) finalItems[idx] = remoteItem;
                        else finalItems.push(remoteItem);
                    });
                }
                setItems(finalItems);

                // SANITIZE before saving to localStorage to prevent quota errors
                const sanitizedForCache = sanitizeItems(finalItems);
                safeSetItem('menuItems', sanitizedForCache);


                if (payData && payData.length > 0) {
                    setPaymentSettings(payData);
                    safeSetItem('paymentSettings', payData);
                }

                if (typeData && typeData.length > 0) {
                    setOrderTypes(typeData);
                    safeSetItem('orderTypes', typeData);
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
                    setStoreSettings(storeData);
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
        variation: null, // Remains null or single object for standard, becomes array for multi
        selectedVariations: [], // New state to handle multiple selections
        flavors: [],
        addons: []
    });

    // Order type and payment state
    const [orderType, setOrderType] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [customerDetails, setCustomerDetails] = useState({
        name: '',
        phone: '',
        table_number: '',
        address: '',
        landmark: '',
        pickup_time: ''
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

        if (isMulti && options.selectedVariations.length > 0) {
            options.selectedVariations.forEach(variation => {
                addSingleToCart(item, { ...options, variation });
            });
        } else {
            addSingleToCart(item, options);
        }
        setSelectedProduct(null);
    };

    const addSingleToCart = (item, options) => {
        const cartItemId = `${item.id}-${options.variation?.name || ''}-${options.flavors.sort().join(',')}-${options.addons.map(a => a.name).join(',')}`;
        const existing = cart.find(i => i.cartItemId === cartItemId);

        const variationPrice = options.variation ? Number(options.variation.price) : 0;
        const basePrice = Number(item.promo_price || item.price);

        let price;
        if (item.name?.toLowerCase().includes('pork ribs')) {
            price = basePrice + variationPrice;
        } else {
            price = variationPrice > 0 ? variationPrice : basePrice;
        }

        const flavorsPrice = (options.flavors || []).reduce((sum, fName) => {
            const flavorObj = (item.flavors || []).find(f => (typeof f === 'string' ? f : f.name) === fName);
            return sum + (flavorObj?.price || 0);
        }, 0);

        const addonsPrice = (options.addons || []).reduce((sum, a) => sum + Number(a.price), 0);
        const finalPrice = price + flavorsPrice + addonsPrice;

        if (existing) {
            setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + (options.quantity || 1) } : i));
        } else {
            const newItem = {
                ...item,
                cartItemId,
                selectedVariation: options.variation,
                selectedFlavors: options.flavors,
                selectedAddons: options.addons,
                finalPrice,
                quantity: options.quantity || 1
            };
            setCart(prev => [...prev, newItem]);
        }
    };

    const removeFromCart = (cartItemId) => {
        setCart(cart.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity > 1 ? i.quantity - 1 : i.quantity } : i));
    };

    const deleteFromCart = (cartItemId) => {
        setCart(cart.filter(i => i.cartItemId !== cartItemId));
    };

    const cartTotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handlePlaceOrder = async () => {
        if (!orderType) {
            alert('Please select an order type (Dine-in, Pickup, or Delivery).');
            return;
        }

        // Validate details...
        const { name, phone, table_number, address, pickup_time } = customerDetails;
        if (orderType === 'dine-in' && (!name || !table_number)) { alert('Please provide your Name and Table Number.'); return; }
        if (orderType === 'pickup' && (!name || !phone || !pickup_time)) { alert('Please provide Name, Phone Number, and Pickup Time.'); return; }
        if (orderType === 'delivery' && (!name || !phone || !address)) { alert('Please provide Name, Phone Number, and Delivery Address.'); return; }

        if (!paymentMethod) { alert('Please select a payment method.'); return; }

        setIsPlacingOrder(true);
        try {
            // --- SAVE ORDER TO SUPABASE ---
            const itemDetails = cart.map(item => {
                let d = `${item.name} (x${item.quantity})`;
                if (item.selectedVariation) d += ` - ${item.selectedVariation.name}`;
                if (item.selectedFlavors && item.selectedFlavors.length > 0) d += ` [${item.selectedFlavors.join(', ')}]`;
                if (item.selectedAddons.length > 0) d += ` + ${item.selectedAddons.map(a => a.name).join(', ')}`;
                return d;
            });

            const newOrder = {
                order_type: orderType,
                payment_method: paymentMethod,
                customer_details: customerDetails,
                items: itemDetails,
                total_amount: cartTotal,
                status: 'Pending'
            };

            const { error } = await supabase.from('orders').insert([newOrder]);
            if (error) throw error;

            // Also save to LocalStorage as a local backup
            const localOrder = { ...newOrder, id: Date.now(), timestamp: new Date().toISOString() };
            const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            localStorage.setItem('orders', JSON.stringify([...existingOrders, localOrder]));

            // --- PREPARE MESSENGER MSG ---
            const orderDetailsStr = itemDetails.join('\n');
            let customerInfoStr = `Name: ${customerDetails.name}`;
            if (orderType === 'dine-in') customerInfoStr += `\nTable Number: ${customerDetails.table_number}`;
            if (orderType === 'pickup') customerInfoStr += `\nPhone: ${customerDetails.phone}\nPickup Time: ${customerDetails.pickup_time}`;
            if (orderType === 'delivery') customerInfoStr += `\nPhone: ${customerDetails.phone}\nAddress: ${customerDetails.address}\nLandmark: ${customerDetails.landmark}`;

            // Add notes if present and not already added as landmark
            if (orderType !== 'delivery' && customerDetails.landmark) {
                customerInfoStr += `\nNotes: ${customerDetails.landmark}`;
            }

            const message = `
Hello! I'd like to place an order:

Order Type: ${orderType.toUpperCase()}
Payment Method: ${paymentMethod}

Customer Details:
${customerInfoStr}

Item Details:
${orderDetailsStr}

TOTAL AMOUNT: ₱${cartTotal}

Thank you!`.trim();

            const messengerUrl = `https://m.me/oesterscafeandresto?text=${encodeURIComponent(message)}`;
            window.open(messengerUrl, '_blank');

            // Optionally clear cart
            // setCart([]); 
            setIsCheckoutOpen(false);
        } catch (error) {
            console.error('Error saving order:', error);
            alert('There was an error saving your order. Please try again.');
        } finally {
            setIsPlacingOrder(false);
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
            {/* Top Loading Bar Removed */}

            {/* Store Closed Overlay */}
            {!isOpen && (
                <div style={{ background: '#ef4444', color: 'white', textAlign: 'center', padding: '12px', position: 'sticky', top: 0, zIndex: 1200, fontWeight: 700, fontSize: '0.9rem' }}>
                    <Clock size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    WE ARE CURRENTLY CLOSED. Our operating hours are {formatTime(storeSettings.open_time) || '4:00 PM'} to {formatTime(storeSettings.close_time) || '1:00 AM'}. Orders are disabled.
                </div>
            )}

            {/* Refreshing Toast Removed */}

            <header className="app-header">
                <div className="container header-container">
                    <Link to="/" className="brand">
                        <img src={storeSettings.logo_url || "/logo.png"} alt="Oesters Logo" style={{ height: '50px' }} loading="eager" />
                    </Link>

                    <nav className="header-nav" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ display: 'flex', gap: '20px' }}>
                            <Link to="/contact" className="nav-link">Contact</Link>
                        </div>
                        <button className="btn-accent" onClick={() => setIsCartOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ShoppingBag size={18} />
                            <span>Cart ({cartCount})</span>
                        </button>
                    </nav>
                </div>

                <div className="category-nav-wrapper">
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
            </header>

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
                                        onClick={() => openProductSelection(item)}
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

            {/* Checkout Modal */}
            {
                isCheckoutOpen && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ background: 'white', maxWidth: '500px', width: '100%', borderRadius: '24px', padding: '30px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                            <button onClick={() => setIsCheckoutOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
                            <h2 style={{ marginBottom: '30px', fontSize: '1.8rem', color: 'var(--primary)' }}>Checkout</h2>

                            <div style={{ marginBottom: '30px' }}>
                                {/* Payment Method */}
                                <div style={{ marginBottom: '30px' }}>
                                    <label style={{ fontWeight: 700, fontSize: '1rem', display: 'block', marginBottom: '15px' }}>Payment Method</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                                        <button
                                            onClick={() => setPaymentMethod('Cash/COD')}
                                            style={{
                                                padding: '15px', borderRadius: '15px', border: '2px solid',
                                                borderColor: paymentMethod === 'Cash/COD' ? 'var(--primary)' : '#e2e8f0',
                                                background: paymentMethod === 'Cash/COD' ? '#f0f9ff' : 'white',
                                                cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>💵</div>
                                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>Cash / COD</div>
                                        </button>
                                        {paymentSettings.map(method => (
                                            <button
                                                key={method.id}
                                                onClick={() => setPaymentMethod(method.id)}
                                                style={{
                                                    padding: '15px', borderRadius: '15px', border: '2px solid',
                                                    borderColor: paymentMethod === method.id ? 'var(--primary)' : '#e2e8f0',
                                                    background: paymentMethod === method.id ? '#f0f9ff' : 'white',
                                                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>💳</div>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>{method.name}</div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Payment Details Area */}
                                    {paymentMethod && paymentMethod !== 'Cash/COD' && (
                                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                                            {paymentSettings.find(m => m.id === paymentMethod) ? (
                                                (() => {
                                                    const method = paymentSettings.find(m => m.id === paymentMethod);
                                                    return (
                                                        <div style={{ textAlign: 'center' }}>
                                                            <h4 style={{ color: 'var(--primary)', marginBottom: '15px' }}>Send {method.name} Payment</h4>
                                                            {method.qr_url && (
                                                                <div style={{ background: 'white', padding: '10px', borderRadius: '12px', display: 'inline-block', marginBottom: '20px' }}>
                                                                    <img src={method.qr_url} style={{ width: '180px', height: '180px', borderRadius: '10px', objectFit: 'contain' }} alt="QR Code" />
                                                                </div>
                                                            )}
                                                            <div style={{ background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Account Number</div>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
                                                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)' }}>{method.account_number}</div>
                                                                    <button
                                                                        onClick={() => { navigator.clipboard.writeText(method.account_number); alert('Copied!'); }}
                                                                        style={{ border: 'none', background: 'var(--primary)', color: 'white', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, fontSize: '0.8rem' }}
                                                                    >
                                                                        <Copy size={14} /> Copy
                                                                    </button>
                                                                </div>
                                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>{method.account_name}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()
                                            ) : (
                                                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Details not found.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Order Type & Form here (omitted for brevity, assume exists as before) */}
                                <div style={{ marginBottom: '30px' }}>
                                    <label style={{ fontWeight: 700, fontSize: '1rem', display: 'block', marginBottom: '15px' }}>Select Order Type</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                                        {orderTypes.map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => setOrderType(type.id)}
                                                style={{
                                                    padding: '15px', borderRadius: '15px', border: '2px solid',
                                                    borderColor: orderType === type.id ? 'var(--primary)' : '#e2e8f0',
                                                    background: orderType === type.id ? '#f0f9ff' : 'white',
                                                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ fontSize: '1.5rem', marginBottom: '8px', color: orderType === type.id ? 'var(--primary)' : 'var(--text-muted)' }}>
                                                    {type.id === 'dine-in' && <Utensils size={24} style={{ margin: '0 auto' }} />}
                                                    {type.id === 'pickup' && <ShoppingBag size={24} style={{ margin: '0 auto' }} />}
                                                    {type.id === 'delivery' && <Truck size={24} style={{ margin: '0 auto' }} />}
                                                    {!['dine-in', 'pickup', 'delivery'].includes(type.id) && <MessageSquare size={24} style={{ margin: '0 auto' }} />}
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: orderType === type.id ? 'var(--primary)' : 'var(--text-muted)' }}>{type.name}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {orderType && (
                                    <div style={{ marginBottom: '30px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Full Name</label><input type="text" value={customerDetails.name} onChange={(e) => setCustomerDetails({ ...customerDetails, name: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }} /></div>
                                            {/* Simplified inputs for brevity */}
                                            {orderType === 'dine-in' && <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Table Number</label><input type="text" value={customerDetails.table_number} onChange={(e) => setCustomerDetails({ ...customerDetails, table_number: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }} /></div>}
                                            {orderType !== 'dine-in' && <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Phone</label><input type="tel" value={customerDetails.phone} onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }} /></div>}
                                            {orderType === 'pickup' && <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Time</label><input type="time" value={customerDetails.pickup_time} onChange={(e) => setCustomerDetails({ ...customerDetails, pickup_time: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }} /></div>}
                                            {orderType === 'delivery' && <div><label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>Address</label><textarea value={customerDetails.address} onChange={(e) => setCustomerDetails({ ...customerDetails, address: e.target.value })} style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0' }} /></div>}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '5px', fontWeight: 600 }}>
                                                    {orderType === 'delivery' ? 'Landmark / Delivery Instructions' : 'Special Instructions / Notes'}
                                                </label>
                                                <textarea
                                                    value={customerDetails.landmark}
                                                    onChange={(e) => setCustomerDetails({ ...customerDetails, landmark: e.target.value })}
                                                    placeholder={orderType === 'delivery' ? "e.g. Near the blue gate, 2nd floor..." : "e.g. No onions, less ice, please..."}
                                                    style={{ padding: '12px', width: '100%', borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '80px' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Amount:</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>₱{cartTotal}</span>
                                </div>

                                <button className={`btn-accent ${isPlacingOrder ? 'btn-loading' : ''}`} onClick={handlePlaceOrder} style={{ width: '100%', padding: '18px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 800, fontSize: '1.1rem' }}>
                                    <MessageSquare size={22} /> {isPlacingOrder ? 'Placing Order...' : 'Confirm Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Same Cart Sidebar as before */}
            {
                isCartOpen && (
                    <div style={{ position: 'fixed', top: 0, right: 0, width: '450px', height: '100vh', background: 'white', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', zIndex: 1100, padding: '30px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}><h2>Your Cart</h2><button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button></div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {cart.map(item => (
                                <div key={item.cartItemId} style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-start' }}>
                                    <img src={item.image} alt={item.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0 }}>{item.name}</h4>
                                        <p style={{ margin: '2px 0 5px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {item.selectedVariation?.name}
                                            {item.selectedFlavors && item.selectedFlavors.length > 0 ? ` | ${item.selectedFlavors.join(', ')}` : ''}
                                        </p>
                                        <span style={{ fontWeight: 700 }}>₱{item.finalPrice}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button onClick={() => removeFromCart(item.cartItemId)} style={{ border: '1px solid var(--border)', background: 'none', padding: '2px', borderRadius: '4px' }}><Minus size={14} /></button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => addToCart(item, { variation: item.selectedVariation, flavors: item.selectedFlavors, addons: item.selectedAddons })} style={{ border: '1px solid var(--border)', background: 'none', padding: '2px', borderRadius: '4px' }}><Plus size={14} /></button>
                                        <button onClick={() => deleteFromCart(item.cartItemId)} style={{ marginLeft: '5px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="btn-primary" onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }} style={{ width: '100%', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 800 }}>Proceed to Checkout</button>
                    </div>
                )
            }
        </div >
    );
};

export default Home;
