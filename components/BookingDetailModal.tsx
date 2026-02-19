
import React, { useState, useEffect } from 'react';
import { X, Printer, CreditCard, CheckCircle, Clock, Save, UserSquare2, Users, Car, Phone, Building, Trash2, AlertCircle, Ban, AlertTriangle } from 'lucide-react';
import { Booking, BookingStatus, PaymentStatus } from '../types';
import StatusBadge from './StatusBadge';

interface BookingDetailModalProps {
  booking: Booking;
  allBookings: Booking[];
  onClose: () => void;
  onUpdate: (updatedBooking: Booking) => void;
  onDelete: (id: string) => void;
}

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({ booking, allBookings = [], onClose, onUpdate, onDelete }) => {
  const [editedBooking, setEditedBooking] = useState<Booking>({ ...booking });
  const [newCoOccupant, setNewCoOccupant] = useState('');
  
  // Track if user has modified any fields to toggle between Action Buttons vs Save Button
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Conflict Alert State (Inline Red Box)
  const [conflictAlert, setConflictAlert] = useState<string | null>(null);
  
  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Track original paid amount on load (handle legacy data where paidAmount might be undefined)
  const [originalPaidAmount, setOriginalPaidAmount] = useState<number>(0);

  useEffect(() => {
    // If it was already paid, assume totalAmount was paid if paidAmount is missing
    const initialPaid = booking.paidAmount !== undefined 
        ? booking.paidAmount 
        : (booking.paymentStatus === PaymentStatus.Paid ? booking.totalAmount : 0);
    setOriginalPaidAmount(initialPaid);
    
    setEditedBooking({
        ...booking,
        paidAmount: initialPaid
    });
    setConflictAlert(null);
    setHasUnsavedChanges(false);
  }, [booking]);

  const calculateTotal = (checkIn: string, checkOut: string, rate: number, earlySurcharge: number = 0, lateSurcharge: number = 0) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    let diffTime = end.getTime() - start.getTime();
    if (diffTime <= 0) diffTime = 1000 * 60 * 60 * 24; // Min 1 night
    
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let total = rate * nights;
    if (earlySurcharge > 0) total += (rate * 0.5);
    if (lateSurcharge > 0) total += (rate * 0.5);
    
    return total;
  };

  // --- Conflict Detection Logic ---

  // Check if extending date overlaps with another booking
  const checkDateConflict = (roomId: string, startStr: string, endStr: string, excludeBookingId: string): Booking | undefined => {
      // Safely access find
      return (allBookings || []).find(b => {
          if (b.id === excludeBookingId) return false;
          if (b.roomNumber !== roomId) return false;
          if (b.status === BookingStatus.Cancelled) return false;
          
          // Check overlap: StartA < EndB && StartB < EndA
          return (startStr < b.checkOutDate) && (b.checkInDate < endStr);
      });
  };

  // Check if Late Checkout (e.g. 16:00) conflicts with someone checking in SAME DAY
  const checkLateCheckOutConflict = (roomId: string, checkOutDate: string, excludeBookingId: string): Booking | undefined => {
      // Safely access find
      return (allBookings || []).find(b => {
          if (b.id === excludeBookingId) return false;
          if (b.roomNumber !== roomId) return false;
          if (b.status === BookingStatus.Cancelled) return false;

          // Conflict if another booking starts on the day we want to leave late
          // (Assuming standard check-in starts at 14:00)
          return b.checkInDate === checkOutDate;
      });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConflictAlert(null); // Clear previous error
    setHasUnsavedChanges(true); // User is typing

    // Special handling for Check-Out Date Extension
    if (name === 'checkOutDate') {
        // Only check if trying to extend beyond original or change dates
        if (value !== editedBooking.checkOutDate) {
            const conflict = checkDateConflict(editedBooking.roomNumber, editedBooking.checkInDate, value, editedBooking.id);
            if (conflict) {
                setConflictAlert(`Cannot extend date to ${value}. Room is booked by ${conflict.bookerName}.`);
                // Auto-clear after 5 seconds to not be annoying
                setTimeout(() => setConflictAlert(null), 5000);
                return; 
            }
        }
    }

    setEditedBooking(prev => {
        let updated = { ...prev, [name]: value };
        
        // Recalculate total if dates change
        if (name === 'checkInDate' || name === 'checkOutDate') {
             if (updated.checkInDate && updated.checkOutDate) {
                 const newTotal = calculateTotal(
                    updated.checkInDate, 
                    updated.checkOutDate, 
                    updated.rate,
                    updated.earlyCheckInSurcharge,
                    updated.lateCheckOutSurcharge
                 );
                 updated.totalAmount = newTotal;

                 if (newTotal > originalPaidAmount) {
                     updated.paymentStatus = PaymentStatus.Unpaid;
                 }
             }
        }
        return updated;
    });
  };

  const handleCheckInTimeChange = (time: string) => {
      const hour = parseInt(time.split(':')[0]);
      setHasUnsavedChanges(true);
      
      setEditedBooking(prev => {
        // Standard check-in is 14:00. If earlier, it implies Early Check-in.
        const newEarlySurcharge = hour < 14 ? 50 : 0;
        
        // Recalculate total with new surcharge
        const newTotal = calculateTotal(
            prev.checkInDate, 
            prev.checkOutDate, 
            prev.rate, 
            newEarlySurcharge, 
            prev.lateCheckOutSurcharge
        );

        let newPaymentStatus = prev.paymentStatus;
        if (newTotal > originalPaidAmount) {
             newPaymentStatus = PaymentStatus.Unpaid;
        }

        return {
            ...prev,
            expectedCheckInTime: time,
            checkInTime: time, // Also update display time
            earlyCheckInSurcharge: newEarlySurcharge,
            totalAmount: newTotal,
            paymentStatus: newPaymentStatus
        };
      });
  };

  const handleCheckOutTimeChange = (time: string) => {
      const hour = parseInt(time.split(':')[0]);
      setConflictAlert(null);
      setHasUnsavedChanges(true);
      
      // If trying to set late check-out (> 12:00)
      if (hour > 12) {
          const conflict = checkLateCheckOutConflict(editedBooking.roomNumber, editedBooking.checkOutDate, editedBooking.id);
          if (conflict) {
              setConflictAlert(`Cannot select late check-out. Next guest (${conflict.bookerName}) arrives today.`);
              setTimeout(() => setConflictAlert(null), 5000);
              return; // Block change
          }
      }

      setEditedBooking(prev => {
        const newLateSurcharge = hour > 12 ? 50 : 0;
        
        // Recalculate total with new surcharge
        const newTotal = calculateTotal(
            prev.checkInDate, 
            prev.checkOutDate, 
            prev.rate, 
            prev.earlyCheckInSurcharge, 
            newLateSurcharge
        );

        let newPaymentStatus = prev.paymentStatus;
        if (newTotal > originalPaidAmount) {
             newPaymentStatus = PaymentStatus.Unpaid;
        }

        return {
            ...prev,
            expectedCheckOutTime: time,
            lateCheckOutSurcharge: newLateSurcharge,
            totalAmount: newTotal,
            paymentStatus: newPaymentStatus
        };
      });
  };

  const handleRateChange = (newRate: 1200 | 1500) => {
    setHasUnsavedChanges(true);
    setEditedBooking(prev => {
        const newTotal = calculateTotal(
          prev.checkInDate,
          prev.checkOutDate,
          newRate,
          prev.earlyCheckInSurcharge,
          prev.lateCheckOutSurcharge
        );
        
        let newStatus = prev.paymentStatus;
        if (newTotal > originalPaidAmount) {
            newStatus = PaymentStatus.Unpaid;
        }

        return {
          ...prev,
          rate: newRate,
          totalAmount: newTotal,
          paymentStatus: newStatus
        };
    });
  };

  const handleIdProofChange = (type: 'Staff ID' | 'National ID' | 'Passport') => {
    setHasUnsavedChanges(true);
    setEditedBooking(prev => ({ ...prev, idProofType: type }));
  };

  const addCoOccupant = () => {
    if (!newCoOccupant.trim()) return;
    if ((editedBooking.coOccupants?.length || 0) >= 3) {
      alert("Maximum 3 co-occupants allowed");
      return;
    }
    setHasUnsavedChanges(true);
    setEditedBooking(prev => ({
      ...prev,
      coOccupants: [...(prev.coOccupants || []), newCoOccupant.trim()]
    }));
    setNewCoOccupant('');
  };

  const removeCoOccupant = (index: number) => {
    setHasUnsavedChanges(true);
    setEditedBooking(prev => ({
      ...prev,
      coOccupants: (prev.coOccupants || []).filter((_, i) => i !== index)
    }));
  };

  const handlePayment = () => {
    const updated = {
      ...editedBooking,
      paymentStatus: PaymentStatus.Paid,
      paidAmount: editedBooking.totalAmount, // Fully Paid
      status: editedBooking.status === BookingStatus.Confirmed ? BookingStatus.CheckedIn : editedBooking.status,
      checkInTime: editedBooking.checkInTime || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    };
    setEditedBooking(updated);
    setOriginalPaidAmount(updated.totalAmount);
    setHasUnsavedChanges(false); // Reset changes after action
    onUpdate(updated);
  };

  const handleCheckIn = () => {
    if (!editedBooking.idProofType) {
        alert("Please select ID Proof Type before checking in.");
        return;
    }
    const updated = {
      ...editedBooking,
      status: BookingStatus.CheckedIn,
      checkInTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    };
    setEditedBooking(updated);
    setHasUnsavedChanges(false); // Reset changes after action
    onUpdate(updated);
  };
  
  const handleCheckOut = () => {
     const updated = {
      ...editedBooking,
      status: BookingStatus.CheckedOut,
    };
    setEditedBooking(updated);
    setHasUnsavedChanges(false); // Reset changes after action
    onUpdate(updated);
  }

  const handleCancelBooking = () => {
    if (window.confirm(`Are you sure you want to cancel booking ${editedBooking.bookingNo}?`)) {
        const updated = {
            ...editedBooking,
            status: BookingStatus.Cancelled
        };
        onUpdate(updated);
        onClose();
    }
  };

  const confirmDelete = () => {
    onDelete(editedBooking.id);
  };

  const handleSaveChanges = () => {
    if (editedBooking.checkInDate >= editedBooking.checkOutDate) {
        alert("Check-out date must be after check-in date");
        return;
    }
    setHasUnsavedChanges(false);
    onUpdate(editedBooking);
  };

  const balanceDue = Math.max(0, editedBooking.totalAmount - originalPaidAmount);
  const isExtensionPayment = balanceDue > 0 && originalPaidAmount > 0;

  // Determine if Delete button should be visible (Not CheckedIn AND Not CheckedOut)
  const canDelete = editedBooking.status !== BookingStatus.CheckedIn && editedBooking.status !== BookingStatus.CheckedOut;

  const checkOutTimeOptions = [
      "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
  ];
  
  const checkInTimeOptions = [
      "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"
  ];
  
  // Format Date for audit
  const formatAuditDate = (dateStr?: string) => {
    if(!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden print:shadow-none print:h-auto print:max-h-none print:w-full relative">
        
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex justify-between items-start sticky top-0 z-10 print:hidden">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">Booking {editedBooking.bookingNo}</h2>
              <StatusBadge status={editedBooking.status} type="booking" />
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
               <span className="font-semibold text-gray-700">Room {editedBooking.roomNumber}</span> 
               <span>•</span> 
               <span>{editedBooking.checkInDate} to {editedBooking.checkOutDate}</span>
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
             <div className="text-right">
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors mb-1 ml-auto block">
                    <X className="w-6 h-6" />
                </button>
                {/* Audit Trail */}
                <div className="text-[10px] text-gray-400 font-medium">
                    {editedBooking.createdBy && (
                        <div>Recorded by <span className="text-gray-600">{editedBooking.createdBy}</span> @ {formatAuditDate(editedBooking.createdAt)}</div>
                    )}
                    {editedBooking.updatedBy && (
                        <div>Updated by <span className="text-gray-600">{editedBooking.updatedBy}</span> @ {formatAuditDate(editedBooking.updatedAt)}</div>
                    )}
                </div>
             </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6 print:bg-white print:p-0 print:overflow-visible">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-7 space-y-6">
              {/* Guest Info */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg border-b pb-2">
                  <UserSquare2 className="w-5 h-5 text-primary-600" /> 
                  Guest Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Guest Name <span className="text-red-500">*</span></label>
                        <input 
                            name="guestName"
                            value={editedBooking.guestName}
                            onChange={handleInputChange}
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Phone Number
                        </label>
                        <input 
                            name="guestPhone"
                            value={editedBooking.guestPhone || ''}
                            onChange={handleInputChange}
                            placeholder="Optional"
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                            <Car className="w-3 h-3" /> License Plate
                        </label>
                        <input 
                            name="licensePlate"
                            value={editedBooking.licensePlate || ''}
                            onChange={handleInputChange}
                            placeholder="Optional"
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>
              </div>

              {/* Booked By Info (Restyled to match Guest Info) */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg border-b pb-2">
                  <Building className="w-5 h-5 text-primary-600" /> 
                  Booked By
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Booker Name</label>
                        <input 
                            name="bookerName"
                            value={editedBooking.bookerName}
                            onChange={handleInputChange}
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Phone Number
                        </label>
                        <input 
                            name="bookerPhone"
                            value={editedBooking.bookerPhone}
                            onChange={handleInputChange}
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                            <Building className="w-3 h-3" /> Organization
                        </label>
                        <input 
                            name="organization"
                            value={editedBooking.organization}
                            onChange={handleInputChange}
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>
              </div>

              {/* Co-occupants */}
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                 <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg border-b pb-2">
                  <Users className="w-5 h-5 text-primary-600" /> 
                  Co-occupants <span className="text-sm font-normal text-gray-600 ml-auto">Max 3 persons</span>
                </h3>
                
                <p className="text-xs text-gray-500 mb-3 italic">Additional guests staying in the room.</p>
                <div className="space-y-3">
                    {editedBooking.coOccupants?.map((name, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100 group">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                            </div>
                            <span className="text-sm text-gray-900 font-medium flex-1">{name}</span>
                            <button onClick={() => removeCoOccupant(idx)} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    
                    {(!editedBooking.coOccupants || editedBooking.coOccupants.length === 0) && (
                        <div className="text-center py-4 text-gray-400 text-sm italic border-2 border-dashed border-gray-100 rounded-lg">
                            No co-occupants listed
                        </div>
                    )}

                    {(editedBooking.coOccupants?.length || 0) < 3 && (
                        <div className="flex gap-2 mt-2">
                            <input 
                                value={newCoOccupant}
                                onChange={(e) => setNewCoOccupant(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-primary-500" 
                                placeholder="Enter full name"
                                onKeyDown={(e) => e.key === 'Enter' && addCoOccupant()}
                            />
                            <button 
                                onClick={addCoOccupant} 
                                className="bg-gray-100 hover:bg-gray-200 px-4 rounded-lg text-sm font-bold text-gray-700 border border-gray-200 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                    )}
                </div>
              </div>
              
              {/* DELETE BUTTON (Moved to Bottom Left) */}
              {canDelete && (
                <div className="flex justify-start pt-2">
                    <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="group flex items-center gap-2 text-gray-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                        title="Delete Booking Record"
                    >
                        <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" /> 
                        <span className="text-sm font-medium">Delete Booking</span>
                    </button>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* Stay & Rate */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 relative">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg border-b pb-2">
                        <Clock className="w-5 h-5 text-primary-600" /> 
                        Stay & Rate
                    </h3>

                    {/* Conflict Alert Box */}
                    {conflictAlert && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <Ban className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-800 font-medium">
                                <p className="font-bold mb-1">Conflict Detected</p>
                                {conflictAlert}
                            </div>
                        </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Check-in</label>
                            <input
                                type="date"
                                name="checkInDate"
                                value={editedBooking.checkInDate}
                                onChange={handleInputChange}
                                className="w-full p-1.5 border border-gray-300 rounded text-sm font-bold text-gray-900 mb-1 focus:ring-2 focus:ring-primary-500"
                            />
                            
                            {/* Check-in Time Selection */}
                             <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                                <label className="text-[10px] uppercase font-bold text-gray-700">Time</label>
                                <select 
                                    value={editedBooking.expectedCheckInTime || "14:00"}
                                    onChange={(e) => handleCheckInTimeChange(e.target.value)}
                                    className="text-xs border border-gray-300 rounded p-1 bg-white focus:ring-2 focus:ring-primary-500 font-bold text-gray-900"
                                >
                                    {checkInTimeOptions.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            
                             {editedBooking.earlyCheckInSurcharge && editedBooking.earlyCheckInSurcharge > 0 ? (
                                <div className="mt-1 text-[10px] text-red-500 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Early Check-in
                                </div>
                            ) : null}
                        </div>
                        
                         <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Check-out</label>
                            <input
                                type="date"
                                name="checkOutDate"
                                value={editedBooking.checkOutDate}
                                onChange={handleInputChange}
                                className="w-full p-1.5 border border-gray-300 rounded text-sm font-bold text-gray-900 mb-1 focus:ring-2 focus:ring-primary-500"
                            />
                            
                            {/* Check-out Time Selection */}
                            <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                                <label className="text-[10px] uppercase font-bold text-gray-700">Time</label>
                                <select 
                                    value={editedBooking.expectedCheckOutTime || "12:00"}
                                    onChange={(e) => handleCheckOutTimeChange(e.target.value)}
                                    className="text-xs border border-gray-300 rounded p-1 bg-white focus:ring-2 focus:ring-primary-500 font-bold text-gray-900"
                                >
                                    {checkOutTimeOptions.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {editedBooking.lateCheckOutSurcharge && editedBooking.lateCheckOutSurcharge > 0 ? (
                                <div className="mt-1 text-[10px] text-red-500 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Late Check-out
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Rate Selection */}
                    <div className="mb-5">
                        <label className="block text-sm font-bold text-gray-900 mb-2">Rate Type <span className="text-red-500">*</span></label>
                        <div className="space-y-2">
                            <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${editedBooking.rate === 1200 ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="radio" 
                                        name="rate" 
                                        checked={editedBooking.rate === 1200} 
                                        onChange={() => handleRateChange(1200)}
                                        className="text-primary-600 focus:ring-primary-500 w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-gray-900">Internal (MDCU/Chula)</span>
                                </div>
                                <span className="text-sm font-bold text-primary-700">1,200 ฿</span>
                            </label>

                             <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${editedBooking.rate === 1500 ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="radio" 
                                        name="rate" 
                                        checked={editedBooking.rate === 1500} 
                                        onChange={() => handleRateChange(1500)}
                                        className="text-primary-600 focus:ring-primary-500 w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-gray-900">External Guest</span>
                                </div>
                                <span className="text-sm font-bold text-primary-700">1,500 ฿</span>
                            </label>
                        </div>
                    </div>

                    {/* ID Proof */}
                    <div className="mb-5">
                        <label className="block text-sm font-bold text-gray-900 mb-2">ID Proof Verified <span className="text-red-500">*</span></label>
                        <div className="flex flex-wrap gap-2">
                            {['Staff ID', 'National ID', 'Passport'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => handleIdProofChange(type as any)}
                                    className={`px-3 py-2 rounded-md text-xs font-bold border transition-all ${
                                        editedBooking.idProofType === type
                                        ? 'bg-green-600 text-white border-green-600 shadow-sm'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {editedBooking.idProofType === type && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                     {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes</label>
                        <textarea 
                            name="notes"
                            value={editedBooking.notes || ''}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Additional requests..."
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>

                {/* Total & Payment (Updated to White Theme) */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-900 font-bold">Total Amount</span>
                        <span className="text-3xl font-bold text-primary-700">{editedBooking.totalAmount.toLocaleString()} <span className="text-lg font-normal text-gray-400">THB</span></span>
                    </div>

                    {/* Balance Due Notice */}
                    {isExtensionPayment && (
                         <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4 flex items-center justify-between animate-pulse">
                             <div className="flex items-center gap-2 text-red-800 text-sm font-bold">
                                 <AlertCircle className="w-4 h-4" />
                                 Balance Due (Extended)
                             </div>
                             <div className="text-red-700 font-bold text-lg">
                                 {balanceDue.toLocaleString()} THB
                             </div>
                         </div>
                    )}
                    
                    <div className="flex gap-2">
                         {/* Delete Button Removed From Here */}

                         {hasUnsavedChanges ? (
                             <button 
                                onClick={handleSaveChanges} 
                                className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors border border-primary-500 animate-in fade-in zoom-in duration-200"
                             >
                                <Save className="w-4 h-4" /> Save Changes
                             </button>
                         ) : (
                             <>
                                {editedBooking.status !== BookingStatus.CheckedIn && editedBooking.status !== BookingStatus.CheckedOut && editedBooking.status !== BookingStatus.Cancelled && (
                                        <button 
                                            onClick={handleCheckIn}
                                            className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20"
                                        >
                                            <CheckCircle className="w-5 h-5" /> Check-in
                                        </button>
                                )}
                                
                                {(editedBooking.paymentStatus === PaymentStatus.Unpaid || isExtensionPayment) && editedBooking.status !== BookingStatus.Cancelled && (
                                    <button 
                                        onClick={handlePayment}
                                        className="flex-1 py-3 bg-white hover:bg-gray-50 border border-gray-300 text-gray-900 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <CreditCard className="w-5 h-5 text-gray-500" /> 
                                        <span>Pay {isExtensionPayment ? `Difference` : ''}</span>
                                    </button>
                                )}

                                {editedBooking.status === BookingStatus.CheckedIn && (
                                        <button 
                                            onClick={handleCheckOut}
                                            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-900/20"
                                        >
                                            <Clock className="w-5 h-5" /> Check-out
                                        </button>
                                )}

                                {editedBooking.status === BookingStatus.Cancelled && (
                                    <div className="flex-1 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold flex items-center justify-center gap-2">
                                        <X className="w-5 h-5" /> Booking Cancelled
                                    </div>
                                )}
                             </>
                         )}
                    </div>
                    {editedBooking.paymentStatus === PaymentStatus.Paid && editedBooking.status !== BookingStatus.Cancelled && !isExtensionPayment && (
                        <div className="mt-3 text-center text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Payment Complete
                        </div>
                    )}
                </div>

                <button className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors print:hidden">
                    <Printer className="w-4 h-4" /> Print Registration Form
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-sm w-full p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Deletion</h3>
                <p className="text-gray-500 mb-6 text-sm">
                    Are you sure you want to permanently delete booking <span className="font-mono font-bold text-gray-800">{editedBooking.bookingNo}</span>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmDelete}
                        className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                    >
                        Yes, Delete
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetailModal;
