import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { getReturnOrders } from '../../../services/api/delivery/deliveryService';

export default function DeliveryReturnOrders() {
  const navigate = useNavigate();
  const [returnOrders, setReturnOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'return' | 'replacement'>('return');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getReturnOrders();
        setReturnOrders(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load return orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Cancelled':
        return 'bg-red-100 text-red-700';
      case 'Returned':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <p className="text-neutral-500">Loading return orders...</p>
        <DeliveryBottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <p className="text-red-500">{error}</p>
        <DeliveryBottomNav />
      </div>
    );
  }



  // Mock Data for Demo
  const MOCK_RETURNS = [
      {
          id: 'RET-101',
          type: 'Return',
          customerName: 'Rahul Sharma',
          address: '123, mg road, bangalore',
          status: 'Pending Pickup',
          items: 1,
          createdAt: new Date().toISOString()
      }
  ];

  const MOCK_REPLACEMENTS = [
      {
          id: 'REP-202',
          type: 'Replacement',
          customerName: 'Priya Singh',
          address: '456, indira nagar, bangalore',
          status: 'Pending Pickup',
          items: 1,
          createdAt: new Date().toISOString()
      }
  ];

  const handlePickup = (id: string, type: string) => {
      alert(`${type} Pickup Confirmed for ${id}`);
      // In real app, update status to 'Picked Up' or 'Out for Delivery' (for replacement)
  };

  const handleDeliver = (id: string) => {
      alert(`Replacement Delivered for ${id}`);
  };

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader />
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-semibold">Tasks</h2>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-white rounded-xl mb-4 border border-neutral-200">
            <button
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'return' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-neutral-500'}`}
                onClick={() => setActiveTab('return')}
            >
                Return Pickups
            </button>
            <button
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'replacement' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-neutral-500'}`}
                onClick={() => setActiveTab('replacement')}
            >
                Replacements
            </button>
        </div>

        {activeTab === 'return' ? (
             <div className="space-y-3">
            {MOCK_RETURNS.map((order) => (
              <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
                 <div className="flex justify-between items-start mb-2">
                     <div>
                         <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">RETURN PICKUP</span>
                         <h3 className="font-semibold text-gray-900 mt-1">{order.id}</h3>
                         <p className="text-sm text-gray-500">{order.customerName}</p>
                     </div>
                     <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{order.status}</span>
                 </div>
                 <p className="text-xs text-gray-500 mb-3">{order.address}</p>
                 <button
                    onClick={() => handlePickup(order.id, 'Return')}
                    className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                 >
                     Confirm Pickup
                 </button>
              </div>
            ))}
            {MOCK_RETURNS.length === 0 && <p className="text-center text-gray-500 mt-10">No return tasks.</p>}
          </div>
        ) : (
             <div className="space-y-3">
            {MOCK_REPLACEMENTS.map((order) => (
              <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm border border-neutral-200">
                 <div className="flex justify-between items-start mb-2">
                     <div>
                         <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">REPLACEMENT</span>
                         <h3 className="font-semibold text-gray-900 mt-1">{order.id}</h3>
                         <p className="text-sm text-gray-500">{order.customerName}</p>
                     </div>
                     <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{order.status}</span>
                 </div>
                 <p className="text-xs text-gray-500 mb-3">{order.address}</p>
                 <div className="flex gap-2">
                     <button
                        onClick={() => handlePickup(order.id, 'Replacement Old Item')}
                        className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                     >
                         Pickup Old Item
                     </button>
                      <button
                        onClick={() => handleDeliver(order.id)}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                     >
                         Deliver New Item
                     </button>
                 </div>
              </div>
            ))}
            {MOCK_REPLACEMENTS.length === 0 && <p className="text-center text-gray-500 mt-10">No replacement tasks.</p>}
          </div>
        )}
      </div>
      <DeliveryBottomNav />
    </div>
  );
}

