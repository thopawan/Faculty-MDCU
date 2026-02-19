
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Download, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, 
  User, Users, Building, Phone, Calendar, CreditCard, FileText, AlertCircle, CheckCircle, Clock, Eye
} from 'lucide-react';
import { Booking, BookingStatus, PaymentStatus } from '../types';
import StatusBadge from './StatusBadge';

interface HistoryViewProps {
  bookings: Booking[];
  onSelectBooking: (b: Booking) => void;
}

interface GroupedGuest {
  id: string; // Phone or Name acting as ID
  bookerName: string;
  bookerPhone: string;
  organization: string;
  bookings: Booking[];
  totalBookings: number;
  totalNights: number;
  latestStayDate: string;
  roomNumbers: Set<string>;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  rateTypes: Set<number>; // 1200 or 1500
  receiptCount: number;
  hasIssues: boolean; // e.g., Unpaid, Missing Receipt
}

const HistoryView: React.FC<HistoryViewProps> = ({ bookings, onSelectBooking }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [financeFilter, setFinanceFilter] = useState<string>('All');
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);

  const displayDate = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // --- 1. Filter Data by Date & Search ---
  const filteredBookings = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    return bookings.filter(b => {
      const bDate = new Date(b.checkInDate);
      
      // Date Filter (Check-in within selected month)
      if (bDate.getFullYear() !== year || bDate.getMonth() !== month) return false;

      // Search Filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        b.bookerName.toLowerCase().includes(searchLower) ||
        b.bookerPhone.includes(searchLower) ||
        b.organization.toLowerCase().includes(searchLower) ||
        b.bookingNo.toLowerCase().includes(searchLower) ||
        (b.receiptNumber && b.receiptNumber.toLowerCase().includes(searchLower)) ||
        (b.licensePlate && b.licensePlate.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter !== 'All' && b.status !== statusFilter) return false;

      // Finance Filter
      if (financeFilter === 'Paid' && b.paymentStatus !== PaymentStatus.Paid) return false;
      if (financeFilter === 'Unpaid' && b.paymentStatus !== PaymentStatus.Unpaid) return false;
      
      // Calculate real balance for 'Due' filter
      const paid = b.paidAmount || 0;
      const isDue = b.totalAmount > paid;
      if (financeFilter === 'Due' && !isDue) return false;

      return true;
    });
  }, [bookings, currentDate, searchTerm, statusFilter, financeFilter]);

  // --- 2. Group by Person (Phone or Name) ---
  const groupedGuests = useMemo(() => {
    const groups: { [key: string]: GroupedGuest } = {};

    filteredBookings.forEach(b => {
      // Use Phone as primary key, fallback to Name
      const key = b.bookerPhone ? b.bookerPhone.trim() : b.bookerName.trim();

      if (!groups[key]) {
        groups[key] = {
          id: key,
          bookerName: b.bookerName,
          bookerPhone: b.bookerPhone,
          organization: b.organization,
          bookings: [],
          totalBookings: 0,
          totalNights: 0,
          latestStayDate: '',
          roomNumbers: new Set(),
          totalAmount: 0,
          paidAmount: 0,
          balanceDue: 0,
          rateTypes: new Set(),
          receiptCount: 0,
          hasIssues: false,
        };
      }

      const g = groups[key];
      g.bookings.push(b);
      g.totalBookings++;
      
      // Calculate Nights
      const start = new Date(b.checkInDate);
      const end = new Date(b.checkOutDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
      g.totalNights += diff > 0 ? diff : 1;

      // Latest Date
      if (!g.latestStayDate || b.checkInDate > g.latestStayDate) {
        g.latestStayDate = b.checkInDate;
      }

      g.roomNumbers.add(b.roomNumber);
      g.totalAmount += b.totalAmount;
      g.paidAmount += (b.paidAmount || 0);
      g.balanceDue = g.totalAmount - g.paidAmount;
      g.rateTypes.add(b.rate);
      if (b.receiptNumber) g.receiptCount++;

      // Issue Flags
      if (b.paymentStatus === PaymentStatus.Unpaid || g.balanceDue > 0) g.hasIssues = true;
      if (b.status === BookingStatus.Cancelled) g.hasIssues = true;
    });

    return Object.values(groups).sort((a, b) => b.latestStayDate.localeCompare(a.latestStayDate));
  }, [filteredBookings]);

  // --- 3. Summary Metrics ---
  const summary = useMemo(() => {
    const totalPeople = groupedGuests.length;
    let totalRevenue = 0;
    let totalDue = 0;
    let internalCount = 0;
    let externalCount = 0;

    groupedGuests.forEach(g => {
        totalRevenue += g.totalAmount;
        totalDue += g.balanceDue;
        
        // Count classification (if mixed, count as External usually, or both. Here strictly by predominant rate)
        const hasInternal = g.rateTypes.has(1200);
        const hasExternal = g.rateTypes.has(1500);
        if (hasInternal) internalCount++;
        else if (hasExternal) externalCount++;
    });

    // Top 5 Guests
    const topGuests = [...groupedGuests]
        .sort((a, b) => b.totalNights - a.totalNights)
        .slice(0, 5);

    const guestsWithIssues = groupedGuests.filter(g => g.hasIssues).length;

    return { totalPeople, totalRevenue, totalDue, internalCount, externalCount, topGuests, guestsWithIssues };
  }, [groupedGuests]);

  // --- 4. Exports ---
  const exportCSV = (type: 'summary' | 'detail') => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (type === 'summary') {
        csvContent += "Name,Phone,Organization,Total Bookings,Total Nights,Latest Stay,Total Amount,Paid,Due,Issues\n";
        groupedGuests.forEach(g => {
            const row = [
                `"${g.bookerName}"`,
                `"${g.bookerPhone}"`,
                `"${g.organization}"`,
                g.totalBookings,
                g.totalNights,
                g.latestStayDate,
                g.totalAmount,
                g.paidAmount,
                g.balanceDue,
                g.hasIssues ? "Yes" : "No"
            ].join(",");
            csvContent += row + "\n";
        });
    } else {
        csvContent += "Booker Name,Phone,Org,Booking No,Room,Check-In,Check-Out,Status,Total,Paid,Due,Receipt\n";
        groupedGuests.forEach(g => {
            g.bookings.forEach(b => {
                 const due = b.totalAmount - (b.paidAmount || 0);
                 const row = [
                    `"${b.bookerName}"`,
                    `"${b.bookerPhone}"`,
                    `"${b.organization}"`,
                    b.bookingNo,
                    b.roomNumber,
                    b.checkInDate,
                    b.checkOutDate,
                    b.status,
                    b.totalAmount,
                    b.paidAmount || 0,
                    due,
                    b.receiptNumber || ''
                 ].join(",");
                 csvContent += row + "\n";
            });
        });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `history_${type}_${currentDate.toISOString().slice(0, 7)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
           <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 min-w-[200px] justify-center">
             <Calendar className="w-5 h-5 text-primary-600" />
             {displayDate}
           </h2>
           <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search name, phone, booking #..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 w-64"
                />
            </div>
            
            <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white"
            >
                <option value="All">All Status</option>
                {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select 
                value={financeFilter} 
                onChange={(e) => setFinanceFilter(e.target.value)}
                className="py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white"
            >
                <option value="All">All Finance</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Due">Balance Due</option>
            </select>

            <div className="flex gap-2 border-l pl-3 ml-1">
                <button onClick={() => exportCSV('summary')} className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="Export Summary">
                    <FileText className="w-5 h-5" />
                </button>
                <button onClick={() => exportCSV('detail')} className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="Export Details">
                    <Download className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="text-gray-500 text-xs font-bold uppercase mb-1">Total Guests</div>
            <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-gray-900">{summary.totalPeople} <span className="text-sm font-normal text-gray-400">Persons</span></div>
                <Users className="w-8 h-8 text-primary-100 text-opacity-80" />
            </div>
            <div className="mt-2 text-xs flex gap-2">
                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{summary.internalCount} Internal</span>
                <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{summary.externalCount} External</span>
            </div>
         </div>
         
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="text-gray-500 text-xs font-bold uppercase mb-1">Monthly Revenue</div>
            <div className="flex items-end justify-between">
                 <div className="text-2xl font-bold text-gray-900">{summary.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-gray-400">THB</span></div>
                 <CreditCard className="w-8 h-8 text-green-100 text-opacity-80" />
            </div>
            <div className="mt-2 text-xs text-red-600 font-medium">
                 {summary.totalDue > 0 ? `${summary.totalDue.toLocaleString()} THB Outstanding` : 'All Clear'}
            </div>
         </div>

         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="text-gray-500 text-xs font-bold uppercase mb-1">Action Items</div>
            <div className="flex items-end justify-between">
                 <div className="text-2xl font-bold text-gray-900">{summary.guestsWithIssues} <span className="text-sm font-normal text-gray-400">Guests</span></div>
                 <AlertCircle className="w-8 h-8 text-red-100 text-opacity-80" />
            </div>
            <div className="mt-2 text-xs text-gray-500">
                 Require attention (Unpaid/Issues)
            </div>
         </div>

         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div className="text-gray-500 text-xs font-bold uppercase mb-2">Top Frequent Guest</div>
            {summary.topGuests.length > 0 ? (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold">
                        {summary.topGuests[0].bookerName.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-sm text-gray-900 truncate w-32">{summary.topGuests[0].bookerName}</div>
                        <div className="text-xs text-gray-500">{summary.topGuests[0].totalNights} Nights / {summary.topGuests[0].totalBookings} Visits</div>
                    </div>
                </div>
            ) : (
                <div className="text-sm text-gray-400 italic">No data</div>
            )}
         </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
               <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Guest Profile</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stay Summary</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Financials (THB)</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 w-10"></th>
               </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
               {groupedGuests.length === 0 ? (
                   <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No history found for this criteria.</td></tr>
               ) : (
                   groupedGuests.map(guest => {
                       const isExpanded = expandedGuestId === guest.id;
                       const rateTypeLabel = guest.rateTypes.has(1200) && guest.rateTypes.has(1500) ? 'Mixed' 
                                            : guest.rateTypes.has(1200) ? 'Internal' 
                                            : guest.rateTypes.has(1500) ? 'External' : '-';
                       
                       return (
                           <React.Fragment key={guest.id}>
                               <tr 
                                 className={`hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
                                 onClick={() => setExpandedGuestId(isExpanded ? null : guest.id)}
                               >
                                   <td className="px-6 py-4">
                                       <div className="flex items-center gap-3">
                                           <div className="flex-shrink-0">
                                               <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                                                   {guest.bookerName.charAt(0)}
                                               </div>
                                           </div>
                                           <div>
                                               <div className="text-sm font-bold text-gray-900">{guest.bookerName}</div>
                                               <div className="text-xs text-gray-500 flex items-center gap-1">
                                                   <Building className="w-3 h-3" /> {guest.organization}
                                               </div>
                                           </div>
                                       </div>
                                   </td>
                                   <td className="px-6 py-4">
                                       <div className="text-sm text-gray-900 flex items-center gap-2">
                                           <Phone className="w-3 h-3 text-gray-400" /> {guest.bookerPhone}
                                       </div>
                                       <div className="text-xs text-gray-500 mt-1">
                                           Rate: <span className="font-medium bg-gray-100 px-1 rounded">{rateTypeLabel}</span>
                                       </div>
                                   </td>
                                   <td className="px-6 py-4">
                                       <div className="text-sm font-medium text-gray-900">
                                           {guest.totalBookings} Visits <span className="text-gray-400 mx-1">|</span> {guest.totalNights} Nights
                                       </div>
                                       <div className="text-xs text-gray-500 mt-1">
                                           Latest: {guest.latestStayDate}
                                       </div>
                                       <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]">
                                           Rooms: {Array.from(guest.roomNumbers).join(', ')}
                                       </div>
                                   </td>
                                   <td className="px-6 py-4">
                                       <div className="text-sm font-bold text-gray-900">{guest.totalAmount.toLocaleString()}</div>
                                       <div className={`text-xs mt-1 font-medium ${guest.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {guest.balanceDue > 0 ? `Due: ${guest.balanceDue.toLocaleString()}` : 'Paid Complete'}
                                       </div>
                                       <div className="text-[10px] text-gray-400 mt-0.5">
                                            {guest.receiptCount} Receipts
                                       </div>
                                   </td>
                                   <td className="px-6 py-4">
                                       {guest.hasIssues ? (
                                           <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                               <AlertCircle className="w-3 h-3" /> Action
                                           </span>
                                       ) : (
                                           <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                               <CheckCircle className="w-3 h-3" /> Clear
                                           </span>
                                       )}
                                   </td>
                                   <td className="px-6 py-4 text-right text-gray-400">
                                       {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                   </td>
                               </tr>
                               
                               {/* Expandable Detail Row */}
                               {isExpanded && (
                                   <tr>
                                       <td colSpan={6} className="bg-gray-50 px-6 py-4 border-t border-gray-100 shadow-inner">
                                           <div className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                               <FileText className="w-4 h-4" /> Booking History Details ({displayDate})
                                           </div>
                                           <div className="overflow-x-auto rounded-lg border border-gray-200">
                                               <table className="min-w-full divide-y divide-gray-200 bg-white">
                                                   <thead className="bg-gray-100">
                                                       <tr>
                                                           <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">Booking No.</th>
                                                           <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">Dates</th>
                                                           <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">Room</th>
                                                           <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">Status</th>
                                                           <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">Total</th>
                                                           <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">Due</th>
                                                           <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 pl-6">Receipt / Notes</th>
                                                       </tr>
                                                   </thead>
                                                   <tbody className="divide-y divide-gray-100">
                                                       {guest.bookings.map(b => {
                                                            const due = b.totalAmount - (b.paidAmount || 0);
                                                            return (
                                                               <tr 
                                                                  key={b.id} 
                                                                  onClick={() => onSelectBooking(b)}
                                                                  className="hover:bg-blue-50 cursor-pointer transition-colors group"
                                                                  title="Click to view/edit booking details"
                                                               >
                                                                   <td className="px-4 py-2 text-xs font-mono text-gray-700 group-hover:text-blue-700 font-medium">
                                                                      {b.bookingNo}
                                                                   </td>
                                                                   <td className="px-4 py-2 text-xs text-gray-700">
                                                                       {b.checkInDate} <span className="text-gray-400">to</span> {b.checkOutDate}
                                                                   </td>
                                                                   <td className="px-4 py-2 text-xs font-bold text-gray-800">{b.roomNumber}</td>
                                                                   <td className="px-4 py-2 text-xs">
                                                                       <StatusBadge status={b.status} type="booking" />
                                                                   </td>
                                                                   <td className="px-4 py-2 text-xs text-right font-medium">{b.totalAmount.toLocaleString()}</td>
                                                                   <td className={`px-4 py-2 text-xs text-right font-bold ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                       {due > 0 ? due.toLocaleString() : '-'}
                                                                   </td>
                                                                   <td className="px-4 py-2 text-xs text-gray-600 pl-6 flex justify-between items-center">
                                                                       <div className="flex flex-col">
                                                                           {b.receiptNumber ? (
                                                                               <div className="flex items-center gap-1 text-green-700 mb-0.5">
                                                                                   <FileText className="w-3 h-3" /> {b.receiptNumber}
                                                                               </div>
                                                                           ) : (
                                                                               <div className="text-red-400 italic mb-0.5">No Receipt</div>
                                                                           )}
                                                                           
                                                                           <div className="flex gap-2">
                                                                              {b.earlyCheckInSurcharge ? <span className="bg-orange-50 text-orange-600 px-1 rounded text-[9px] border border-orange-100">Early In</span> : null}
                                                                              {b.lateCheckOutSurcharge ? <span className="bg-orange-50 text-orange-600 px-1 rounded text-[9px] border border-orange-100">Late Out</span> : null}
                                                                              {b.notes && <span className="text-gray-400 italic truncate max-w-[100px]" title={b.notes}>"{b.notes}"</span>}
                                                                           </div>
                                                                       </div>
                                                                       <Eye className="w-4 h-4 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                   </td>
                                                               </tr>
                                                            );
                                                       })}
                                                   </tbody>
                                               </table>
                                           </div>
                                       </td>
                                   </tr>
                               )}
                           </React.Fragment>
                       );
                   })
               )}
            </tbody>
         </table>
      </div>
    </div>
  );
};

export default HistoryView;
