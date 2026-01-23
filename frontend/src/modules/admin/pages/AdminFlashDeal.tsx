import { useState, useEffect, useRef } from 'react';
import { bannerService } from '../../../services/bannerService';

export default function AdminFlashDeal() {
  const [config, setConfig] = useState<any>({ flashDealTargetDate: '', isActive: true });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchConfig = async () => {
        try {
            const data = await bannerService.getDealsConfig();
            setConfig(data);
            if (data.flashDealImage) {
                setPreviewUrl(data.flashDealImage);
            }
        } catch (error) {
            console.error("Error fetching flash deal config:", error);
        }
    };
    fetchConfig();
  }, []);

  const getLocalDate = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getLocalTime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const handleDateChange = (date: string) => {
    const time = getLocalTime(config.flashDealTargetDate) || '00:00';
    if (date) {
        setConfig({ ...config, flashDealTargetDate: new Date(`${date}T${time}`).toISOString() });
    }
  };

  const handleTimeChange = (time: string) => {
    const date = getLocalDate(config.flashDealTargetDate) || getLocalDate(new Date().toISOString());
    if (time) {
        setConfig({ ...config, flashDealTargetDate: new Date(`${date}T${time}`).toISOString() });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
      }
  };

  const handleSave = async () => {
    setLoading(true);
    let imageUrl = config.flashDealImage;

    if (selectedFile) {
        // Convert to Base64
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        await new Promise((resolve) => {
            reader.onload = () => {
                imageUrl = reader.result as string;
                resolve(true);
            };
        });
    }

    bannerService.updateDealsConfig({
        flashDealTargetDate: config.flashDealTargetDate,
        flashDealImage: imageUrl,
        isActive: config.isActive
    });

    setTimeout(() => {
        setLoading(false);
        setMessage('Flash Deal settings updated successfully!');
        setTimeout(() => setMessage(''), 3000);
    }, 500);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
           <h1 className="text-2xl font-bold text-gray-800">Flash Deals</h1>
           <div className="text-sm text-gray-500">Promotion / Flash Deals</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 max-w-3xl">
        <label className="flex items-center gap-3 mb-6 p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
            <input
                type="checkbox"
                className="w-5 h-5 accent-[#E65100]"
                checked={config.isActive ?? true}
                onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
            />
            <span className="text-gray-700 font-semibold uppercase tracking-wider text-sm">Enable Flash Deal Section</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <label className="block">
                <span className="text-gray-700 font-medium mb-2 block">Flash Deal End Date</span>
                <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#E65100] outline-none"
                    value={getLocalDate(config.flashDealTargetDate)}
                    onChange={(e) => handleDateChange(e.target.value)}
                />
            </label>
            <label className="block">
                <span className="text-gray-700 font-medium mb-2 block">Flash Deal End Time</span>
                <input
                    type="time"
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#E65100] outline-none"
                    value={getLocalTime(config.flashDealTargetDate)}
                    onChange={(e) => handleTimeChange(e.target.value)}
                />
            </label>
        </div>

        <label className="block mb-6">
            <span className="text-gray-700 font-medium mb-2 block">Deal Image</span>
            <div className="flex items-start gap-4">
                 <div className="flex-1">
                     <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg block text-center transition-colors font-medium border-dashed border-2">
                          <span className="block mb-1">Click to upload image</span>
                          <span className="text-xs text-gray-400 font-normal">JPG, PNG supported</span>
                          <input
                              type="file"
                              ref={fileInputRef}
                              className="hidden"
                              accept="image/*"
                              onChange={handleFileChange}
                          />
                      </label>
                 </div>
                 {previewUrl && (
                     <div className="h-24 w-40 bg-gray-100 rounded-lg border overflow-hidden flex-shrink-0">
                         <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                     </div>
                 )}
            </div>
        </label>

        <button
            onClick={handleSave}
            disabled={loading}
            className="bg-[#E65100] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#EF6C00] disabled:opacity-70 shadow-sm"
        >
            {loading ? 'Saving...' : 'Save Settings'}
        </button>

        {message && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                {message}
            </div>
        )}
      </div>
    </div>
  );
}
