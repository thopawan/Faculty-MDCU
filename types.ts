
export enum BookingStatus {
  Draft = "Draft",
  Confirmed = "Confirmed",
  CheckedIn = "Checked-in",
  CheckedOut = "Checked-out",
  Cancelled = "Cancelled",
}

export enum PaymentStatus {
  Unpaid = "Unpaid",
  Paid = "Paid",
}

export interface User {
  id: string;
  name: string;
  email: string; // Used as UserID
  password: string;
  role: 'Super Admin' | 'Admin';
}

export interface Room {
  id: string;
  number: string;
  floor: string;
  type: "Standard" | "Special";
  status: "Active" | "Maintenance";
  maintenanceStart?: string; // YYYY-MM-DD
  maintenanceEnd?: string;   // YYYY-MM-DD
}

export interface Transaction {
  id: string;
  type: 'Room Charge' | 'Early Check-in' | 'Late Check-out' | 'Extension' | 'Damage' | 'Other';
  amount: number;
  status: 'Paid' | 'Unpaid';
  receiptNumber?: string;
  updatedBy?: string;
  timestamp: string;
  note?: string;
}

export interface Booking {
  id: string;
  bookingNo: string;
  bookerName: string;
  bookerPhone: string;
  guestName: string; // Initially same as booker, can be changed
  guestPhone?: string; // Contact for the actual guest
  identificationNumber?: string; // Added for passport/ID card
  organization: string;
  roomNumber: string;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string; // YYYY-MM-DD
  checkInTime?: string; // Actual arrival time
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  rate: 1200 | 1500;
  totalAmount: number;
  paidAmount?: number; // Amount actually received so far
  
  transactions?: Transaction[]; // New: List of split payments/receipts

  licensePlate?: string;
  receiptNumber?: string; // Legacy field, kept for compatibility
  notes?: string;
  earlyCheckInSurcharge?: 0 | 50 | 100; // Surcharge percentage for early check-in
  expectedCheckInTime?: string; // HH:mm for planning
  lateCheckOutSurcharge?: 0 | 50 | 100; // Surcharge percentage for late check-out
  expectedCheckOutTime?: string; // HH:mm for planning
  coOccupants?: string[];
  idProofType?: 'Staff ID' | 'National ID' | 'Passport';
  
  // Audit Trail
  createdBy?: string;
  createdAt?: string; // ISO String
  updatedBy?: string;
  updatedAt?: string; // ISO String
}

export interface HousekeepingItem {
  roomNumber: string;
  guestCount: number;
  checkIn: boolean;
  checkOut: boolean;
  items: {
    pillow: number;
    tissueRoll: number;
    tissueBox: number;
    shampoo: number;
    soap: number;
    water: number;
    sanitaryBag: number;
    showerCap: number;
    glassBag: number;
  };
  notes: string;
}
