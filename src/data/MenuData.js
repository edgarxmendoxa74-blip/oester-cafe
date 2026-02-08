export const categories = [
    { id: 'full-menu', name: 'Order Map' }
];

export const menuItems = [
    {
        id: 'oesters-master-menu',
        category_id: 'full-menu',
        name: 'Oesters Cafe & Resto - Full Menu',
        description: 'Click to view all our Coffee, Milk Tea, Oysters, and Wings. You can select multiple items at once!',
        price: 0,
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
        variations: [
            // Coffee
            { name: '☕ Iced Americano', price: 90 },
            { name: '☕ Hot Latte', price: 110 },
            { name: '☕ Iced Latte', price: 130 },
            { name: '☕ Caramel Macchiato', price: 145 },

            // Milk Tea
            { name: '🧋 Matcha 16oz', price: 59 },
            { name: '🧋 Matcha 22oz', price: 79 },
            { name: '🧋 Okinawa 16oz', price: 49 },
            { name: '🧋 Okinawa 22oz', price: 69 },
            { name: '🧋 Wintermelon 16oz', price: 49 },
            { name: '🧋 Wintermelon 22oz', price: 69 },

            // Oysters
            { name: '🐚 Baked Oysters (8pcs)', price: 250 },
            { name: '🐚 Oysters Rockefeller (8pcs)', price: 280 },

            // Wings
            { name: '🍗 Garlic Parmesan Wings', price: 180 },
            { name: '🍗 Spicy Buffalo Wings', price: 180 }
        ],
        addons: [
            { name: 'Extra Pearl', price: 15 },
            { name: 'Cream Cheese', price: 25 },
            { name: 'Extra Cheese (Oysters)', price: 30 }
        ],
        allow_multiple: true
    }
];
