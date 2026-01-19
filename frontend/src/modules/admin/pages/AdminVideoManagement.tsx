import React, { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';

interface VideoProduct {
  id: string;
  title: string;
  price: number;
  originalPrice: number;
  videoUrl: string;
  views: string;
}

const DEFAULT_MOCK_VIDEOS = [
  {
    id: '1',
    title: 'Spatula And Brush Set',
    price: 33,
    originalPrice: 149,
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    views: '1.2L'
  },
  {
    id: '2',
    title: 'Power Free Hand Blender',
    price: 51,
    originalPrice: 199,
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    views: '85K'
  },
  {
    id: '3',
    title: 'Cartoon Vacuum Flask',
    price: 96,
    originalPrice: 299,
    videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    views: '2.5L'
  }
];

export default function AdminVideoManagement() {
  const { showToast } = useToast();

  // Lazy initialization to prevent overwriting local storage on mount
  const [videos, setVideos] = useState<VideoProduct[]>(() => {
    const savedVideos = localStorage.getItem('admin_video_finds');
    if (savedVideos) {
      return JSON.parse(savedVideos);
    }
    // Initialize with defaults if empty
    localStorage.setItem('admin_video_finds', JSON.stringify(DEFAULT_MOCK_VIDEOS));
    return DEFAULT_MOCK_VIDEOS;
  });

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    originalPrice: '',
    videoUrl: '',
    views: ''
  });
  const [isEditing, setIsEditing] = useState<string | null>(null);

  // Save to localStorage whenever videos change
  useEffect(() => {
    localStorage.setItem('admin_video_finds', JSON.stringify(videos));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('local-storage-update'));
  }, [videos]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      setVideos(prev => prev.map(v => v.id === isEditing ? {
        ...v,
        title: formData.title,
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice),
        videoUrl: formData.videoUrl,
        views: formData.views
      } : v));
      setIsEditing(null);
      showToast('Video updated successfully', 'success');
    } else {
      const newVideo: VideoProduct = {
        id: Date.now().toString(),
        title: formData.title,
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice),
        videoUrl: formData.videoUrl,
        views: formData.views || '0'
      };
      setVideos([...videos, newVideo]);
      showToast('Video added successfully', 'success');
    }
    setFormData({ title: '', price: '', originalPrice: '', videoUrl: '', views: '' });
  };

  const handleEdit = (video: VideoProduct) => {
    setFormData({
      title: video.title,
      price: video.price.toString(),
      originalPrice: video.originalPrice.toString(),
      videoUrl: video.videoUrl,
      views: video.views
    });
    setIsEditing(video.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      setVideos(videos.filter(v => v.id !== id));
      showToast('Video deleted successfully', 'success');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Video Finds Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Video' : 'Add New Video'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Product Title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    name="originalPrice"
                    value={formData.originalPrice}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (Direct MP4 Link)</label>
                <input
                  type="url"
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://example.com/video.mp4"
                />
                <p className="text-xs text-gray-500 mt-1">Direct link to .mp4 file works best.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Views Count</label>
                <input
                  type="text"
                  name="views"
                  value={formData.views}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 1.5K"
                />
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {isEditing ? 'Update Video' : 'Add Video'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                        setIsEditing(null);
                        setFormData({ title: '', price: '', originalPrice: '', videoUrl: '', views: '' });
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Existing Videos ({videos.length})</h3>
                <button
                    onClick={() => {
                        if(window.confirm("Reset to default mock data?")) {
                            setVideos(DEFAULT_MOCK_VIDEOS);
                            showToast('Reset to defaults', 'info');
                        }
                    }}
                    className="text-xs text-blue-600 hover:underline"
                >
                    Reset Defaults
                </button>
            </div>
            <div className="divide-y">
              {videos.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No videos added yet.</div>
              ) : (
                  videos.map((video) => (
                    <div key={video.id} className="p-4 flex gap-4 hover:bg-gray-50 transition">
                      <div className="w-24 h-32 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative group">
                        <video src={video.videoUrl} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 line-clamp-1">{video.title}</h4>
                        <div className="flex gap-2 text-sm mt-1">
                          <span className="font-bold">₹{video.price}</span>
                          <span className="text-gray-400 line-through">₹{video.originalPrice}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">Views: {video.views}</div>
                        <p className="text-xs text-gray-400 mt-1 truncate max-w-md">{video.videoUrl}</p>
                      </div>
                      <div className="flex flex-col gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(video)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
