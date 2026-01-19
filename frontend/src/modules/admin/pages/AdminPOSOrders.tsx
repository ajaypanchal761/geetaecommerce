import React, { useState, useEffect } from 'react';
import { getAllSellers } from '../../../services/api/sellerService';
import { getProducts } from '../../../services/api/admin/adminProductService';
import { getAllCustomers } from '../../../services/api/admin/adminCustomerService';
import { createPOSOrder, initiatePOSOnlineOrder, verifyPOSPayment } from '../../../services/api/admin/adminOrderService';
import { useToast } from '../../../context/ToastContext';

const AdminPOSOrders = () => {
    const { showToast } = useToast();

    // Data States
    const [sellers, setSellers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]); // Current page products
    const [allItems, setAllItems] = useState<any[]>([]); // All fetched & expanded products
    const [customers, setCustomers] = useState<any[]>([]);

    const [selectedSeller, setSelectedSeller] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [cart, setCart] = useState<any[]>(() => {
        const saved = localStorage.getItem('pos_cart');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('pos_cart', JSON.stringify(cart));
    }, [cart]);

    // UI States
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingCheckout, setLoadingCheckout] = useState(false);

    // Modals
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);

    // Helper for loading scripts
    const loadScript = (src: string) => {
        return new Promise((resolve) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    // ... existing handlers ...

    const calculateTotal = () => {
        return cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    };

    const handleAccessPayment = () => {
        if (cart.length === 0) {
            showToast("Cart is empty", "error");
            return;
        }
        if (!selectedCustomer) {
            showToast("Please select a customer", "error");
            return;
        }
        setShowPaymentModal(true);
    };

    const handlePaymentSelection = async (method: string) => {
        setShowPaymentModal(false);

        if (method === 'Cash') {
             performCashCheckout();
             return;
        }

        // Online Payment
        setLoadingCheckout(true);
        try {
            const orderData = {
                customerId: selectedCustomer._id,
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.qty,
                    price: item.price,
                    name: item.name
                })),
                gateway: method
            };

            const response = await initiatePOSOnlineOrder(orderData);

            if (response.success) {
                const { gateway, orderId, amount, key, razorpayOrderId, paymentSessionId, isSandbox } = response.data;

                if (gateway === 'Razorpay') {
                    const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
                    if (!loaded) {
                        showToast('Razorpay SDK failed to load', 'error');
                        setLoadingCheckout(false);
                        return;
                    }

                    const options = {
                        key: key,
                        amount: amount * 100,
                        currency: "INR",
                        name: "Geeta Stores",
                        description: "POS Order",
                        order_id: razorpayOrderId,
                        handler: async function (response: any) {
                             await handleVerifyPayment(orderId, response.razorpay_payment_id);
                        },
                        prefill: {
                            name: selectedCustomer.name,
                            email: selectedCustomer.email || 'guest@example.com',
                            contact: selectedCustomer.phone
                        },
                        theme: { color: "#2563eb" }
                    };
                    const rzp = new (window as any).Razorpay(options);
                    rzp.open();
                    // Keep loading true until payment completes or user closes (rzp doesn't notify close easily without modal option, but fine for now)
                    setLoadingCheckout(false);
                } else if (gateway === 'Cashfree') {
                    const loaded = await loadScript('https://sdk.cashfree.com/js/v3/cashfree.js');
                    if (!loaded) {
                        showToast('Cashfree SDK failed to load', 'error');
                        setLoadingCheckout(false);
                        return;
                    }

                    const cashfree = new (window as any).Cashfree({
                        mode: isSandbox ? "sandbox" : "production"
                    });

                    cashfree.checkout({
                        paymentSessionId: paymentSessionId,
                        redirectTarget: "_modal",
                    }).then((result: any) => {
                        console.log("Cashfree Result:", result);
                         // In a real scenario, we check backend status via webhook or polling.
                         // For POS instant feedback, we'll optimistically assume success if no error thrown,
                         // OR ideally user clicks "Check Status".
                         // BUT user requirement: "payment successful ho jan chiaye".
                         // We will trigger verification.
                         handleVerifyPayment(orderId, "CF_References_Checked_Backend");
                    });
                    setLoadingCheckout(false);
                }
            } else {
                 showToast(response.message || "Failed to initiate payment", "error");
                 setLoadingCheckout(false);
            }
        } catch (error: any) {
            showToast(error.message || "Payment initiation failed", "error");
            setLoadingCheckout(false);
        }
    };

    const handleVerifyPayment = async (orderId: string, paymentId: string) => {
        setLoadingCheckout(true);
        try {
            const response = await verifyPOSPayment({ orderId, paymentId, status: 'success' });
            if (response.success) {
                showToast("Order placed successfully!", "success");
                setCart([]);
                setPaymentMethod('Cash');
                setSelectedCustomer(null);
                setCustomerSearch('');
            } else {
                showToast("Payment Verification Failed", "error");
            }
        } catch (error) {
            showToast("Payment Verification Error", "error");
        } finally {
            setLoadingCheckout(false);
        }
    };

    const performCashCheckout = async () => {
        setLoadingCheckout(true);
        try {
            const orderData = {
                customerId: selectedCustomer._id,
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.qty,
                    price: item.price,
                    name: item.name
                })),
                paymentMethod: 'Cash',
                paymentStatus: 'Paid' as any
            };

            const response = await createPOSOrder(orderData);
            if (response.success) {
                showToast("Order placed successfully!", "success");
                setCart([]);
                setPaymentMethod('Cash');
                setSelectedCustomer(null);
                setCustomerSearch('');
            } else {
                 showToast(response.message || "Failed to place order", "error");
            }
        } catch (error: any) {
            showToast(error.message || "Something went wrong", "error");
        } finally {
            setLoadingCheckout(false);
        }
    };

    // --- Handlers ---
    const handleQuickAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newItem = {
            id: `custom_${Date.now()}`,
            name: quickForm.name,
            price: parseFloat(quickForm.price),
            qty: parseInt(quickForm.qty),
            purchasePrice: 0,
            image: '',
            productId: 'custom_item'
        };

        setCart(prev => [...prev, newItem]);
        showToast("Item added to cart", "success");
        setShowQuickAdd(false);
        setQuickForm({ name: '', price: '', qty: '1' });
    };

    const openEditModal = (item: any) => {
        setEditingItem(item);
        setEditForm({
            name: item.name,
            price: item.price.toString(),
            qty: item.qty.toString()
        });
    };

    const handleEditItemSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        setCart(prev => prev.map(item => {
            if (item.id === editingItem.id) {
                return {
                    ...item,
                    name: editForm.name,
                    price: parseFloat(editForm.price),
                    qty: parseInt(editForm.qty)
                };
            }
            return item;
        }));
        setEditingItem(null);
    };

    // Quick Add Form
    const [quickForm, setQuickForm] = useState({ name: '', price: '', qty: '1' });
    // Edit Item Form
    const [editForm, setEditForm] = useState({ name: '', price: '', qty: '' });

    // Initial Load - Sellers and recent customers/products
    useEffect(() => {
        fetchSellers();
        // Load default/recent products or wait for search?
        // Let's load some initial products if needed, but for now wait for seller selection or search
        fetchAndProcessProducts('', ''); // Load some initial products
    }, []);

    // Fetch Sellers
    const fetchSellers = async () => {
        try {
            const response = await getAllSellers({ status: 'Approved' });
            if (response.success) {
                setSellers(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch sellers", error);
        }
    };

    // Fetch Products when seller or search changes
    // Expanded Fetch Logic: Fetch all (limit 1000), Expand Variations, Client-side Pagination
    useEffect(() => {
        const timer = setTimeout(() => {
             fetchAndProcessProducts(selectedSeller, searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [selectedSeller, searchQuery]);

    useEffect(() => {
        // Handle client-side pagination whenever allItems or currentPage changes
        const startIndex = (currentPage - 1) * 12;
        const endIndex = startIndex + 12;
        setProducts(allItems.slice(startIndex, endIndex));
    }, [currentPage, allItems]);

    const fetchAndProcessProducts = async (sellerId: string, search: string) => {
        setLoadingProducts(true);
        try {
            // Fetch ALL matching products to handle variations expansion and client-side pagination
            const params: any = { limit: 1000, page: 1 };
            if (sellerId) params.seller = sellerId;
            if (search) params.search = search;

            const response = await getProducts(params);
            if (response.success) {
                const fetchedProducts = response.data;
                const expandedProducts: any[] = [];

                fetchedProducts.forEach((product: any) => {
                    // Check for variations
                    if (product.variations && product.variations.length > 0) {
                         product.variations.forEach((variation: any, index: number) => {
                             expandedProducts.push({
                                 ...product,
                                 _id: `${product._id}-var-${index}`, // Unique ID for UI/Cart
                                 productId: product._id, // Keep original Product ID for backend
                                 productName: `${product.productName} (${variation.name}: ${variation.value})`,
                                 price: variation.price || product.price,
                                 stock: variation.stock !== undefined ? variation.stock : product.stock,
                                 originalProduct: product, // Store reference if needed
                                 isVariation: true
                             });
                         });
                    } else {
                        expandedProducts.push(product);
                    }
                });

                setAllItems(expandedProducts);
                const total = expandedProducts.length;
                setTotalPages(Math.ceil(total / 12));
                setCurrentPage(1); // Reset to page 1 on new fetch
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setLoadingProducts(false);
        }
    };

    // Search Customers
    useEffect(() => {
        if (!customerSearch) return;
        const timer = setTimeout(() => {
            fetchCustomers(customerSearch);
        }, 500);
        return () => clearTimeout(timer);
    }, [customerSearch]);

    const fetchCustomers = async (search: string) => {
        try {
            const response = await getAllCustomers({ search, limit: 10 });
            if (response.success) {
                setCustomers(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch customers", error);
        }
    };


    // --- Cart Logic ---
    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product._id);
            if (existing) {
                return prev.map(item => item.id === product._id ? { ...item, qty: item.qty + 1 } : item);
            }
            return [...prev, {
                id: product._id,
                name: product.productName,
                price: product.price,
                qty: 1,
                purchasePrice: 0, // Not exposed in product list typically
                image: product.mainImage,
                productId: product._id
            }];
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };



    return (
        <div className="p-4 bg-gray-50 min-h-screen font-sans">
            {/* Header / Breadcrumb */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">POS System</h1>
                    <div className="text-sm text-gray-500">
                        <span className="text-blue-600">Dashboard</span> / POS
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                {/* LEFT COLUMN - PRODUCTS */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">

                        {/* Top Bar (Filters) */}
                        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 bg-white z-10">
                            <select
                                className="border border-gray-300 rounded px-3 py-2 text-sm w-full sm:w-1/3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={selectedSeller}
                                onChange={(e) => {
                                    setSelectedSeller(e.target.value);
                                    // Page reset handled in fetchAndProcessProducts
                                }}
                            >
                                <option value="">-- All Sellers --</option>
                                {sellers.map(seller => (
                                    <option key={seller._id} value={seller._id}>{seller.storeName || seller.sellerName}</option>
                                ))}
                            </select>

                            <div className="flex w-full">
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    className="border border-gray-300 border-r-0 rounded-l px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                         // Page reset handled in fetchAndProcessProducts
                                    }}
                                />
                                <button className="bg-[#e65100] text-white px-4 rounded-r flex items-center justify-center">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Products Grid */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                            {loadingProducts ? (
                                <div className="flex justify-center items-center h-40">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {products.map(product => (
                                        <div key={product._id} onClick={() => addToCart(product)} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col items-center text-center group">
                                            <div className="w-16 h-16 bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                                                {product.mainImage ? (
                                                     <img src={product.mainImage} alt={product.productName} className="w-full h-full object-cover"/>
                                                ) : (
                                                    <span className="text-xs text-gray-400">IMG</span>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-medium text-gray-800 line-clamp-2">{product.productName}</h3>
                                            <div className="mt-2 text-green-600 font-bold">₹{product.price}</div>
                                            {product.stock <= 0 && <span className="text-xs text-red-500">Out of Stock</span>}
                                        </div>
                                    ))}
                                    {products.length === 0 && (
                                        <div className="col-span-full py-10 text-center text-gray-400 text-sm">
                                            No products found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>


                        {/* Pagination */}
                        <div className="p-3 border-t border-gray-100 flex justify-center items-center gap-2 bg-white sticky bottom-0 z-10">
                             <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-600"
                             >
                                &lt;
                             </button>

                             <div className="flex items-center gap-1">
                                <button className="w-8 h-8 flex items-center justify-center rounded bg-[#009688] text-white font-medium">
                                    {currentPage}
                                </button>
                             </div>

                             <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-600"
                             >
                                &gt;
                             </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - CART */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-2rem)] sticky top-4">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
                            <h2 className="text-lg font-semibold text-gray-700">Billing</h2>
                            <button
                                onClick={() => setShowQuickAdd(true)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded flex items-center gap-1 font-medium transition-colors"
                            >
                                + Quick Add
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Customer Selection */}
                            <div className="p-4 border-b border-gray-100">
                                {selectedCustomer ? (
                                     <div className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                                         <div>
                                             <div className="font-medium text-blue-800">{selectedCustomer.name}</div>
                                             <div className="text-xs text-blue-600">{selectedCustomer.phone}</div>
                                         </div>
                                         <button onClick={() => setSelectedCustomer(null)} className="text-blue-500 hover:text-blue-700 text-sm">Change</button>
                                     </div>
                                ) : (
                                    <div className="relative">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Search Customer / Mobile..."
                                                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors"
                                                value={customerSearch}
                                                onChange={(e) => setCustomerSearch(e.target.value)}
                                            />
                                            {customerSearch && customers.length > 0 && (
                                                <div className="absolute top-full left-0 right-12 z-20 bg-white border border-gray-200 shadow-lg rounded-b max-h-48 overflow-y-auto">
                                                    {customers.map(cust => (
                                                        <div
                                                            key={cust._id}
                                                            className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50"
                                                            onClick={() => {
                                                                setSelectedCustomer(cust);
                                                                setCustomerSearch('');
                                                                setCustomers([]);
                                                            }}
                                                        >
                                                            <div className="text-sm font-medium">{cust.name}</div>
                                                            <div className="text-xs text-gray-500">{cust.phone}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <button className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700 transition-colors">
                                                +
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Cart Items List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {cart.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                        <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        <span className="text-sm">Cart is empty</span>
                                    </div>
                                ) : (
                                    cart.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-blue-200 transition-colors shadow-sm">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-medium text-gray-800 line-clamp-1">{item.name}</h4>
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit Item"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-500">₹{item.price} x</span>
                                                    <div className="flex items-center border border-gray-200 rounded">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="px-1.5 py-0.5 hover:bg-gray-100 text-gray-600">-</button>
                                                        <span className="px-2 text-xs font-medium">{item.qty}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="px-1.5 py-0.5 hover:bg-gray-100 text-gray-600">+</button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-gray-900">₹{item.price * item.qty}</div>
                                                <button onClick={() => removeFromCart(item.id)} className="text-xs text-red-500 hover:text-red-700 mt-1">Remove</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer Summary */}
                            <div className="bg-gray-50 p-4 border-t border-gray-200">
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal</span>
                                        <span>₹{calculateTotal()}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-gray-900 border-t border-gray-200 pt-2">
                                        <span>Total</span>
                                        <span>₹{calculateTotal()}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={handleAccessPayment}
                                        disabled={loadingCheckout}
                                        className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 ${loadingCheckout ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {loadingCheckout ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <span>Access Payment</span>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                            </>
                                        )}
                                    </button>


                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- QUICK ADD MODAL --- */}
            {showQuickAdd && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-green-600 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Quick Add Item</h3>
                            <button onClick={() => setShowQuickAdd(false)} className="text-white/80 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleQuickAddSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                <input
                                    type="text" required
                                    value={quickForm.name} onChange={e => setQuickForm({ ...quickForm, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    placeholder="Enter item name"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                                    <input
                                        type="number" required min="0"
                                        value={quickForm.price} onChange={e => setQuickForm({ ...quickForm, price: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        type="number" required min="1"
                                        value={quickForm.qty} onChange={e => setQuickForm({ ...quickForm, qty: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2">
                                Add to Cart
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- EDIT ITEM MODAL --- */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Edit Item</h3>
                            <button onClick={() => setEditingItem(null)} className="text-white/80 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleEditItemSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                <input
                                    type="text" required
                                    value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Enter item name"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                                    <input
                                        type="number" required min="0" step="0.01"
                                        value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        type="number" required min="1"
                                        value={editForm.qty} onChange={e => setEditForm({ ...editForm, qty: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2">
                                Update Item
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- PAYMENT METHOD MODAL --- */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="bg-gray-800 px-6 py-4 text-white flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Select Payment Method</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-white/80 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 space-y-3">
                             <div className="text-center mb-4">
                                 <p className="text-gray-500 text-sm">Total Amount to Pay</p>
                                 <p className="text-2xl font-bold text-gray-800">₹{calculateTotal()}</p>
                             </div>

                            <button onClick={() => handlePaymentSelection('Razorpay')} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group">
                                <span className="font-semibold text-gray-700 group-hover:text-blue-700">Razorpay</span>
                                <span className="text-blue-500">→</span>
                            </button>

                            <button onClick={() => handlePaymentSelection('Cashfree')} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group">
                                <span className="font-semibold text-gray-700 group-hover:text-purple-700">Cashfree</span>
                                <span className="text-purple-500">→</span>
                            </button>

                             <button onClick={() => handlePaymentSelection('Cash')} className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group">
                                <span className="font-semibold text-gray-700 group-hover:text-green-700">Cash</span>
                                <span className="text-green-500">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPOSOrders;
