import React from 'react';
import { supabase } from '../../supabaseClient';
import { Save, Printer, Trash2 } from 'lucide-react';

const OrderHistory = ({ orders, setOrders, storeSettings, showMessage }) => {
    const stats = orders.reduce((acc, order) => {
        acc.totalOrders++;
        if (order.status !== 'Cancelled') {
            acc.totalSales += Number(order.total_amount || 0);
        }
        if (order.status === 'Pending' || !order.status) acc.pendingOrders++;
        return acc;
    }, { totalOrders: 0, totalSales: 0, pendingOrders: 0 });

    const updateOrderStatus = async (orderId, newStatus) => {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error) { console.error(error); showMessage(`Error updating status: ${error.message}`); return; }
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        showMessage('Order status updated!');
    };

    const deleteOrder = async (orderId) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            const { error } = await supabase.from('orders').delete().eq('id', orderId);
            if (error) { console.error(error); showMessage(`Error deleting: ${error.message}`); return; }
            setOrders(orders.filter(o => o.id !== orderId));
            showMessage('Order deleted.');
        }
    };

    const printReceipt = (order) => {
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt - ${order.id}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 10px; width: 57mm; margin: 0; font-size: 11px; line-height: 1.2; color: #000; }
                        .center { text-align: center; }
                        .logo { max-width: 30mm; max-height: 30mm; margin: 0 auto 5px; display: block; object-fit: contain; }
                        .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
                        .item { display: flex; justify-content: space-between; margin-bottom: 3px; }
                        .total { font-weight: bold; font-size: 13px; margin-top: 5px; }
                        @media print { 
                            body { width: 57mm; padding: 0; }
                            @page { margin: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="center">

                        <div style="font-weight:bold; font-size: 14px; text-transform: uppercase;">${storeSettings.store_name}</div>
                        <div style="margin-top: 2px;">${storeSettings.address}</div>
                        <div>Tel: ${storeSettings.contact}</div>
                    </div>
                    <div class="divider"></div>
                    <div>
                        <strong>OR#:</strong> ${order.id.toString().slice(-6).toUpperCase()}<br>
                        <strong>Date:</strong> ${new Date(order.timestamp).toLocaleString()}<br>
                        <strong>Type:</strong> ${(order.order_type || 'Dine-in').toUpperCase()}<br>
                        <strong>Cust:</strong> ${order.customer_details?.name}
                        ${order.customer_details?.table_number ? `<br><strong>Table:</strong> ${order.customer_details?.table_number}` : ''}
                    </div>
                    <div class="divider"></div>
                    <div style="font-weight:bold; margin-bottom: 5px;">ITEMS:</div>
                    ${(order.items || []).map(item => `<div class="item"><span>• ${item}</span></div>`).join('')}
                    <div class="divider"></div>
                    <div class="item total">
                        <span>TOTAL</span>
                        <span>₱${order.total_amount}</span>
                    </div>
                    <div class="divider"></div>
                    <div class="center" style="margin-top: 10px; font-style: italic;">
                        *** THANK YOU! ***<br>
                        Please come again.
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                            setTimeout(() => window.close(), 500);
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
        showMessage('Receipt generated! Check your print window.');
    };

    return (
        <div className="admin-card" style={{ background: 'white', padding: '30px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ margin: 0 }}>Orders Management</h2>
            </div>

            {/* Stats Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '15px', border: '1px solid #dbeafe' }}>
                    <div style={{ color: '#1e40af', fontSize: '0.9rem', fontWeight: 600 }}>Total Orders</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e3a8a' }}>{stats.totalOrders}</div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '15px', border: '1px solid #dcfce7' }}>
                    <div style={{ color: '#166534', fontSize: '0.9rem', fontWeight: 600 }}>Total Sales</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#14532d' }}>₱{stats.totalSales}</div>
                </div>
                <div style={{ background: '#fff7ed', padding: '20px', borderRadius: '15px', border: '1px solid #ffedd5' }}>
                    <div style={{ color: '#9a3412', fontSize: '0.9rem', fontWeight: 600 }}>Pending Orders</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7c2d12' }}>{stats.pendingOrders}</div>
                </div>
            </div>

            {orders.length === 0 ? <p className="text-muted">No orders recorded yet.</p> : (
                <div style={{ display: 'grid', gap: '20px' }}>
                    {orders.slice().reverse().map((order, idx) => (
                        <div key={order.id || idx} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                    <span style={{ fontWeight: 800, color: 'var(--primary)', marginRight: '10px' }}>{(order.order_type || 'N/A').toUpperCase()}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(order.timestamp).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <select
                                            id={`status-${order.id}`}
                                            defaultValue={order.status || 'Pending'}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '0.85rem',
                                                outline: 'none',
                                                background: order.status === 'Completed' ? '#dcfce7' : order.status === 'Cancelled' ? '#fee2e2' : '#f8fafc',
                                                color: order.status === 'Completed' ? '#166534' : order.status === 'Cancelled' ? '#991b1b' : 'inherit',
                                                fontWeight: 600
                                            }}
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Preparing">Preparing</option>
                                            <option value="Ready">Ready</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                        <button
                                            onClick={() => updateOrderStatus(order.id, document.getElementById(`status-${order.id}`).value)}
                                            className="btn-primary"
                                            style={{ padding: '6px 15px', fontSize: '0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                        >
                                            <Save size={14} /> Save
                                        </button>
                                    </div>
                                    <button onClick={() => printReceipt(order)} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }} title="Print Receipt"><Printer size={18} /></button>
                                    <button onClick={() => deleteOrder(order.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} title="Delete Order"><Trash2 size={18} /></button>
                                </div>
                            </div>
                            <div style={{ marginBottom: '10px', fontSize: '0.95rem' }}>
                                <strong>{order.customer_details?.name}</strong> • {order.payment_method}
                                {order.customer_details?.phone && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{order.customer_details.phone}</div>}
                                {order.customer_details?.tableNumber && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Table: {order.customer_details.tableNumber}</div>}
                                {order.customer_details?.address && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Address: {order.customer_details.address}</div>}
                            </div>
                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', fontSize: '0.9rem' }}>
                                {order.items.map((item, i) => (
                                    <div key={i} style={{ marginBottom: '4px' }}>• {item}</div>
                                ))}
                            </div>
                            <div style={{ marginTop: '15px', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem' }}>
                                Total Amount: ₱{order.total_amount}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrderHistory;
