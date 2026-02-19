
import { Booking, BookingStatus, PaymentStatus, Room, User } from "./types";

// Helper to generate dates relative to today
const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const formatDateTime = (date: Date) => date.toLocaleString('en-GB');

const addDays = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Super Admin',
    email: 'admin@mdcu.com',
    password: 'password123',
    role: 'Super Admin'
  },
  {
    id: 'u2',
    name: 'Staff Member',
    email: 'staff@mdcu.com',
    password: 'staff',
    role: 'Admin'
  }
];

export const MOCK_ROOMS: Room[] = [
  // Floor 8
  ...Array.from({ length: 16 }, (_, i) => ({
    id: `8${i + 1 < 10 ? '0' + (i + 1) : i + 1}`,
    number: `8${i + 1 < 10 ? '0' + (i + 1) : i + 1}`,
    floor: "8",
    type: "Standard" as const,
    status: "Active" as const
  })),
  // Floor 9
  ...Array.from({ length: 16 }, (_, i) => ({
    id: `9${i + 1 < 10 ? '0' + (i + 1) : i + 1}`,
    number: `9${i + 1 < 10 ? '0' + (i + 1) : i + 1}`,
    floor: "9",
    type: "Standard" as const,
    status: "Active" as const
  })),
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: "b1",
    bookingNo: "BK-2023-001",
    bookerName: "Dr. Somchai",
    bookerPhone: "081-234-5678",
    guestName: "Dr. Somchai",
    organization: "Surgery Dept",
    roomNumber: "802",
    checkInDate: formatDate(today), // Checking in today
    checkOutDate: addDays(2),
    status: BookingStatus.Confirmed,
    paymentStatus: PaymentStatus.Unpaid,
    rate: 1200,
    totalAmount: 2400,
    paidAmount: 0,
    transactions: [],
    createdBy: 'System Seeder',
    createdAt: new Date().toISOString()
  },
  {
    id: "b2",
    bookingNo: "BK-2023-002",
    bookerName: "Nurse Jane",
    bookerPhone: "089-999-8888",
    guestName: "Mr. John Doe",
    organization: "Pediatrics",
    roomNumber: "805",
    checkInDate: formatDate(today), // Checking in today
    checkOutDate: addDays(1),
    status: BookingStatus.CheckedIn,
    paymentStatus: PaymentStatus.Paid,
    rate: 1500,
    totalAmount: 1500,
    paidAmount: 1500,
    checkInTime: "13:45",
    receiptNumber: "RCP-001",
    transactions: [
        {
            id: 't1',
            type: 'Room Charge',
            amount: 1500,
            status: 'Paid',
            receiptNumber: 'RCP-001',
            updatedBy: 'Staff Member',
            timestamp: new Date().toISOString()
        }
    ],
    createdBy: 'Staff Member',
    createdAt: new Date().toISOString(),
    updatedBy: 'Super Admin',
    updatedAt: new Date().toISOString()
  },
  {
    id: "b3",
    bookingNo: "BK-2023-003",
    bookerName: "Prof. Williams",
    bookerPhone: "02-218-1111",
    guestName: "Prof. Williams",
    organization: "International",
    roomNumber: "901",
    checkInDate: addDays(-2),
    checkOutDate: formatDate(today), // Checking out today
    status: BookingStatus.CheckedIn,
    paymentStatus: PaymentStatus.Paid,
    rate: 1200,
    totalAmount: 2400,
    paidAmount: 2400,
    transactions: [
        {
            id: 't2',
            type: 'Room Charge',
            amount: 2400,
            status: 'Paid',
            receiptNumber: 'RCP-005',
            updatedBy: 'Super Admin',
            timestamp: new Date().toISOString()
        }
    ],
    createdBy: 'Super Admin',
    createdAt: new Date().toISOString()
  },
  {
    id: "b4",
    bookingNo: "BK-2023-004",
    bookerName: "Admin Staff",
    bookerPhone: "080-000-0000",
    guestName: "Guest Speaker A",
    organization: "Dean Office",
    roomNumber: "910",
    checkInDate: addDays(-3),
    checkOutDate: formatDate(today), // Checking out today
    status: BookingStatus.CheckedIn, // Hasn't checked out yet
    paymentStatus: PaymentStatus.Unpaid,
    rate: 1500,
    totalAmount: 4500,
    paidAmount: 0,
    transactions: [],
    createdBy: 'System Seeder',
    createdAt: new Date().toISOString()
  },
  {
    id: "b5",
    bookingNo: "BK-2023-005",
    bookerName: "Dr. Piti",
    bookerPhone: "085-555-5555",
    guestName: "Dr. Piti",
    organization: "Radiology",
    roomNumber: "801",
    checkInDate: addDays(-1),
    checkOutDate: addDays(3), // Staying through
    status: BookingStatus.CheckedIn,
    paymentStatus: PaymentStatus.Paid,
    rate: 1200,
    totalAmount: 4800,
    paidAmount: 4800,
    earlyCheckInSurcharge: 50, // Demo: Early check-in
    transactions: [
        {
            id: 't3',
            type: 'Room Charge',
            amount: 3600,
            status: 'Paid',
            receiptNumber: 'RCP-003',
            updatedBy: 'Staff Member',
            timestamp: new Date().toISOString()
        },
        {
            id: 't4',
            type: 'Early Check-in',
            amount: 1200,
            status: 'Paid',
            receiptNumber: 'RCP-004',
            updatedBy: 'Staff Member',
            timestamp: new Date().toISOString()
        }
    ],
    createdBy: 'Staff Member',
    createdAt: new Date().toISOString()
  },
  {
    id: "b6",
    bookingNo: "BK-2023-006",
    bookerName: "Future Reserver",
    bookerPhone: "099-999-9999",
    guestName: "Future Guest",
    organization: "Cardiology",
    roomNumber: "803",
    checkInDate: addDays(1),
    checkOutDate: addDays(4),
    status: BookingStatus.Confirmed,
    paymentStatus: PaymentStatus.Unpaid,
    rate: 1200,
    totalAmount: 3600,
    paidAmount: 0,
    transactions: [],
    createdBy: 'Super Admin',
    createdAt: new Date().toISOString()
  }
];
