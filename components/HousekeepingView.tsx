import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Printer, AlertTriangle } from 'lucide-react';
import { Booking, Room, BookingStatus } from '../types';

interface HousekeepingViewProps {
  bookings: Booking[];
  rooms: Room[];
}

const HousekeepingView: React.FC<HousekeepingViewProps> = ({ bookings, rooms }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFloor, setSelectedFloor] = useState("8");

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

  const floorRooms = rooms.filter(r => r.floor === selectedFloor);

  const checklistItems = [
    { name: 'ปลอกหมอน', count: 2 },
    { name: 'ผ้าปูที่นอน', count: 1 },
    { name: 'ผ้าเช็ดตัว', count: 2 },
    { name: 'ผ้าเช็ดมือ', count: 2 },
    { name: 'ผ้าเช็ดเท้า', count: 1 },
    { name: 'ผ้ารอง', count: 1 },
    { name: 'ผ้าห่ม', count: 2 },
    { name: 'ทิชชู่ม้วน', count: 1 },
    { name: 'ทิชชู่กล่อง', count: 1 },
    { name: 'แชมพู', count: 2 },
    { name: 'สบู่', count: 2 },
    { name: 'น้ำดื่ม', count: 2 },
    { name: 'ถุงอนามัย', count: 2 },
    { name: 'หมวกอาบน้ำ', count: 2 },
    { name: 'ถุงห่อแก้ว', count: 2 },
  ];

  // Process data for the table
  const rowData = useMemo(() => {
    return floorRooms.map(room => {
      // Filter valid bookings
      const activeBookings = bookings.filter(b => b.status !== BookingStatus.Cancelled);
      
      const checkIn = activeBookings.some(b => b.roomNumber === room.number && b.checkInDate === formattedDate);
      const checkOut = activeBookings.some(b => b.roomNumber === room.number && b.checkOutDate === formattedDate);
      
      const activeBooking = activeBookings.find(b => 
        b.roomNumber === room.number && 
        b.checkInDate <= formattedDate && 
        b.checkOutDate >= formattedDate
      );
      
      const isOccupied = !!activeBooking;
      const isCheckInDay = activeBooking?.checkInDate === formattedDate;
      
      // Logic: Show count '2' only if occupied AND NOT check-in date
      const showCount2 = isOccupied && !isCheckInDay;
      
      // Maintenance logic
      let isMaintenance = false;
      if (room.status === 'Maintenance') {
          if (!room.maintenanceStart || !room.maintenanceEnd) {
              isMaintenance = true;
          } else if (formattedDate >= room.maintenanceStart && formattedDate <= room.maintenanceEnd) {
              isMaintenance = true;
          }
      }
      // If occupied, do NOT treat as maintenance for display blocking purposes
      const showMaintenance = isMaintenance && !isOccupied;

      return {
        room,
        checkIn,
        checkOut,
        showCount2,
        isMaintenance,
        showMaintenance
      };
    });
  }, [floorRooms, bookings, formattedDate]);

  // Calculate Totals
  const totalCountValue = rowData.reduce((sum, r) => sum + (r.showCount2 ? 2 : 0), 0);
  const totalIn = rowData.filter(r => r.checkIn).length;
  const totalOut = rowData.filter(r => r.checkOut).length;

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
        <div className="flex items-center gap-4">
           <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center">
             <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Date</span>
             <h2 className="text-xl font-bold text-gray-800 min-w-[180px] text-center">{displayDate}</h2>
          </div>
          <button onClick={handleNextDay} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-gray-400 font-bold uppercase">Floor</label>
            <select 
              value={selectedFloor} 
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="border-gray-300 border rounded-lg py-2 px-3 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="8">Floor 8</option>
              <option value="9">Floor 9</option>
            </select>
          </div>
          <div className="h-8 w-px bg-gray-200 mx-2"></div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 rounded-lg font-medium shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Checklist
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:p-0 print:w-full print:h-screen flex flex-col">
        <div className="mb-4 text-center hidden print:block">
           <h1 className="text-lg font-bold">Housekeeping Checklist - Faculty @ MDCU</h1>
           <p className="text-sm text-gray-600">วันที่ (Date): {displayDate} | ชั้น (Floor): {selectedFloor}</p>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full table-fixed border-collapse border border-gray-300 text-[10px] print:text-[9px]">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="border border-gray-400 p-1 text-center">ห้อง<br/>(Room)</th>
                <th className="border border-gray-400 p-1 text-center">จำนวน<br/>(2)</th>
                <th className="border border-gray-400 p-1 text-center bg-green-50">เข้า<br/>(In)</th>
                <th className="border border-gray-400 p-1 text-center bg-red-50">ออก<br/>(Out)</th>
                
                {checklistItems.map((item, idx) => (
                    <th key={idx} className="border border-gray-400 p-1 text-center font-medium">
                        {item.name}<br/><span className="text-gray-500">({item.count})</span>
                    </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowData.map(({ room, checkIn, checkOut, showCount2, isMaintenance, showMaintenance }) => (
                  <tr key={room.id} className={`h-9 print:h-8 ${showMaintenance ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
                    <td className={`border border-gray-400 p-1 font-black text-center text-sm print:text-xs relative ${showMaintenance ? 'text-gray-400' : 'bg-gray-100 text-black'}`}>
                        {room.number}
                        {isMaintenance && (
                            <div className="absolute top-0 right-0 p-0.5 text-red-500 print:text-black" title="Maintenance Mode">
                                <AlertTriangle className="w-2 h-2" />
                            </div>
                        )}
                    </td>
                    <td className="border border-gray-400 p-1 text-center text-gray-800 font-semibold">
                        {showCount2 ? '2' : ''}
                    </td>
                    <td className="border border-gray-400 p-0 text-center bg-green-50/30 relative">
                      {checkIn && (
                        <svg className="absolute inset-0 w-full h-full text-black print:text-black" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        </svg>
                      )}
                    </td>
                    <td className="border border-gray-400 p-0 text-center bg-red-50/30 relative">
                      {checkOut && (
                        <svg className="absolute inset-0 w-full h-full text-black print:text-black" viewBox="0 0 100 100" preserveAspectRatio="none">
                             <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        </svg>
                      )}
                    </td>
                    {/* Empty cells for checklist */}
                    {checklistItems.map((_, idx) => (
                         <td key={idx} className={`border border-gray-400 p-1 ${showMaintenance ? 'bg-gray-100' : ''}`}>
                             {showMaintenance && idx === 0 ? <span className="text-[8px] text-gray-400 ml-1">Closed</span> : ''}
                         </td>
                    ))}
                  </tr>
              ))}
              
              {/* Total Row */}
              <tr className="h-9 print:h-8 bg-gray-100 font-bold border-t-2 border-gray-400">
                  <td className="border border-gray-400 p-1 text-center text-black">รวม (Total)</td>
                  <td className="border border-gray-400 p-1 text-center text-gray-900">{totalCountValue > 0 ? totalCountValue : '-'}</td>
                  <td className="border border-gray-400 p-1 text-center text-green-700">{totalIn > 0 ? totalIn : '-'}</td>
                  <td className="border border-gray-400 p-1 text-center text-red-700">{totalOut > 0 ? totalOut : '-'}</td>
                  {checklistItems.map((_, idx) => (
                      <td key={idx} className="border border-gray-400 p-1 bg-gray-50"></td>
                  ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer for Handwriting */}
        <div className="mt-auto pt-4 hidden print:block">
           <div className="border border-gray-400 rounded p-2 h-20 mb-2">
              <span className="text-xs font-bold underline">หมายเหตุ (Notes):</span>
              <div className="border-b border-gray-300 border-dotted mt-4"></div>
              <div className="border-b border-gray-300 border-dotted mt-6"></div>
           </div>
           <div className="flex justify-end mt-4 px-8">
              <div className="text-center w-48">
                 <div className="border-b border-gray-400 border-dotted mb-1"></div>
                 <span className="text-[10px] text-gray-500">บันทึกโดย (Recorded By)</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default HousekeepingView;