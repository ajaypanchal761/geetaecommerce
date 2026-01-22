import { useState, useEffect, useRef } from 'react';
import { bannerService } from '../../../services/bannerService';

export default function AdminFlashDeal() {
  const [config, setConfig] = useState(bannerService.getDealsConfig());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setConfig(bannerService.getDealsConfig());
    if (config.flashDealImage) {
        setPreviewUrl(config.flashDealImage);
    }
  }, []);

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
        flashDealImage: imageUrl
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
        <label className="block mb-6">
            <span className="text-gray-700 font-medium mb-2 block">Flash Deal End Date/Time</span>
            <input
                type="datetime-local"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-[#E65100] outline-none"
                value={config.flashDealTargetDate ? new Date(config.flashDealTargetDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => setConfig({ ...config, flashDealTargetDate: new Date(e.target.value).toISOString() })}
            />
        </label>

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
