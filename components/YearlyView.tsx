import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, Users, DollarSign, PieChart, Activity, BarChart3 } from 'lucide-react';
import { Booking, Room, BookingStatus } from '../types';

interface YearlyViewProps {
  bookings: Booking[];
  rooms: Room[];
}

const YearlyView: React.FC<YearlyViewProps> = ({ bookings, rooms }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Helper: Get days in month
  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();

  // Helper: Get days in year
  const daysInYear = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || selectedYear % 400 === 0 ? 366 : 365;

  // --- Data Processing ---
  const monthlyData = useMemo(() => {
    const data = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 12; i++) {
      // Check-ins in this month (for Count & Revenue)
      
      let revenue = 0;
      let checkInCount = 0;

      bookings.forEach(b => {
        if (b.status === BookingStatus.Cancelled) return;

        // Revenue & Check-ins (Based on Check-in Date)
        const bCheckIn = new Date(b.checkInDate);
        if (bCheckIn.getMonth() === i && bCheckIn.getFullYear() === selectedYear) {
            revenue += b.totalAmount;
            checkInCount++;
        }
      });

      data.push({
        name: months[i],
        revenue,
        checkIns: checkInCount,
      });
    }
    return data;
  }, [bookings, selectedYear]);

  // --- Room Utilization Stats ---
  const roomUtilization = useMemo(() => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear + 1, 0, 1); // Start of next year

    const stats = rooms.map(room => {
        let nights = 0;
        let bookingCount = 0;

        bookings.forEach(b => {
            if (b.roomNumber !== room.number || b.status === BookingStatus.Cancelled) return;

            const bStart = new Date(b.checkInDate);
            const bEnd = new Date(b.checkOutDate);

            // Calculate overlap with selected year
            const startOverlap = bStart < yearStart ? yearStart : bStart;
            const endOverlap = bEnd > yearEnd ? yearEnd : bEnd;

            if (startOverlap < endOverlap) {
                const diffTime = endOverlap.getTime() - startOverlap.getTime();
                const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                nights += days;
                bookingCount++;
            }
        });

        return {
            ...room,
            nights,
            bookingCount
        };
    });

    return stats.sort((a, b) => a.number.localeCompare(b.number)); // Sort by Room Number (1-16)
  }, [bookings, rooms, selectedYear]);

  // Group by floor
  const floor8Stats = roomUtilization.filter(r => r.floor === '8');
  const floor9Stats = roomUtilization.filter(r => r.floor === '9');

  const totalNightsFloor8 = floor8Stats.reduce((acc, curr) => acc + curr.nights, 0);
  const totalBookingsFloor8 = floor8Stats.reduce((acc, curr) => acc + curr.bookingCount, 0);
  
  const totalNightsFloor9 = floor9Stats.reduce((acc, curr) => acc + curr.nights, 0);
  const totalBookingsFloor9 = floor9Stats.reduce((acc, curr) => acc + curr.bookingCount, 0);


  // --- Aggregate Stats ---
  const totalYearlyRevenue = monthlyData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalYearlyCheckins = monthlyData.reduce((acc, curr) => acc + curr.checkIns, 0);

  // --- Pie Chart Data (Guest Type) ---
  const guestTypeData = useMemo(() => {
    let internal = 0;
    let external = 0;
    bookings.forEach(b => {
        if (new Date(b.checkInDate).getFullYear() === selectedYear && b.status !== BookingStatus.Cancelled) {
            if (b.rate === 1200) internal++;
            else external++;
        }
    });
    return { internal, external, total: internal + external };
  }, [bookings, selectedYear]);

  // --- Components: Simple SVG Charts ---

  const BarChart = ({ data, dataKey, color, formatValue }: any) => {
    const max = Math.max(...data.map((d: any) => d[dataKey])) || 1;
    return (
      <div className="flex items-end justify-between h-40 gap-1 pt-6">
        {data.map((d: any, idx: number) => {
          const height = (d[dataKey] / max) * 100;
          return (
            <div key={idx} className="flex flex-col items-center flex-1 group relative">
               {/* Tooltip */}
               <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] p-1 rounded whitespace-nowrap z-10">
                 {formatValue ? formatValue(d[dataKey]) : d[dataKey]}
               </div>
               <div 
                 className={`w-full max-w-[20px] rounded-t-sm transition-all duration-500 ${color}`} 
                 style={{ height: `${height}%` }}
               ></div>
               <span className="text-[10px] text-gray-400 mt-2">{d.name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const RoomUsageTable = ({ rooms, totalNights, totalBookings, floorName, colorClass }: { rooms: any[], totalNights: number, totalBookings: number, floorName: string, colorClass: string }) => (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col">
          <div className={`p-4 border-b border-gray-100 flex justify-between items-center ${colorClass} bg-opacity-10`}>
              <h4 className="font-bold text-gray-800">{floorName}</h4>
              {/* Removed Total Nights badge from here as requested */}
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px] custom-scrollbar">
              <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 font-medium sticky top-0">
                      <tr>
                          <th className="px-4 py-2 text-left w-20">Room</th>
                          <th className="px-4 py-2 text-center text-gray-800 font-bold">No. of Bookings</th>
                          <th className="px-4 py-2 text-center text-black font-bold">Total Nights</th>
                          <th className="px-4 py-2 text-center">Avg / Month</th>
                          <th className="px-4 py-2 text-left w-1/3">Occupancy Rate</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {rooms.map(room => {
                          const realPercent = (room.nights / daysInYear) * 100;
                          // Scale bar visually for better UX on low numbers, but show real percent in text
                          const visualPercent = Math.min(realPercent * 1.5, 100); 
                          const avgPerMonth = (room.nights / 12).toFixed(1);
                          return (
                              <tr key={room.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-bold text-gray-700">{room.number}</td>
                                  <td className="px-4 py-2 text-center text-gray-600">{room.bookingCount}</td>
                                  <td className="px-4 py-2 text-center font-mono font-medium">{room.nights}</td>
                                  <td className="px-4 py-2 text-center text-gray-500">{avgPerMonth}</td>
                                  <td className="px-4 py-2">
                                      <div className="flex items-center gap-2">
                                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden flex-1">
                                              <div 
                                                  className={`h-full rounded-full ${room.nights > 100 ? 'bg-red-500' : room.nights > 50 ? 'bg-blue-500' : 'bg-gray-400'}`} 
                                                  style={{ width: `${visualPercent}%` }}
                                              ></div>
                                          </div>
                                          <span className="text-xs font-bold text-gray-700 min-w-[36px] text-right">{realPercent.toFixed(1)}%</span>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                      {/* Total Sum Row */}
                      <tr className={`${colorClass} bg-opacity-10 font-bold border-t-2 border-gray-200 sticky bottom-0 shadow-sm text-gray-900`}>
                          <td className="px-4 py-3 text-left">Total</td>
                          <td className="px-4 py-3 text-center">{totalBookings}</td>
                          <td className="px-4 py-3 text-center text-lg">{totalNights}</td>
                          <td className="px-4 py-3 text-center">{(totalNights / 12).toFixed(1)}</td>
                          <td className="px-4 py-3">
                              <div className="flex justify-end items-center gap-2">
                                 <span className="text-xs text-gray-600 font-normal">Avg Occ:</span>
                                 <span>{((totalNights / (rooms.length * daysInYear)) * 100).toFixed(1)}%</span>
                              </div>
                          </td>
                      </tr>
                  </tbody>
              </table>
          </div>
      </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-600" />
            Yearly Analytics
          </h2>
          <p className="text-sm text-gray-500 mt-1">Performance overview and key metrics.</p>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-gray-100 rounded-lg"><Calendar className="w-4 h-4" /></button>
            <span className="text-xl font-bold text-gray-800 min-w-[80px] text-center">{selectedYear}</span>
            <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-gray-100 rounded-lg"><Calendar className="w-4 h-4" /></button>
        </div>
      </div>

      {/* KPI Cards - Reduced to 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute right-0 top-0 p-4 opacity-10">
                  <DollarSign className="w-24 h-24 text-green-600" />
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{totalYearlyRevenue.toLocaleString()} <span className="text-sm text-gray-400 font-normal">THB</span></h3>
              <div className="mt-4 flex items-center gap-2 text-sm text-green-600 font-medium bg-green-50 w-fit px-2 py-1 rounded">
                  <TrendingUp className="w-4 h-4" /> Annual Total
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="absolute right-0 top-0 p-4 opacity-10">
                  <Users className="w-24 h-24 text-purple-600" />
              </div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Check-ins</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">{totalYearlyCheckins} <span className="text-sm text-gray-400 font-normal">Bookings</span></h3>
              <div className="mt-4 flex items-center gap-2 text-sm text-purple-600 font-medium bg-purple-50 w-fit px-2 py-1 rounded">
                  Avg {(totalYearlyCheckins/12).toFixed(1)} / month
              </div>
          </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" /> Monthly Revenue
                  </h3>
              </div>
              <BarChart 
                data={monthlyData} 
                dataKey="revenue" 
                color="bg-green-500 hover:bg-green-600" 
                formatValue={(v: number) => v.toLocaleString()}
              />
          </div>

          {/* Guest Demographics */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-indigo-500" /> Guest Distribution
                  </h3>
              </div>
              
              <div className="flex items-center justify-center gap-8 h-48">
                  {/* Simple CSS Donut representation using Flex/Border */}
                  <div className="relative w-32 h-32 rounded-full border-[16px] border-indigo-100 flex items-center justify-center">
                       <div 
                         className="absolute inset-0 rounded-full border-[16px] border-indigo-600"
                         style={{ 
                             clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`, 
                             transform: `rotate(${ (guestTypeData.internal / (guestTypeData.total || 1)) * 360 }deg)` 
                         }}
                       ></div>
                        {/* Better SVG Donut for accuracy */}
                        <svg viewBox="0 0 36 36" className="w-32 h-32 absolute top-[-16px] left-[-16px]">
                             <path className="text-indigo-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4.5" />
                             <path className="text-indigo-600" strokeDasharray={`${(guestTypeData.internal / (guestTypeData.total || 1)) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4.5" />
                        </svg>

                       <div className="text-center z-10">
                           <span className="text-2xl font-bold text-gray-800">{guestTypeData.total}</span>
                           <span className="block text-[10px] text-gray-400">TOTAL</span>
                       </div>
                  </div>

                  <div className="space-y-3">
                      <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                          <div>
                              <p className="text-sm font-bold text-gray-700">Internal (MDCU)</p>
                              <p className="text-xs text-gray-500">{guestTypeData.internal} bookings</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-indigo-100"></div>
                          <div>
                              <p className="text-sm font-bold text-gray-700">External Guest</p>
                              <p className="text-xs text-gray-500">{guestTypeData.external} bookings</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Room Utilization Section */}
      <div className="mt-8">
          <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-6 h-6 text-gray-700" />
              <div>
                  <h3 className="text-xl font-bold text-gray-800">Room Utilization Analysis</h3>
                  <p className="text-sm text-gray-500">Breakdown of nights occupied per room for {selectedYear}.</p>
              </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
              {/* Floor 8 */}
              <RoomUsageTable 
                  rooms={floor8Stats} 
                  totalNights={totalNightsFloor8} 
                  totalBookings={totalBookingsFloor8}
                  floorName="Floor 8" 
                  colorClass="bg-blue-500" 
              />
              
              {/* Floor 9 */}
              <RoomUsageTable 
                  rooms={floor9Stats} 
                  totalNights={totalNightsFloor9} 
                  totalBookings={totalBookingsFloor9}
                  floorName="Floor 9" 
                  colorClass="bg-purple-500" 
              />
          </div>
      </div>
    </div>
  );
};

export default YearlyView;