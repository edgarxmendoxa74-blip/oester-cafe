-- Supabase Schema for Oesters Cafe and Resto
-- This script is idempotent (safe to run multiple times)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Store Settings Table
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT NOT NULL DEFAULT 'Oesters Cafe and Resto',
    address TEXT,
    contact TEXT,
    logo_url TEXT,
    banner_images JSONB DEFAULT '[]',
    open_time TIME DEFAULT '16:00',
    close_time TIME DEFAULT '01:00',
    manual_status TEXT DEFAULT 'auto',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    promo_price DECIMAL(10, 2),
    image TEXT,
    out_of_stock BOOLEAN DEFAULT FALSE,
    allow_multiple BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    variations JSONB DEFAULT '[]', -- [{name, price, disabled}]
    flavors JSONB DEFAULT '[]',    -- [{name, disabled}] or [string] (for backward compatibility)
    addons JSONB DEFAULT '[]',      -- [{name, price, disabled}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Order Types Table
CREATE TABLE IF NOT EXISTS order_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Payment Settings Table
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    account_number TEXT,
    account_name TEXT,
    qr_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number SERIAL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_type TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    customer_details JSONB NOT NULL, -- {name, phone, tableNumber, address, etc}
    items JSONB NOT NULL,            -- Array of strings or object summaries
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'Pending'    -- Pending, Preparing, Ready, Completed, Cancelled
);

-- Initial Data (Optional)
-- INSERT INTO store_settings (store_name, contact) VALUES ('Oesters Cafe and Resto', '09563713967');
