import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getMockCustomer,
    addMockCredit,
    addMockPayment,
    MockCustomer,
    MockTransaction
} from '../../../services/mockPOSService';
import { useToast } from '../../../context/ToastContext';

const AdminPOSCustomerDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [customer, setCustomer] = useState<MockCustomer | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);

    // Form States
    const dateNow = new Date().toISOString().split('T')[0];
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(dateNow);
    const [note, setNote] = useState('');
    const [paymentMode, setPaymentMode] = useState('Cash');

    useEffect(() => {
        loadCustomer();
    }, [id]);

    const loadCustomer = () => {
        if (!id) return;
        const data = getMockCustomer(id);
        if (data) {
            setCustomer({ ...data }); // Clone to trigger re-render
        } else {
            showToast("Customer not found", "error");
            navigate('/admin/pos/customers');
        }
    };

    const handleSavePayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer) return;

        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            showToast("Enter valid amount", "error");
            return;
        }

        addMockPayment(customer.id, val, paymentMode, note, date);
        showToast("Payment recorded", "success");
        setShowPaymentModal(false);
        resetForms();
        loadCustomer();
    };

    const handleSaveCredit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer) return;

        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            showToast("Enter valid amount", "error");
            return;
        }

        addMockCredit(customer.id, val, note || 'Manual Credit', date);
        showToast("Credit added", "success");
        setShowCreditModal(false);
        resetForms();
        loadCustomer();
    };

    const resetForms = () => {
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setNote('');
        setPaymentMode('Cash');
    };

    if (!customer) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans mb-10 pb-20">
            {/* Header */}
            <div className="bg-white px-4 py-4 shadow-sm sticky top-0 z-20 flex items-center justify-between border-b border-gray-100">
                 <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/admin/pos/customers')} className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-gray-900 leading-tight">{customer.name}</h1>
                        <p className="text-xs text-gray-500 font-medium">{customer.phone}</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                 </div>
            </div>

            <div className="max-w-xl mx-auto w-full">
                {/* Balance Card */}
                <div className="m-4 mt-6">
                    <div className={`relative overflow-hidden rounded-2xl p-6 shadow-lg ${customer.balance > 0 ? 'bg-gradient-to-br from-red-500 to-pink-600 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'}`}>
                        <div className="relative z-10 flex flex-col items-center justify-center text-center">
                            <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">Total Balance Due</p>
                            <h2 className="text-5xl font-bold mb-1 tracking-tight">
                                ₹{customer.balance.toLocaleString()}
                            </h2>
                            <p className="text-white/90 text-sm mt-2 font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                {customer.balance > 0 ? 'Amount to Collect' : 'No Payment Due'}
                            </p>
                        </div>
                        {/* Decor circles */}
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-black/10 blur-xl"></div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 px-4 mb-8">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                        </div>
                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Total Credit</p>
                        <p className="text-lg font-bold text-gray-800 mt-0.5">₹{customer.totalCredit.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500 mb-2">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                        </div>
                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Total Paid</p>
                        <p className="text-lg font-bold text-gray-800 mt-0.5">₹{customer.totalPaid.toLocaleString()}</p>
                    </div>
                </div>

                {/* Recent Orders Section */}
                <div className="px-4 mb-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-800">Recent Orders</h3>
                        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">View All</button>
                    </div>

                    <div className="space-y-3">
                        {customer.orders.length === 0 ? (
                            <div className="text-gray-400 text-sm text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">No orders placed yet</div>
                        ) : (
                            customer.orders.slice(0, 3).map(order => (
                                <div key={order.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-4 transition-transform active:scale-[0.99]">
                                     {/* Image(s) */}
                                     <div className="flex gap-1 flex-wrap w-16 h-16 content-start flex-shrink-0">
                                        {order.images && order.images.length > 0 ? (
                                            <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 relative shadow-sm">
                                                 <img src={order.images[0]} alt="Product" className="w-full h-full object-cover" />
                                                 {order.images.length > 1 && (
                                                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold backdrop-blur-[1px]">
                                                         +{order.images.length - 1}
                                                     </div>
                                                 )}
                                            </div>
                                        ) : (
                                            <div className="w-16 h-16 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center text-gray-300">
                                                <svg className="w-6 h-6 opacity-30" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                        )}
                                     </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div>
                                                <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium tracking-wide">#{order.id.slice(-6).toUpperCase()}</span>
                                                <p className="text-[11px] text-gray-400 mt-1.5 font-medium">{order.date}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${order.paymentType === 'Credit' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                    {order.paymentType}
                                                </span>
                                                <p className="font-bold text-gray-900 mt-1">₹{order.amount}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-2 line-clamp-1 font-medium bg-gray-50 px-2 py-1 rounded-lg inline-block max-w-full truncate">
                                            {order.itemsString}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="border-t border-gray-100 my-8 mx-4"></div>

                {/* Ledger Section */}
                <div className="px-4 pb-4">
                     <h3 className="text-base font-bold text-gray-800 mb-4">Transaction History</h3>

                     <div className="relative border-l-2 border-gray-100 ml-3.5 space-y-6 pb-4">
                        {customer.transactions.length === 0 ? (
                             <div className="ml-8 text-gray-400 text-sm italic">No entries yet</div>
                        ) : (
                            customer.transactions.map((txn, idx) => (
                                <div key={txn.id || idx} className="relative ml-8">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[41px] top-1 w-5 h-5 rounded-full border-4 border-white shadow-sm ${txn.type === 'PAYMENT' ? 'bg-green-500' : 'bg-red-500'}`}></div>

                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${txn.type === 'PAYMENT' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {txn.type === 'PAYMENT' ? 'Received' : 'Given'}
                                                </span>
                                                <span className="text-xs text-gray-400 font-medium">{txn.date}</span>
                                            </div>
                                            <span className={`text-lg font-bold ${txn.type === 'PAYMENT' ? 'text-green-600' : 'text-red-600'}`}>
                                                {txn.type === 'PAYMENT' ? '-' : '+'} ₹{txn.amount.toLocaleString()}
                                            </span>
                                        </div>
                                        {(txn.note || txn.paymentMode) && (
                                            <div className="bg-gray-50 rounded-lg p-2.5 mt-2 flex justify-between items-end">
                                                <p className="text-xs text-gray-600 italic leading-relaxed max-w-[70%]">
                                                    {txn.note || "No notes"}
                                                </p>
                                                {txn.paymentMode && (
                                                    <span className="text-[10px] font-bold bg-white border border-gray-200 px-2 py-1 rounded text-gray-500 uppercase">
                                                        {txn.paymentMode}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                     </div>
                </div>
            </div>

            {/* Bottom Floating Actions */}
            <div className={`fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] flex gap-3 z-30 transition-transform duration-300`}>
                <button
                    onClick={() => { resetForms(); setShowCreditModal(true); }}
                    className="flex-1 bg-red-50 border border-red-100 text-red-600 font-bold py-3.5 rounded-xl hover:bg-red-100 active:bg-red-200 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add Credit
                </button>
                <button
                    onClick={() => { resetForms(); setShowPaymentModal(true); }}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    Accept Payment
                </button>
            </div>

            {/* --- MODALS --- */}

            {/* Payment Modal - Select Payment Method Style */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden slide-in-from-bottom-5">
                        {/* Header */}
                        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg">Select Payment Method</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 pt-8 pb-8">
                            {/* Amount Display/Input */}
                            <div className="text-center mb-8">
                                <p className="text-gray-500 text-sm font-medium mb-1">Total Amount</p>
                                <div className="flex items-center justify-center relative">
                                    <span className="text-4xl font-bold text-gray-900 mr-1">₹</span>
                                    <input
                                        type="number" required min="1"
                                        className="w-32 text-center text-4xl font-bold text-gray-900 outline-none bg-transparent placeholder-gray-300 p-0 m-0"
                                        placeholder="0"
                                        value={amount} onChange={e => setAmount(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Method List */}
                            <div className="space-y-3">
                                {[
                                    { name: 'Razorpay', icon: null },
                                    { name: 'Cashfree', icon: null },
                                    { name: 'Cash', icon: null }
                                ].map((mode) => (
                                    <button
                                        key={mode.name}
                                        onClick={() => {
                                            setPaymentMode(mode.name);
                                            if(!amount || parseFloat(amount) <= 0) {
                                                 showToast("Please enter a valid amount", "error");
                                                 return;
                                            }
                                            addMockPayment(customer.id, parseFloat(amount), mode.name, note, date);
                                            showToast("Payment recorded", "success");
                                            setShowPaymentModal(false);
                                            resetForms();
                                            loadCustomer();
                                        }}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-6 py-4 flex justify-between items-center hover:border-gray-300 hover:shadow-sm active:bg-gray-50 transition-all group"
                                    >
                                        <span className="font-bold text-gray-700 text-base group-hover:text-gray-900">{mode.name}</span>
                                        <span className="text-gray-300 group-hover:text-gray-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Credit Modal */}
            {showCreditModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden slide-in-from-bottom-5">
                         <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-white text-center">
                            <h3 className="text-xl font-bold">Add Credit</h3>
                            <p className="text-white/80 text-sm mt-1">Increase customer balance manualy</p>
                        </div>
                        <form onSubmit={handleSaveCredit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Credit Amount</label>
                                <div className="relative">
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">₹</span>
                                    <input
                                        type="number" required min="1"
                                        className="w-full pl-8 text-4xl font-bold border-b border-gray-200 focus:border-red-500 outline-none perm-marker-font text-gray-800 placeholder-gray-200 py-2 bg-transparent"
                                        placeholder="0"
                                        value={amount} onChange={e => setAmount(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Reason / Note</label>
                                <textarea
                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-red-100 resize-none"
                                    rows={2} required
                                    value={note} onChange={e => setNote(e.target.value)}
                                    placeholder="Why are you adding this credit?"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</label>
                                <input type="date" required className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-red-100" value={date} onChange={e => setDate(e.target.value)} />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreditModal(false)} className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-[2] bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black shadow-lg hover:shadow-xl transition-all">
                                    Add Credit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPOSCustomerDetail;
