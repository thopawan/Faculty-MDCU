
import React, { useState } from 'react';
import { Building2, Lock, User, Terminal } from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string, pass: string) => void;
  error?: string;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const autoFill = (role: 'admin' | 'staff') => {
    if (role === 'admin') {
      setEmail('admin@mdcu.com');
      setPassword('password123');
    } else {
      setEmail('staff@mdcu.com');
      setPassword('staff');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-primary-600 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-white mb-4 backdrop-blur-sm">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Faculty Dorm</h1>
          <p className="text-primary-100 text-sm mt-1">@ MDCU Management System</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email / UserID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="admin@mdcu.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg text-center font-medium animate-pulse">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Sign In
            </button>
          </form>
          
          {/* Prototype Controls */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
               <Terminal className="w-3 h-3" /> Prototype Auto-fill
            </div>
            <div className="grid grid-cols-2 gap-3">
               <button
                 type="button"
                 onClick={() => autoFill('admin')}
                 className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-lg border border-gray-200 transition-colors text-left"
               >
                 Login as Super Admin
               </button>
               <button
                 type="button"
                 onClick={() => autoFill('staff')}
                 className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-lg border border-gray-200 transition-colors text-left"
               >
                 Login as Staff
               </button>
            </div>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-400">
             Authorized Personnel Only
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
