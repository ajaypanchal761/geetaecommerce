import React, { useState, useEffect, useMemo } from "react";
import {
  Product,
  Category,
  updateProduct,
} from "../../../services/api/admin/adminProductService";

interface AdminStockBulkEditProps {
  products: Product[];
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

interface EditableProduct {
  id: string;
  original: Product;
  productName: string;
  categoryId: string;
  compareAtPrice: number;
  price: number;
  stock: number;
  publish: boolean;
  isChanged: boolean;
}

export default function AdminStockBulkEdit({
  products,
  categories,
  onClose,
  onSave,
}: AdminStockBulkEditProps) {
  const [editableProducts, setEditableProducts] = useState<EditableProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize editable products
  useEffect(() => {
    const initialized = products.map((p) => {
      let categoryId = "";
      if (p.category) {
         if (typeof p.category === "object" && p.category !== null) {
          categoryId = p.category._id || "";
        } else if (typeof p.category === "string") {
          categoryId = p.category;
        }
      }

      return {
        id: p._id,
        original: p,
        productName: p.productName,
        categoryId: categoryId,
        compareAtPrice: p.compareAtPrice || 0,
        price: p.price,
        stock: p.stock,
        publish: p.publish,
        isChanged: false,
      };
    });
    setEditableProducts(initialized);
  }, [products]);

  const handleFieldChange = (
    index: number,
    field: keyof EditableProduct,
    value: any
  ) => {
    setEditableProducts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value, isChanged: true };
      return updated;
    });
  };

  const handleSave = async () => {
    const changedProducts = editableProducts.filter((p) => p.isChanged);
    if (changedProducts.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const updatePromises = changedProducts.map((p) =>
        updateProduct(p.id, {
          productName: p.productName,
          category: p.categoryId,
          compareAtPrice: p.compareAtPrice,
          price: p.price,
          stock: p.stock,
          publish: p.publish,
        })
      );

      await Promise.all(updatePromises);
      onSave(); // Trigger refresh in parent
      onClose();
    } catch (error) {
      console.error("Failed to save bulk edits", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
     return editableProducts.filter(p => p.productName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [editableProducts, searchTerm]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-teal-600 text-white rounded-t-lg">
          <h2 className="text-lg font-semibold">Bulk Edit Products</h2>
          <div className="flex items-center gap-2">
             <input
                type="text"
                placeholder="Search products..."
                className="px-3 py-1 text-sm text-black rounded border-none focus:ring-2 focus:ring-teal-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
            <button
              onClick={onClose}
              className="text-white hover:bg-teal-700 p-2 rounded transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Content (Spreadsheet) */}
        <div className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-12 text-center">
                  #
                </th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 min-w-[200px]">
                  Product Name
                </th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 min-w-[150px]">
                  Category
                </th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24">
                  MRP
                </th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24">
                  Selling Price
                </th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24">
                  Stock
                </th>
                <th className="p-3 border-b border-neutral-300 text-xs font-bold text-neutral-700 w-32 text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => {
                 // Find original index in editableProducts to update correctly if we didn't use id-based update
                 // Actually we can map back or just pass the id.
                 // Better: update editableProducts based on id.
                 const originalIndex = editableProducts.findIndex(p => p.id === product.id);

                return (
                <tr
                  key={product.id}
                  className={`border-b border-neutral-200 hover:bg-neutral-50 ${
                    product.isChanged ? "bg-yellow-50" : ""
                  }`}
                >
                  <td className="p-2 border-r border-neutral-200 text-center text-xs text-neutral-500">
                    {index + 1}
                  </td>
                  <td className="p-0 border-r border-neutral-200">
                    <input
                      type="text"
                      className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-sm"
                      value={product.productName}
                      onChange={(e) =>
                        handleFieldChange(originalIndex, "productName", e.target.value)
                      }
                    />
                  </td>
                  <td className="p-0 border-r border-neutral-200">
                    <select
                      className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-sm cursor-pointer"
                      value={product.categoryId}
                      onChange={(e) =>
                        handleFieldChange(originalIndex, "categoryId", e.target.value)
                      }
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-0 border-r border-neutral-200">
                    <input
                      type="number"
                      className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-sm text-right"
                      value={product.compareAtPrice}
                      onChange={(e) =>
                        handleFieldChange(
                          originalIndex,
                          "compareAtPrice",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </td>
                  <td className="p-0 border-r border-neutral-200">
                    <input
                      type="number"
                      className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-sm text-right font-medium"
                      value={product.price}
                      onChange={(e) =>
                        handleFieldChange(
                          originalIndex,
                          "price",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </td>
                  <td className="p-0 border-r border-neutral-200">
                    <input
                      type="number"
                      className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-sm text-right"
                      value={product.stock}
                      onChange={(e) =>
                        handleFieldChange(
                          originalIndex,
                          "stock",
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                  </td>
                  <td className="p-2 text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={product.publish}
                        onChange={(e) =>
                          handleFieldChange(originalIndex, "publish", e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-teal-600"></div>
                      <span className="ms-2 text-xs font-medium text-gray-900">
                        {product.publish ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-neutral-500">
              No products found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex justify-end gap-3 bg-neutral-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 rounded text-neutral-700 text-sm hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editableProducts.some((p) => p.isChanged)}
            className={`px-4 py-2 rounded text-white text-sm flex items-center gap-2 ${
              saving || !editableProducts.some((p) => p.isChanged)
                ? "bg-neutral-400 cursor-not-allowed"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
