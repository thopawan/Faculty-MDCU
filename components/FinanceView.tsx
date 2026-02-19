
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Printer, FileText, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, User, Save, Edit2, Lock } from 'lucide-react';
import { Booking, BookingStatus, PaymentStatus, Transaction } from '../types';
import StatusBadge from './StatusBadge';

interface FinanceViewProps {
  bookings: Booking[];
  onUpdateBooking: (b: Booking) => void;
}

interface FinancialRowItem {
    id: string; // Transaction ID or Temp ID
    bookingNo: string;
    description: string;
    amount: number;
    status: 'Paid' | 'Unpaid';
    receiptNumber: string;
    updatedBy: string;
    isPersisted: boolean; // True if it's from booking.transactions, False if calculated balance
}

const FinanceView: React.FC<FinanceViewProps> = ({ bookings, onUpdateBooking }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [printShift, setPrintShift] = useState<'AM' | 'PM' | null>(null);
  
  // State for editing receipt in the dropdown
  // Key: TransactionID/RowID, Value: Draft Receipt String
  const [draftReceipts, setDraftReceipts] = useState<{[key: string]: string}>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const formattedDate = currentDate.toISOString().split('T')[0];
  const displayDate = currentDate.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handlePrint = (shift: 'AM' | 'PM') => {
    setPrintShift(shift);
    setTimeout(() => {
        window.print();
        setTimeout(() => setPrintShift(null), 1000);
    }, 100);
  };

  // Logic: Show active bookings related to finance for the day
  const dailyBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === BookingStatus.Cancelled) return false;
      return b.checkInDate === formattedDate || b.checkOutDate === formattedDate || (b.status === BookingStatus.CheckedIn && b.checkInDate <= formattedDate);
    }).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
  }, [bookings, formattedDate]);

  const totalRevenue = dailyBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const paidCount = dailyBookings.filter(b => b.paymentStatus === PaymentStatus.Paid).length;
  const receiptCount = dailyBookings.reduce((sum, b) => sum + (b.transactions?.filter(t => t.receiptNumber).length || 0), 0);

  // Helper: Generate the rows for the dropdown table
  const getBookingFinancialRows = (b: Booking): FinancialRowItem[] => {
      const rows: FinancialRowItem[] = [];
      const storedTransactions = b.transactions || [];
      
      // 1. Add existing (Paid/Saved) transactions
      storedTransactions.forEach(t => {
          rows.push({
              id: t.id,
              bookingNo: b.bookingNo,
              description: t.type,
              amount: t.amount,
              status: t.status,
              receiptNumber: t.receiptNumber || '',
              updatedBy: t.updatedBy || 'System',
              isPersisted: true
          });
      });

      // 2. Calculate Pending Balance
      const totalPaid = storedTransactions.reduce((sum, t) => sum + t.amount, 0);
      const balance = b.totalAmount - totalPaid;

      if (balance > 0) {
          // Identify what this balance is likely for (simplified logic)
          let reason = "Room Charge";
          if (storedTransactions.some(t => t.type === 'Room Charge')) {
              reason = "Extension / Balance Due";
          } else if (b.earlyCheckInSurcharge || b.lateCheckOutSurcharge) {
             // If nothing paid yet, could be combined
             reason = "Total Charges (Incl. Fees)";
          }

          rows.push({
              id: `temp-${b.id}`, // Temporary ID for input
              bookingNo: b.bookingNo,
              description: reason,
              amount: balance,
              status: 'Unpaid',
              receiptNumber: '',
              updatedBy: '-',
              isPersisted: false
          });
      }

      return rows;
  };

  // Helper: Get Nights
  const getNights = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
  };

  const handleSaveReceipt = (booking: Booking, row: FinancialRowItem, receiptVal: string) => {
      if (!receiptVal.trim()) return;

      const newTransaction: Transaction = {
          id: row.isPersisted ? row.id : `tx-${Date.now()}`,
          type: row.description as any,
          amount: row.amount,
          status: 'Paid',
          receiptNumber: receiptVal,
          updatedBy: 'Admin', // In real app, use currentUser
          timestamp: new Date().toISOString()
      };

      let updatedTransactions = [...(booking.transactions || [])];

      if (row.isPersisted) {
          // Update existing
          updatedTransactions = updatedTransactions.map(t => 
              t.id === row.id ? { ...t, receiptNumber: receiptVal, status: 'Paid' } : t
          );
      } else {
          // Create new
          updatedTransactions.push(newTransaction);
      }

      // Recalculate Booking Level Status
      const totalPaid = updatedTransactions.reduce((sum, t) => sum + t.amount, 0);
      const isFullyPaid = totalPaid >= booking.totalAmount;

      const updatedBooking = {
          ...booking,
          transactions: updatedTransactions,
          paidAmount: totalPaid,
          paymentStatus: isFullyPaid ? PaymentStatus.Paid : PaymentStatus.Unpaid
          // Legacy receiptNumber field could be updated with the latest one, but we focus on transactions now
      };

      onUpdateBooking(updatedBooking);
      setEditingRowId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[200px]">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Revenue Date</span>
            <h2 className="text-xl font-bold text-gray-800">{displayDate}</h2>
          </div>
          <button onClick={handleNextDay} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
             <div className="text-xs text-gray-500 font-medium mr-2">Print Report:</div>
            <button 
                onClick={() => handlePrint('AM')}
                className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white hover:bg-black rounded-lg font-bold shadow-sm transition-colors text-xs"
            >
                <Printer className="w-4 h-4" /> AM (Before 12:00)
            </button>
            <button 
                onClick={() => handlePrint('PM')}
                className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white hover:bg-black rounded-lg font-bold shadow-sm transition-colors text-xs"
            >
                <Printer className="w-4 h-4" /> PM (After 12:00)
            </button>
        </div>
      </div>

      {/* Stats Cards (No Print) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-xs font-bold uppercase mb-1">Expected Revenue</div>
            <div className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} <span className="text-sm font-normal text-gray-400">THB</span></div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-xs font-bold uppercase mb-1">Payment Status</div>
            <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-green-600">{paidCount}</div>
                <div className="text-sm text-gray-400">Paid / {dailyBookings.length} Guests</div>
            </div>
         </div>
         <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-xs font-bold uppercase mb-1">Receipts Issued</div>
            <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-primary-600">{receiptCount}</div>
                <div className="text-sm text-gray-400">Transactions</div>
            </div>
         </div>
      </div>

      {/* Printable Report Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none print:w-full">
         <div className="p-6 border-b border-gray-200 hidden print:block">
            <h1 className="text-xl font-bold text-gray-900 text-center uppercase mb-1">
                Daily Income Report {printShift && `(${printShift} Shift)`}
            </h1>
            <p className="text-center text-gray-600 text-sm">Faculty Dormitory @ MDCU</p>
            <p className="text-center text-gray-500 text-sm mt-2">Date: {displayDate}</p>
         </div>

         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 print:bg-gray-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16">Room</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Booker / Guest</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Organization</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Total (THB)</th>
                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Nights</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black no-print">Status</th>
                        <th className="px-4 py-3 text-center w-10 no-print"></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {dailyBookings.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">No transactions found for this date.</td>
                        </tr>
                    ) : (
                        dailyBookings.map((booking) => {
                            const financialRows = getBookingFinancialRows(booking);
                            const isExpanded = expandedBookingId === booking.id;
                            const nights = getNights(booking.checkInDate, booking.checkOutDate);

                            return (
                                <React.Fragment key={booking.id}>
                                    <tr 
                                        onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                                        className={`transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{booking.roomNumber}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{booking.bookerName}</div>
                                            {booking.guestName !== booking.bookerName && (
                                                <div className="text-xs text-gray-500">Guest: {booking.guestName}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{booking.organization}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono font-medium text-right">
                                            {booking.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 text-center font-mono">
                                            {nights}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap no-print">
                                            <StatusBadge status={booking.paymentStatus} type="payment" />
                                        </td>
                                        <td className="px-4 py-4 text-gray-400 text-center no-print">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </td>
                                    </tr>
                                    
                                    {/* DROPDOWN DETAILS */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={7} className="bg-gray-50 px-6 py-4 border-b border-gray-200 shadow-inner">
                                                <div className="mb-2 text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                                    <FileText className="w-4 h-4" /> Receipt Breakdown
                                                </div>
                                                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                                                    <table className="min-w-full divide-y divide-gray-100">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">Booking No.</th>
                                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">Transaction Reason</th>
                                                                <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">Amount (THB)</th>
                                                                <th className="px-4 py-2 text-center text-xs font-bold text-gray-500">Status</th>
                                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">Updated By</th>
                                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 w-48">Receipt No.</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50">
                                                            {financialRows.map((row) => {
                                                                const isEditing = editingRowId === row.id;
                                                                const draftVal = draftReceipts[row.id] !== undefined ? draftReceipts[row.id] : row.receiptNumber;

                                                                return (
                                                                    <tr key={row.id} className="hover:bg-gray-50">
                                                                        <td className="px-4 py-2 text-xs font-mono text-gray-600">
                                                                            {row.bookingNo}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-xs font-medium text-gray-800">
                                                                            {row.description}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-xs text-right font-mono font-bold text-gray-900">
                                                                            {row.amount.toLocaleString()}
                                                                        </td>
                                                                        <td className="px-4 py-2 text-center">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] border ${
                                                                                row.status === 'Paid' 
                                                                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                                                                : 'bg-orange-100 text-orange-700 border-orange-200'
                                                                            }`}>
                                                                                {row.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-2 text-xs text-gray-500 flex items-center gap-1">
                                                                            <User className="w-3 h-3" /> {row.updatedBy}
                                                                        </td>
                                                                        <td className="px-4 py-2">
                                                                            {/* Receipt Input Logic */}
                                                                            {row.isPersisted && row.receiptNumber && !isEditing ? (
                                                                                <div className="flex items-center justify-between group">
                                                                                    <span className="text-xs font-mono font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                                                                                        {row.receiptNumber}
                                                                                    </span>
                                                                                    <button 
                                                                                        onClick={() => {
                                                                                            setEditingRowId(row.id);
                                                                                            setDraftReceipts(prev => ({...prev, [row.id]: row.receiptNumber}));
                                                                                        }}
                                                                                        className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                                                                        title="Edit Receipt"
                                                                                    >
                                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2">
                                                                                    <input 
                                                                                        type="text"
                                                                                        value={draftVal}
                                                                                        onChange={(e) => setDraftReceipts(prev => ({...prev, [row.id]: e.target.value}))}
                                                                                        className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 outline-none"
                                                                                        placeholder="Enter Receipt No."
                                                                                    />
                                                                                    <button 
                                                                                        onClick={() => handleSaveReceipt(booking, row, draftVal)}
                                                                                        disabled={!draftVal.trim()}
                                                                                        className={`p-1 rounded transition-colors no-print ${
                                                                                            draftVal.trim() 
                                                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                                                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                                                                        }`}
                                                                                        title="Save Receipt"
                                                                                    >
                                                                                        <Save className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                    {isEditing && (
                                                                                        <button
                                                                                            onClick={() => setEditingRowId(null)}
                                                                                            className="p-1 rounded bg-red-50 text-red-500 hover:bg-red-100 no-print"
                                                                                        >
                                                                                            <Lock className="w-3.5 h-3.5" />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}
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
                <tfoot className="bg-gray-50 font-bold print:bg-gray-100">
                    <tr>
                        <td colSpan={3} className="px-6 py-3 text-right text-sm text-gray-700 uppercase">Total Revenue (Daily)</td>
                        <td className="px-6 py-3 text-right text-sm text-gray-900 font-mono underline decoration-double underline-offset-4">
                            {totalRevenue.toLocaleString()}
                        </td>
                        <td colSpan={3}></td>
                    </tr>
                </tfoot>
            </table>
         </div>
         
         {/* Signature Area for Print */}
         <div className="hidden print:flex justify-between mt-16 px-12">
            <div className="text-center">
                <div className="border-b border-black w-48 mb-2"></div>
                <p className="text-xs">เจ้าหน้าที่หอพัก (Dormitory Officer)</p>
            </div>
            <div className="text-center">
                <div className="border-b border-black w-48 mb-2"></div>
                <p className="text-xs">เจ้าหน้าที่การเงิน (Finance Officer)</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default FinanceView;
