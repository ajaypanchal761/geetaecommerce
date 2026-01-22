import React, { useState, useEffect } from 'react';
import { getPOSProducts, Product } from '../../../services/api/admin/adminProductService';
import { createPOSOrder, initiatePOSOnlineOrder, verifyPOSPayment } from '../../../services/api/admin/adminOrderService';
import { getAllCustomers, Customer } from '../../../services/api/admin/adminCustomerService';
import { useToast } from '../../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from "jspdf";

// Interface for Cart Item extending Product
interface CartItem extends Product {
  qty: number;
  customPrice?: number; // For edited selling price
  originalProductId?: string; // To store parent ID for variations
  variationId?: string;
  isVariation?: boolean;
}

interface Bill {
  id: string;
  name: string;
  cart: CartItem[];
  selectedCustomer: Customer | null;
  customerSearch: string;
  paymentMethod: string;
  createdAt: number;
}

const AdminPOSOrders = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [selectedSeller, setSelectedSeller] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Bill State
  const [bills, setBills] = useState<Bill[]>(() => {
    try {
      const savedBills = localStorage.getItem('pos_bills');
      if (savedBills) {
        const parsed = JSON.parse(savedBills);
        if (Array.isArray(parsed) && parsed.length === 1) {
          // Normalize single remaining bill's name to "Bill 1"
          parsed[0] = { ...parsed[0], name: 'Bill 1' };
        }
        return parsed;
      }
    } catch (e) {
      console.error("Failed to load bills", e);
    }
    return [{
      id: '1',
      name: 'Bill 1',
      cart: [],
      selectedCustomer: null,
      customerSearch: '',
      paymentMethod: 'Cash',
      createdAt: Date.now()
    }];
  });

  const [activeBillId, setActiveBillId] = useState<string>(() => {
    return localStorage.getItem('pos_active_bill') || '1';
  });

  const activeBill = bills.find(b => b.id === activeBillId) || bills[0];

  // Helper to update active bill state
  const updateActiveBill = (updates: Partial<Bill>) => {
    setBills(prev => {
      const newBills = prev.map(b => b.id === activeBillId ? { ...b, ...updates } : b);
      localStorage.setItem('pos_bills', JSON.stringify(newBills));
      return newBills;
    });
  };

  const createNewBill = () => {
    const newId = (Date.now()).toString();
    const newBill: Bill = {
      id: newId,
      name: `Bill ${bills.length + 1}`,
      cart: [],
      selectedCustomer: null,
      customerSearch: '',
      paymentMethod: 'Cash',
      createdAt: Date.now()
    };
    setBills(prev => {
      const updated = [...prev, newBill];
      localStorage.setItem('pos_bills', JSON.stringify(updated));
      return updated;
    });
    setActiveBillId(newId);
    localStorage.setItem('pos_active_bill', newId);
  };

  const closeBill = (billId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (bills.length <= 1) {
      showToast("At least one bill must remain open", "error");
      return;
    }

    setBills(prev => {
      let updated = prev.filter(b => b.id !== billId);
      // If only one bill remains, ensure its name is "Bill 1"
      if (updated.length === 1) {
        updated = [{ ...updated[0], name: 'Bill 1' }];
      }
      localStorage.setItem('pos_bills', JSON.stringify(updated));

      // If closing active bill, switch to the last available one
      if (billId === activeBillId) {
        const nextBill = updated[updated.length - 1];
        setActiveBillId(nextBill.id);
        localStorage.setItem('pos_active_bill', nextBill.id);
      }
      return updated;
    });
  };

  // Derived State (Proxies for existing logic)
  const cart = activeBill.cart;
  const selectedCustomer = activeBill.selectedCustomer;
  const customerSearch = activeBill.customerSearch;
  const paymentMethod = activeBill.paymentMethod;

  const setCart = (action: React.SetStateAction<CartItem[]>) => {
    let newCart;
    if (typeof action === 'function') {
      newCart = action(activeBill.cart);
    } else {
      newCart = action;
    }
    updateActiveBill({ cart: newCart });
  };

  const setPaymentMethod = (method: string) => {
      updateActiveBill({ paymentMethod: method });
  };

  useEffect(() => {
    localStorage.setItem('pos_active_bill', activeBillId);
  }, [activeBillId]);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  // Quick Add Form
  const [quickForm, setQuickForm] = useState({ name: '', price: '', qty: '1', mrp: '', purchasePrice: '' });
  // Edit Item Form
  const [editForm, setEditForm] = useState({ name: '', price: '', qty: '' });

  // Customer Search State
  // const [customerSearch, setCustomerSearch] = useState(''); // Removed global
  const [customers, setCustomers] = useState<Customer[]>([]);
  // const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null); // Removed global
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Search Customers
  useEffect(() => {
    // If we have a selected customer and the search matches their name, don't search again
    if (selectedCustomer && customerSearch.includes(selectedCustomer.name)) return;

    if (!customerSearch || customerSearch.length < 2) {
        setCustomers([]);
        setShowCustomerDropdown(false);
        return;
    }
    const timer = setTimeout(async () => {
        try {
            const res = await getAllCustomers({ search: customerSearch, limit: 5 });
            if (res.success && res.data) {
                setCustomers(res.data);
                setShowCustomerDropdown(true);
            }
        } catch (e) {
            console.error(e);
        }
    }, 400);
    return () => clearTimeout(timer);
  }, [customerSearch, selectedCustomer]);

  const selectCustomer = (c: Customer) => {
      // setSelectedCustomer(c);
      // const displayName = c.phone ? `${c.name} (${c.phone})` : c.name;
      // setCustomerSearch(displayName);
      const displayName = c.phone ? `${c.name} (${c.phone})` : c.name;
      updateActiveBill({ selectedCustomer: c, customerSearch: displayName });
      setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
      // setSelectedCustomer(null);
      // setCustomerSearch('');
      updateActiveBill({ selectedCustomer: null, customerSearch: '' });
      setCustomers([]);
  };

  const handleCustomerSearchChange = (val: string) => {
    updateActiveBill({ customerSearch: val });
  };

  // Fetch Products
  useEffect(() => {
    const fetchProducts = async () => {
      if (!searchQuery.trim()) {
        setProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await getPOSProducts({
          search: searchQuery,
          limit: 1000 // Fetch all for client-side pagination
        });
        if (response.success && response.data) {
          // Expand Variations
          const expandedProducts: any[] = []; // Relax type to allow adding originalProductId

          response.data.forEach((product: any) => {
             if (product.variations && product.variations.length > 0) {
                 product.variations.forEach((variation: any) => {
                     expandedProducts.push({
                         ...product,
                         _id: `${product._id}-${variation.sku || Math.random().toString(36).substr(2, 5)}`,
                         originalProductId: product._id, // Store parent ID
                         productName: `${product.productName} - ${variation.variationName}`,
                         price: variation.price,
                         stock: variation.stock,
                         sku: variation.sku || product.sku, // Use variation SKU
                         isVariation: true,
                         variationId: variation._id
                     });
                 });
             } else {
                 expandedProducts.push({
                     ...product,
                     originalProductId: product._id
                 });
             }
          });

          setProducts(expandedProducts);
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

  // Barcode Scanner Handler
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        // Exact match check for Barcode/SKU/ItemCode
        const exactMatch = products.find(p =>
            (p.barcode && p.barcode.toLowerCase() === query) ||
            (p.sku && p.sku.toLowerCase() === query) ||
            ((p as any).itemCode && (p as any).itemCode.toLowerCase() === query)
        );

        if (exactMatch) {
            e.preventDefault();
            addToCart(exactMatch as CartItem);
            setSearchQuery(''); // Clear for next scan
            // showToast("Item added!", "success");
        }
    }
  };

  // --- Cart Logic ---
  const addToCart = (product: Product | CartItem) => {
    // Check Stock
    if (product.stock <= 0) {
        showToast(`Item "${product.productName}" is Out of Stock!`, "error");
        return;
    }

    setCart(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        if (existing.qty >= product.stock) {
            showToast("Cannot add more than available stock", "error");
            return prev;
        }
        return prev.map(item => item._id === product._id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...(product as CartItem), qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === id) {
        const newQty = Math.max(1, item.qty + delta);
        // Check Stock for non-quick-add items
        if (!item._id.toString().startsWith('quick-') && delta > 0) {
            if (newQty > (item.stock || 0)) {
                showToast("Reached maximum available stock", "error");
                return item;
            }
        }
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
    const newItem: any = {
      _id: 'quick-' + Date.now(),
      productName: quickForm.name,
      price: parseFloat(quickForm.price) || 0,
      compareAtPrice: parseFloat(quickForm.mrp) || 0,
      purchasePrice: parseFloat(quickForm.purchasePrice) || 0,
      qty: parseInt(quickForm.qty) || 1,
      mainImage: '', // Placeholder
      originalProductId: null
    };
    setCart(prev => [...prev, newItem]);
    setShowQuickAdd(false);
    setQuickForm({ name: '', price: '', qty: '1', mrp: '', purchasePrice: '' });
  };

  const openEditModal = (item: CartItem) => {
    setEditingItem(item);
    const currentPrice = item.customPrice !== undefined ? item.customPrice : item.price;
    setEditForm({
      name: item.productName,
      price: currentPrice.toString(),
      qty: item.qty.toString()
    });
  };

  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setCart(prev => prev.map(item => {
      if (item._id === editingItem._id) {
        return {
          ...item,
          productName: editForm.name,
          customPrice: parseFloat(editForm.price),
          qty: parseInt(editForm.qty) || 1
        };
      }
      return item;
    }));
    setEditingItem(null);
  };

  const handleGenerateBill = () => {
    if (cart.length === 0) {
        showToast("Cart is empty", "error");
        return;
    }

    const doc = new jsPDF();

    // --- Header ---
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("GEETA", 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const address = "Q7WM+92M, Q7WM+92M, , Indore Division,\nNagda, Madhya Pradesh, India - 454001\n7898111456";
    doc.text(address, 14, 26);

    // Line
    doc.line(14, 40, 196, 40);

    // --- Invoice Details ---
    const invoiceNum = Math.floor(10000 + Math.random() * 90000);
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    doc.setFont("helvetica", "bold");
    doc.text("Invoice Number:", 14, 48);
    doc.text("Invoice Date:", 14, 53);
    doc.text("Payment Status:", 14, 58);

    doc.setFont("helvetica", "normal");
    doc.text(invoiceNum.toString(), 196, 48, { align: 'right' });
    doc.text(`${dateStr} ${timeStr}`, 196, 53, { align: 'right' });
    doc.text("Cash", 196, 58, { align: 'right' });

    // Line
    doc.setLineWidth(0.5);
    doc.line(14, 63, 196, 63);

    // --- Table Header ---
    doc.setFont("helvetica", "bold");
    doc.text("Estimated Bill", 105, 68, { align: 'center' });

    let y = 74;
    doc.setFontSize(10);
    doc.text("Item-name", 14, y);
    doc.text("Qty", 100, y);
    doc.text("MRP", 125, y);
    doc.text("Sp.", 155, y);
    doc.text("Total", 196, y, { align: 'right' });

    y += 4;

    // --- Table Body ---
    doc.setFont("helvetica", "normal");

    let totalQty = 0;
    let totalMRP = 0;
    let totalBillAmount = 0;

    cart.forEach((item, index) => {
        const qty = item.qty;
        const sp = item.customPrice !== undefined ? item.customPrice : item.price;
        const itemMrp = item.compareAtPrice && item.compareAtPrice > sp ? item.compareAtPrice : sp;

        const rowTotal = sp * qty;
        const rowMrpTotal = itemMrp * qty;

        totalQty += qty;
        totalMRP += rowMrpTotal;
        totalBillAmount += rowTotal;

        y += 6;
        if (y > 280) {
            doc.addPage();
            y = 20;
        }

        const name = `(${index + 1}) ${item.productName}`;
        const truncatedName = name.length > 40 ? name.substring(0, 37) + "..." : name;

        doc.text(truncatedName, 14, y);
        doc.text(qty.toString(), 100, y);
        doc.text(itemMrp.toString(), 125, y);
        doc.text(sp.toString(), 155, y);
        doc.text(rowTotal.toString(), 196, y, { align: 'right' });
    });

    y += 8;
    // Line
    doc.line(14, y, 196, y);
    y += 6;

    // --- Summary ---
    doc.setFont("helvetica", "normal");
    doc.text(`Total Qty.: ${totalQty}`, 14, y);
    doc.text(`Total MRP: Rs ${totalMRP}`, 196, y, { align: 'right' });

    y += 4;

    // Savings
    const savings = totalMRP - totalBillAmount;
    if (savings > 0) {
        doc.setFillColor(200, 200, 200);
        doc.rect(14, y, 182, 8, 'F');

        const savingPercent = ((savings / totalMRP) * 100).toFixed(1);

        doc.setFont("helvetica", "bold");
        doc.text(`You Saved ${savingPercent} %`, 16, y + 5.5);
        doc.text(savings.toString(), 194, y + 5.5, { align: 'right' });
    }

    y += 12;
    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);

    y += 6;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Total bill amount:", 14, y);
    doc.text(totalBillAmount.toString(), 196, y, { align: 'right' });

    y += 2;
    doc.line(14, y + 2, 196, y + 2);

    doc.save(`Invoice_${invoiceNum}.pdf`);
  };

  const handleAccessPayment = () => {
    if (cart.length === 0) {
        showToast("Cart is empty", "error");
        return;
    }

    // Customer check removed to allow guest checkout
    setShowPaymentModal(true);
  };

  const loadScript = (src: string) => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePaymentSelection = async (method: string) => {
    setShowPaymentModal(false);

    if (method === 'Cash') {
       await performCashCheckout();
       return;
    }

    if (method === 'Credit') {
        performCreditCheckout();
        return;
    }

    setLoading(true);
    try {
        const orderData = {
            customerId: selectedCustomer ? selectedCustomer._id : "walk-in-customer",
            items: cart.map(item => ({
                productId: item.originalProductId || item._id, // Send PARENT ID if available
                name: item.productName,
                quantity: item.qty,
                price: item.customPrice !== undefined ? item.customPrice : item.price,
                variationId: item.variationId
            })),
            gateway: method
        };

        const response = await initiatePOSOnlineOrder(orderData);

        if (response.success) {
            const { gateway, orderId, amount, key, razorpayOrderId, paymentSessionId, isSandbox } = response.data;

            if (gateway === 'Razorpay') {
                const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
                if (!res) {
                    showToast("Razorpay SDK failed to load", "error");
                    setLoading(false);
                    return;
                }

                const options = {
                    key: key,
                    amount: Math.round(amount * 100),
                    currency: "INR",
                    name: "Geeta Stores",
                    description: "POS Payment",
                    order_id: razorpayOrderId,
                    handler: async function (response: any) {
                        await handleVerifyPayment(orderId, response.razorpay_payment_id);
                    },
                    prefill: {
                        name: selectedCustomer?.name || "Walk-in Customer",
                        contact: selectedCustomer?.phone || undefined,
                        email: selectedCustomer?.email || undefined
                    },
                    theme: {
                        color: "#3399cc"
                    }
                };
                const rzp1 = new (window as any).Razorpay(options);
                rzp1.open();
                setLoading(false); // Modal is open, we can stop spinner
            } else if (gateway === 'Cashfree') {
                const res = await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");
                if (!res) {
                    showToast("Cashfree SDK failed to load", "error");
                    setLoading(false);
                    return;
                }
                const cashfree = new (window as any).Cashfree({
                    mode: isSandbox ? "sandbox" : "production"
                });
                cashfree.checkout({
                    paymentSessionId: paymentSessionId,
                    redirectTarget: "_modal",
                }).then((result: any) => {
                     // Optimistic verification or rely on backend webhook.
                     // For POS, we'll try to verify if we get a cue, but Cashfree JS promise resolves on close/completion.
                     // We'll Trigger verify
                     handleVerifyPayment(orderId, "CF_References_Checked_Backend");
                });
                setLoading(false);
            }
        } else {
             showToast(response.message || "Failed to initiate payment", "error");
             setLoading(false);
        }
    } catch (error) {
        console.error("Payment Init Error", error);
        showToast("Error initiating payment", "error");
        setLoading(false);
    }
  };

  const handleVerifyPayment = async (orderId: string, paymentId: string) => {
      setLoading(true);
      try {
          const response = await verifyPOSPayment({ orderId, paymentId, status: 'success' });
          if (response.success) {
              showToast("Payment Successful & Order Placed!", "success");
              setCart([]);
          } else {
              showToast("Payment Verification Failed", "error");
          }
      } catch (error) {
          console.error("Verify Error", error);
          showToast("Error verifying payment", "error");
      } finally {
          setLoading(false);
      }
  };

  const performCashCheckout = async () => {
    setLoading(true);
    try {
        const orderData = {
            customerId: selectedCustomer ? selectedCustomer._id : "walk-in-customer",
            items: cart.map(item => ({
                productId: item.originalProductId || item._id, // Use valid ID or custom
                name: item.productName,
                quantity: item.qty,
                price: item.customPrice !== undefined ? item.customPrice : item.price,
                variationId: item.variationId
            })),
            paymentMethod: 'Cash',
            paymentStatus: "Paid" as "Paid"
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
    } finally {
        setLoading(false);
    }
  };

  const performCreditCheckout = async () => {
      if (!selectedCustomer) {
          showToast("Customer selection is mandatory for Credit orders", "error");
          return;
      }

      setLoading(true);
      try {
           const orderData = {
                customerId: selectedCustomer._id,
                items: cart.map(item => ({
                    productId: item.originalProductId || item._id, // Use valid ID
                    name: item.productName,
                    quantity: item.qty,
                    price: item.customPrice !== undefined ? item.customPrice : item.price,
                    variationId: item.variationId
                })),
                paymentMethod: 'Credit',
                paymentStatus: "Pending" as "Pending"
            };

            const response = await createPOSOrder(orderData);

            if (response.success) {
                showToast(`Credit Order Placed! Balance updated for ${selectedCustomer.name}`, "success");
                setCart([]);
                // Navigate to REAL customer credit page
                navigate(`/admin/pos/customers/${selectedCustomer._id}`);
            } else {
                showToast(response.message || "Failed to create credit order", "error");
            }

      } catch (error) {
          console.error(error);
          showToast("Error processing credit order", "error");
      } finally {
          setLoading(false);
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
        <button
          onClick={() => window.location.href='/admin/pos/report'}
          className="px-4 py-2 bg-white text-orange-600 border border-orange-600 rounded-lg text-sm font-bold hover:bg-orange-50 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          View POS Report
        </button>
        <button
          onClick={() => navigate('/admin/pos/customers')}
          className="px-4 py-2 bg-blue-600 text-white border border-blue-600 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Customers (Credit)
        </button>
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
                   placeholder="Scan Barcode or Search products..."
                   className="border border-gray-300 border-r-0 rounded-l px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   onKeyDown={handleSearchKeyDown}
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
                        {products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(product => (
                           <div
                             key={product._id}
                             onClick={() => addToCart(product)}
                             className={`bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col items-center text-center group relative ${product.stock <= 0 ? 'opacity-60 grayscale' : ''}`}
                           >
                                <div className="w-16 h-16 bg-gray-100 rounded mb-2 flex items-center justify-center overflow-hidden">
                                    {product.mainImage ? (
                                        <img src={product.mainImage} alt={product.productName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xs text-gray-400">IMG</span>
                                    )}
                                </div>
                                <h3 className="text-sm font-medium text-gray-800 line-clamp-2">{product.productName}</h3>
                                <div className="mt-2 text-green-600 font-bold">₹{product.price}</div>
                                <div className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${product.stock <= 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                    Stock: {product.stock}
                                </div>
                                {product.stock <= 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg pointer-events-none">
                                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">OUT OF STOCK</span>
                                    </div>
                                )}
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
             {products.length > itemsPerPage && (
                <div className="p-4 border-t border-gray-100 flex justify-center items-center gap-3 bg-white rounded-b-lg">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="w-10 h-10 flex items-center justify-center border border-teal-600 rounded text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-50 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center bg-teal-600 text-white rounded font-bold shadow-sm">
                        {currentPage}
                    </button>
                     <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(products.length / itemsPerPage)))}
                        disabled={currentPage === Math.ceil(products.length / itemsPerPage)}
                        className="w-10 h-10 flex items-center justify-center border border-teal-600 rounded text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-50 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
             )}
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

            {/* Bill Tabs */}
            <div className="flex items-center gap-2 px-2 pt-2 overflow-x-auto border-b border-gray-200 bg-gray-50">
              {bills.map(bill => (
                <div
                  key={bill.id}
                  onClick={() => setActiveBillId(bill.id)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-pointer border-t border-l border-r transition-all min-w-[100px] justify-between select-none text-xs font-medium
                    ${activeBillId === bill.id
                      ? 'bg-white border-b-transparent text-blue-600 relative -mb-[1px] z-10 shadow-[0_-2px_4px_rgba(0,0,0,0.02)]'
                      : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200/50'}
                  `}
                >
                  <span className="truncate max-w-[80px]">{bill.name}</span>
                  <button
                    onClick={(e) => closeBill(bill.id, e)}
                    className="hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-full p-0.5 transition-colors"
                    title="Close Bill"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              ))}

              <button
                onClick={createNewBill}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors ml-1 flex-shrink-0"
                title="New Bill"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              </button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Customer Selection */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search Customer / Mobile..."
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50 focus:bg-white transition-colors"
                        value={customerSearch}
                        onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            // Reset selection if user modifies the text
                            if (selectedCustomer) {
                                const expected = selectedCustomer.phone ? `${selectedCustomer.name} (${selectedCustomer.phone})` : selectedCustomer.name;
                                if (e.target.value !== expected) {
                                  setSelectedCustomer(null);
                                }
                            }
                        }}
                        onFocus={() => {
                            if (customerSearch.length >= 2) setShowCustomerDropdown(true);
                        }}
                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                      />
                      {selectedCustomer && (
                          <button onClick={clearCustomer} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                              ✕
                          </button>
                      )}

                      {/* Search Results Dropdown */}
                      {showCustomerDropdown && customers.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {customers.map(c => (
                                  <div
                                     key={c._id}
                                     onMouseDown={(e) => {
                                         e.preventDefault(); // Prevent input blur
                                         selectCustomer(c);
                                     }}
                                     onClick={() => selectCustomer(c)}
                                     className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                                  >
                                      <div className="font-medium text-sm text-gray-800">{c.name}</div>
                                      <div className="text-xs text-gray-500">{c.phone} | {c.email}</div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                  <button onClick={() => {/* Add New Customer logic if needed */}} className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700 transition-colors">
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

                      <button
                        onClick={handleGenerateBill}
                        disabled={cart.length === 0}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                         Generate Bill
                      </button>

                      <button
                        onClick={handleAccessPayment}
                        disabled={loading}
                        className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                         {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                <span>Processing...</span>
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
                           value={quickForm.name} onChange={e => setQuickForm({...quickForm, name: e.target.value})}
                           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                           placeholder="Enter item name"
                           autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">MRP (₹)</label>
                            <input
                               type="number" min="0"
                               value={quickForm.mrp} onChange={e => setQuickForm({...quickForm, mrp: e.target.value})}
                               className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                               placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price (₹)</label>
                            <input
                               type="number" min="0"
                               value={quickForm.purchasePrice} onChange={e => setQuickForm({...quickForm, purchasePrice: e.target.value})}
                               className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
                               placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹)</label>
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
                           value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
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
                               value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})}
                               className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                               placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                               type="number" required min="1"
                               value={editForm.qty} onChange={e => setEditForm({...editForm, qty: e.target.value})}
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

      {/* --- PAYMENT MODAL --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="bg-gray-800 px-6 py-4 text-white flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Select Payment Method</h3>
                    <button onClick={() => setShowPaymentModal(false)} className="text-white/80 hover:text-white">✕</button>
                </div>
                <div className="p-6 space-y-4">
                     <div className="text-center mb-6">
                         <p className="text-gray-500 text-sm mb-1">Total Amount</p>
                         <p className="text-3xl font-bold text-gray-900">₹{calculateTotal()}</p>
                     </div>

                     <div className="space-y-3">
                        <button
                          onClick={() => handlePaymentSelection('Razorpay')}
                          className="w-full group flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                            <span className="font-semibold text-gray-700 group-hover:text-blue-700">Razorpay</span>
                            <span className="text-gray-300 group-hover:text-blue-500">→</span>
                        </button>

                        <button
                          onClick={() => handlePaymentSelection('Cashfree')}
                          className="w-full group flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all"
                        >
                            <span className="font-semibold text-gray-700 group-hover:text-purple-700">Cashfree</span>
                            <span className="text-gray-300 group-hover:text-purple-500">→</span>
                        </button>

                         <button
                          onClick={() => handlePaymentSelection('Credit')}
                          className="w-full group flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all"
                        >
                            <div className="flex flex-col items-start">
                                <span className="font-semibold text-gray-700 group-hover:text-red-700">Credit (Udhaar)</span>
                                {selectedCustomer && (
                                    <span className="text-xs text-red-500 font-medium">Due: ₹{selectedCustomer.creditBalance?.toLocaleString() || '0'}</span>
                                )}
                            </div>
                            <span className="text-gray-300 group-hover:text-red-500">→</span>
                        </button>

                         <button
                          onClick={() => handlePaymentSelection('Cash')}
                          className="w-full group flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all"
                        >
                            <span className="font-semibold text-gray-700 group-hover:text-green-700">Cash</span>
                            <span className="text-gray-300 group-hover:text-green-500">→</span>
                        </button>
                     </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminPOSOrders;
