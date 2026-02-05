export const categories = [
    { id: 'oysters', name: 'Fresh Oysters' },
    { id: 'wings', name: 'Flavored Wings' },
    { id: 'meals', name: 'Main Course' },
    { id: 'coffee', name: 'Specialty Coffee' },
    { id: 'desserts', name: 'Sweet Treats' },
];

export const menuItems = [
    // Oysters
    {
        id: 1,
        category_id: 'oysters',
        name: 'Fresh Baked Oysters',
        description: 'Juicy oysters baked with cheese and garlic butter.',
        price: 250,
        promo_price: 220,
        image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=80',
        variations: [
            { name: 'Standard (8pcs)', price: 250 },
            { name: 'Family (12pcs)', price: 350 }
        ],
        flavors: ['Cheese & Garlic', 'Classic Steamed'],
        addons: [
            { name: 'Extra Cheese', price: 30 },
            { name: 'Extra Garlic Butter', price: 20 }
        ]
    },
    {
        id: 2,
        category_id: 'oysters',
        name: 'Oysters Rockefeller',
        description: 'Baked oysters with spinach, herbs, and breadcrumbs.',
        price: 280,
        image: 'https://images.unsplash.com/photo-1626202346513-e8d9a4cccc9d?auto=format&fit=crop&w=400&q=80',
        variations: [
            { name: 'Standard (8pcs)', price: 280 },
            { name: 'Platter (16pcs)', price: 520 }
        ]
    },
    // Wings
    {
        id: 3,
        category_id: 'wings',
        name: 'Garlic Parmesan Wings',
        description: 'Crispy wings tossed in garlic and parmesan cheese.',
        price: 180,
        promo_price: 165,
        image: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80',
        variations: [
            { name: '6pcs', price: 180 },
            { name: '12pcs', price: 340 }
        ],
        addons: [
            { name: 'Ranch Dip', price: 25 }
        ]
    },
    {
        id: 4,
        category_id: 'wings',
        name: 'Spicy Buffalo Wings',
        description: 'Classic spicy wings served with dip.',
        price: 180,
        image: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=400&q=80',
        variations: [
            { name: '6pcs', price: 180 },
            { name: '12pcs', price: 340 }
        ],
        flavors: ['Mild', 'Hot', 'Atomic']
    },
    // Coffee
    {
        id: 5,
        category_id: 'coffee',
        name: 'Signature Latte',
        description: 'Smooth espresso with steamed milk and cream.',
        price: 120,
        image: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?auto=format&fit=crop&w=400&q=80',
        variations: [
            { name: 'Hot (12oz)', price: 120 },
            { name: 'Iced (16oz)', price: 140 }
        ],
        addons: [
            { name: 'Caramel Drizzle', price: 20 },
            { name: 'Vanilla Syrup', price: 20 }
        ]
    },
    {
        id: 6,
        category_id: 'coffee',
        name: 'Iced Americano',
        description: 'Refreshing bold coffee over ice.',
        price: 90,
        image: 'https://images.unsplash.com/photo-1517701604599-bb29b565094d?auto=format&fit=crop&w=400&q=80',
        variations: [
            { name: 'Standard', price: 90 },
            { name: 'Upsize', price: 110 }
        ]
    }
];
