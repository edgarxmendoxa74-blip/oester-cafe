import React from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

const CartSidebar = ({ onCheckout }) => {
    const {
        cart,
        isCartOpen,
        setIsCartOpen,
        removeFromCart,
        addToCart,
        deleteFromCart,
        cartTotal,
        cartCount
    } = useCart();

    if (!isCartOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
            {/* Backdrop */}
            <div
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                onClick={() => setIsCartOpen(false)}
            />

            {/* Sidebar */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100%',
                maxWidth: '450px',
                height: '100vh',
                background: 'white',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideIn 0.3s ease-out'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0, color: 'var(--primary)' }}>
                        <ShoppingBag /> Your Cart ({cartCount})
                    </h2>
                    <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--text-muted)' }}>
                            <ShoppingBag size={64} style={{ opacity: 0.2, marginBottom: '20px' }} />
                            <p>Your cart is empty.</p>
                            <button className="btn-primary" onClick={() => setIsCartOpen(false)} style={{ marginTop: '20px' }}>Start Ordering</button>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.cartItemId} style={{ display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'flex-start', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                                <img src={item.image} alt={item.name} style={{ width: '70px', height: '70px', borderRadius: '12px', objectFit: 'cover' }} />
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>{item.name}</h4>
                                    <div style={{ margin: '4px 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {item.selectedVariation && <span>Variation: {item.selectedVariation.name}</span>}
                                        {item.selectedFlavors && item.selectedFlavors.length > 0 && <span>Flavors: {item.selectedFlavors.join(', ')}</span>}
                                        {item.selectedAddons && item.selectedAddons.length > 0 && <span>Add-ons: {item.selectedAddons.map(a => a.name).join(', ')}</span>}
                                    </div>
                                    <div style={{ fontWeight: 800, color: 'var(--primary)' }}>₱{item.finalPrice}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '5px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                        <button onClick={() => removeFromCart(item.cartItemId)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Minus size={14} /></button>
                                        <span style={{ fontWeight: 700 }}>{item.quantity}</span>
                                        <button onClick={() => addToCart(item, { variation: item.selectedVariation, flavors: item.selectedFlavors, addons: item.selectedAddons })} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}><Plus size={14} /></button>
                                    </div>
                                    <button onClick={() => deleteFromCart(item.cartItemId)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {cart.length > 0 && (
                    <div style={{ marginTop: '30px', borderTop: '2px solid #f1f5f9', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-muted)' }}>Subtotal:</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>₱{cartTotal}</span>
                        </div>
                        <button
                            className="btn-primary"
                            onClick={onCheckout}
                            style={{ width: '100%', padding: '18px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(217, 35, 45, 0.2)' }}
                        >
                            Proceed to Checkout
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};

export default CartSidebar;
