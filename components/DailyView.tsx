import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Clock, Eye, Car, Home, LogIn, LogOut } from 'lucide-react';
import { Booking, BookingStatus } from '../types';
import StatusBadge from './StatusBadge';
import BookingDetailModal from './BookingDetailModal';

interface DailyViewProps {
  bookings: Booking[];
  onUpdateBooking: (b: Booking) => void;
  onDeleteBooking: (id: string) => void;
}

const DailyView: React.FC<DailyViewProps> = ({ bookings, onUpdateBooking, onDeleteBooking }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [activeTab, setActiveTab] = useState<'arrivals' | 'departures' | 'stayovers'>('arrivals');

  const formattedDate = currentDate.toISOString().split('T')[0];
  const displayDate = currentDate.toLocaleDateString('en-GB', {
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

  // Helper: Format Date as dd/mm
  const formatDateShort = (dateStr: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`; // dd/mm
    return dateStr;
  };

  // Helper: Calculate Nights
  const getNights = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
  };

  // Filter Lists
  const checkIns = useMemo(() => {
    return bookings.filter(b => b.checkInDate === formattedDate && b.status !== BookingStatus.Cancelled);
  }, [bookings, formattedDate]);

  const checkOuts = useMemo(() => {
    return bookings.filter(b => b.checkOutDate === formattedDate && b.status !== BookingStatus.Cancelled);
  }, [bookings, formattedDate]);

  const stayOvers = useMemo(() => {
    return bookings.filter(b => 
        b.checkInDate < formattedDate && 
        b.checkOutDate > formattedDate && 
        b.status !== BookingStatus.Cancelled
    );
  }, [bookings, formattedDate]);

  // Calculate statistics
  const arrivedCount = checkIns.filter(b => b.status === BookingStatus.CheckedIn || b.status === BookingStatus.CheckedOut).length;
  const departedCount = checkOuts.filter(b => b.status === BookingStatus.CheckedOut).length;

  // Calculate Parking Card Returns (Guests checking out with License Plate)
  const parkingTotal = checkOuts.filter(b => b.licensePlate && b.licensePlate.trim() !== '').length;
  const parkingCollected = checkOuts.filter(b => b.licensePlate && b.licensePlate.trim() !== '' && b.status === BookingStatus.CheckedOut).length;

  const BookingTable = ({ data, type }: { data: Booking[], type: 'in' | 'out' | 'stay' }) => {
    let headerBg = "bg-gray-50";
    if (type === 'in') headerBg = "bg-blue-50";
    else if (type === 'out') headerBg = "bg-purple-50";
    else if (type === 'stay') headerBg = "bg-orange-50";

    return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm relative min-h-[300px]">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className={headerBg}>
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Room</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Dates</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Booker / Guest</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Organization</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Payment</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
               {type === 'in' ? 'Check-in Time' : type === 'out' ? 'Check-out Time' : 'Current Status'}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Total Amount</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Nights</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">License Plate</th>
            <th scope="col" className={`px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider sticky right-0 z-10 ${headerBg} shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]`}>
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={11} className="px-6 py-12 text-center text-gray-500 italic">
                {type === 'in' && 'No arrivals scheduled for this date.'}
                {type === 'out' && 'No departures scheduled for this date.'}
                {type === 'stay' && 'No stay-over guests for this date.'}
              </td>
            </tr>
          ) : (
            data.map((booking) => (
              <tr 
                key={booking.id} 
                onClick={() => setSelectedBooking(booking)}
                className="hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{booking.roomNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                   {formatDateShort(booking.checkInDate)} - {formatDateShort(booking.checkOutDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{booking.bookerName}</div>
                  <div className="text-xs text-gray-500">{booking.guestName !== booking.bookerName ? `Guest: ${booking.guestName}` : ''}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.organization}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={booking.status} type="booking" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={booking.paymentStatus} type="payment" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {type === 'in' && (
                     <div className="flex flex-col">
                        <span className={booking.checkInTime ? "font-bold text-green-700" : ""}>
                            {booking.checkInTime || '-'}
                        </span>
                        {booking.expectedCheckInTime && !booking.checkInTime && (
                            <span className="text-xs text-gray-400">Exp: {booking.expectedCheckInTime}</span>
                        )}
                     </div>
                  )}
                  {type === 'out' && (
                     <div className="flex flex-col">
                        <span>{booking.expectedCheckOutTime || '12:00'}</span>
                     </div>
                  )}
                  {type === 'stay' && (
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">In House</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                  {booking.totalAmount ? booking.totalAmount.toLocaleString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                  {getNights(booking.checkInDate, booking.checkOutDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                  {booking.licensePlate || '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center sticky right-0 bg-white group-hover:bg-gray-50 transition-colors shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                   <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBooking(booking);
                      }}
                      className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm"
                   >
                     <Eye className="w-3.5 h-3.5" /> View
                   </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">{displayDate}</h2>
        </div>
        <button onClick={handleNextDay} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Check-ins Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">CHECK-INS TODAY</p>
            <div className="text-4xl font-bold text-gray-900 mb-2 font-mono">
              {arrivedCount} <span className="text-gray-400 text-2xl font-normal">/ {checkIns.length}</span>
            </div>
            <p className="text-xs text-gray-400 font-medium">Arrived / Scheduled</p>
          </div>
          <div className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-blue-200 shadow-lg">
            <Check className="w-7 h-7 stroke-[3]" />
          </div>
        </div>

        {/* Check-outs Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">CHECK-OUTS TODAY</p>
            <div className="text-4xl font-bold text-gray-900 mb-2 font-mono">
              {departedCount} <span className="text-gray-400 text-2xl font-normal">/ {checkOuts.length}</span>
            </div>
            <p className="text-xs text-gray-400 font-medium">Departed / Scheduled</p>
          </div>
          <div className="w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
            <Clock className="w-7 h-7 stroke-[3]" />
          </div>
        </div>

        {/* Parking Returns Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">PARKING RETURNS</p>
            <div className="text-4xl font-bold text-gray-900 mb-2 font-mono">
              {parkingCollected} <span className="text-gray-400 text-2xl font-normal">/ {parkingTotal}</span>
            </div>
            <p className="text-xs text-gray-400 font-medium">Cards Collected / Expected</p>
          </div>
          <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-orange-200 shadow-lg">
            <Car className="w-7 h-7 stroke-[3]" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('arrivals')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'arrivals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <LogIn className="w-4 h-4" />
            Arrival List
            <span className={`ml-2 rounded-full py-0.5 px-2.5 text-xs font-medium ${activeTab === 'arrivals' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-900'}`}>
              {checkIns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('departures')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'departures'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <LogOut className="w-4 h-4" />
            Departure List
            <span className={`ml-2 rounded-full py-0.5 px-2.5 text-xs font-medium ${activeTab === 'departures' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-900'}`}>
              {checkOuts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('stayovers')}
            className={`
              flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${activeTab === 'stayovers'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <Home className="w-4 h-4" />
            Stay-overs (In House)
            <span className={`ml-2 rounded-full py-0.5 px-2.5 text-xs font-medium ${activeTab === 'stayovers' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-900'}`}>
              {stayOvers.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pt-2 animate-in fade-in duration-200">
        {activeTab === 'arrivals' && (
           <BookingTable data={checkIns} type="in" />
        )}
        {activeTab === 'departures' && (
           <BookingTable data={checkOuts} type="out" />
        )}
        {activeTab === 'stayovers' && (
           <BookingTable data={stayOvers} type="stay" />
        )}
      </div>

      {selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking} 
          allBookings={bookings}
          onClose={() => setSelectedBooking(null)}
          onUpdate={onUpdateBooking}
          onDelete={(id) => {
            onDeleteBooking(id);
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
};

export default DailyView;