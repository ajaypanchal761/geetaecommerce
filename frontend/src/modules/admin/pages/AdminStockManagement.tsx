import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getProducts,
  getCategories,
  deleteProduct,
  updateProduct,
  type Product,
  type Category,
} from "../../../services/api/admin/adminProductService";
import { useAuth } from "../../../context/AuthContext";
import AdminStockBulkEdit from "./AdminStockBulkEdit";

interface ProductVariation {
  id: string;
  productId: string;
  name: string;
  seller: string;
  sellerId: string;
  image: string;
  variation: string;
  stock: number | "Unlimited";
  price: number;
  compareAtPrice: number;
  status: "Published" | "Unpublished";
  category: string;
  categoryId: string;
  publish: boolean;
}

const STATUS_OPTIONS = ["All Products", "Published", "Unpublished"];
const STOCK_OPTIONS = ["All Products", "In Stock", "Out of Stock", "Unlimited"];

export default function AdminStockManagement() {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);
  const [changedProductIds, setChangedProductIds] = useState<Set<string>>(new Set());


  const [filterCategory, setFilterCategory] = useState("All Category");
  const [filterSeller, setFilterSeller] = useState("All Sellers");
  const [filterStatus, setFilterStatus] = useState("All Products");
  const [filterStock, setFilterStock] = useState("All Products");

  // Fetch products and categories
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setHasUnsavedChanges(false);
      setChangedProductIds(new Set());

      // Fetch categories for filter dropdown
      const categoriesResponse = await getCategories();
      if (categoriesResponse.success) {
        setCategories(categoriesResponse.data);
      }

      // Fetch products
      const params: any = {
        limit: 1000, // Fetch all products (increase if you have more than 1000)
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (filterCategory !== "All Category") {
        params.category = filterCategory;
      }

      if (filterStatus !== "All Products") {
        params.publish = filterStatus === "Published";
      }

      const response = await getProducts(params);
      if (response.success) {
        setProducts(response.data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: { data?: { message?: string } };
        };
        setError(
          axiosError.response?.data?.message ||
          "Failed to load products. Please try again."
        );
      } else {
        setError("Failed to load products. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [
    isAuthenticated,
    token,
    searchTerm,
    filterCategory,
    filterStatus,
  ]);

  const handleDelete = async (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await deleteProduct(productId);
        if (response.success || response.message === "Product deleted successfully") {
          alert("Product deleted successfully");
          fetchData();
        } else {
          alert("Failed to delete product");
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("An error occurred while deleting the product");
      }
    }
  };

  const handleEdit = (productId: string) => {
    navigate(`/admin/product/edit/${productId}`);
  };

  // Inline edit handler
  const handleInlineChange = (productId: string, field: string, value: any) => {
    setProducts((prevProducts) => {
        const newProducts = [...prevProducts];
        const productIndex = newProducts.findIndex((p) => p._id === productId);

        if (productIndex !== -1) {
            newProducts[productIndex] = {
                ...newProducts[productIndex],
                [field]: value,
            };
            // Special handling for legacy field 'publish' vs 'status' string if needed,
            // but AdminStockBulkEdit uses 'publish'.
             if (field === 'status') {
                 // If the table passes "Published", we map it to publish=true
                newProducts[productIndex].publish = value === 'Published';
             }
        }
        return newProducts;
    });

    setChangedProductIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(productId);
        return newSet;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    if (changedProductIds.size === 0) return;

    setSavingChanges(true);
    try {
        const promises = Array.from(changedProductIds).map(async (productId) => {
            const product = products.find((p) => p._id === productId);
            if (!product) return;

             // Prepare update data. AdminStockBulkEdit updates:
             // productName, category, compareAtPrice, price, stock, publish.
            const updateData = {
                productName: product.productName,
                category: typeof product.category === 'object' && product.category ? product.category._id : product.category,
                compareAtPrice: product.compareAtPrice,
                price: product.price,
                stock: product.stock,
                publish: product.publish,
            };

            await updateProduct(productId, updateData);
        });

        await Promise.all(promises);
        setChangedProductIds(new Set());
        setHasUnsavedChanges(false);
        alert("Changes saved successfully!");
        fetchData(); // Refresh to ensure sync
    } catch (error) {
        console.error("Failed to save changes:", error);
        alert("Failed to save some changes. Please try again.");
    } finally {
        setSavingChanges(false);
    }
  };


  // Flatten products with variations into individual rows
  const productVariations = useMemo(() => {
    const variations: ProductVariation[] = [];

    products.forEach((product) => {
      // Handle null/undefined category
      let categoryName = "Unknown";
      let categoryId = "";

      if (product.category) {
        if (typeof product.category === "object" && product.category !== null) {
          categoryName = product.category.name || "Unknown";
          categoryId = product.category._id || "";
        } else if (typeof product.category === "string") {
          categoryId = product.category;
          categoryName = categories.find((c) => c._id === product.category)?.name || "Unknown";
        }
      }

      const sellerName =
        typeof product.seller === "object" && product.seller !== null
          ? product.seller.storeName || product.seller.sellerName
          : "Unknown Seller";
      const sellerId = typeof product.seller === "object" ? "" : product.seller || "";

      // If product has variations, create a row for each variation
      if (product.variations && product.variations.length > 0) {
        product.variations.forEach((variation, index) => {
          variations.push({
            id: `${product._id}-${index}`,
            productId: product._id,
            name: product.productName,
            seller: sellerName,
            sellerId: sellerId,
            image: product.mainImage || product.galleryImages[0] || "",
            variation: `${variation.name}: ${variation.value}`,
            stock: variation.stock !== undefined ? variation.stock : product.stock || 0,
            price: product.price, // Using product price as bulk edit does
            compareAtPrice: product.compareAtPrice || 0,
            status: product.publish ? "Published" : "Unpublished",
            publish: product.publish,
            category: categoryName,
            categoryId: categoryId,
          });
        });
      } else {
        // If no variations, create a single row for the product
        variations.push({
          id: product._id,
          productId: product._id,
          name: product.productName,
          seller: sellerName,
          sellerId: sellerId,
          image: product.mainImage || product.galleryImages[0] || "",
          variation: "Default",
          stock: product.stock || 0,
          price: product.price,
          compareAtPrice: product.compareAtPrice || 0,
          status: product.publish ? "Published" : "Unpublished",
          publish: product.publish,
          category: categoryName,
          categoryId: categoryId,
        });
      }
    });

    return variations;
  }, [products, categories]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => (
    <span className="text-neutral-400 text-xs ml-1">
      {sortColumn === column ? (sortDirection === "asc" ? "↑" : "↓") : "⇅"}
    </span>
  );

  // Get unique sellers from products
  const sellers = useMemo(() => {
    const sellerSet = new Set<string>();
    productVariations.forEach((p) => {
      if (p.seller && p.seller !== "Unknown Seller") {
        sellerSet.add(p.seller);
      }
    });
    return ["All Sellers", ...Array.from(sellerSet).sort()];
  }, [productVariations]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return productVariations.filter((product) => {
      const matchesCategory =
        filterCategory === "All Category" ||
        product.categoryId === filterCategory;
      const matchesSeller =
        filterSeller === "All Sellers" || product.seller === filterSeller;
      const matchesStatus =
        filterStatus === "All Products" || product.status === filterStatus;
      const matchesStock =
        filterStock === "All Products" ||
        (filterStock === "Unlimited" && product.stock === "Unlimited") ||
        (filterStock === "In Stock" &&
          product.stock !== "Unlimited" &&
          typeof product.stock === "number" &&
          product.stock > 0) ||
        (filterStock === "Out of Stock" &&
          product.stock !== "Unlimited" &&
          typeof product.stock === "number" &&
          product.stock === 0);
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.seller.toLowerCase().includes(searchTerm.toLowerCase());

      return (
        matchesCategory &&
        matchesSeller &&
        matchesStatus &&
        matchesStock &&
        matchesSearch
      );
    });
  }, [
    productVariations,
    filterCategory,
    filterSeller,
    filterStatus,
    filterStock,
    searchTerm,
  ]);

  // Sort products
  const sortedProducts = useMemo(() => {
    if (!sortColumn) return filteredProducts;

    return [...filteredProducts].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case "id":
          aValue = a.id;
          bValue = b.id;
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "seller":
          aValue = a.seller.toLowerCase();
          bValue = b.seller.toLowerCase();
          break;
        case "variation":
          aValue = a.variation.toLowerCase();
          bValue = b.variation.toLowerCase();
          break;
        case "stock":
          aValue = typeof a.stock === "number" ? a.stock : 999999;
          bValue = typeof b.stock === "number" ? b.stock : 999999;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredProducts, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedProducts.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const displayedProducts = sortedProducts.slice(startIndex, endIndex);

  const handleExport = () => {
    const headers = [
      "Variation Id",
      "Name",
      "Seller",
      "Variation",
      "Stock",
      "Status",
    ];
    const csvContent = [
      headers.join(","),
      ...sortedProducts.map((product) =>
        [
          product.id,
          `"${product.name}"`,
          `"${product.seller}"`,
          `"${product.variation}"`,
          product.stock === "Unlimited" ? "Unlimited" : product.stock,
          product.status,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `stock_management_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Page Content */}
      <div className="flex-1 p-6">
        {/* Main Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          {/* Header */}
          <div className="bg-teal-600 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
            <h2 className="text-lg font-semibold">View Stock Management</h2>
             {hasUnsavedChanges && (
                <button
                    onClick={handleSaveChanges}
                    disabled={savingChanges}
                    className="bg-white text-teal-600 px-4 py-1.5 rounded font-bold text-sm hover:bg-neutral-100 transition-colors shadow-sm flex items-center gap-2"
                >
                    {savingChanges ? "Saving..." : "Save Changes"}
                </button>
             )}
          </div>

          {/* Filters and Controls */}
          <div className="p-4 border-b border-neutral-200">
            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Filter By Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer">
                  <option value="All Category">All Category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Filter by Sellers
                </label>
                <select
                  value={filterSeller}
                  onChange={(e) => {
                    setFilterSeller(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer">
                  {sellers.map((seller) => (
                    <option key={seller} value={seller}>
                      {seller}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Filter by Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer">
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Filter by Stock
                </label>
                <select
                  value={filterStock}
                  onChange={(e) => {
                    setFilterStock(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer">
                  {STOCK_OPTIONS.map((stock) => (
                    <option key={stock} value={stock}>
                      {stock}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-600">Show</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkEdit(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Bulk Edit
                </button>
                <button
                  onClick={handleExport}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors">
                  Export
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs">
                    Search:
                  </span>
                  <input
                    type="text"
                    className="pl-14 pr-3 py-1.5 bg-neutral-100 border-none rounded text-sm focus:ring-1 focus:ring-teal-500 w-48"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder=""
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 text-xs font-bold text-neutral-800 border-b border-neutral-200">
                  <th className="p-4">
                    Variation Id
                  </th>
                  <th className="p-4">
                    Image
                  </th>
                  <th
                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors"
                    onClick={() => handleSort("name")}>
                    <div className="flex items-center">
                      Name <SortIcon column="name" />
                    </div>
                  </th>
                  <th className="p-4 w-32">
                     Category
                  </th>
                  <th className="p-4 w-24">
                     MRP (₹)
                  </th>
                  <th className="p-4 w-24">
                     Price (₹)
                  </th>
                  <th
                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors w-24"
                    onClick={() => handleSort("stock")}>
                    <div className="flex items-center">
                      Stock <SortIcon column="stock" />
                    </div>
                  </th>
                  <th
                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors text-center"
                    onClick={() => handleSort("status")}>
                    <div className="flex items-center justify-center">
                      Status <SortIcon column="status" />
                    </div>
                  </th>
                  <th className="p-4 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-neutral-400">
                      Loading products...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : displayedProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="p-8 text-center text-neutral-400">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700 border-b border-neutral-200">
                      <td className="p-4 align-middle text-xs text-neutral-500">
                        {product.id.slice(-6)}
                      </td>
                       <td className="p-4 align-middle">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 object-cover rounded border border-neutral-200"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="80"%3E%3Crect width="60" height="80" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="10"%3ENo Image%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-neutral-100 rounded flex items-center justify-center text-xs text-neutral-400">
                            No Image
                          </div>
                        )}
                      </td>
                      <td className="p-2 align-middle">
                          <input
                            type="text"
                            className="w-full px-2 py-1 border border-neutral-200 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
                            value={product.name}
                            onChange={(e) => handleInlineChange(product.productId, 'productName', e.target.value)}
                          />
                           <div className="text-xs text-neutral-400 mt-1">{product.variation !== "Default" ? product.variation : ""}</div>
                      </td>
                      <td className="p-2 align-middle">
                        <select
                           className="w-full px-2 py-1 border border-neutral-200 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm"
                           value={product.categoryId}
                           onChange={(e) => handleInlineChange(product.productId, 'category', e.target.value)}
                        >
                            <option value="">Select</option>
                            {categories.map(c => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                        </select>
                      </td>
                      <td className="p-2 align-middle">
                          <input
                            type="number"
                            className="w-full px-2 py-1 border border-neutral-200 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm text-right"
                            value={product.compareAtPrice}
                            onChange={(e) => handleInlineChange(product.productId, 'compareAtPrice', parseFloat(e.target.value) || 0)}
                          />
                      </td>
                      <td className="p-2 align-middle">
                          <input
                            type="number"
                            className="w-full px-2 py-1 border border-neutral-200 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm text-right font-medium"
                            value={product.price}
                            onChange={(e) => handleInlineChange(product.productId, 'price', parseFloat(e.target.value) || 0)}
                          />
                      </td>
                      <td className="p-2 align-middle">
                          <input
                            type="number"
                            className="w-full px-2 py-1 border border-neutral-200 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-sm text-right"
                            value={product.stock === "Unlimited" ? 0 : product.stock}
                            onChange={(e) => handleInlineChange(product.productId, 'stock', parseInt(e.target.value) || 0)}
                          />
                      </td>
                      <td className="p-4 align-middle text-center">
                        <label className="inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={product.publish}
                                className="sr-only peer"
                                onChange={(e) => handleInlineChange(product.productId, 'publish', e.target.checked)}
                            />
                            <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                        </label>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(product.productId)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Details">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(product.productId)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="text-xs sm:text-sm text-neutral-700">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, sortedProducts.length)} of{" "}
              {sortedProducts.length} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`p-2 border border-teal-600 rounded ${currentPage === 1
                  ? "text-neutral-400 cursor-not-allowed bg-neutral-50"
                  : "text-teal-600 hover:bg-teal-50"
                  }`}
                aria-label="Previous page">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button className="px-3 py-1.5 border border-teal-600 bg-teal-600 text-white rounded font-medium text-sm">
                {currentPage}
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className={`p-2 border border-teal-600 rounded ${currentPage === totalPages
                  ? "text-neutral-400 cursor-not-allowed bg-neutral-50"
                  : "text-teal-600 hover:bg-teal-50"
                  }`}
                aria-label="Next page">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M9 18L15 12L9 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-sm text-neutral-600 border-t border-neutral-200 bg-white">
        Copyright © 2025. Developed By{" "}
        <a href="#" className="text-blue-600 hover:underline">
          Geeta Stores - 10 Minute App
        </a>
      </footer>


      {showBulkEdit && (
        <AdminStockBulkEdit
          products={products}
          categories={categories}
          onClose={() => setShowBulkEdit(false)}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
