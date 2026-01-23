import { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';

interface BarcodeSettings {
    width: number;
    height: number;
    fontSize: number;
    barcodeHeight: number;
    productNameSize: number;
    showPrice: boolean;
    showName: boolean;
}

const DEFAULT_SETTINGS: BarcodeSettings = {
    width: 38, // mm
    height: 25, // mm
    fontSize: 10, // px
    barcodeHeight: 40, // px
    productNameSize: 10,
    showPrice: true,
    showName: true
};

export default function AdminBarcodeSettings() {
    const { showToast } = useToast();
    const [settings, setSettings] = useState<BarcodeSettings>(DEFAULT_SETTINGS);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Load settings from localStorage
        const saved = localStorage.getItem('barcode_printer_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            } catch (e) {
                console.error("Failed to parse barcode settings", e);
            }
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : Number(value)
        }));
    };

    const handleSave = () => {
        setSaving(true);
        try {
            localStorage.setItem('barcode_printer_settings', JSON.stringify(settings));
            // Also update the old legacy setting if needed, or just leave it.
            // We'll update AdminAddProduct to prefer 'barcode_printer_settings'.
            showToast('Barcode settings saved successfully', 'success');
        } catch (e) {
            showToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-neutral-50 relative">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900">Barcode Settings</h1>
                    <p className="text-sm text-neutral-500 mt-1">Configure print dimension and layout for barcodes.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-6 rounded-lg shadow-sm transition-colors text-sm flex items-center gap-2"
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Dimensions Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                            <h2 className="font-bold text-neutral-800">Label Dimensions</h2>
                            <p className="text-xs text-neutral-500 mt-0.5">Physical size of your sticker label (in mm)</p>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">Width (mm)</label>
                                <input
                                    type="number"
                                    name="width"
                                    value={settings.width}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                />
                                <p className="text-xs text-neutral-400 mt-1">e.g. 38</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">Height (mm)</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={settings.height}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                />
                                <p className="text-xs text-neutral-400 mt-1">e.g. 25</p>
                            </div>
                        </div>
                    </div>

                    {/* Content Styles Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                             <h2 className="font-bold text-neutral-800">Content Styles</h2>
                             <p className="text-xs text-neutral-500 mt-0.5">Font sizes and barcode height</p>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                             <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">Product Name Grid Size (px)</label>
                                <input
                                    type="number"
                                    name="productNameSize"
                                    value={settings.productNameSize}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">Price Font Size (px)</label>
                                <input
                                    type="number"
                                    name="fontSize"
                                    value={settings.fontSize}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">Barcode Image Height (px)</label>
                                <input
                                    type="number"
                                    name="barcodeHeight"
                                    value={settings.barcodeHeight}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Visibility Card */}
                    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
                         <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
                             <h2 className="font-bold text-neutral-800">Visibility</h2>
                             <p className="text-xs text-neutral-500 mt-0.5">Toggle elements on the label</p>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="showName"
                                    checked={settings.showName}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500 border-neutral-300"
                                />
                                <span className="text-neutral-700 font-medium">Show Product Name</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="showPrice"
                                    checked={settings.showPrice}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500 border-neutral-300"
                                />
                                <span className="text-neutral-700 font-medium">Show Price (MRP/SP)</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
