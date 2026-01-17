import React, { useState } from 'react';

const AdminPOSReport = () => {
  const [dateRange, setDateRange] = useState('12/09/2025 - 12/09/2025');
  const [selectedSeller, setSelectedSeller] = useState('All Sellers');
  const [paymentMethod, setPaymentMethod] = useState('All Payment Methods');
  const [entries, setEntries] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="p-4 bg-gray-50 min-h-screen font-sans">
      {/* Header / Breadcrumb */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-gray-800">POS Report</h1>
        <div className="text-sm text-gray-500">
           Dashboard / <span className="text-blue-600">POS Report</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">

        {/* Card Header */}
        <div className="bg-[#009688] px-4 py-3">
           <h2 className="text-white font-medium text-base">View POS Report</h2>
        </div>

        {/* Filters Section */}
        <div className="p-4 border-b border-gray-100 flex flex-col gap-5 text-sm text-gray-700">

           {/* Row 1: Primary Filters */}
           <div className="flex flex-col xl:flex-row gap-4 xl:items-center">

              {/* Date Filter */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                 <span className="whitespace-nowrap font-medium text-gray-600">From - To Order Date:</span>
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                     <div className="relative flex items-center border border-gray-300 rounded px-2 py-1.5 bg-white flex-1 sm:w-64 shadow-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 mr-2 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <input type="text" value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full focus:outline-none text-gray-600 font-medium bg-transparent" />
                     </div>
                     <button className="bg-[#333] hover:bg-black text-white px-4 py-1.5 rounded transition-colors shadow-sm font-medium" onClick={() => setDateRange('')}>Clear</button>
                 </div>
              </div>

              {/* Dropdowns */}
              <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto mt-2 sm:mt-0">
                 <select
                    className="border border-gray-300 rounded px-3 py-1.5 bg-white w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-gray-600 shadow-sm"
                    value={selectedSeller}
                    onChange={(e) => setSelectedSeller(e.target.value)}
                 >
                    <option>All Sellers</option>
                    <option>Seller A</option>
                    <option>Seller B</option>
                 </select>

                 <select
                    className="border border-gray-300 rounded px-3 py-1.5 bg-white w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium text-gray-600 shadow-sm"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                 >
                    <option>All Payment Methods</option>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>UPI</option>
                 </select>
              </div>
           </div>

           {/* Row 2: Table Control Actions */}
           <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">

              {/* Left: Show Entries & Export */}
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                 <div className="flex items-center gap-2">
                     <span className="text-gray-600 font-medium">Show</span>
                     <select
                       className="border border-gray-300 rounded px-3 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-sm"
                       value={entries}
                       onChange={(e) => setEntries(Number(e.target.value))}
                     >
                        <option>10</option>
                        <option>25</option>
                        <option>50</option>
                     </select>
                     <span className="text-gray-600 font-medium">entries</span>
                 </div>

                 <button className="bg-[#009688] hover:bg-teal-700 text-white px-4 py-1.5 rounded flex items-center gap-2 transition-colors shadow-sm text-xs font-bold uppercase tracking-wide">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export
                 </button>
              </div>

              {/* Right: Search */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                 <span className="text-gray-600 font-medium">Search:</span>
                 <input
                   type="text"
                   placeholder="Search..."
                   className="border border-gray-300 rounded px-3 py-1.5 w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-sm"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
              </div>
           </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="bg-white text-xs font-bold text-gray-500 uppercase border-b border-gray-200 tracking-wider">
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-50 whitespace-nowrap">O. ID <span className="text-[10px] ml-1">⇅</span></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-50 whitespace-nowrap">CUSTOMER DETAILS <span className="text-[10px] ml-1">⇅</span></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-50 whitespace-nowrap">MOBILE <span className="text-[10px] ml-1">⇅</span></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-50 whitespace-nowrap">DATE <span className="text-[10px] ml-1">⇅</span></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-50 whitespace-nowrap">PAYMENT METHOD <span className="text-[10px] ml-1">⇅</span></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-50 whitespace-nowrap">AMOUNT <span className="text-[10px] ml-1">⇅</span></th>
                    <th className="px-4 py-3 cursor-pointer hover:bg-gray-50 whitespace-nowrap">BILL BY <span className="text-[10px] ml-1">⇅</span></th>
                    <th className="px-4 py-3 whitespace-nowrap">INVOICE</th>
                 </tr>
              </thead>
              <tbody className="text-sm">
                 {/* Empty State Row */}
                 <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 border-b border-gray-200 bg-white">
                       No data available in table
                    </td>
                 </tr>
              </tbody>
           </table>
        </div>

        {/* Footer / Pagination */}
        <div className="p-4 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
           <div>
              Showing 1 to 0 of 0 entries
           </div>
           <div className="flex gap-1">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled>&lt;</button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled>&gt;</button>
           </div>
        </div>

      </div>

      <div className="mt-8 text-center text-xs text-teal-600">
         Copyright © 2025. Developed By Appzeto - 10 Minute App
      </div>

    </div>
  );
};

export default AdminPOSReport;
