
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import DailyView from './components/DailyView';
import MonthlyView from './components/MonthlyView';
import HousekeepingView from './components/HousekeepingView';
import FinanceView from './components/FinanceView';
import SettingsView from './components/SettingsView';
import YearlyView from './components/YearlyView';
import LoginView from './components/LoginView';
import UserManagementView from './components/UserManagementView';
import CreateBookingModal from './components/CreateBookingModal';
import BookingDetailModal from './components/BookingDetailModal';
import HistoryView from './components/HistoryView';
import { Plus, Wand2, Repeat } from 'lucide-react';
import { MOCK_BOOKINGS, MOCK_ROOMS, MOCK_USERS } from './constants';
import { Booking, BookingStatus, PaymentStatus, Room, User } from './types';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState('');
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  const [currentView, setCurrentView] = useState('daily');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [rooms, setRooms] = useState<Room[]>(MOCK_ROOMS);
  
  // For monthly view detail popup
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // -- AUTH HANDLERS --
  const handleLogin = (email: string, pass: string) => {
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
        setCurrentUser(user);
        setLoginError('');
        setCurrentView('daily');
    } else {
        setLoginError('Invalid email or password');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('daily');
    setLoginError('');
  };

  const handleAddUser = (newUser: Omit<User, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setUsers([...users, { ...newUser, id }]);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  // -- APP HANDLERS --

  const handleCreateBooking = (data: any) => {
    // Calculate nights
    const start = new Date(data.checkInDate);
    const end = new Date(data.checkOutDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    const rate = data.rate || 1200;
    let total = rate * nights;
    
    // Apply Early Check-in Surcharge (e.g., 50% of 1 night rate)
    if (data.earlyCheckInSurcharge > 0) {
        total += (rate * 0.5);
    }

    // Apply Late Check-out Surcharge (e.g., 50% of 1 night rate)
    if (data.lateCheckOutSurcharge > 0) {
        total += (rate * 0.5);
    }

    const newBooking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      bookingNo: `BK-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
      bookerName: data.bookerName,
      bookerPhone: data.bookerPhone,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      organization: data.organization,
      roomNumber: data.roomNumber,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      status: BookingStatus.Confirmed,
      paymentStatus: PaymentStatus.Unpaid,
      rate: rate,
      totalAmount: total,
      earlyCheckInSurcharge: data.earlyCheckInSurcharge,
      expectedCheckInTime: data.expectedCheckInTime,
      lateCheckOutSurcharge: data.lateCheckOutSurcharge,
      expectedCheckOutTime: data.expectedCheckOutTime,
      notes: data.notes,
      // Audit Trail
      createdBy: currentUser?.name || 'Unknown',
      createdAt: new Date().toISOString()
    };
    setBookings(prev => [...prev, newBooking]);
  };

  // PROTOTYPE: Random Generator
  const generateRandomBooking = () => {
    const activeRooms = rooms.filter(r => r.status === 'Active');
    if (activeRooms.length === 0) return;

    const names = ["Somchai Jai-dee", "Somsri Rak-thai", "John Wick", "Tony Stark", "Steve Rogers", "Natasha Romanoff", "Bruce Banner", "Peter Parker", "Wanda Maximoff", "Doctor Strange", "Harry Potter", "Hermione Granger"];
    const orgs = ["Surgery", "Pediatrics", "Radiology", "Medicine", "Orthopedics", "Anesthesiology", "Cardiology", "Neurology", "General Admin", "External Guest"];
    
    // Helpers
    const randomEl = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const room = randomEl(activeRooms);
    const bookerName = randomEl(names);
    
    // Dates: Random start within +/- 15 days from today
    const today = new Date();
    const startOffset = randomInt(-5, 15); 
    const stayLength = randomInt(1, 5);
    
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + startOffset);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkIn.getDate() + stayLength);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const checkInStr = formatDate(checkIn);
    const checkOutStr = formatDate(checkOut);

    // Random Rate
    const rate = Math.random() > 0.5 ? 1200 : 1500;
    
    // Options
    const isEarly = Math.random() > 0.8;
    const isLate = Math.random() > 0.8;
    
    let total = rate * stayLength;
    if (isEarly) total += rate * 0.5;
    if (isLate) total += rate * 0.5;

    const newBooking: Booking = {
        id: Math.random().toString(36).substr(2, 9),
        bookingNo: `BK-RND-${Math.floor(Math.random() * 10000)}`,
        bookerName: bookerName,
        bookerPhone: `08${randomInt(1,9)}-${randomInt(100,999)}-${randomInt(1000,9999)}`,
        guestName: Math.random() > 0.7 ? randomEl(names) : bookerName,
        organization: randomEl(orgs),
        roomNumber: room.number,
        checkInDate: checkInStr,
        checkOutDate: checkOutStr,
        status: BookingStatus.Confirmed,
        paymentStatus: PaymentStatus.Unpaid,
        rate: rate as 1200 | 1500,
        totalAmount: total,
        paidAmount: 0,
        earlyCheckInSurcharge: isEarly ? 50 : 0,
        expectedCheckInTime: isEarly ? "09:00" : undefined,
        lateCheckOutSurcharge: isLate ? 50 : 0,
        expectedCheckOutTime: isLate ? "16:00" : undefined,
        notes: "Auto-generated by Prototype Control",
        createdBy: 'Prototype Bot',
        createdAt: new Date().toISOString()
    };
    
    setBookings(prev => [...prev, newBooking]);
  };

  // PROTOTYPE: Repeat Guest Generator (Same person, different dates)
  const generateRepeatGuestBooking = () => {
    if (bookings.length === 0) {
        generateRandomBooking();
        return;
    }

    // 1. Pick a random existing booking to get guest details
    const sourceBooking = bookings[Math.floor(Math.random() * bookings.length)];
    
    // 2. Determine new dates (Future booking relative to their last stay)
    const guestBookings = bookings.filter(b => b.bookerPhone === sourceBooking.bookerPhone);
    const lastCheckOut = guestBookings.reduce((max, b) => {
        return b.checkOutDate > max ? b.checkOutDate : max;
    }, sourceBooking.checkOutDate);

    const lastDate = new Date(lastCheckOut);
    
    // Add 2-10 days gap
    const nextCheckIn = new Date(lastDate);
    nextCheckIn.setDate(nextCheckIn.getDate() + Math.floor(Math.random() * 8) + 2); 
    
    const stayLength = Math.floor(Math.random() * 3) + 1; // 1-3 nights
    const nextCheckOut = new Date(nextCheckIn);
    nextCheckOut.setDate(nextCheckIn.getDate() + stayLength);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const checkInStr = formatDate(nextCheckIn);
    const checkOutStr = formatDate(nextCheckOut);

    // 3. Find available room
    const availableRooms = rooms.filter(room => {
        if (room.status !== 'Active') return false;
        
        // Check collision with ALL bookings
        const isTaken = bookings.some(b => {
            if (b.roomNumber !== room.number) return false;
            if (b.status === BookingStatus.Cancelled) return false;
            return (b.checkInDate < checkOutStr) && (checkInStr < b.checkOutDate);
        });
        return !isTaken;
    });

    if (availableRooms.length === 0) {
        console.warn("No rooms available for repeat guest auto-gen.");
        return;
    }
    
    // Prefer same room if available, else random
    let selectedRoom = availableRooms.find(r => r.number === sourceBooking.roomNumber);
    if (!selectedRoom) {
        selectedRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
    }

    const newBooking: Booking = {
        id: Math.random().toString(36).substr(2, 9),
        bookingNo: `BK-RPT-${Math.floor(Math.random() * 10000)}`,
        bookerName: sourceBooking.bookerName,
        bookerPhone: sourceBooking.bookerPhone,
        guestName: sourceBooking.guestName,
        guestPhone: sourceBooking.guestPhone,
        organization: sourceBooking.organization,
        roomNumber: selectedRoom.number,
        checkInDate: checkInStr,
        checkOutDate: checkOutStr,
        status: BookingStatus.Confirmed,
        paymentStatus: PaymentStatus.Unpaid,
        rate: sourceBooking.rate,
        totalAmount: sourceBooking.rate * stayLength,
        paidAmount: 0,
        notes: "Returning Guest (Auto-generated)",
        createdBy: 'Prototype Bot',
        createdAt: new Date().toISOString()
    };
    
    setBookings(prev => [...prev, newBooking]);
  };

  const handleUpdateBooking = (updatedBooking: Booking) => {
    // Add Audit Update Info
    const bookingWithAudit = {
        ...updatedBooking,
        updatedBy: currentUser?.name || 'Unknown',
        updatedAt: new Date().toISOString()
    };

    setBookings(prev => prev.map(b => b.id === bookingWithAudit.id ? bookingWithAudit : b));
    if (selectedBooking && selectedBooking.id === bookingWithAudit.id) {
        setSelectedBooking(bookingWithAudit); // Keep modal in sync
    }
  };

  const handleDeleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    setSelectedBooking(null);
  };

  const handleUpdateRoom = (updatedRoom: Room) => {
    setRooms(prev => prev.map(r => r.id === updatedRoom.id ? updatedRoom : r));
  };

  // If not logged in, show Login View
  if (!currentUser) {
    return <LoginView onLogin={handleLogin} error={loginError} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'daily':
        return <DailyView bookings={bookings} onUpdateBooking={handleUpdateBooking} onDeleteBooking={handleDeleteBooking} />;
      case 'monthly':
        return <MonthlyView bookings={bookings} rooms={rooms} onSelectBooking={setSelectedBooking} />;
      case 'housekeeping':
        return <HousekeepingView bookings={bookings} rooms={rooms} />;
      case 'finance':
        return <FinanceView bookings={bookings} onUpdateBooking={handleUpdateBooking} />;
      case 'history':
        return <HistoryView bookings={bookings} onSelectBooking={setSelectedBooking} />;
      case 'settings':
        return <SettingsView rooms={rooms} onUpdateRoom={handleUpdateRoom} currentUser={currentUser} />;
      case 'yearly':
        return <YearlyView bookings={bookings} rooms={rooms} />;
      case 'users':
        return <UserManagementView users={users} onAddUser={handleAddUser} onDeleteUser={handleDeleteUser} currentUserId={currentUser.id} />;
      default:
        return <DailyView bookings={bookings} onUpdateBooking={handleUpdateBooking} onDeleteBooking={handleDeleteBooking} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F3F4F6]">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto pb-24">
        {/* Top Bar Area */}
        <div className="flex justify-between items-center mb-8 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {currentView === 'daily' && 'Daily Operations'}
              {currentView === 'monthly' && 'Monthly Schedule'}
              {currentView === 'housekeeping' && 'Housekeeping'}
              {currentView === 'finance' && 'Finance & Receipts'}
              {currentView === 'history' && 'History & Guest Database'}
              {currentView === 'settings' && 'System Settings'}
              {currentView === 'yearly' && 'Yearly Dashboard'}
              {currentView === 'users' && 'User Administration'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage bookings, rooms, and guests efficiently.</p>
          </div>
          
          {currentView !== 'settings' && currentView !== 'users' && currentView !== 'history' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium flex items-center gap-2 transition-colors focus:ring-4 focus:ring-primary-100"
              >
                <Plus className="w-5 h-5" />
                Create Booking
              </button>
          )}
        </div>

        {/* View Content */}
        {renderContent()}

        {/* Modals */}
        <CreateBookingModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onCreate={handleCreateBooking}
          bookings={bookings}
          rooms={rooms}
        />

        {selectedBooking && (
           <BookingDetailModal 
             booking={selectedBooking} 
             allBookings={bookings}
             onClose={() => setSelectedBooking(null)}
             onUpdate={handleUpdateBooking}
             onDelete={handleDeleteBooking}
           />
        )}

         {/* PROTOTYPE CONTROL PANEL (Fixed Bottom) */}
         <div className="fixed bottom-0 left-64 right-0 bg-gray-900 text-white p-3 z-[60] shadow-[0_-5px_15px_rgba(0,0,0,0.1)] border-t border-gray-700 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center border border-gray-600">
                    <Wand2 className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-200">Prototype Control</h3>
                    <p className="text-[10px] text-gray-500">Auto-generate Data</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => generateRandomBooking()}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-bold border border-gray-600 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-3 h-3" /> Gen 1 Guest
                </button>
                <button 
                    onClick={generateRepeatGuestBooking}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-bold transition-colors flex items-center gap-2 shadow-lg"
                >
                    <Repeat className="w-3 h-3" /> Repeat Guest
                </button>
                <button 
                    onClick={() => { for(let i=0; i<5; i++) generateRandomBooking(); }}
                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 rounded text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-primary-900/20"
                >
                    <Plus className="w-3 h-3" /> Gen 5 Guests
                </button>
            </div>
         </div>
      </main>
    </div>
  );
};

export default App;
