
import React, { useState } from 'react';
import { Settings, Check, Ban, AlertTriangle, Calendar, X, Infinity, Lock } from 'lucide-react';
import { Room, User } from '../types';

interface SettingsViewProps {
  rooms: Room[];
  onUpdateRoom: (room: Room) => void;
  currentUser: User;
}

const SettingsView: React.FC<SettingsViewProps> = ({ rooms, onUpdateRoom, currentUser }) => {
  const [selectedFloor, setSelectedFloor] = useState<string>('All');
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [selectedRoomForMaintenance, setSelectedRoomForMaintenance] = useState<Room | null>(null);
  
  // Maintenance Form State
  const [mStartDate, setMStartDate] = useState('');
  const [mEndDate, setMEndDate] = useState('');
  const [isIndefinite, setIsIndefinite] = useState(false);

  // Group rooms by floor
  const floors = ['8', '9'];
  
  const filteredRooms = selectedFloor === 'All' 
    ? rooms 
    : rooms.filter(r => r.floor === selectedFloor);

  const isSuperAdmin = currentUser.role === 'Super Admin';

  const openMaintenanceModal = (room: Room) => {
    if (!isSuperAdmin) return;

    setSelectedRoomForMaintenance(room);
    // Default to today and tomorrow if not set
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const nextWeek = tomorrow.toISOString().split('T')[0];

    // If currently indefinite or just opening fresh
    if (room.status === 'Maintenance' && (!room.maintenanceStart || !room.maintenanceEnd)) {
        setIsIndefinite(true);
        setMStartDate(today);
        setMEndDate(nextWeek);
    } else {
        setIsIndefinite(false);
        setMStartDate(room.maintenanceStart || today);
        setMEndDate(room.maintenanceEnd || nextWeek);
    }
    
    setMaintenanceModalOpen(true);
  };

  const closeMaintenanceModal = () => {
    setMaintenanceModalOpen(false);
    setSelectedRoomForMaintenance(null);
  };

  const confirmMaintenance = () => {
    if (selectedRoomForMaintenance) {
        if (!isIndefinite) {
            if (!mStartDate || !mEndDate) {
                alert("Please select dates or choose 'Indefinite'");
                return;
            }
            if (mStartDate > mEndDate) {
                alert("End date must be after start date");
                return;
            }
        }

        onUpdateRoom({
            ...selectedRoomForMaintenance,
            status: 'Maintenance',
            maintenanceStart: isIndefinite ? undefined : mStartDate,
            maintenanceEnd: isIndefinite ? undefined : mEndDate
        });
        closeMaintenanceModal();
    }
  };

  const enableRoom = (room: Room) => {
    if (!isSuperAdmin) return;
    
    onUpdateRoom({ 
        ...room, 
        status: 'Active',
        maintenanceStart: undefined,
        maintenanceEnd: undefined
    });
  };

  const getStats = () => {
    const total = rooms.length;
    const active = rooms.filter(r => r.status === 'Active').length;
    const maintenance = rooms.filter(r => r.status === 'Maintenance').length;
    return { total, active, maintenance };
  };

  const stats = getStats();

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <Settings className="w-6 h-6 text-gray-500" />
             Room Management
           </h2>
           <p className="text-sm text-gray-500 mt-1">Schedule maintenance periods for rooms.</p>
        </div>
        
        <div className="flex gap-4">
           <div className="text-center px-4 py-2 bg-green-50 rounded-lg border border-green-100">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-xs text-green-700 font-medium uppercase">Active</div>
           </div>
           <div className="text-center px-4 py-2 bg-red-50 rounded-lg border border-red-100">
              <div className="text-2xl font-bold text-red-600">{stats.maintenance}</div>
              <div className="text-xs text-red-700 font-medium uppercase">Maintenance</div>
           </div>
        </div>
      </div>

      {!isSuperAdmin && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-orange-800 font-medium">
                Restricted Access: Only <strong>Super Admin</strong> can change room status or schedule maintenance.
            </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedFloor('All')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFloor === 'All' ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          All Floors
        </button>
        {floors.map(floor => (
          <button
            key={floor}
            onClick={() => setSelectedFloor(floor)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedFloor === floor ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Floor {floor}
          </button>
        ))}
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {filteredRooms.map(room => (
          <div 
            key={room.id}
            className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-between min-h-[160px] ${
              room.status === 'Active' 
                ? 'bg-white border-transparent shadow-sm hover:shadow-md hover:border-primary-100' 
                : 'bg-gray-50 border-red-200 shadow-inner'
            }`}
          >
             <div className="text-center w-full">
                <div className={`text-2xl font-bold mb-1 ${room.status === 'Active' ? 'text-gray-800' : 'text-gray-400'}`}>
                    {room.number}
                </div>
                <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">{room.type}</div>
                
                {room.status === 'Maintenance' && (
                    <div className="w-full bg-red-50 rounded p-1 mb-1 border border-red-100">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-red-600 font-bold uppercase">
                            <AlertTriangle className="w-3 h-3" /> Maintenance
                        </div>
                        <div className="text-[9px] text-red-800 mt-0.5 font-mono leading-tight">
                            {(!room.maintenanceStart || !room.maintenanceEnd) ? (
                                <span className="flex items-center justify-center gap-1 font-bold">
                                    <Infinity className="w-3 h-3" /> Indefinite
                                </span>
                            ) : (
                                <>{room.maintenanceStart}<br/>to<br/>{room.maintenanceEnd}</>
                            )}
                        </div>
                    </div>
                )}
             </div>

             <button
                disabled={!isSuperAdmin}
                onClick={() => room.status === 'Active' ? openMaintenanceModal(room) : enableRoom(room)}
                className={`w-full mt-2 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    !isSuperAdmin
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : room.status === 'Active'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
                title={!isSuperAdmin ? "Super Admin Only" : ""}
             >
                {room.status === 'Active' ? (
                    <>
                        <Ban className="w-3 h-3" /> {isSuperAdmin ? 'Disable' : 'Locked'}
                    </>
                ) : (
                    <>
                        <Check className="w-3 h-3" /> {isSuperAdmin ? 'Enable' : 'Locked'}
                    </>
                )}
             </button>
             
             {/* Status Indicator Dot */}
             <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${room.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
        ))}
      </div>

      {/* Maintenance Date Selection Modal */}
      {maintenanceModalOpen && selectedRoomForMaintenance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gray-800 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        Close Room {selectedRoomForMaintenance.number}
                    </h3>
                    <button onClick={closeMaintenanceModal} className="hover:bg-gray-700 p-1 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Please select the duration for maintenance.
                    </p>
                    
                    {/* Indefinite Toggle */}
                    <div className="mb-6 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            id="indefinite"
                            checked={isIndefinite}
                            onChange={(e) => setIsIndefinite(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="indefinite" className="text-sm font-bold text-gray-800 flex items-center gap-2 select-none cursor-pointer">
                            <Infinity className="w-4 h-4 text-gray-500" />
                            Close Indefinitely
                        </label>
                    </div>

                    <div className={`space-y-4 transition-all duration-300 ${isIndefinite ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
                            <input 
                                type="date" 
                                value={mStartDate}
                                onChange={(e) => setMStartDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">End Date</label>
                            <input 
                                type="date" 
                                value={mEndDate}
                                onChange={(e) => setMEndDate(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                    
                    <div className="mt-6 flex gap-3 justify-end">
                        <button 
                            onClick={closeMaintenanceModal}
                            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmMaintenance}
                            className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg shadow-sm"
                        >
                            Confirm Maintenance
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
