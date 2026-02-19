import React from 'react';
import { BookingStatus, PaymentStatus } from '../types';

interface StatusBadgeProps {
  status: BookingStatus | PaymentStatus;
  type: 'booking' | 'payment';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
  let colorClass = "bg-gray-100 text-gray-800";

  if (type === 'booking') {
    switch (status) {
      case BookingStatus.Draft:
        colorClass = "bg-gray-100 text-gray-600 border border-gray-200";
        break;
      case BookingStatus.Confirmed:
        colorClass = "bg-blue-100 text-blue-700 border border-blue-200";
        break;
      case BookingStatus.CheckedIn:
        colorClass = "bg-green-100 text-green-700 border border-green-200";
        break;
      case BookingStatus.CheckedOut:
        colorClass = "bg-purple-100 text-purple-700 border border-purple-200";
        break;
      case BookingStatus.Cancelled:
        colorClass = "bg-red-100 text-red-700 border border-red-200";
        break;
    }
  } else {
    switch (status) {
      case PaymentStatus.Unpaid:
        colorClass = "bg-orange-100 text-orange-700 border border-orange-200";
        break;
      case PaymentStatus.Paid:
        colorClass = "bg-emerald-100 text-emerald-700 border border-emerald-200";
        break;
    }
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
};

export default StatusBadge;