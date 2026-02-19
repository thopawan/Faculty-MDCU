import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Printer, Car, Phone } from 'lucide-react';
import { Booking, BookingStatus, Room } from '../types';

interface ParkingViewProps {
  bookings: Booking[];
  rooms: Room[];
}

const ParkingView: React.FC<ParkingViewProps> = ({ bookings, rooms }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

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

  // Logic: Show active stays for the selected date that have a license plate
  const parkingList = useMemo(() => {
    return bookings.filter(b => {
      // Must be active (not cancelled)
      if (b.status === BookingStatus.Cancelled) return false;
      
      // Must have license plate
      if (!b.licensePlate || b.licensePlate.trim() === '') return false;

      // Must be staying on this date (Inclusive of Check-in and Check-out date range)
      return b.checkInDate <= formattedDate && b.checkOutDate >= formattedDate;
    }).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
  }, [bookings, formattedDate]);

  const totalRooms = rooms.length; // Count total rooms from props

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[200px]">
            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Date</span>
            <h2 className="text-xl font-bold text-gray-800">{displayDate}</h2>
          </div>
          <button onClick={handleNextDay} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
            <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white hover:bg-black rounded-lg font-medium shadow-sm transition-colors"
            >
                <Printer className="w-4 h-4" /> Print List
            </button>
        </div>
      </div>

      {/* Stats Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm no-print">
         <div className="flex items-center justify-between">
            <div>
                <div className="text-gray-500 text-xs font-bold uppercase mb-1">Vehicles Parked Today</div>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900">{parkingList.length}</span>
                    <span className="text-lg text-gray-400 font-medium">/ {totalRooms} Rooms</span>
                </div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6" />
            </div>
         </div>
      </div>

      {/* Printable Report Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none print:w-full">
         <div className="p-6 border-b border-gray-200 hidden print:block">
            <h1 className="text-xl font-bold text-gray-900 text-center uppercase mb-1">Daily Parking List</h1>
            <p className="text-center text-gray-600 text-sm">Faculty Dormitory @ MDCU</p>
            <p className="text-center text-gray-500 text-sm mt-2">Date: {displayDate}</p>
         </div>

         <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 print:bg-gray-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black w-24">Room</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">License Plate (ทะเบียนรถ)</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Owner / Guest</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black w-48">Note</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {parkingList.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                <Car className="w-12 h-12 mx-auto text-gray-200 mb-2" />
                                No vehicles registered for this date.
                            </td>
                        </tr>
                    ) : (
                        parkingList.map((booking) => (
                            <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-gray-900">{booking.roomNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="inline-flex items-center px-3 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 font-bold font-mono text-base print:border-black print:bg-transparent print:text-black">
                                        {booking.licensePlate}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{booking.bookerName}</div>
                                    {booking.guestName !== booking.bookerName && (
                                        <div className="text-xs text-gray-500">Guest: {booking.guestName}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-3 h-3 text-gray-400" />
                                        {booking.bookerPhone}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-l border-gray-100 bg-gray-50/50 print:bg-transparent">
                                    {/* Empty space for security guard notes */}
                                    <div className="h-4 w-full border-b border-gray-200 border-dotted print:border-gray-400"></div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
         </div>
         
         {/* Footer for Print */}
         <div className="hidden print:block mt-8 px-6 pb-6">
            <div className="flex justify-between items-end">
                <div className="text-xs text-gray-400">
                    Generated on {new Date().toLocaleString('th-TH')}
                </div>
                <div className="text-center">
                    <div className="border-b border-black w-40 mb-2"></div>
                    <p className="text-xs">Security Guard (รปภ.)</p>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ParkingView;