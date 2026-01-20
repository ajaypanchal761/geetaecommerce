import { useState } from 'react';

interface SettingField {
  id: string;
  label: string;
  description?: string;
  isEnabled: boolean;
  type?: 'toggle' | 'text';
  canDelete?: boolean;
}

interface SettingSection {
  id: string;
  title: string;
  description?: string;
  fields: SettingField[];
}

export default function AdminProductDisplaySettings() {
  const [sections, setSections] = useState<SettingSection[]>([
    {
      id: 'basic',
      title: 'Basic Details',
      description: 'Control what appears on your product page.',
      fields: [
        {
          id: 'category',
          label: 'Category',
          description: 'Product Category Information',
          isEnabled: true,
        },
        {
          id: 'brand',
          label: 'Brand',
          description: 'Product Brand Information',
          isEnabled: true,
        },
        {
          id: 'summary',
          label: 'Summary',
          description: '2-3 key points, e.g. 4 star frost free refrigerator',
          isEnabled: true,
        },
        {
          id: 'description',
          label: 'Description',
          description: 'Detailed product description',
          isEnabled: true,
        },
        {
          id: 'video',
          label: 'Product Video',
          description: 'Specify product youtube video link',
          isEnabled: false,
        },
      ],
    },
    {
      id: 'pricing',
      title: 'Pricing & Tax',
      fields: [
        {
          id: 'tax',
          label: 'Tax',
          description: 'Tax related info',
          isEnabled: true,
        },
        {
          id: 'purchase_price',
          label: 'Purchase Price',
          description: 'Purchase price of goods (visible only to you)',
          isEnabled: true,
        },
      ],
    },
    {
      id: 'variants',
      title: 'Variant Fields',
      description: 'Add variants for products having more than one option',
      fields: [
        {
          id: 'size',
          label: 'Size',
          description: 'Product variant',
          isEnabled: true,
          canDelete: true,
        },
        {
          id: 'color',
          label: 'Color',
          description: 'Product variant',
          isEnabled: true,
          canDelete: true,
        },
        {
          id: 'online_offer_price',
          label: 'Online Offer Price',
          description: 'Product variant',
          isEnabled: false,
          canDelete: true,
        },
      ],
    },
  ]);

  const toggleField = (sectionId: string, fieldId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map((field) =>
                field.id === fieldId ? { ...field, isEnabled: !field.isEnabled } : field
              ),
            }
          : section
      )
    );
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    if (window.confirm('Are you sure you want to remove this variant field?')) {
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                fields: section.fields.filter((field) => field.id !== fieldId),
              }
            : section
        )
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 relative">
      {/* Header - Static at top of flex column (outside scroll area) */}
      <div className="bg-white px-4 sm:px-6 py-4 border-b border-neutral-200 z-20 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Product Settings</h1>
          </div>
          <div className="text-sm text-neutral-600">
            <span className="text-teal-600">Home</span> / <span className="text-neutral-900">Product Settings</span>
          </div>
        </div>
      </div>

      {/* Content Area - Takes remaining space and scrolls */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
          {sections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100">
                <h2 className="text-lg font-bold text-neutral-800">{section.title}</h2>
                {section.description && (
                  <p className="text-sm text-neutral-500 mt-1">{section.description}</p>
                )}
              </div>

              <div className="p-0">
                {section.fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-800 text-sm sm:text-base">
                          {field.label}
                        </span>
                        {field.id === 'video' && (
                          <svg className="w-4 h-4 text-blue-500 fill-current" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                          </svg>
                        )}
                      </div>
                      {field.description && (
                        <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                          {field.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Toggle Switch */}
                      <button
                        onClick={() => toggleField(section.id, field.id)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
                          field.isEnabled ? 'bg-blue-600' : 'bg-neutral-200'
                        }`}
                        role="switch"
                        aria-checked={field.isEnabled}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            field.isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      {/* Delete Button (Trash Icon) */}
                      {field.canDelete && (
                        <button
                          onClick={() => deleteField(section.id, field.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete field"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}


              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer - Static at bottom of flex column */}
      <div className="bg-white border-t border-neutral-200 p-4 flex justify-end z-20 flex-shrink-0">
        <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm transition-colors text-sm sm:text-base">
          Save Changes
        </button>
      </div>
    </div>
  );
}
