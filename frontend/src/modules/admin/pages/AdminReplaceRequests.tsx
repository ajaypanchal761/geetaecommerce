import { useState, useEffect } from "react";

// Mock Data for Replace Requests
const MOCK_REPLACE_REQUESTS = [
  {
    id: "REP-001",
    orderId: "ORD-112233",
    product: "Running Shoes (Size 9)",
    image: "https://via.placeholder.com/50",
    reason: "Size mismatch",
    status: "Pending",
    date: "2026-01-23",
  },
  {
    id: "REP-002",
    orderId: "ORD-112234",
    product: "Ceramic Coffee Mug",
    image: "https://via.placeholder.com/50",
    reason: "Broken on arrival",
    status: "Approved",
    date: "2026-01-22",
  },
];

export default function AdminReplaceRequests() {
  const [requests, setRequests] = useState(MOCK_REPLACE_REQUESTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    // Load dynamic requests from localStorage
    const savedRequests = JSON.parse(localStorage.getItem("geeta_replace_requests") || "[]");
    if (savedRequests.length > 0) {
      // Merge saved requests with mock requests
      setRequests(prev => {
         const prevIds = new Set(prev.map(r => r.id));
         const newUnique = savedRequests.filter((r: any) => !prevIds.has(r.id));
         return [...newUnique, ...prev];
      });
    }
  }, []);

  const handleAccept = (id: string, product: string) => {
      // Logic for pickup + replacement
      if(confirm(`Approve replacement for ${product}? This will schedule a pickup and new delivery.`)) {
         setRequests(prev => prev.map(r => r.id === id ? {...r, status: 'Approved'} : r));
      }
  };

  const handleReject = (id: string) => {
      const reason = prompt("Enter Rejection Reason:");
      if (!reason) return;
      setRequests(prev => prev.map(r => r.id === id ? {...r, status: 'Rejected'} : r));
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Replace Requests</h1>
            <p className="text-sm text-gray-500">Manage item replacement requests</p>
        </div>
         <div className="flex gap-2">
           <input
             type="text"
             placeholder="Search Order ID..."
             className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

       {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Issue Image</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                 <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.filter(r => r.orderId.toLowerCase().includes(searchTerm.toLowerCase())).map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{request.orderId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{request.product}</td>
                  <td className="px-6 py-4">
                      <div
                        className="h-10 w-10 bg-gray-100 rounded border overflow-hidden cursor-pointer"
                        onClick={() => setSelectedImage(request.image)}
                      >
                          <img src={request.image} alt="Issue" className="h-full w-full object-cover" />
                      </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{request.reason}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : request.status === "Rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex gap-2">
                       {request.status === 'Pending' && (
                           <>
                             <button
                               onClick={() => handleAccept(request.id, request.product)}
                               className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                             >
                               Accept Replacement
                             </button>
                             <button
                               onClick={() => handleReject(request.id)}
                               className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                             >
                               Reject
                             </button>
                           </>
                       )}
                       {request.status !== 'Pending' && (
                           <span className="text-gray-400 text-xs italic">
                               {request.status}
                           </span>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            {requests.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                  No replacement requests found.
              </div>
          )}
        </div>
      </div>

       {/* Image Preview Modal */}
       {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={() => setSelectedImage(null)}>
          <div className="bg-white p-2 rounded-lg max-w-lg w-full" onClick={e => e.stopPropagation()}>
             <img src={selectedImage} alt="Full View" className="w-full h-auto rounded" />
             <button
                className="mt-2 w-full py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                onClick={() => setSelectedImage(null)}
             >
                 Close
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
