import React, { useState, useMemo } from 'react';
import { X, Search, Calendar, User, Phone, Briefcase, AlertCircle, Clock, LogOut, Users, ClipboardList } from 'lucide-react';
import { Room, Booking, BookingStatus } from '../types';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (bookingData: any) => void;
  bookings: Booking[];
  rooms: Room[];
}

interface RoomSearchResult {
  room: Room;
  isAvailable: boolean;
  conflictReason?: string;
}

const CreateBookingModal: React.FC<CreateBookingModalProps> = ({ isOpen, onClose, onCreate, bookings = [], rooms = [] }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [isGuestSameAsBooker, setIsGuestSameAsBooker] = useState(true);
  const [formData, setFormData] = useState({
    bookerName: '',
    bookerPhone: '',
    guestName: '',
    guestPhone: '',
    organization: '',
    checkInDate: '',
    checkOutDate: '',
    expectedCheckInTime: '',
    isEarlyCheckIn: false,
    expectedCheckOutTime: '',
    isLateCheckOut: false,
    notes: '',
  });
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomResults, setRoomResults] = useState<RoomSearchResult[]>([]);

  // Generate time options for Early Check-in (06:00 - 14:00, 30 min interval)
  const earlyTimeOptions = useMemo(() => {
    const options = [];
    for (let i = 6; i <= 14; i++) {
      const hour = i.toString().padStart(2, '0');
      options.push(`${hour}:00`);
      if (i !== 14) options.push(`${hour}:30`);
    }
    return options;
  }, []);

  // Generate time options for Late Check-out (12:00 - 18:00, 30 min interval)
  const lateTimeOptions = useMemo(() => {
    const options = [];
    for (let i = 12; i <= 18; i++) {
      const hour = i.toString().padStart(2, '0');
      options.push(`${hour}:00`);
      if (i !== 18) options.push(`${hour}:30`);
    }
    return options;
  }, []);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    
    setFormData(prev => {
        // Early Check-in Logic
        if (target.name === 'isEarlyCheckIn') {
             if (value === true && !prev.expectedCheckInTime) {
                return { ...prev, [target.name]: value, expectedCheckInTime: '09:00' };
             }
             if (value === false) {
                 return { ...prev, [target.name]: value, expectedCheckInTime: '' };
             }
        }

        // Late Check-out Logic
        if (target.name === 'isLateCheckOut') {
             if (value === true && !prev.expectedCheckOutTime) {
                return { ...prev, [target.name]: value, expectedCheckOutTime: '14:00' };
             }
             if (value === false) {
                 return { ...prev, [target.name]: value, expectedCheckOutTime: '' };
             }
        }

        return { ...prev, [target.name]: value };
    });
  };

  const handleGuestSameToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsGuestSameAsBooker(e.target.checked);
    if (e.target.checked) {
      setFormData(prev => ({
        ...prev,
        guestName: '',
        guestPhone: ''
      }));
    }
  };

  const handleSearch = () => {
    if (!formData.checkInDate || !formData.checkOutDate) {
      alert("Please select both check-in and check-out dates");
      return;
    }

    if (formData.checkInDate >= formData.checkOutDate) {
      alert("Check-out date must be after check-in date");
      return;
    }

    const start = formData.checkInDate;
    const end = formData.checkOutDate;

    // Requirement 6: Core Matching & 6.2 Overlap Rule
    // Formula: A.start < B.end && B.start < A.end
    const results: RoomSearchResult[] = rooms.map(room => {
      // 1. Check Maintenance Status
      if (room.status === 'Maintenance') {
          // If no dates specified, it's indefinitely closed
          if (!room.maintenanceStart || !room.maintenanceEnd) {
              return {
                  room,
                  isAvailable: false,
                  conflictReason: 'Room is closed indefinitely'
              };
          }
          
          // Check date overlap for timed maintenance
          // Overlap: Booking Start < Maint End AND Maint Start < Booking End
          const overlap = (start < room.maintenanceEnd) && (room.maintenanceStart < end);
          if (overlap) {
              return {
                  room,
                  isAvailable: false,
                  conflictReason: `Maintenance (${room.maintenanceStart} to ${room.maintenanceEnd})`
              };
          }
      }

      // 2. Check Bookings Overlap
      // Safely access bookings
      const conflict = (bookings || []).find(b => {
        if (b.roomNumber !== room.number) return false;
        if (b.status === BookingStatus.Cancelled) return false; // Ignored cancelled bookings

        // Check overlap
        const overlaps = (b.checkInDate < end) && (start < b.checkOutDate);
        return overlaps;
      });

      if (conflict) {
        return {
          room,
          isAvailable: false,
          conflictReason: `Occupied by ${conflict.bookerName} (${conflict.checkInDate} - ${conflict.checkOutDate})`
        };
      }

      return { room, isAvailable: true };
    });

    setRoomResults(results);
    setStep(2);
  };

  const handleConfirm = () => {
    if (!selectedRoom) return;
    
    onCreate({
      ...formData,
      roomNumber: selectedRoom.number,
      // Use explicit guest data if different, otherwise fallback to booker
      guestName: isGuestSameAsBooker ? formData.bookerName : formData.guestName,
      guestPhone: isGuestSameAsBooker ? formData.bookerPhone : formData.guestPhone,
      rate: 1200,
      earlyCheckInSurcharge: formData.isEarlyCheckIn ? 50 : 0,
      expectedCheckInTime: formData.expectedCheckInTime,
      lateCheckOutSurcharge: formData.isLateCheckOut ? 50 : 0,
      expectedCheckOutTime: formData.expectedCheckOutTime,
      notes: formData.notes
    });
    
    // Reset and close
    setStep(1);
    setFormData({
      bookerName: '',
      bookerPhone: '',
      guestName: '',
      guestPhone: '',
      organization: '',
      checkInDate: '',
      checkOutDate: '',
      expectedCheckInTime: '',
      isEarlyCheckIn: false,
      expectedCheckOutTime: '',
      isLateCheckOut: false,
      notes: '',
    });
    setIsGuestSameAsBooker(true);
    setSelectedRoom(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-primary-600 p-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Create Booking
          </h2>
          <button onClick={onClose} className="hover:bg-primary-700 p-1 rounded transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
          {step === 1 ? (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
              
              {/* Booker Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b pb-2 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Booker Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Booker Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="bookerName"
                      value={formData.bookerName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Dr. Somchai"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="bookerPhone"
                      value={formData.bookerPhone}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="08x-xxx-xxxx"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization / Department <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="organization"
                        value={formData.organization}
                        onChange={handleInputChange}
                        className="pl-10 w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Surgery Dept."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Guest Section */}
              <div>
                 <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                      <Users className="w-4 h-4" /> Guest Information
                    </h3>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="guestSame" 
                        checked={isGuestSameAsBooker} 
                        onChange={handleGuestSameToggle}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="guestSame" className="text-sm text-gray-600 select-none cursor-pointer">Same as Booker</label>
                    </div>
                 </div>
                 
                 {!isGuestSameAsBooker && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="guestName"
                          value={formData.guestName}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-blue-50/30"
                          placeholder="Mr. Guest Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Guest Phone</label>
                        <input
                          type="text"
                          name="guestPhone"
                          value={formData.guestPhone}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-blue-50/30"
                          placeholder="08x-xxx-xxxx"
                        />
                      </div>
                    </div>
                 )}
                 {isGuestSameAsBooker && (
                    <div className="text-sm text-gray-400 italic">Guest information will be the same as booker information.</div>
                 )}
              </div>

              {/* Stay Details */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b pb-2 mb-4 flex items-center gap-2">
                   <Clock className="w-4 h-4" /> Stay Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      name="checkInDate"
                      value={formData.checkInDate}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      name="checkOutDate"
                      value={formData.checkOutDate}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  
                  {/* Special Requests Section */}
                  <div className="md:col-span-2 pt-2 border-t border-gray-100 mt-1 space-y-2">
                      {/* Early Check-in */}
                      <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex h-5 items-center mt-0.5">
                              <input
                                  id="earlyCheckIn"
                                  name="isEarlyCheckIn"
                                  type="checkbox"
                                  checked={formData.isEarlyCheckIn}
                                  onChange={handleInputChange}
                                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                          </div>
                          <div className="flex-1">
                              <label htmlFor="earlyCheckIn" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                  Early Check-in Request
                              </label>
                              <p className="text-xs text-gray-500 mt-0.5">Standard check-in is at 14:00.</p>
                              
                              {formData.isEarlyCheckIn && (
                                  <div className="mt-3 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                      <div className="w-full sm:w-auto">
                                          <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                                              <Clock className="w-3 h-3" /> Expected Arrival
                                          </label>
                                          <select
                                              name="expectedCheckInTime"
                                              value={formData.expectedCheckInTime}
                                              onChange={handleInputChange}
                                              className="block w-full sm:w-40 rounded-md border-gray-300 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 bg-white"
                                          >
                                              {earlyTimeOptions.map(t => (
                                                  <option key={t} value={t}>{t}</option>
                                              ))}
                                          </select>
                                      </div>
                                      <div className="pt-4 text-xs text-orange-600 font-medium flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                           <AlertCircle className="w-3.5 h-3.5" /> Surcharge +50% of 1 night
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Late Check-out */}
                      <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex h-5 items-center mt-0.5">
                              <input
                                  id="lateCheckOut"
                                  name="isLateCheckOut"
                                  type="checkbox"
                                  checked={formData.isLateCheckOut}
                                  onChange={handleInputChange}
                                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                          </div>
                          <div className="flex-1">
                              <label htmlFor="lateCheckOut" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                  Late Check-out Request
                              </label>
                              <p className="text-xs text-gray-500 mt-0.5">Standard check-out is at 12:00.</p>
                              
                              {formData.isLateCheckOut && (
                                  <div className="mt-3 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                      <div className="w-full sm:w-auto">
                                          <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                                              <LogOut className="w-3 h-3" /> Expected Departure
                                          </label>
                                          <select
                                              name="expectedCheckOutTime"
                                              value={formData.expectedCheckOutTime}
                                              onChange={handleInputChange}
                                              className="block w-full sm:w-40 rounded-md border-gray-300 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 bg-white"
                                          >
                                              {lateTimeOptions.map(t => (
                                                  <option key={t} value={t}>{t}</option>
                                              ))}
                                          </select>
                                      </div>
                                      <div className="pt-4 text-xs text-orange-600 font-medium flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                           <AlertCircle className="w-3.5 h-3.5" /> Surcharge +50% of 1 night
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b pb-2 mb-4 flex items-center gap-2">
                   <ClipboardList className="w-4 h-4" /> Additional Notes
                </h3>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                   <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Special requests, flight details, etc."
                   />
                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <p className="text-xs text-blue-600 uppercase font-bold">Booker</p>
                    <p className="text-blue-900 font-medium">{formData.bookerName} <span className="text-blue-500 font-normal text-sm">({formData.bookerPhone})</span></p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-blue-600 uppercase font-bold">Guest</p>
                    <p className="text-blue-900 font-medium">
                      {isGuestSameAsBooker ? 'Same as Booker' : `${formData.guestName} (${formData.guestPhone})`}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-blue-600 uppercase font-bold">Stay Period</p>
                    <p className="text-blue-900 font-medium">{formData.checkInDate} <span className="text-blue-400">to</span> {formData.checkOutDate}</p>
                  </div>
                   {formData.isEarlyCheckIn && (
                      <div className="flex flex-col">
                        <p className="text-xs text-red-600 uppercase font-bold">Early Check-in</p>
                        <p className="text-red-900 font-medium flex items-center gap-1">Yes {formData.expectedCheckInTime && `(${formData.expectedCheckInTime})`}</p>
                      </div>
                   )}
                   {formData.isLateCheckOut && (
                      <div className="flex flex-col">
                        <p className="text-xs text-red-600 uppercase font-bold">Late Check-out</p>
                        <p className="text-red-900 font-medium flex items-center gap-1">Yes {formData.expectedCheckOutTime && `(${formData.expectedCheckOutTime})`}</p>
                      </div>
                   )}
                   {formData.notes && (
                      <div className="md:col-span-2 flex flex-col">
                        <p className="text-xs text-blue-600 uppercase font-bold">Notes</p>
                        <p className="text-blue-900 font-medium text-sm italic">"{formData.notes}"</p>
                      </div>
                   )}
                </div>
                <div className="mt-3 text-right">
                     <button onClick={() => setStep(1)} className="text-sm text-blue-600 hover:text-blue-800 underline font-medium">Change Criteria</button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                 <h3 className="font-bold text-lg text-gray-800">Matching Results</h3>
                 <div className="flex gap-3 text-xs">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border-2 border-primary-500 rounded"></div> Selected</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-200 rounded"></div> Available</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div> Occupied / Maintenance</div>
                 </div>
              </div>
              
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                {roomResults.map(({ room, isAvailable, conflictReason }) => (
                  <button
                    key={room.id}
                    onClick={() => isAvailable && setSelectedRoom(room)}
                    disabled={!isAvailable}
                    title={!isAvailable ? conflictReason : `Room ${room.number} (${room.type})`}
                    className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all h-20 relative ${
                      !isAvailable
                        ? 'bg-red-50 border-red-200 opacity-80 cursor-not-allowed'
                        : selectedRoom?.id === room.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700 ring-2 ring-primary-200 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-primary-400 hover:shadow-md'
                    }`}
                  >
                    <span className={`font-bold text-lg ${!isAvailable ? 'text-red-400' : 'text-gray-800'}`}>{room.number}</span>
                    <span className="text-[10px] text-gray-500 leading-tight text-center">{room.type}</span>
                    {!isAvailable && (
                        <div className="absolute top-1 right-1 text-red-400">
                            <AlertCircle className="w-3 h-3" />
                        </div>
                    )}
                  </button>
                ))}
              </div>
              {roomResults.every(r => !r.isAvailable) && (
                  <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-dashed">
                      No rooms available for this period.
                  </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium shadow-sm transition-colors"
          >
            Cancel
          </button>
          {step === 1 ? (
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2 shadow-sm transition-colors"
            >
              <Search className="w-4 h-4" /> Match Rooms
            </button>
          ) : (
             <button
              onClick={handleConfirm}
              disabled={!selectedRoom}
              className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors ${
                selectedRoom 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Confirm Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateBookingModal;