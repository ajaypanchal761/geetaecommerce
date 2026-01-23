import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// Mock Data for Return Requests
const MOCK_RETURN_REQUESTS = [
  {
    id: "RET-001",
    orderId: "ORD-789012",
    user: "Rahul Sharma",
    product: "Premium Wireless Headphones",
    quantity: 1,
    reason: "Quality is not good",
    status: "Pending",
    date: "2026-01-22",
  },
  {
    id: "RET-002",
    orderId: "ORD-789013",
    user: "Priya Singh",
    product: "Cotton T-Shirt (L)",
    quantity: 2,
    reason: "Wrong item received",
    status: "Approved",
    date: "2026-01-21",
  },
  {
    id: "RET-003",
    orderId: "ORD-789014",
    user: "Amit Verma",
    product: "Smart Watch Series 5",
    quantity: 1,
    reason: "Damaged product",
    status: "Rejected",
    date: "2026-01-20",
  },
];

export default function AdminReturnRequests() {
  const [requests, setRequests] = useState(MOCK_RETURN_REQUESTS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Load dynamic requests from localStorage
    const savedRequests = JSON.parse(localStorage.getItem("geeta_return_requests") || "[]");
    if (savedRequests.length > 0) {
      // Merge saved requests with mock requests
      // Avoid duplicates if necessary, but for now just appending
      setRequests(prev => {
         const prevIds = new Set(prev.map(r => r.id));
         const newUnique = savedRequests.filter((r: any) => !prevIds.has(r.id));
         return [...newUnique, ...prev];
      });
    }
  }, []);

  const handleAccept = (id: string) => {
    // In a real app, this would open a modal to select a delivery boy
    const deliveryBoy = prompt("Assign Delivery Boy (Enter Name):", "Ramesh Kumar");
    if (!deliveryBoy) return;

    if (confirm(`Accept return request ${id} and assign to ${deliveryBoy}?`)) {
      setRequests((prev) =>
        prev.map((req) =>
          req.id === id ? { ...req, status: "Approved" } : req
        )
      );
    }
  };

  const handleReject = (id: string) => {
    const reason = prompt("Enter Rejection Reason:");
    if (!reason) return;

    setRequests((prev) =>
      prev.map((req) =>
        req.id === id ? { ...req, status: "Rejected" } : req
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Return Requests</h1>
            <p className="text-sm text-gray-500">Manage customer return requests</p>
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
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.filter(r => r.orderId.toLowerCase().includes(searchTerm.toLowerCase())).map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{request.orderId}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{request.user}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{request.product}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{request.quantity}</td>
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
                               onClick={() => handleAccept(request.id)}
                               className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                             >
                               Accept
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
                           <button className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 transition-colors">
                            View
                           </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                  No return requests found.
              </div>
          )}
        </div>
      </div>
    </div>
  );
}
