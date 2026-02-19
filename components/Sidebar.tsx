
import React from 'react';
import { LayoutDashboard, CalendarDays, CalendarRange, ClipboardList, Settings, LogOut, Building2, Receipt, Users, History } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  currentUser: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, currentUser, onLogout }) => {
  const menuItems = [
    { id: 'daily', label: 'Daily View', icon: CalendarDays },
    { id: 'monthly', label: 'Monthly Calendar', icon: CalendarRange },
    { id: 'housekeeping', label: 'Housekeeping', icon: ClipboardList },
    { id: 'finance', label: 'Finance & Receipts', icon: Receipt },
    { id: 'history', label: 'History & Guests', icon: History },
    { id: 'yearly', label: 'Yearly Overview', icon: LayoutDashboard },
  ];

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 no-print z-40">
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 leading-tight">Faculty Dorm</h1>
          <p className="text-xs text-gray-500">@ MDCU</p>
        </div>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1">
        <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Main Menu
        </div>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === item.id 
                ? 'bg-primary-50 text-primary-700' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-primary-600' : 'text-gray-400'}`} />
            {item.label}
          </button>
        ))}

        {currentUser.role === 'Super Admin' && (
          <>
            <div className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Administration
            </div>
            <button
              onClick={() => onChangeView('users')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'users' 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Users className={`w-5 h-5 ${currentView === 'users' ? 'text-primary-600' : 'text-gray-400'}`} />
              User Management
            </button>
          </>
        )}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="mb-4 px-3 flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                 {currentUser.name.charAt(0)}
             </div>
             <div className="overflow-hidden">
                 <p className="text-sm font-bold text-gray-800 truncate">{currentUser.name}</p>
                 <p className="text-xs text-gray-500 truncate">{currentUser.role}</p>
             </div>
        </div>

        <button 
            onClick={() => onChangeView('settings')}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium w-full rounded-lg transition-colors ${
                currentView === 'settings' 
                ? 'bg-primary-50 text-primary-700' 
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
        >
          <Settings className={`w-5 h-5 ${currentView === 'settings' ? 'text-primary-600' : 'text-gray-400'}`} />
          Settings
        </button>
        <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 w-full rounded-lg mt-1"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
