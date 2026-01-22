import React, { useState, useEffect, useMemo } from "react";
import {
  Product,
  Category,
  updateProduct,
  uploadImage,
  getSubCategories,
  getBrands,
  SubCategory,
  Brand,
} from "../../../services/api/admin/adminProductService";

interface AdminStockBulkEditProps {
  products: Product[];
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

interface ProductImage {
  id: string;
  url: string;
  file?: File;
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
  images: ProductImage[];
  isChanged: boolean;
  // New fields
  itemCode: string; // SKU
  rackNumber: string;
  description: string;
  barcode: string;
  hsnCode: string;
  pack: string; // Unit
  purchasePrice: number;
  deliveryTime: string;
  lowStockQuantity: number;
  subCategoryId?: string; // Add this
  // Read-only/Display fields (not editable in bulk edit for now or just text)
  subSubCategory: string;
  brand: string; // Display name
  brandId: string; // ID for editing
  tax: string;
  offerPrice: number;
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

  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [subRes, brandRes] = await Promise.all([
                getSubCategories({ limit: 1000 } as any),
                getBrands()
            ]);
            if(subRes.success && subRes.data) setSubCategories(subRes.data);
            if(brandRes.success && brandRes.data) setBrands(brandRes.data);
        } catch (e) {
            console.error("Failed to load metadata for bulk edit", e);
        }
    };
    fetchData();
  }, []);

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

      let subCategoryId = "";
      if (p.subcategory) {
          if (typeof p.subcategory === 'object' && p.subcategory !== null) {
              subCategoryId = p.subcategory._id;
          } else if (typeof p.subcategory === 'string') {
              subCategoryId = p.subcategory;
          }
      }

      let brandId = "";
      if (p.brand) {
          if (typeof p.brand === 'object' && p.brand !== null) {
              brandId = p.brand._id;
          } else if (typeof p.brand === 'string') {
              brandId = p.brand;
          }
      }

      const images: ProductImage[] = [];
      if (p.mainImage) {
        images.push({ id: `main-${p._id}`, url: p.mainImage });
      }
      if (p.galleryImages && p.galleryImages.length > 0) {
        p.galleryImages.forEach((url, i) => {
           images.push({ id: `gal-${p._id}-${i}`, url });
        });
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
        // New fields initialization
        itemCode: (p as any).itemCode || p.sku || "",
        rackNumber: (p as any).rackNumber || "",
        description: p.smallDescription || p.description || "",
        barcode: (p as any).barcode || "",
        hsnCode: (p as any).hsnCode || "",
        pack: (p as any).pack || "",
        purchasePrice: (p as any).purchasePrice || 0,
        deliveryTime: (p as any).deliveryTime || "",
        lowStockQuantity: (p as any).lowStockQuantity || 5,
        subSubCategory: (p as any).subSubCategory || "",
        subCategoryId: subCategoryId, // Add this
        brand: typeof p.brand === "object" ? (p.brand as any).name : "-",
        brandId: brandId,
        tax: p.tax || "",
        offerPrice: p.discPrice || 0,
        images: images,
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

  const handleImageChange = (index: number, files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newImages: ProductImage[] = Array.from(files).map((f) => ({
        id: URL.createObjectURL(f),
        url: URL.createObjectURL(f),
        file: f,
      }));

      setEditableProducts((prev) => {
          const updated = [...prev];
          const currentProduct = updated[index];

          updated[index] = {
              ...currentProduct,
              images: [...currentProduct.images, ...newImages],
              isChanged: true
          };

          return updated;
      });
  };

  const handleRemoveImage = (productIndex: number, imageId: string) => {
    setEditableProducts((prev) => {
      const updated = [...prev];
      const currentProduct = updated[productIndex];

      updated[productIndex] = {
        ...currentProduct,
        images: currentProduct.images.filter((img) => img.id !== imageId),
        isChanged: true,
      };

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
      const updatePromises = changedProducts.map(async (p) => {
        const finalImages: string[] = [];

        // Upload new images and collect all URLs
        for (const img of p.images) {
          if (img.file) {
            try {
              const uploadRes = await uploadImage(img.file);
              if (uploadRes.success) {
                finalImages.push(uploadRes.data.url);
              }
            } catch (err) {
              console.error("Failed to upload image", err);
            }
          } else {
            finalImages.push(img.url);
          }
        }

        const mainImage = finalImages.length > 0 ? finalImages[0] : "";
        const galleryImages = finalImages.length > 1 ? finalImages.slice(1) : [];

        return updateProduct(p.id, {
          productName: p.productName,
          category: p.categoryId,
          compareAtPrice: p.compareAtPrice,
          price: p.price,
          stock: p.stock,
          publish: p.publish,
          mainImage: mainImage,
          galleryImages: galleryImages,
          // New fields update
          sku: p.itemCode, // mapped to sku
          itemCode: p.itemCode,
          rackNumber: p.rackNumber,
          smallDescription: p.description, // using smallDescription as primary desc
          description: p.description,
          barcode: p.barcode,
          hsnCode: p.hsnCode,
          pack: p.pack,
          purchasePrice: p.purchasePrice,
          deliveryTime: p.deliveryTime,
          lowStockQuantity: p.lowStockQuantity,
          subcategory: p.subCategoryId,
          subSubCategory: p.subSubCategory,
          brand: p.brandId,
          tax: p.tax,
          discPrice: p.offerPrice,
        } as any);
      });

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

  const [categorySearch, setCategorySearch] = useState("");

  const filteredProducts = useMemo(() => {
     return editableProducts.filter(p => {
        const nameMatch = p.productName.toLowerCase().includes(searchTerm.toLowerCase());

        // Resolve category name for filtering
        const catName = categories.find(c => c._id === p.categoryId)?.name || "";
        const catMatch = catName.toLowerCase().includes(categorySearch.toLowerCase());

        return nameMatch && catMatch;
     });
  }, [editableProducts, searchTerm, categorySearch, categories]);

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
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 min-w-[140px] text-center">
                  Image
                </th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 min-w-[200px] whitespace-nowrap">4. Product Name</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 min-w-[150px] whitespace-nowrap align-top">
                  <div className="flex flex-col gap-2">
                    <span>1. Category</span>
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full text-[11px] px-2 py-1 border border-gray-300 rounded font-normal focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-32 whitespace-nowrap">2. Sub Cat</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-32 whitespace-nowrap">3. Sub Sub Cat</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-32 whitespace-nowrap">5. SKU</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">6. Rack</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-32 whitespace-nowrap">7. Desc</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-32 whitespace-nowrap">8. Barcode</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">9. HSN</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">10. Unit</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">11. Size</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">12. Color</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">13. Attr</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">14. Tax Cat</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">15. GST</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">16. Pur. Price</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">17. MRP</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">18. Sell Price</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-32 whitespace-nowrap">19. Del. Time</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">20. Stock</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">21. Offer Price</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">22. Low Stock</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">23. Brand</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">24. Val (MRP)</th>
                <th className="p-3 border-b border-r border-neutral-300 text-xs font-bold text-neutral-700 w-24 whitespace-nowrap">25. Val (Pur)</th>
                <th className="p-3 border-b border-neutral-300 text-xs font-bold text-neutral-700 w-32 text-center whitespace-nowrap">Status</th>
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
                  {/* Image (Modified) */}
                  <td className="p-1 border-r border-neutral-200 text-center align-middle">
                      <div className="flex flex-wrap justify-center items-center gap-2 p-1 min-w-[140px]">
                          {product.images.map((img, i) => (
                             <div key={img.id} className="relative group w-12 h-12 border border-gray-200 rounded overflow-hidden bg-white shrink-0">
                                <img src={img.url} alt={`Img-${i}`} className="w-full h-full object-cover" />
                                <button
                                    onClick={() => handleRemoveImage(originalIndex, img.id)}
                                    className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 flex items-center justify-center rounded-bl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 z-10"
                                    title="Remove"
                                >
                                    <span className="text-[10px] font-bold leading-none">&times;</span>
                                </button>
                                {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] py-[1px]">Main</span>}
                             </div>
                          ))}

                          {/* Add Button */}
                          <label htmlFor={`file-input-${originalIndex}`} className="w-10 h-10 border border-dashed border-gray-400 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 text-gray-500 hover:text-teal-600 transition-colors shrink-0" title="Add Images">
                              <span className="text-xl leading-none font-light">+</span>
                              <input
                                id={`file-input-${originalIndex}`}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    handleImageChange(originalIndex, e.target.files);
                                    e.target.value = "";
                                }}
                              />
                          </label>
                      </div>
                  </td>
                  {/* 4. Product Name */}
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
                  {/* 1. Category */}
                  <td className="p-0 border-r border-neutral-200">
                    <select
                      className="w-full h-full px-3 py-2 bg-transparent border-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-sm cursor-pointer"
                      value={product.categoryId}
                      onChange={(e) =>
                        handleFieldChange(originalIndex, "categoryId", e.target.value)
                      }
                    >
                      <option value="">Category</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* 2. Sub Cat */}
                  <td className="p-0 border-r border-neutral-200">
                    <select
                      className="w-full h-full px-2 py-2 bg-transparent border-none text-sm cursor-pointer"
                      value={product.subCategoryId || ""}
                      onChange={(e) => handleFieldChange(originalIndex, 'subCategoryId', e.target.value)}
                    >
                        <option value="">-</option>
                        {subCategories
                            .filter(sub => {
                                // Filter based on selected category if possible
                                const subCatObj = sub.category;
                                const subCatId = (typeof subCatObj === 'string') ? subCatObj : subCatObj._id;
                                return !product.categoryId || subCatId === product.categoryId;
                            })
                            .map(sub => (
                                <option key={sub._id} value={sub._id}>{sub.name}</option>
                            ))
                        }
                    </select>
                  </td>
                  {/* 3. Sub Sub Cat */}
                   <td className="p-0 border-r border-neutral-200">
                      <input type="text" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm" value={product.subSubCategory} onChange={(e) => handleFieldChange(originalIndex, 'subSubCategory', e.target.value)} />
                   </td>
                  {/* 5. SKU */}
                  <td className="p-0 border-r border-neutral-200">
                     <input type="text" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm" value={product.itemCode} onChange={(e) => handleFieldChange(originalIndex, 'itemCode', e.target.value)} />
                  </td>
                  {/* 6. Rack */}
                  <td className="p-0 border-r border-neutral-200">
                     <input type="text" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm" value={product.rackNumber} onChange={(e) => handleFieldChange(originalIndex, 'rackNumber', e.target.value)} />
                  </td>
                  {/* 7. Desc */}
                   <td className="p-0 border-r border-neutral-200">
                     <input type="text" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm" value={product.description} onChange={(e) => handleFieldChange(originalIndex, 'description', e.target.value)} />
                  </td>
                   {/* 8. Barcode */}
                   <td className="p-0 border-r border-neutral-200">
                     <input type="text" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm" value={product.barcode} onChange={(e) => handleFieldChange(originalIndex, 'barcode', e.target.value)} />
                  </td>
                   {/* 9. HSN */}
                   <td className="p-0 border-r border-neutral-200">
                     <input type="text" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm" value={product.hsnCode} onChange={(e) => handleFieldChange(originalIndex, 'hsnCode', e.target.value)} />
                  </td>
                   {/* 10. Unit */}
                   <td className="p-0 border-r border-neutral-200">
                     <input type="text" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm" value={product.pack} onChange={(e) => handleFieldChange(originalIndex, 'pack', e.target.value)} />
                  </td>
                   {/* 11. Size (Read-only placeholder) */}
                   <td className="p-2 border-r border-neutral-200 text-sm text-neutral-600">-</td>
                   {/* 12. Color (Read-only placeholder) */}
                   <td className="p-2 border-r border-neutral-200 text-sm text-neutral-600">-</td>
                   {/* 13. Attr (Read-only placeholder) */}
                   <td className="p-2 border-r border-neutral-200 text-sm text-neutral-600">-</td>
                   {/* 14. Tax Cat */}
                   <td className="p-0 border-r border-neutral-200">
                      <input type="text" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm" value={product.tax} onChange={(e) => handleFieldChange(originalIndex, 'tax', e.target.value)} />
                   </td>
                   {/* 15. GST (Read-only placeholder) */}
                   <td className="p-2 border-r border-neutral-200 text-sm text-neutral-600">-</td>
                  {/* 16. Purchase Price */}
                    <td className="p-0 border-r border-neutral-200">
                     <input type="number" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm text-right" value={product.purchasePrice} onChange={(e) => handleFieldChange(originalIndex, 'purchasePrice', parseFloat(e.target.value))} />
                  </td>
                  {/* 17. MRP */}
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
                  {/* 18. Selling Price */}
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
                  {/* 19. Delivery Time */}
                   <td className="p-0 border-r border-neutral-200">
                     <input type="text" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm" value={product.deliveryTime} onChange={(e) => handleFieldChange(originalIndex, 'deliveryTime', e.target.value)} />
                  </td>
                  {/* 20. Stock */}
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
                   {/* 21. Offer Price */}
                   <td className="p-0 border-r border-neutral-200">
                     <input type="number" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm text-right" value={product.offerPrice} onChange={(e) => handleFieldChange(originalIndex, 'offerPrice', parseFloat(e.target.value) || 0)} />
                   </td>
                   {/* 22. Low Stock */}
                    <td className="p-0 border-r border-neutral-200">
                     <input type="number" className="w-full h-full px-2 py-2 bg-transparent border-none text-sm text-right" value={product.lowStockQuantity} onChange={(e) => handleFieldChange(originalIndex, 'lowStockQuantity', parseInt(e.target.value))} />
                  </td>
                   {/* 23. Brand */}
                   <td className="p-0 border-r border-neutral-200">
                       <select
                          className="w-full h-full px-2 py-2 bg-transparent border-none text-sm cursor-pointer"
                          value={product.brandId || ""}
                          onChange={(e) => handleFieldChange(originalIndex, 'brandId', e.target.value)}
                        >
                            <option value="">-Select Brand-</option>
                            {brands.map(brand => (
                                <option key={brand._id} value={brand._id}>{brand.name}</option>
                            ))}
                        </select>
                   </td>
                   {/* 24. Val (MRP) (Calculated/Read-only) */}
                   <td className="p-2 border-r border-neutral-200 text-sm text-neutral-600 text-right">{(product.compareAtPrice * product.stock).toLocaleString()}</td>
                   {/* 25. Val (Pur) (Calculated/Read-only) */}
                   <td className="p-2 border-r border-neutral-200 text-sm text-neutral-600 text-right">{(product.purchasePrice * product.stock).toLocaleString()}</td>
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
