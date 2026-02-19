
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Booking, Room } from '../types';

interface MonthlyViewProps {
  bookings: Booking[];
  rooms: Room[];
  onSelectBooking: (b: Booking) => void;
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ bookings = [], rooms = [], onSelectBooking }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFloor, setSelectedFloor] = useState<string>("8");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const displayMonth = currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Filter rooms for the selected floor and use them to render rows
  const floorRooms = rooms.filter(r => r.floor === selectedFloor).sort((a, b) => a.number.localeCompare(b.number));

  // Helper to check if a booking overlaps with a specific day and room
  const getBookingForCell = (roomNum: string, day: number) => {
    const cellDate = new Date(year, month, day).toISOString().split('T')[0];
    
    // Safely access bookings
    return (bookings || []).find(b => {
      if (b.roomNumber !== roomNum) return false;
      // Logic [Start, End)
      return cellDate >= b.checkInDate && cellDate < b.checkOutDate;
    });
  };

  // Helper to determine if a cell is the start of a booking bar
  const isBookingStart = (booking: Booking, day: number) => {
    const cellDate = new Date(year, month, day).toISOString().split('T')[0];
    return booking.checkInDate === cellDate;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
             <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
             <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
          </div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            {displayMonth}
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
           <label className="text-sm font-medium text-gray-600">Floor:</label>
           <select 
             value={selectedFloor} 
             onChange={(e) => setSelectedFloor(e.target.value)}
             className="border-gray-300 border rounded-md text-sm py-1.5 px-3 focus:ring-primary-500 focus:border-primary-500"
           >
             <option value="8">Floor 8</option>
             <option value="9">Floor 9</option>
           </select>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <div className="min-w-max">
           {/* Header Row (Days) */}
           <div className="flex border-b sticky top-0 bg-white z-20 shadow-sm">
             <div className="w-20 flex-shrink-0 p-2 border-r bg-gray-50 text-xs font-bold text-gray-500 flex items-center justify-center sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
               Room
             </div>
             {daysArray.map(day => {
               const isToday = 
                  day === today.getDate() && 
                  month === today.getMonth() && 
                  year === today.getFullYear();
                  
               return (
                 <div 
                  key={day} 
                  className={`w-12 flex-shrink-0 p-2 border-r text-center text-xs font-medium ${isToday ? 'bg-yellow-100 text-yellow-800 font-bold' : 'text-gray-600'}`}
                 >
                   {day}
                 </div>
               );
             })}
           </div>

           {/* Room Rows */}
           {floorRooms.map(room => (
             <div key={room.id} className="flex border-b h-14 hover:bg-gray-50 transition-colors">
               <div className="w-20 flex-shrink-0 border-r font-bold flex items-center justify-center sticky left-0 z-10 text-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-white text-gray-700">
                 {room.number}
               </div>
               
               {daysArray.map(day => {
                  const cellDate = new Date(year, month, day).toISOString().split('T')[0];
                  const booking = getBookingForCell(room.number, day);
                  const isStart = booking ? isBookingStart(booking, day) : false;
                  const isToday = 
                      day === today.getDate() && 
                      month === today.getMonth() && 
                      year === today.getFullYear();
                  
                  // Check Maintenance Logic
                  let isMaintenanceDay = false;
                  if (room.status === 'Maintenance') {
                      // Indefinite maintenance
                      if (!room.maintenanceStart || !room.maintenanceEnd) {
                          isMaintenanceDay = true;
                      } 
                      // Date-specific maintenance
                      else if (cellDate >= room.maintenanceStart && cellDate <= room.maintenanceEnd) {
                          isMaintenanceDay = true;
                      }
                  }

                  // Base cell style
                  let cellClass = `w-12 flex-shrink-0 border-r border-gray-100 relative group transition-colors ${isToday ? 'bg-yellow-50' : ''}`;
                  
                  // Maintenance Background Element
                  let maintenanceEl = null;
                  if (isMaintenanceDay) {
                      cellClass = `w-12 flex-shrink-0 border-r border-gray-100 bg-gray-50 relative group transition-colors`;
                      maintenanceEl = (
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                                 <div className="w-1 h-full bg-gray-200 rotate-12"></div>
                         </div>
                      );
                  }

                  // Bar style logic
                  let barClass = "";
                  const isEarlyCheckIn = booking?.earlyCheckInSurcharge && booking.earlyCheckInSurcharge > 0;
                  const isLateCheckOut = booking?.lateCheckOutSurcharge && booking.lateCheckOutSurcharge > 0;
                  
                  const hasNotes = booking?.notes && booking.notes.trim().length > 0;
                  
                  // Color Logic
                  // With notes = Red, Normal = Blue
                  const baseColor = hasNotes ? "bg-red-500" : "bg-blue-500";
                  // Strip color: Darker version of base (Red-900 or Blue-900)
                  const stripColor = hasNotes ? "bg-red-900" : "bg-blue-900";

                  if (booking) {
                    barClass = `absolute top-1.5 bottom-1.5 ${baseColor} z-10 shadow-sm cursor-pointer hover:brightness-110 transition-all`;
                    
                    const currentDayDate = new Date(year, month, day);
                    const isLastNight = new Date(currentDayDate.getTime() + 86400000).toISOString().split('T')[0] === booking.checkOutDate;

                    if (isStart) {
                        barClass += " left-0"; 
                        barClass += " rounded-l-md";
                    } else {
                        barClass += " left-0 rounded-l-none"; 
                    }

                    if (isLastNight) {
                        barClass += " right-0";
                        barClass += " rounded-r-md";
                    } else {
                        barClass += " right-0 rounded-r-none"; 
                    }

                    const isVisualStart = isStart || day === 1;

                    return (
                        <div key={day} className={cellClass}>
                            {maintenanceEl}
                            <div 
                                className={barClass}
                                onClick={() => onSelectBooking(booking)}
                            >
                                {/* Left Strip Indicator */}
                                {isVisualStart && (
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stripColor} ${isStart ? 'rounded-l-md' : ''} z-20`}></div>
                                )}

                                {/* Name Label */}
                                {isVisualStart && (
                                <span className={`absolute left-2.5 top-1.5 text-[10px] text-white font-medium whitespace-nowrap overflow-hidden max-w-[120px] z-10 pointer-events-none drop-shadow-md`}>
                                    {booking.bookerName}
                                </span>
                                )}

                                {/* Hover Tooltip */}
                                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-50 pointer-events-none animate-in fade-in zoom-in duration-200">
                                    <div className="flex flex-col gap-1">
                                        <div className="font-bold text-sm border-b border-gray-700 pb-1 mb-1">{booking.bookerName}</div>
                                        
                                        {/* Time Display with Early/Late flags (No 50% text) */}
                                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mb-2">
                                            <div className="text-gray-400">Check-in:</div>
                                            <div className={`text-right ${isEarlyCheckIn ? 'text-green-400 font-bold' : 'text-gray-200'}`}>
                                                {booking.expectedCheckInTime || booking.checkInTime || '14:00'}
                                                {isEarlyCheckIn && " (Early)"}
                                            </div>
                                            
                                            <div className="text-gray-400">Check-out:</div>
                                            <div className={`text-right ${isLateCheckOut ? 'text-orange-400 font-bold' : 'text-gray-200'}`}>
                                                {booking.expectedCheckOutTime || '12:00'}
                                                {isLateCheckOut && " (Late)"}
                                            </div>
                                        </div>

                                        <div className="flex justify-between">
                                        <span className="text-gray-400">Phone:</span>
                                        <span>{booking.bookerPhone}</span>
                                        </div>
                                        <div className="flex justify-between">
                                        <span className="text-gray-400">Receipt:</span>
                                        <span>{booking.receiptNumber || '-'}</span>
                                        </div>
                                        {booking.notes && (
                                        <div className="mt-1 pt-1 border-t border-gray-700 text-yellow-300 italic">
                                            "{booking.notes}"
                                        </div>
                                        )}
                                    </div>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                                </div>
                            </div>
                        </div>
                    );
                  }

                  return <div key={day} className={cellClass}>{maintenanceEl}</div>;
               })}
             </div>
           ))}
        </div>
      </div>
       
       <div className="p-3 bg-gray-50 text-xs text-gray-500 border-t flex gap-6 justify-end">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-sm"></span> Today
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-sm relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-900"></div></div> Booking
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-sm relative overflow-hidden"><div className="absolute left-0 top-0 bottom-0 w-1 bg-red-900"></div></div> With Notes
          </div>
           <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-gray-200 rounded-sm"></span> Maintenance
          </div>
       </div>
    </div>
  );
};

export default MonthlyView;
