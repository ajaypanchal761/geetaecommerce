import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { uploadImage, uploadImages } from "../../../services/api/uploadService";
import {
  validateImageFile,
  createImagePreview,
} from "../../../utils/imageUpload";
import {
  createProduct,
  updateProduct,
  getProductById,
  getShops,
  ProductVariation,
  Shop,
} from "../../../services/api/productService";
import {
  getCategories,
  getSubcategories,
  getSubSubCategories,
  Category,
  SubCategory,
  SubSubCategory,
} from "../../../services/api/categoryService";
import { getActiveTaxes, Tax } from "../../../services/api/taxService";
import { getBrands, Brand } from "../../../services/api/brandService";
import {
  getHeaderCategoriesPublic,
  HeaderCategory,
} from "../../../services/api/headerCategoryService";
import ThemedDropdown from "../components/ThemedDropdown";

export default function SellerAddProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    productName: "",
    headerCategory: "",
    category: "",
    subcategory: "",
    subSubCategory: "",
    publish: "No",
    popular: "No",
    dealOfDay: "No",
    brand: "",
    tags: "",
    smallDescription: "",
    seoTitle: "",
    seoKeywords: "",
    seoImageAlt: "",
    seoDescription: "",
    variationType: "",
    manufacturer: "",
    madeIn: "",
    tax: "",
    isReturnable: "No",
    maxReturnDays: "",
    fssaiLicNo: "",
    totalAllowedQuantity: "10",
    mainImageUrl: "",
    galleryImageUrls: [] as string[],
    isShopByStoreOnly: "No",
    shopId: "",
  });

  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [variationForm, setVariationForm] = useState({
    title: "",
    price: "",
    discPrice: "0",
    stock: "0",
    status: "Available" as "Available" | "Sold out",
  });

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>("");
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>(
    []
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [headerCategories, setHeaderCategories] = useState<HeaderCategory[]>(
    []
  );
  const [shops, setShops] = useState<Shop[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use Promise.allSettled to ensure one failing API doesn't break all others
        const results = await Promise.allSettled([
          getCategories(),
          getActiveTaxes(),
          getBrands(),
          getHeaderCategoriesPublic(),
          getShops(),
        ]);

        // Handle categories
        if (results[0].status === "fulfilled" && results[0].value.success) {
          setCategories(results[0].value.data);
        }

        // Handle taxes
        if (results[1].status === "fulfilled" && results[1].value.success) {
          setTaxes(results[1].value.data);
        }

        // Handle brands
        if (results[2].status === "fulfilled" && results[2].value.success) {
          setBrands(results[2].value.data);
        }

        // Handle header categories
        if (results[3].status === "fulfilled") {
          const headerCatRes = results[3].value;
          if (headerCatRes && Array.isArray(headerCatRes)) {
            // Filter only Published header categories
            const published = headerCatRes.filter(
              (hc: HeaderCategory) => hc.status === "Published"
            );
            setHeaderCategories(published);
          }
        }

        // Handle shops (optional - for Shop By Store feature)
        if (results[4].status === "fulfilled" && results[4].value.success) {
          setShops(results[4].value.data);
        } else if (results[4].status === "rejected") {
          // Shops API failed - this is non-critical, log and continue
          console.warn("Failed to fetch shops (Shop By Store feature may be unavailable):", results[4].reason?.message || "Unknown error");
        }
      } catch (err) {
        console.error("Error fetching form data:", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          const response = await getProductById(id);
          if (response.success && response.data) {
            const product = response.data;
            setFormData({
              productName: product.productName,
              headerCategory:
                (product.headerCategoryId as any)?._id ||
                (product as any).headerCategoryId ||
                "",
              category:
                (product.category as any)?._id || product.categoryId || "",
              subcategory:
                (product.subcategory as any)?._id ||
                product.subcategoryId ||
                "",
              subSubCategory:
                (product.subSubCategory as any)?._id ||
                (product as any).subSubCategoryId ||
                "",
              publish: product.publish ? "Yes" : "No",
              popular: product.popular ? "Yes" : "No",
              dealOfDay: product.dealOfDay ? "Yes" : "No",
              brand: (product.brand as any)?._id || product.brandId || "",
              tags: product.tags.join(", "),
              smallDescription: product.smallDescription || "",
              seoTitle: product.seoTitle || "",
              seoKeywords: product.seoKeywords || "",
              seoImageAlt: product.seoImageAlt || "",
              seoDescription: product.seoDescription || "",
              variationType: product.variationType || "",
              manufacturer: product.manufacturer || "",
              madeIn: product.madeIn || "",
              tax: (product.tax as any)?._id || product.taxId || "",
              isReturnable: product.isReturnable ? "Yes" : "No",
              maxReturnDays: product.maxReturnDays?.toString() || "",
              fssaiLicNo: product.fssaiLicNo || "",
              totalAllowedQuantity:
                product.totalAllowedQuantity?.toString() || "10",
              mainImageUrl: product.mainImageUrl || product.mainImage || "",
              galleryImageUrls: product.galleryImageUrls || [],
              isShopByStoreOnly: (product as any).isShopByStoreOnly ? "Yes" : "No",
              shopId: (product as any).shopId?._id || (product as any).shopId || "",
            });
            setVariations(product.variations);
            if (product.mainImageUrl || product.mainImage) {
              setMainImagePreview(
                product.mainImageUrl || product.mainImage || ""
              );
            }
            if (product.galleryImageUrls) {
              setGalleryImagePreviews(product.galleryImageUrls);
            }
          }
        } catch (err) {
          console.error("Error fetching product:", err);
          setUploadError("Failed to fetch product details");
        }
      };
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    const fetchSubs = async () => {
      if (formData.category) {
        try {
          const res = await getSubcategories(formData.category);
          if (res.success) setSubcategories(res.data);
        } catch (err) {
          console.error("Error fetching subcategories:", err);
        }
      } else {
        setSubcategories([]);
        // Clear subcategory selection when category is cleared
        setFormData((prev) => ({ ...prev, subcategory: "" }));
      }
    };
    // Only fetch if category changed and user is interacting (or initial load)
    // For edit mode, we want to load subcategories for the selected category
    if (formData.category) {
      fetchSubs();
    }
  }, [formData.category]);

  useEffect(() => {
    const fetchSubSubs = async () => {
      if (formData.subcategory) {
        try {
          const res = await getSubSubCategories(formData.subcategory);
          if (res.success) setSubSubCategories(res.data);
        } catch (err) {
          console.error("Error fetching sub-subcategories:", err);
        }
      } else {
        setSubSubCategories([]);
        setFormData((prev) => ({ ...prev, subSubCategory: "" }));
      }
    };
    if (formData.subcategory) {
      fetchSubSubs();
    }
  }, [formData.subcategory]);

  // Clear category and subcategory when header category changes
  useEffect(() => {
    if (formData.headerCategory) {
      // Header category selected - check if current category belongs to it
      const currentCategory = categories.find(
        (cat: any) => (cat._id || cat.id) === formData.category
      );
      if (currentCategory) {
        const catHeaderId =
          typeof currentCategory.headerCategoryId === "string"
            ? currentCategory.headerCategoryId
            : currentCategory.headerCategoryId?._id;
        // If current category doesn't belong to selected header category, clear it
        if (catHeaderId !== formData.headerCategory) {
          setFormData((prev) => ({
            ...prev,
            category: "",
            subcategory: "",
            subSubCategory: "",
          }));
          setSubcategories([]);
          setSubSubCategories([]);
        }
      }
    } else {
      // Header category cleared - clear category and subcategory
      setFormData((prev) => ({
        ...prev,
        category: "",
        subcategory: "",
      }));
      setSubcategories([]);
    }
  }, [formData.headerCategory, categories]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMainImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Invalid image file");
      return;
    }

    setMainImageFile(file);
    setUploadError("");

    try {
      const preview = await createImagePreview(file);
      setMainImagePreview(preview);
    } catch (error) {
      setUploadError("Failed to create image preview");
    }
  };

  const handleGalleryImagesChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate all files
    const invalidFiles = files.filter((file) => !validateImageFile(file).valid);
    if (invalidFiles.length > 0) {
      setUploadError(
        "Some files are invalid. Please check file types and sizes."
      );
      return;
    }

    setGalleryImageFiles(files);
    setUploadError("");

    try {
      const previews = await Promise.all(
        files.map((file) => createImagePreview(file))
      );
      setGalleryImagePreviews(previews);
    } catch (error) {
      setUploadError("Failed to create image previews");
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImageFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addVariation = () => {
    if (!variationForm.title || !variationForm.price) {
      setUploadError("Please fill in variation title and price");
      return;
    }

    const price = parseFloat(variationForm.price);
    const discPrice = parseFloat(variationForm.discPrice || "0");
    const stock = parseInt(variationForm.stock || "0");

    if (discPrice > price) {
      setUploadError("Discounted price cannot be greater than price");
      return;
    }

    const newVariation: ProductVariation = {
      title: variationForm.title,
      price,
      discPrice,
      stock,
      status: variationForm.status,
    };

    setVariations([...variations, newVariation]);
    setVariationForm({
      title: "",
      price: "",
      discPrice: "0",
      stock: "0",
      status: "Available",
    });
    setUploadError("");
  };

  const removeVariation = (index: number) => {
    setVariations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError("");

    // Basic validation
    if (!formData.productName.trim()) {
      setUploadError("Please enter a product name.");
      return;
    }

    // Only validate categories if NOT shop by store only
    if (formData.isShopByStoreOnly !== "Yes") {
      if (!formData.headerCategory) {
        setUploadError("Please select a header category.");
        return;
      }
      if (!formData.category) {
        setUploadError("Please select a category.");
        return;
      }
    }

    setUploading(true);

    try {
      // Keep local copies so we don't rely on async state updates before submit
      let mainImageUrl = formData.mainImageUrl;
      let galleryImageUrls = [...formData.galleryImageUrls];

      // Upload main image if provided
      if (mainImageFile) {
        const mainImageResult = await uploadImage(
          mainImageFile,
          "Geeta Stores/products"
        );
        mainImageUrl = mainImageResult.secureUrl;
        setFormData((prev) => ({
          ...prev,
          mainImageUrl,
        }));
      }

      // Upload gallery images if provided
      if (galleryImageFiles.length > 0) {
        const galleryResults = await uploadImages(
          galleryImageFiles,
          "Geeta Stores/products/gallery"
        );
        galleryImageUrls = galleryResults.map((result) => result.secureUrl);
        setFormData((prev) => ({ ...prev, galleryImageUrls }));
      }

      // Validate variations
      if (variations.length === 0) {
        setUploadError("Please add at least one product variation");
        setUploading(false);
        return;
      }

      // Prepare product data for API
      const tagsArray = formData.tags
        ? formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];

      const productData = {
        productName: formData.productName,
        headerCategoryId: formData.headerCategory || undefined,
        categoryId: formData.category || undefined,
        subcategoryId: formData.subcategory || undefined,
        subSubCategoryId: formData.subSubCategory || undefined,
        brandId: formData.brand || undefined,
        publish: formData.publish === "Yes",
        popular: formData.popular === "Yes",
        dealOfDay: formData.dealOfDay === "Yes",
        seoTitle: formData.seoTitle || undefined,
        seoKeywords: formData.seoKeywords || undefined,
        seoImageAlt: formData.seoImageAlt || undefined,
        seoDescription: formData.seoDescription || undefined,
        smallDescription: formData.smallDescription || undefined,
        tags: tagsArray,
        manufacturer: formData.manufacturer || undefined,
        madeIn: formData.madeIn || undefined,
        taxId: formData.tax || undefined,
        isReturnable: formData.isReturnable === "Yes",
        maxReturnDays: formData.maxReturnDays
          ? parseInt(formData.maxReturnDays)
          : undefined,
        totalAllowedQuantity: parseInt(formData.totalAllowedQuantity || "10"),
        fssaiLicNo: formData.fssaiLicNo || undefined,
        mainImageUrl: mainImageUrl || undefined,
        galleryImageUrls,
        variations: variations,
        variationType: formData.variationType || undefined,
        isShopByStoreOnly: formData.isShopByStoreOnly === "Yes",
        shopId: formData.isShopByStoreOnly === "Yes" && formData.shopId ? formData.shopId : undefined,
      };

      // Create or Update product via API
      let response;
      if (id) {
        response = await updateProduct(id as string, productData);
      } else {
        response = await createProduct(productData);
      }

      if (response.success) {
        setSuccessMessage(
          id ? "Product updated successfully!" : "Product added successfully!"
        );
        setTimeout(() => {
          // Reset form or navigate
          if (!id) {
            setFormData({
              productName: "",
              headerCategory: "",
              category: "",
              subcategory: "",
              subSubCategory: "",
              publish: "No",
              popular: "No",
              dealOfDay: "No",
              brand: "",
              tags: "",
              smallDescription: "",
              seoTitle: "",
              seoKeywords: "",
              seoImageAlt: "",
              seoDescription: "",
              variationType: "",
              manufacturer: "",
              madeIn: "",
              tax: "",
              isReturnable: "No",
              maxReturnDays: "",
              fssaiLicNo: "",
              totalAllowedQuantity: "10",
              mainImageUrl: "",
              galleryImageUrls: [],
              isShopByStoreOnly: "No",
              shopId: "",
            });
            setVariations([]);
            setMainImageFile(null);
            setMainImagePreview("");
            setGalleryImageFiles([]);
            setGalleryImagePreviews([]);
          }
          setSuccessMessage("");
          // Navigate to product list
          navigate("/seller/product/list");
        }, 1500);
      } else {
        setUploadError(response.message || "Failed to create product");
      }
    } catch (error: any) {
      setUploadError(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload images. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Section */}
          {/* Product Section */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-teal-600 text-white px-6 py-4">
              <h2 className="text-lg font-semibold tracking-wide">Product Details</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleChange}
                    placeholder="Enter Product Name"
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Header Category <span className="text-red-500">*</span>
                  </label>
                  <ThemedDropdown
                    options={headerCategories.map(hc => ({ id: hc._id, label: hc.name, value: hc._id }))}
                    value={formData.headerCategory}
                    onChange={(val) => setFormData(prev => ({ ...prev, headerCategory: val }))}
                    placeholder="Select Header Category"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Category
                  </label>
                  <ThemedDropdown
                    options={categories
                      .filter((cat: any) => {
                        if (formData.headerCategory) {
                          const catHeaderId = typeof cat.headerCategoryId === "string"
                              ? cat.headerCategoryId
                              : cat.headerCategoryId?._id;
                          return catHeaderId === formData.headerCategory;
                        }
                        return true;
                      })
                      .map((cat: any) => ({ id: cat._id || cat.id, label: cat.name, value: cat._id || cat.id }))
                    }
                    value={formData.category}
                    onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                    placeholder={formData.headerCategory ? "Select Category" : "Select Header Category First"}
                    disabled={!formData.headerCategory}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    SubCategory
                  </label>
                  <ThemedDropdown
                    options={subcategories.map(sub => ({ id: sub._id, label: sub.subcategoryName, value: sub._id }))}
                    value={formData.subcategory}
                    onChange={(val) => setFormData(prev => ({ ...prev, subcategory: val }))}
                    placeholder={formData.category ? "Select Subcategory" : "Select Category First"}
                    disabled={!formData.category}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Sub-SubCategory
                  </label>
                  <ThemedDropdown
                    options={subSubCategories.map(sub => ({ id: sub._id, label: sub.name, value: sub._id }))}
                    value={formData.subSubCategory}
                    onChange={(val) => setFormData(prev => ({ ...prev, subSubCategory: val }))}
                    placeholder={formData.subcategory ? "Select Sub-SubCategory" : "Select Subcategory First"}
                    disabled={!formData.subcategory}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Publish Product?
                  </label>
                  <ThemedDropdown
                    options={['Yes', 'No']}
                    value={formData.publish}
                    onChange={(val) => setFormData(prev => ({ ...prev, publish: val }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Make Popular?
                  </label>
                  <ThemedDropdown
                    options={['Yes', 'No']}
                    value={formData.popular}
                    onChange={(val) => setFormData(prev => ({ ...prev, popular: val }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Deal of the Day?
                  </label>
                  <ThemedDropdown
                    options={['Yes', 'No']}
                    value={formData.dealOfDay}
                    onChange={(val) => setFormData(prev => ({ ...prev, dealOfDay: val }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Brand
                  </label>
                  <ThemedDropdown
                    options={brands.map(brand => ({ id: brand._id, label: brand.name, value: brand._id }))}
                    value={formData.brand}
                    onChange={(val) => setFormData(prev => ({ ...prev, brand: val }))}
                    placeholder="Select Brand"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Tags <span className="text-xs text-neutral-500 font-normal ml-1">(Separated by comma)</span>
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="Enter tags for search optimization"
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Short Description
                </label>
                <textarea
                  name="smallDescription"
                  value={formData.smallDescription}
                  onChange={handleChange}
                  placeholder="Enter a brief product description..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* SEO Content Section */}
          {/* SEO Content Section */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-teal-600 text-white px-6 py-4">
              <h2 className="text-lg font-semibold tracking-wide">SEO Configuration</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    meta Title
                  </label>
                  <input
                    type="text"
                    name="seoTitle"
                    value={formData.seoTitle}
                    onChange={handleChange}
                    placeholder="Enter meta Title"
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    meta Keywords
                  </label>
                  <input
                    type="text"
                    name="seoKeywords"
                    value={formData.seoKeywords}
                    onChange={handleChange}
                    placeholder="Enter meta Keywords"
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Image Alt Attributes
                  </label>
                  <input
                    type="text"
                    name="seoImageAlt"
                    value={formData.seoImageAlt}
                    onChange={handleChange}
                    placeholder="Enter Image Alt Text"
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    meta Description
                  </label>
                  <textarea
                    name="seoDescription"
                    value={formData.seoDescription}
                    onChange={handleChange}
                    placeholder="Enter meta Description"
                    rows={4}
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Add Variation Section */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-teal-600 text-white px-6 py-4">
              <h2 className="text-lg font-semibold tracking-wide">Product Variations</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Variation Type
                </label>
                <div className="max-w-xs">
                  <ThemedDropdown
                    options={['Size', 'Weight', 'Color', 'Pack']}
                    value={formData.variationType}
                    onChange={(val) => setFormData(prev => ({ ...prev, variationType: val }))}
                    placeholder="Select Variation Type"
                  />
                </div>
              </div>

              {/* Variation Form */}
              <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-200">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                      Title
                    </label>
                    <input
                      type="text"
                      value={variationForm.title}
                      onChange={(e) => setVariationForm({ ...variationForm, title: e.target.value })}
                      placeholder="e.g. XL, 1kg"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                      Price *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">₹</span>
                      <input
                        type="number"
                        value={variationForm.price}
                        onChange={(e) => setVariationForm({ ...variationForm, price: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                      Discount Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">₹</span>
                      <input
                        type="number"
                        value={variationForm.discPrice}
                        onChange={(e) => setVariationForm({ ...variationForm, discPrice: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
                      Stock
                    </label>
                    <input
                      type="number"
                      value={variationForm.stock}
                      onChange={(e) => setVariationForm({ ...variationForm, stock: e.target.value })}
                      placeholder="0 = Unlimited"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div className="flex items-end h-full pt-6">
                    <button
                      type="button"
                      onClick={addVariation}
                      className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                      Add +
                    </button>
                  </div>
                </div>
              </div>

              {/* Variations List */}
              {variations.length > 0 && (
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200">
                    <h3 className="text-sm font-semibold text-neutral-700">Added Variations</h3>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {variations.map((variation, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors"
                      >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                          <div>
                            <span className="text-xs text-neutral-400 block">Title</span>
                            <span className="font-medium text-neutral-900">{variation.title}</span>
                          </div>
                          <div>
                            <span className="text-xs text-neutral-400 block">Price</span>
                            <span className="font-medium text-teal-600">₹{variation.price}</span>
                            {variation.discPrice > 0 && (
                               <span className="text-xs text-neutral-400 line-through ml-2">₹{variation.discPrice}</span>
                            )}
                          </div>
                          <div>
                            <span className="text-xs text-neutral-400 block">Stock</span>
                            <span className="text-neutral-700">{variation.stock === 0 ? "Unlimited" : variation.stock}</span>
                          </div>
                          <div>
                            <span className="text-xs text-neutral-400 block">Status</span>
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${variation.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {variation.status}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariation(index)}
                          className="ml-4 p-2 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Remove variation"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Other Details Section */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-teal-600 text-white px-6 py-4">
              <h2 className="text-lg font-semibold tracking-wide">Additional Details</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    placeholder="Enter Manufacturer Name"
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Made In
                  </label>
                  <input
                    type="text"
                    name="madeIn"
                    value={formData.madeIn}
                    onChange={handleChange}
                    placeholder="Enter Country/Region"
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Tax Category
                  </label>
                  <ThemedDropdown
                    options={taxes.map(tax => ({ id: tax._id, label: `${tax.name} (${tax.percentage}%)`, value: tax._id }))}
                    value={formData.tax}
                    onChange={(val) => setFormData(prev => ({ ...prev, tax: val }))}
                    placeholder="Select Tax"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Returnable?
                  </label>
                  <ThemedDropdown
                    options={['Yes', 'No']}
                    value={formData.isReturnable}
                    onChange={(val) => setFormData(prev => ({ ...prev, isReturnable: val }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Max Return Days
                  </label>
                  <input
                    type="number"
                    name="maxReturnDays"
                    value={formData.maxReturnDays}
                    onChange={handleChange}
                    placeholder="e.g. 7"
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    FSSAI Lic. No.
                  </label>
                  <input
                    type="text"
                    name="fssaiLicNo"
                    value={formData.fssaiLicNo}
                    onChange={handleChange}
                    placeholder="Enter License Number"
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Total Allowed Quantity
                  </label>
                  <input
                    type="number"
                    name="totalAllowedQuantity"
                    value={formData.totalAllowedQuantity}
                    onChange={handleChange}
                    placeholder="e.g. 10"
                    className="w-full px-4 py-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Max quantity a user can buy at once
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Add Images Section */}
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-teal-600 text-white px-4 sm:px-6 py-3">
              <h2 className="text-lg font-semibold">Add Images</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-6">
              {uploadError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {uploadError}
                </div>
              )}
              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                  {successMessage}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Product Main Image <span className="text-red-500">*</span>
                </label>
                <label className="block border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors cursor-pointer">
                  {mainImagePreview ? (
                    <div className="space-y-2">
                      <img
                        src={mainImagePreview}
                        alt="Main product preview"
                        className="max-h-48 mx-auto rounded-lg object-cover"
                      />
                      <p className="text-sm text-neutral-600">
                        {mainImageFile?.name}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setMainImageFile(null);
                          setMainImagePreview("");
                        }}
                        className="text-sm text-red-600 hover:text-red-700">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto mb-2 text-neutral-400">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <p className="text-sm text-neutral-600 font-medium">
                        Upload Main Image
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Max 5MB, JPG/PNG/WEBP
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Product Gallery Images (Optional)
                </label>
                <label className="block border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors cursor-pointer">
                  {galleryImagePreviews.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {galleryImagePreviews.map((preview, index) => (
                          <div key={index} className="relative">
                            <img
                              src={preview}
                              alt={`Gallery ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                removeGalleryImage(index);
                              }}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-neutral-600">
                        {galleryImageFiles.length} image(s) selected
                      </p>
                    </div>
                  ) : (
                    <div>
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto mb-2 text-neutral-400">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <p className="text-sm text-neutral-600 font-medium">
                        Upload Other Product Images Here
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Max 5MB per image, up to 10 images
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryImagesChange}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Shop by Store Section */}
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="bg-teal-600 text-white px-6 py-4">
              <h2 className="text-lg font-semibold tracking-wide">Store Visibility</h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex gap-3 items-start">
                 <svg className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 <p className="text-sm text-teal-800">
                   <strong>Note:</strong> If you select "Show in Shop by Store only", this product will <strong>only</strong> be visible in the selected store's specific page and will not appear on general category pages or the home page.
                 </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    Show in Shop by Store only?
                  </label>
                  <ThemedDropdown
                    options={['Yes', 'No']}
                    value={formData.isShopByStoreOnly}
                    onChange={(val) => setFormData(prev => ({ ...prev, isShopByStoreOnly: val }))}
                  />
                </div>
                {formData.isShopByStoreOnly === "Yes" && (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                      Select Store <span className="text-red-500">*</span>
                    </label>
                    <ThemedDropdown
                      options={shops.map(shop => ({ id: shop._id, label: shop.name, value: shop._id }))}
                      value={formData.shopId}
                      onChange={(val) => setFormData(prev => ({ ...prev, shopId: val }))}
                      placeholder="Select Store"
                    />
                    {shops.length === 0 && (
                      <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        No active stores available. Please contact admin.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pb-6">
            <button
              type="submit"
              disabled={uploading}
              className={`px-8 py-3 rounded-lg font-medium text-lg transition-colors shadow-sm ${
                uploading
                  ? "bg-neutral-400 cursor-not-allowed text-white"
                  : "bg-teal-600 hover:bg-teal-700 text-white"
              }`}>
              {uploading ? "Uploading Images..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
