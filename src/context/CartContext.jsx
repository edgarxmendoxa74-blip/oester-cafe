import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Load cart from local storage on mount
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

    // Save cart to local storage whenever it changes
    useEffect(() => {
        localStorage.setItem('oesters_cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (item, options) => {
        const cartItemId = `${item.id}-${options.variation?.name || ''}-${(options.flavors || []).sort().join(',')}-${(options.addons || []).map(a => a.name).join(',')}`;
        const existing = cart.find(i => i.cartItemId === cartItemId);

        const variationPrice = options.variation ? Number(options.variation.price) : 0;
        const basePrice = Number(item.promo_price || item.price);

        let price;
        // Logic specific to 'pork ribs' as seen in Home.jsx
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
        setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity > 1 ? i.quantity - 1 : i.quantity } : i));
    };

    const deleteFromCart = (cartItemId) => {
        setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));
    };

    const clearCart = () => setCart([]);

    const cartTotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            deleteFromCart,
            clearCart,
            cartTotal,
            cartCount,
            isCartOpen,
            setIsCartOpen,
            isCheckoutOpen,
            setIsCheckoutOpen
        }}>
            {children}
        </CartContext.Provider>
    );
};
