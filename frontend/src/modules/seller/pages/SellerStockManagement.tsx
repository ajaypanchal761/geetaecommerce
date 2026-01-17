import { useState, useEffect } from 'react';
import { getProducts, updateStock, Product } from '../../../services/api/productService';
import { getCategories } from '../../../services/api/categoryService';
import { useAuth } from '../../../context/AuthContext';
import ThemedDropdown from '../components/ThemedDropdown';
import QRScannerModal from '../../../components/QRScannerModal';

interface StockItem {
    variationId: string;
    productId: string;
    name: string;
    seller: string;
    image: string;
    variation: string;
    stock: number | 'Unlimited';
    status: 'Published' | 'Unpublished';
    category: string;
}

export default function SellerStockManagement() {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [updatingStock, setUpdatingStock] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All Category');
    const [statusFilter, setStatusFilter] = useState('All Products');
    const [stockFilter, setStockFilter] = useState('All Products');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [categories, setCategories] = useState<string[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [showScanner, setShowScanner] = useState(false);
    const { user } = useAuth();

    // Fetch categories for filter
    useEffect(() => {
        const fetchCats = async () => {
            try {
                const res = await getCategories();
                if (res.success) {
                    setCategories(res.data.map(cat => cat.name));
                }
            } catch (err) {
                console.error("Error fetching categories:", err);
            }
        };
        fetchCats();
    }, []);

    const handleScan = (decodedText: string) => {
        setSearchTerm(decodedText);
        setShowScanner(false);
    };

    // Helper to resolve image URL
    const resolveImageUrl = (url: string | undefined) => {
        if (!url) return '/assets/product-placeholder.jpg';
        if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;

        // Handle relative paths
        const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";
        try {
            const urlObj = new URL(apiBase);
            const origin = urlObj.origin;
            const cleanUrl = url.replace(/\\/g, '/'); // Fix windows backslashes
            return `${origin}/${cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl}`;
        } catch (e) {
            return url;
        }
    };

    // Fetch products and convert to stock items
    useEffect(() => {
        const fetchStockItems = async () => {
            setLoading(true);
            setError('');
            try {
                const params: any = {
                    page: currentPage,
                    limit: rowsPerPage,
                };

                if (categoryFilter !== 'All Category') {
                    params.category = categoryFilter;
                }
                if (statusFilter === 'Published') {
                    params.status = 'published';
                } else if (statusFilter === 'Unpublished') {
                    params.status = 'unpublished';
                }

                const response = await getProducts(params);
                if (response.success && response.data) {
                    // Convert products to stock items
                    const items: StockItem[] = [];
                    response.data.forEach((product: Product) => {
                        product.variations.forEach((variation, index) => {
                            items.push({
                                variationId: variation._id || `${product._id}-${index}`,
                                productId: product._id,
                                name: product.productName,
                                seller: user?.storeName || '',
                                image: resolveImageUrl(product.mainImage || product.mainImageUrl),
                                variation: variation.title || variation.value || variation.name || 'Default',
                                stock: variation.stock,
                                status: product.publish ? 'Published' : 'Unpublished',
                                category: (product.category as any)?.name || 'Uncategorized',
                            });
                        });
                    });
                    setStockItems(items);
                    if ((response as any).pagination) {
                        setTotalPages((response as any).pagination.pages);
                    }
                } else {
                    setError(response.message || 'Failed to fetch stock items');
                }
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch stock items');
            } finally {
                setLoading(false);
            }
        };

        fetchStockItems();

        // Implement real-time updates by polling every 30 seconds
        const intervalId = setInterval(fetchStockItems, 30000);

        return () => clearInterval(intervalId);
    }, [currentPage, rowsPerPage, categoryFilter, statusFilter, user]);

    // Handle stock update
    const handleStockUpdate = async (productId: string, variationId: string, newStock: number) => {
        setUpdatingStock(variationId);
        try {
            const response = await updateStock(productId, variationId, newStock);
            if (response.success) {
                // Update local state
                setStockItems(prev => prev.map(item =>
                    item.variationId === variationId
                        ? { ...item, stock: newStock }
                        : item
                ));
            } else {
                alert(response.message || 'Failed to update stock');
            }
        } catch (err: any) {
            alert(err.response?.data?.message || err.message || 'Failed to update stock');
        } finally {
            setUpdatingStock(null);
        }
    };

    // Filter items
    let filteredItems = stockItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.seller.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All Category' || item.category === categoryFilter;
        const matchesStatus = statusFilter === 'All Products' ||
            (statusFilter === 'Published' && item.status === 'Published') ||
            (statusFilter === 'Unpublished' && item.status === 'Unpublished');
        const matchesStock = stockFilter === 'All Products' ||
            (stockFilter === 'In Stock' && (typeof item.stock === 'number' && item.stock > 0)) ||
            (stockFilter === 'Out of Stock' && item.stock === 0);
        return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });

    // Sort items
    if (sortColumn) {
        filteredItems.sort((a, b) => {
            let aVal: any = a[sortColumn as keyof typeof a];
            let bVal: any = b[sortColumn as keyof typeof b];
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            if (sortColumn === 'stock') {
                // Stock is now always a number
                aVal = Number(aVal);
                bVal = Number(bVal);
            }
            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ column }: { column: string }) => (
        <span className="text-neutral-300 text-[10px]">
            {sortColumn === column ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
        </span>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">Stock Management</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Monitor and update your product inventory
                    </p>
                </div>
                <div className="text-sm font-medium text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
                    Dashboard / Stock
                </div>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 flex-1 flex flex-col overflow-hidden">

                {/* Filters and Controls */}
                <div className="p-5 border-b border-neutral-100 bg-white">
                    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">

                        {/* Filter Group */}
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            <div className="w-full sm:w-48">
                                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                                    Category
                                </label>
                                <ThemedDropdown
                                    options={['All Category', ...categories]}
                                    value={categoryFilter}
                                    onChange={setCategoryFilter}
                                />
                            </div>
                            <div className="w-full sm:w-40">
                                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                                    Status
                                </label>
                                <ThemedDropdown
                                    options={['All Products', 'Published', 'Unpublished']}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                />
                            </div>
                            <div className="w-full sm:w-40">
                                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                                    Stock
                                </label>
                                <ThemedDropdown
                                    options={['All Products', 'In Stock', 'Out of Stock']}
                                    value={stockFilter}
                                    onChange={setStockFilter}
                                />
                            </div>
                        </div>

                        {/* Actions Group */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                             <div className="w-24">
                                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                                    Show
                                </label>
                                <ThemedDropdown
                                    options={[10, 20, 50, 100]}
                                    value={rowsPerPage}
                                    onChange={(val) => setRowsPerPage(Number(val))}
                                />
                            </div>

                            <div className="flex-1 sm:w-64">
                                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                                    Search
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-neutral-400 group-focus-within:text-teal-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-lg text-sm placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Name, Seller, SKU..."
                                    />
                                    <button
                                        onClick={() => setShowScanner(true)}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-teal-600 bg-teal-50 hover:bg-teal-100 hover:text-teal-700 transition-colors border-l border-neutral-200 rounded-r-lg"
                                        title="Scan Barcode"
                                    >
                                         <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                                            <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                                            <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                                            <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                                            <line x1="12" y1="3" x2="12" y2="21"></line>
                                         </svg>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    const headers = ['Variation Id', 'Product Id', 'Product Name', 'Seller Name', 'Variation', 'Current Stock', 'Status', 'Category'];
                                    const csvContent = [
                                        headers.join(','),
                                        ...filteredItems.map(item => [
                                            item.variationId,
                                            item.productId,
                                            `"${item.name}"`,
                                            `"${item.seller}"`,
                                            `"${item.variation}"`,
                                            item.stock,
                                            item.status,
                                            `"${item.category}"`
                                        ].join(','))
                                    ].join('\n');
                                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                    const link = document.createElement('a');
                                    const url = URL.createObjectURL(blob);
                                    link.setAttribute('href', url);
                                    link.setAttribute('download', `stock_${new Date().toISOString().split('T')[0]}.csv`);
                                    link.style.visibility = 'hidden';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                                className="h-[42px] px-4 bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm whitespace-nowrap"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                Export CSV
                            </button>
                        </div>
                        {/* Scanner Modal */}
                        {showScanner && (
                            <QRScannerModal
                                onScanSuccess={handleScan}
                                onClose={() => setShowScanner(false)}
                            />
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neutral-50/50 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                                <th
                                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors whitespace-nowrap"
                                    onClick={() => handleSort('variationId')}
                                >
                                    <div className="flex items-center gap-1">
                                        Var. ID <SortIcon column="variationId" />
                                    </div>
                                </th>
                                <th
                                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors whitespace-nowrap"
                                    onClick={() => handleSort('productId')}
                                >
                                    <div className="flex items-center gap-1">
                                        Prod. ID <SortIcon column="productId" />
                                    </div>
                                </th>
                                <th
                                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Product Name <SortIcon column="name" />
                                    </div>
                                </th>
                                <th
                                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors whitespace-nowrap"
                                    onClick={() => handleSort('seller')}
                                >
                                    <div className="flex items-center gap-1">
                                        Seller <SortIcon column="seller" />
                                    </div>
                                </th>
                                <th className="p-4 text-center">
                                    Image
                                </th>
                                <th
                                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors whitespace-nowrap"
                                    onClick={() => handleSort('variation')}
                                >
                                    <div className="flex items-center gap-1">
                                        Variation <SortIcon column="variation" />
                                    </div>
                                </th>
                                <th
                                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors whitespace-nowrap text-center"
                                    onClick={() => handleSort('stock')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Current Stock <SortIcon column="stock" />
                                    </div>
                                </th>
                                <th className="p-4 text-center whitespace-nowrap w-32">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {filteredItems.map((item) => (
                                <tr key={item.variationId} className="hover:bg-teal-50/30 transition-colors text-sm text-neutral-700 group">
                                    <td className="p-4 align-middle text-xs text-neutral-500">
                                        <span title={item.variationId} className="truncate max-w-[80px] inline-block">
                                            {item.variationId.substring(0, 10)}...
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-xs text-neutral-500">
                                         <span title={item.productId} className="truncate max-w-[80px] inline-block">
                                            {item.productId.substring(0, 10)}...
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle font-medium text-neutral-800">{item.name}</td>
                                    <td className="p-4 align-middle text-neutral-600">{item.seller}</td>
                                    <td className="p-4 align-middle text-center">
                                        <div className="w-12 h-12 bg-white border border-neutral-100 rounded-lg p-1 mx-auto shadow-sm flex items-center justify-center">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="max-w-full max-h-full object-contain rounded"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/60x40?text=Img';
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                            {item.variation}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-center">
                                         <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${item.stock === 0
                                                ? 'bg-red-50 text-red-600 border border-red-100'
                                                : (typeof item.stock === 'number' && item.stock < 10)
                                                    ? 'bg-amber-50 text-amber-600 border border-amber-100' // Low stock warning
                                                    : 'bg-green-50 text-green-600 border border-green-100'
                                                }`}>
                                                {item.stock} Units
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center justify-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                defaultValue={item.stock}
                                                className="w-20 px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = parseInt((e.target as HTMLInputElement).value);
                                                        if (!isNaN(val)) {
                                                            handleStockUpdate(item.productId, item.variationId, val);
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                disabled={updatingStock === item.variationId}
                                                onClick={(e) => {
                                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                                    const val = parseInt(input.value);
                                                    if (!isNaN(val)) {
                                                        handleStockUpdate(item.productId, item.variationId, val);
                                                    }
                                                }}
                                                className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-neutral-300 shadow-sm"
                                                title="Update Stock"
                                            >
                                                {updatingStock === item.variationId ? (
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                        <polyline points="7 3 7 8 15 8"></polyline>
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr>
                                     <td colSpan={8} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-neutral-400">
                                            <svg className="w-12 h-12 mb-3 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                            <p className="text-base font-medium text-neutral-600">No stock items found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-50/30">
                    <div className="text-sm text-neutral-500 font-medium">
                        Showing <span className="text-neutral-800 font-semibold">{(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, filteredItems.length)}</span> of <span className="text-neutral-800 font-semibold">{filteredItems.length}</span> items
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-lg border transition-all ${currentPage === 1
                                ? 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                                : 'border-neutral-300 text-neutral-600 hover:bg-white hover:border-teal-500 hover:text-teal-600 shadow-sm'
                                }`}
                            aria-label="Previous page"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18L9 12L15 6" />
                            </svg>
                        </button>
                         <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                     className={`min-w-[36px] h-[36px] flex items-center justify-center rounded-lg text-sm font-medium transition-all ${
                                        currentPage === page
                                            ? "bg-teal-600 text-white shadow-md shadow-teal-200"
                                            : "text-neutral-600 hover:bg-neutral-100"
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                              {totalPages > 5 && <span className="text-neutral-400 px-1">...</span>}
                        </div>
                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-lg border transition-all ${currentPage === totalPages
                                ? 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                                : 'border-neutral-300 text-neutral-600 hover:bg-white hover:border-teal-500 hover:text-teal-600 shadow-sm'
                                }`}
                            aria-label="Next page"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18L15 12L9 6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
