import React, { useState, useEffect } from 'react';
import { getProducts, Product } from '../../../services/api/admin/adminProductService';
import { createPOSOrder } from '../../../services/api/admin/adminOrderService';
import { useToast } from '../../../context/ToastContext';

// Interface for Cart Item extending Product
interface CartItem extends Product {
  qty: number;
  customPrice?: number; // For edited selling price
}

const AdminPOSOrders = () => {
  const { showToast } = useToast();
  const [selectedSeller, setSelectedSeller] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  // Quick Add Form
  const [quickForm, setQuickForm] = useState({ name: '', price: '', qty: '1' });
  // Edit Price Form
  const [editPriceForm, setEditPriceForm] = useState({ sellingPrice: '' });

  // Fetch Products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await getProducts({
          search: searchQuery,
          status: 'Active',
          limit: 20 // Reasonable limit for POS
        });
        if (response.success && response.data) {
          setProducts(response.data);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        showToast("Failed to load products", "error");
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
        fetchProducts();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // --- Cart Logic ---
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => {
        const price = item.customPrice !== undefined ? item.customPrice : item.price;
        return acc + (price * item.qty);
    }, 0);
  };

  // --- Handlers ---
  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Quick Add creates a temporary mock product in cart
    // In a real app, this might need backend support or special ID
    const newItem: any = {
      _id: 'quick-' + Date.now(),
      productName: quickForm.name,
      price: parseFloat(quickForm.price),
      qty: parseInt(quickForm.qty) || 1,
      mainImage: '', // Placeholder
      // Add other required Product fields with defaults if necessary for strictly typed CartItem
    };
    setCart(prev => [...prev, newItem]);
    setShowQuickAdd(false);
    setQuickForm({ name: '', price: '', qty: '1' });
  };

  const openEditModal = (item: CartItem) => {
    setEditingItem(item);
    // Use customPrice if set, otherwise default price
    const currentPrice = item.customPrice !== undefined ? item.customPrice : item.price;
    setEditPriceForm({ sellingPrice: currentPrice.toString() });
  };

  const handleEditPriceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setCart(prev => prev.map(item => {
      if (item._id === editingItem._id) {
        return { ...item, customPrice: parseFloat(editPriceForm.sellingPrice) };
      }
      return item;
    }));
    setEditingItem(null);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
        showToast("Cart is empty", "error");
        return;
    }

    try {
        const orderData = {
            customerId: "walk-in-customer", // Default or handle customer selection
            items: cart.map(item => ({
                productId: item._id.startsWith('quick-') ? '' : item._id, // Handle quick add items appropriately
                name: item._id.startsWith('quick-') ? item.productName : undefined,
                quantity: item.qty,
                price: item.customPrice !== undefined ? item.customPrice : item.price
            })),
            paymentMethod: paymentMethod,
            paymentStatus: "Paid" as "Paid" // Assuming immediate payment in POS
        };

        const response = await createPOSOrder(orderData);
        if (response.success) {
            showToast("Order placed successfully!", "success");
            setCart([]);
        } else {
            showToast("Failed to place order", "error");
        }
    } catch (error) {
        console.error("Order error:", error);
        showToast("Error processing order", "error");
    }
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
                 onChange={(e) => setSelectedSeller(e.target.value)}
               >
                 <option value="">-- Select Seller --</option>
                 <option value="seller1">Seller 1</option>
                 <option value="seller2">Seller 2</option>
               </select>

               <div className="flex w-full">
                 <input
                   type="text"
                   placeholder="Search products..."
                   className="border border-gray-300 border-r-0 rounded-l px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
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
               {loading ? (
                   <div className="flex justify-center items-center h-40">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                   </div>
               ) : (
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {products.map(product => (
                          <div key={product._id} onClick={() => addToCart(product)} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col items-center text-center group">
                               <div className="w-16 h-16 bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                                   {product.mainImage ? (
                                       <img src={product.mainImage} alt={product.productName} className="w-full h-full object-cover" />
                                   ) : (
                                       <span className="text-xs text-gray-400">IMG</span>
                                   )}
                               </div>
                               <h3 className="text-sm font-medium text-gray-800 line-clamp-2">{product.productName}</h3>
                               <div className="mt-2 text-green-600 font-bold">₹{product.price}</div>
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search Customer / Mobile..."
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors"
                  />
                  <button className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700 transition-colors">
                     +
                  </button>
                </div>
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
                                     <h4 className="text-sm font-medium text-gray-800 line-clamp-1">{item.productName}</h4>
                                     <button
                                        onClick={() => openEditModal(item)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit Price"
                                     >
                                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                     </button>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-gray-500">₹{item.customPrice !== undefined ? item.customPrice : item.price} x</span>
                                      <div className="flex items-center border border-gray-200 rounded">
                                          <button onClick={() => updateQuantity(item._id, -1)} className="px-1.5 py-0.5 hover:bg-gray-100 text-gray-600">-</button>
                                          <span className="px-2 text-xs font-medium">{item.qty}</span>
                                          <button onClick={() => updateQuantity(item._id, 1)} className="px-1.5 py-0.5 hover:bg-gray-100 text-gray-600">+</button>
                                      </div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="font-semibold text-gray-900">₹{(item.customPrice !== undefined ? item.customPrice : item.price) * item.qty}</div>
                                  <button onClick={() => removeFromCart(item._id)} className="text-xs text-red-500 hover:text-red-700 mt-1">Remove</button>
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
                      <div>
                          <label className="block text-xs font-semibold text-gray-500 mb-1">Payment Method</label>
                          <div className="grid grid-cols-4 gap-2">
                              {['Cash', 'Card', 'UPI', 'Credit'].map(method => (
                                  <button
                                     key={method}
                                     onClick={() => setPaymentMethod(method)}
                                     className={`py-2 text-xs font-medium rounded border ${paymentMethod === method ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                  >
                                      {method}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <button
                        onClick={handlePlaceOrder}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                          <span>Place Order</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
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
                           value={quickForm.name} onChange={e => setQuickForm({...quickForm, name: e.target.value})}
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
                               value={quickForm.price} onChange={e => setQuickForm({...quickForm, price: e.target.value})}
                               className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                               placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                               type="number" required min="1"
                               value={quickForm.qty} onChange={e => setQuickForm({...quickForm, qty: e.target.value})}
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

      {/* --- EDIT PRICE MODAL --- */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Edit Price</h3>
                    <button onClick={() => setEditingItem(null)} className="text-white/80 hover:text-white">✕</button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded p-3 mb-2">
                        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Purchase Price</p>
                        {/* Note: 'purchasePrice' is typically Cost Price. If backend doesn't provide it, we show 0 or N/A.
                            If 'compareAtPrice' is closer to MRP/Original, we might show that depending on need,
                            but user specifically asked for purchase price. */}
                        <p className="text-lg font-bold text-blue-800">₹{(editingItem as any).purchasePrice || 0}</p>
                    </div>

                    <form onSubmit={handleEditPriceSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
                            <input
                               type="number" required min="0" step="0.01"
                               value={editPriceForm.sellingPrice} onChange={e => setEditPriceForm({ sellingPrice: e.target.value })}
                               className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                               autoFocus
                            />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors">
                            Update Price
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminPOSOrders;

