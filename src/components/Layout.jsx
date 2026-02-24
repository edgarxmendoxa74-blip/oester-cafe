import React from 'react';
import Header from './Header';
import CartSidebar from './CartSidebar';
import CheckoutModal from './CheckoutModal';
import { useCart } from '../context/CartContext';

const Layout = ({ children }) => {
    const { setIsCartOpen, setIsCheckoutOpen } = useCart();

    const handleCheckout = () => {
        setIsCartOpen(false);
        setIsCheckoutOpen(true);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <main style={{ flex: 1 }}>
                {children}
            </main>
            <CartSidebar onCheckout={handleCheckout} />
            <CheckoutModal />
        </div>
    );
};

export default Layout;
