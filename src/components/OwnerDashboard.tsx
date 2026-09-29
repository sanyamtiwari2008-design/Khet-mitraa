import React, { useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  EquipmentItem,
  EquipmentCategory,
  BookingRecord,
  MatchedDriver,
  NotificationItem,
  ChatMessage,
  EQUIPMENT_CATEGORIES,
} from '../types';
import {
  Bell,
  MoreVertical,
  Plus,
  Edit3,
  Trash2,
  Check,
  AlertCircle,
  X,
  MessageSquare,
  Send,
  ClipboardCheck,
  UserCheck,
} from 'lucide-react';

interface OwnerDashboardProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  onLogout: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  user,
  onUpdateUser,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<
    'my_equipment' | 'add_equipment' | 'bookings' | 'drivers' | 'analytics' | 'profile' | 'report'
  >('my_equipment');

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [myEquipment, setMyEquipment] = useState<EquipmentItem[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [drivers, setDrivers] = useState<MatchedDriver[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add / Edit Equipment form states
  const [editingEquipId, setEditingEquipId] = useState<number | null>(null);
  const [eqName, setEqName] = useState('');
  const [eqCategory, setEqCategory] = useState<EquipmentCategory>('Tractor');
  const [eqBrand, setEqBrand] = useState('');
  const [eqModel, setEqModel] = useState('');
  const [eqYear, setEqYear] = useState(2024);
  const [eqImage, setEqImage] = useState('');
  const [eqDesc, setEqDesc] = useState('');
  const [eqPriceHour, setEqPriceHour] = useState(450);
  const [eqPriceDay, setEqPriceDay] = useState(2800);
  const [eqAvailable, setEqAvailable] = useState(true);
  const [eqLocation, setEqLocation] = useState(user.area_city || 'Karnal, Haryana');
  const [eqOpAvailable, setEqOpAvailable] = useState(true);
  const [eqOpCharge, setEqOpCharge] = useState(700);
  const [eqReqOpType, setEqReqOpType] = useState('Licensed Farm Machinery Operator');
  const [eqTerms, setEqTerms] = useState(
    '10% advance required to confirm booking. Diesel extra as per actual field usage.',
  );

  // Driver Assignment Modal
  const [assignModalBooking, setAssignModalBooking] = useState<BookingRecord | null>(null);
  const [matchedDriversForAssign, setMatchedDriversForAssign] = useState<MatchedDriver[]>([]);
  const [selectedDriverForAssign, setSelectedDriverForAssign] = useState<number | ''>('');
  const [assignInstructions, setAssignInstructions] = useState('');

  // Post-Rental Inspection Modal
  const [inspectModalBooking, setInspectModalBooking] = useState<BookingRecord | null>(null);
  const [insCondition, setInsCondition] = useState<'Excellent' | 'Good' | 'Fair' | 'Damaged'>('Good');
  const [insHasDamage, setInsHasDamage] = useState(false);
  const [insDamageDesc, setInsDamageDesc] = useState('');
  const [insNotes, setInsNotes] = useState('Returned in clean working condition.');
  const [insPhoto, setInsPhoto] = useState('');
  const [insExtraCharges, setInsExtraCharges] = useState(0);

  // Chat Modal
  const [chatBooking, setChatBooking] = useState<BookingRecord | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatTarget, setChatTarget] = useState<'farmer' | 'driver'>('farmer');

  // Owner Profile & Payment Methods Edit
  const [profName, setProfName] = useState(user.full_name);
  const [profMobile, setProfMobile] = useState(user.mobile);
  const [profAddress, setProfAddress] = useState(user.address);
  const [profAreaCity, setProfAreaCity] = useState(user.area_city);
  const [profBusiness, setProfBusiness] = useState(
    user.owner_profile?.business_name || `${user.full_name} Farm Implements`,
  );
  const [profUpi, setProfUpi] = useState(user.owner_profile?.accepts_upi ?? true);
  const [profBank, setProfBank] = useState(user.owner_profile?.accepts_bank_transfer ?? true);
  const [profCash, setProfCash] = useState(user.owner_profile?.accepts_cash ?? true);
  const [profUpiId, setProfUpiId] = useState(user.owner_profile?.upi_id || '');
  const [profBankNote, setProfBankNote] = useState(
    user.owner_profile?.bank_account_note || 'Direct Bank Transfer Enabled',
  );

  // Support ticket
  const [ticketCategory, setTicketCategory] = useState('Booking Problem');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOwnerData = useCallback(async () => {
    try {
      const [eqRes, bRes, dRes, nRes] = await Promise.all([
        fetch(`/api/equipment?owner_id=${user.user_id}`),
        fetch(`/api/bookings?owner_id=${user.user_id}`),
        fetch('/api/drivers/match?category=Tractor'),
        fetch(`/api/notifications/${user.user_id}`),
      ]);
      if (eqRes.ok) setMyEquipment(await eqRes.json());
      if (bRes.ok) setBookings(await bRes.json());
      if (dRes.ok) setDrivers(await dRes.json());
      if (nRes.ok) setNotifications(await nRes.json());
    } catch {
      // silent
    }
  }, [user.user_id]);

  useEffect(() => {
    fetchOwnerData();
  }, [fetchOwnerData]);

  // Calculate 7 Dashboard Summary Metrics
  const totalEquipmentCount = myEquipment.length;
  const activeBookingsCount = bookings.filter((b) =>
    ['Active', 'Driver Assigned', 'Returned', 'Inspected'].includes(b.booking_status),
  ).length;
  const upcomingBookingsCount = bookings.filter((b) =>
    ['Pending', 'Accepted'].includes(b.booking_status),
  ).length;
  const completedBookingsCount = bookings.filter((b) => b.booking_status === 'Completed').length;
  const totalRevenue = bookings
    .filter((b) => b.payment_status === 'Fully Paid')
    .reduce((sum, b) => sum + Number(b.total_price), 0);
  const pendingPayments = bookings
    .filter((b) => b.booking_status !== 'Cancelled' && b.payment_status !== 'Fully Paid')
    .reduce(
      (sum, b) =>
        sum +
        (b.payment_status === 'Advance Paid' || b.payment_status === 'Remaining Pending'
          ? Number(b.remaining_amount)
          : Number(b.total_price)),
      0,
    );
  const avgRating =
    myEquipment.length > 0
      ? (
          myEquipment.reduce((s, e) => s + Number(e.average_rating || 4.8), 0) / myEquipment.length
        ).toFixed(1)
      : '4.8';

  const resetEquipmentForm = () => {
    setEditingEquipId(null);
    setEqName('');
    setEqCategory('Tractor');
    setEqBrand('');
    setEqModel('');
    setEqYear(2024);
    setEqImage('');
    setEqDesc('');
    setEqPriceHour(450);
    setEqPriceDay(2800);
    setEqAvailable(true);
    setEqLocation(user.area_city || 'Karnal, Haryana');
    setEqOpAvailable(true);
    setEqOpCharge(700);
    setEqReqOpType('Licensed Farm Machinery Operator');
  };

  const startEditEquipment = (eq: EquipmentItem) => {
    setEditingEquipId(eq.equipment_id);
    setEqName(eq.equipment_name);
    setEqCategory(eq.category);
    setEqBrand(eq.brand);
    setEqModel(eq.model);
    setEqYear(eq.manufacturing_year);
    setEqImage(eq.image_url);
    setEqDesc(eq.description);
    setEqPriceHour(eq.price_per_hour);
    setEqPriceDay(eq.price_per_day);
    setEqAvailable(eq.is_available);
    setEqLocation(eq.location);
    setEqOpAvailable(eq.operator_available);
    setEqOpCharge(eq.operator_charge_per_day);
    setEqReqOpType(eq.required_operator_type);
    setEqTerms(eq.terms_and_conditions);
    setActiveTab('add_equipment');
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      owner_id: user.user_id,
      equipment_name: eqName,
      category: eqCategory,
      brand: eqBrand,
      model: eqModel,
      manufacturing_year: eqYear,
      image_url: eqImage,
      description: eqDesc,
      price_per_hour: eqPriceHour,
      price_per_day: eqPriceDay,
      is_available: eqAvailable,
      location: eqLocation,
      operator_available: eqOpAvailable,
      operator_charge_per_day: eqOpCharge,
      required_operator_type: eqReqOpType,
      terms_and_conditions: eqTerms,
    };

    try {
      const url = editingEquipId ? `/api/equipment/${editingEquipId}` : '/api/equipment';
      const method = editingEquipId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          'success',
          editingEquipId ? 'Equipment updated successfully!' : 'New equipment added to catalog!',
        );
        resetEquipmentForm();
        fetchOwnerData();
        setActiveTab('my_equipment');
      } else {
        showToast('error', data.error || 'Failed to save equipment.');
      }
    } catch {
      showToast('error', 'Error saving equipment.');
    }
  };

  const handleToggleEquipAvailability = async (eq: EquipmentItem) => {
    try {
      const res = await fetch(`/api/equipment/${eq.equipment_id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !eq.is_available }),
      });
      if (res.ok) {
        showToast(
          'success',
          `${eq.equipment_name} marked as ${!eq.is_available ? 'Available' : 'Unavailable'}.`,
        );
        fetchOwnerData();
      }
    } catch {
      showToast('error', 'Failed to toggle availability.');
    }
  };

  const handleDeleteEquipment = async (equipmentId: number) => {
    try {
      const res = await fetch(`/api/equipment/${equipmentId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'Equipment listing deleted.');
        fetchOwnerData();
      }
    } catch {
      showToast('error', 'Failed to delete equipment.');
    }
  };

  const handleBookingStatusUpdate = async (bookingId: number, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, updated_by_user_id: user.user_id }),
      });
      if (res.ok) {
        showToast('success', `Booking #${bookingId} marked as ${status}.`);
        fetchOwnerData();
      }
    } catch {
      showToast('error', 'Failed to update booking status.');
    }
  };

  const openDriverAssignModal = async (b: BookingRecord) => {
    setAssignModalBooking(b);
    setAssignInstructions(`Operate ${b.equipment_name} at ${b.work_location} (${b.start_date})`);
    try {
      const res = await fetch(
        `/api/drivers/match?category=${encodeURIComponent(
          b.equipment_category,
        )}&location=${encodeURIComponent(b.work_location)}`,
      );
      if (res.ok) {
        const list: MatchedDriver[] = await res.json();
        setMatchedDriversForAssign(list);
        if (list.length > 0) setSelectedDriverForAssign(list[0].user_id);
      }
    } catch {
      setMatchedDriversForAssign([]);
    }
  };

  const handleConfirmDriverAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalBooking || !selectedDriverForAssign) return;
    try {
      const res = await fetch(`/api/bookings/${assignModalBooking.booking_id}/assign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: Number(selectedDriverForAssign),
          instructions: assignInstructions,
        }),
      });
      if (res.ok) {
        showToast('success', `Driver assigned to Booking #${assignModalBooking.booking_id}!`);
        setAssignModalBooking(null);
        fetchOwnerData();
      }
    } catch {
      showToast('error', 'Failed to assign driver.');
    }
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectModalBooking) return;
    try {
      const res = await fetch(`/api/bookings/${inspectModalBooking.booking_id}/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_condition: insCondition,
          has_damage: insHasDamage,
          damage_description: insDamageDesc,
          additional_notes: insNotes,
          inspection_photo: insPhoto,
          additional_charges: insHasDamage ? insExtraCharges : 0,
        }),
      });
      if (res.ok) {
        showToast(
          'success',
          `Inspection confirmed for Booking #${inspectModalBooking.booking_id}! Farmer can now pay the remaining 90% balance.`,
        );
        setInspectModalBooking(null);
        fetchOwnerData();
      }
    } catch {
      showToast('error', 'Failed to save inspection.');
    }
  };

  const openChat = async (b: BookingRecord) => {
    setChatBooking(b);
    setChatTarget('farmer');
    try {
      const res = await fetch(`/api/messages/${b.booking_id}`);
      if (res.ok) setChatMessages(await res.json());
    } catch {
      setChatMessages([]);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatBooking || !chatInput.trim()) return;
    const receiverId =
      chatTarget === 'driver' && chatBooking.driver_id
        ? chatBooking.driver_id
        : chatBooking.farmer_id;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: chatBooking.booking_id,
          sender_id: user.user_id,
          receiver_id: receiverId,
          message_text: chatInput,
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        setChatMessages((prev) => [...prev, msg]);
        setChatInput('');
      }
    } catch {
      showToast('error', 'Failed to send message.');
    }
  };

  const handleSaveOwnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profUpi && !profBank && !profCash) {
      showToast('error', 'Please enable at least one payment method (UPI, Bank Transfer, or Cash).');
      return;
    }
    try {
      const res = await fetch(`/api/users/${user.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profName,
          mobile: profMobile,
          address: profAddress,
          area_city: profAreaCity,
          business_name: profBusiness,
          accepts_upi: profUpi,
          accepts_bank_transfer: profBank,
          accepts_cash: profCash,
          upi_id: profUpiId,
          bank_account_note: profBankNote,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdateUser(data.user);
        showToast('success', 'Owner profile & accepted payment methods updated!');
      }
    } catch {
      showToast('error', 'Failed to update profile.');
    }
  };

  const handleSubmitSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          category: ticketCategory,
          subject: ticketSubject,
          description: ticketDesc,
        }),
      });
      if (res.ok) {
        showToast('success', 'Support ticket submitted to Admin.');
        setTicketSubject('');
        setTicketDesc('');
        setActiveTab('my_equipment');
      }
    } catch {
      showToast('error', 'Failed to submit ticket.');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1A241B]">
      {/* TOP NAVIGATION BAR (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE2D8] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveTab('my_equipment')}
          className="text-xl font-bold tracking-tight text-[#1A241B] whitespace-nowrap"
        >
          Khet Mitra
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4E5D50]">
          <button
            type="button"
            onClick={() => setActiveTab('my_equipment')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'my_equipment' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            My Equipment ({totalEquipmentCount})
          </button>
          <button
            type="button"
            onClick={() => {
              resetEquipmentForm();
              setActiveTab('add_equipment');
            }}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'add_equipment' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Add Equipment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'bookings' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Bookings ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('drivers')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'drivers' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Drivers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'analytics' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Analytics
          </button>
        </nav>

        <div className="flex items-center gap-2.5 relative">
          <div className="relative">
            <button
              type="button"
              onClick={async () => {
                setNotifOpen(!notifOpen);
                setMenuOpen(false);
                if (!notifOpen && unreadCount > 0) {
                  await fetch(`/api/notifications/${user.user_id}/read`, { method: 'PATCH' });
                  fetchOwnerData();
                }
              }}
              className="p-2 rounded-md border border-[#DCE2D8] hover:bg-[#F7F8F5] relative"
            >
              <Bell className="w-4 h-4 text-[#1A241B]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#B45309] text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono-tabular">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#DCE2D8] rounded-lg shadow-lg p-3 z-50">
                <div className="flex justify-between pb-2 mb-2 border-b border-[#E6EBE2] text-xs font-bold">
                  <span>Owner Notifications</span>
                  <button type="button" onClick={() => setNotifOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#E6EBE2]">
                  {notifications.map((n) => (
                    <div key={n.notification_id} className="py-2 text-xs">
                      <div className="font-semibold text-[#1A241B]">{n.title}</div>
                      <div className="text-[#4E5D50]">{n.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="px-3 py-1.5 text-xs font-semibold border border-[#DCE2D8] rounded-md hover:bg-[#F7F8F5] whitespace-nowrap"
          >
            {user.full_name.split(' ')[0]} (Owner)
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-md border border-[#DCE2D8] hover:bg-[#F7F8F5]"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-[#DCE2D8] rounded-lg shadow-lg py-1.5 z-50 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('profile');
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#F7F8F5]"
                >
                  Owner Profile &amp; Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('analytics');
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#F7F8F5]"
                >
                  Revenue &amp; Analytics
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('report');
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#F7F8F5]"
                >
                  Help &amp; Report a Problem
                </button>
                <div className="border-t border-[#E6EBE2] my-1" />
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-700 font-semibold"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {toast && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
          <div
            className={`p-3.5 rounded-md border flex items-center justify-between text-sm ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-700" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-700" />
              )}
              <span>{toast.text}</span>
            </div>
            <button type="button" onClick={() => setToast(null)} className="text-xs underline">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* 7 OWNER DASHBOARD SUMMARY CARDS */}
        <section className="bg-white border border-[#DCE2D8] rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#E6EBE2]">
            <div className="flex items-center gap-3">
              <img
                src={
                  user.profile_photo ||
                  '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg'
                }
                alt={user.full_name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border border-[#DCE2D8] shrink-0"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-[#1A241B]">
                    Equipment Owner Dashboard — {user.owner_profile?.business_name || user.full_name}
                  </h1>
                </div>
                <p className="text-xs text-[#4E5D50] mt-0.5">
                  Rajasthan Location: <strong>{user.area_city}</strong> · Experience:{' '}
                  <strong>{user.owner_profile?.experience_years || 12} Years</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Total Equipment</div>
              <div className="text-lg font-bold text-[#1A241B] font-mono-tabular mt-0.5">
                {totalEquipmentCount}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Active Bookings</div>
              <div className="text-lg font-bold text-[#2E6F40] font-mono-tabular mt-0.5">
                {activeBookingsCount}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Upcoming Requests</div>
              <div className="text-lg font-bold text-[#B45309] font-mono-tabular mt-0.5">
                {upcomingBookingsCount}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Completed</div>
              <div className="text-lg font-bold text-[#1A241B] font-mono-tabular mt-0.5">
                {completedBookingsCount}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Total Revenue</div>
              <div className="text-lg font-bold text-[#2E6F40] font-mono-tabular mt-0.5">
                ₹{totalRevenue.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Pending Payments</div>
              <div className="text-lg font-bold text-[#B45309] font-mono-tabular mt-0.5">
                ₹{pendingPayments.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Average Rating</div>
              <div className="text-lg font-bold text-[#B45309] font-mono-tabular mt-0.5">
                {avgRating}★
              </div>
            </div>
          </div>

          {/* 4 MAIN ACTION BUTTONS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                resetEquipmentForm();
                setActiveTab('add_equipment');
              }}
              className={`py-2.5 px-4 rounded-md text-xs sm:text-sm font-semibold border transition-colors ${
                activeTab === 'add_equipment'
                  ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                  : 'bg-[#F7F8F5] hover:bg-[#E9EFE6] border-[#DCE2D8] text-[#1A241B]'
              }`}
            >
              1. Add Equipment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my_equipment')}
              className={`py-2.5 px-4 rounded-md text-xs sm:text-sm font-semibold border transition-colors ${
                activeTab === 'my_equipment'
                  ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                  : 'bg-[#F7F8F5] hover:bg-[#E9EFE6] border-[#DCE2D8] text-[#1A241B]'
              }`}
            >
              2. My Equipment ({myEquipment.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bookings')}
              className={`py-2.5 px-4 rounded-md text-xs sm:text-sm font-semibold border transition-colors ${
                activeTab === 'bookings'
                  ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                  : 'bg-[#F7F8F5] hover:bg-[#E9EFE6] border-[#DCE2D8] text-[#1A241B]'
              }`}
            >
              3. Bookings ({bookings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('drivers')}
              className={`py-2.5 px-4 rounded-md text-xs sm:text-sm font-semibold border transition-colors ${
                activeTab === 'drivers'
                  ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                  : 'bg-[#F7F8F5] hover:bg-[#E9EFE6] border-[#DCE2D8] text-[#1A241B]'
              }`}
            >
              4. Drivers ({drivers.length})
            </button>
          </div>
        </section>

        {/* ================================================================
            VIEW 1: MY EQUIPMENT (CRUD)
           ================================================================ */}
        {activeTab === 'my_equipment' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#1A241B]">My Listed Agricultural Equipment</h2>
              <button
                type="button"
                onClick={() => {
                  resetEquipmentForm();
                  setActiveTab('add_equipment');
                }}
                className="px-4 py-2 bg-[#2E6F40] text-white text-xs font-semibold rounded-md inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add New Equipment
              </button>
            </div>

            {myEquipment.length === 0 ? (
              <div className="bg-white border border-[#DCE2D8] rounded-lg p-8 text-center">
                <p className="text-sm text-[#4E5D50]">You haven&apos;t added any equipment yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEquipment.map((eq) => (
                  <div
                    key={eq.equipment_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      startEditEquipment(eq);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        startEditEquipment(eq);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="bg-white border border-[#DCE2D8] hover:border-[#2E6F40] hover:shadow-md rounded-lg overflow-hidden flex flex-col justify-between cursor-pointer transition-all text-left"
                  >
                    <div>
                      <div className="relative h-48 bg-[#E9EFE6]">
                        <img
                          src={eq.image_url}
                          alt={eq.equipment_name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4 space-y-1.5">
                        <div className="text-xs text-[#4E5D50] font-mono-tabular">
                          {eq.category} · {eq.brand} · {eq.manufacturing_year} Older/Used Model · {eq.location}
                        </div>
                        <h3 className="text-base font-bold text-[#1A241B] hover:text-[#2E6F40]">
                          {eq.equipment_name}
                        </h3>
                        <div className="text-[11px] text-[#1A241B] p-2 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
                          <strong>Used Model Info:</strong> {eq.used_condition_note || eq.model}
                        </div>
                        <div className="text-xs text-[#4E5D50] space-y-1 font-mono-tabular pt-1">
                          <div>
                            Daily Price: ₹{eq.price_per_day}/day · Rental Price: ₹{eq.price_per_hour}/hr
                          </div>
                          <div>
                            Operator: {eq.operator_available ? `Available (+₹${eq.operator_charge_per_day}/day)` : 'Not Included'} · Exp: {eq.experience_years || 10} yrs
                          </div>
                          <div>
                            Status:{' '}
                            <span
                              className={
                                eq.is_available ? 'text-[#2E6F40] font-bold' : 'text-red-700 font-bold'
                              }
                            >
                              {eq.is_available ? 'Available' : 'Unavailable'}
                            </span>{' '}
                            · Rating:{' '}
                            <span className="text-[#B45309] font-semibold">
                              {eq.rating_label || `${eq.average_rating}★ (${eq.review_count || 0} reviews)`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-[#E6EBE2] flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEquipAvailability(eq);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold border border-[#DCE2D8] rounded hover:bg-[#F7F8F5]"
                      >
                        Mark {eq.is_available ? 'Unavailable' : 'Available'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditEquipment(eq);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3 py-1.5 text-xs font-semibold border border-[#DCE2D8] rounded hover:bg-[#F7F8F5] inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Open &amp; Edit →
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEquipment(eq.equipment_id);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-700 rounded hover:bg-red-50 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================================================================
            VIEW 2: ADD / EDIT EQUIPMENT FORM
           ================================================================ */}
        {activeTab === 'add_equipment' && (
          <section className="max-w-3xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6">
            <h2 className="text-lg font-bold text-[#1A241B] mb-4">
              {editingEquipId ? 'Edit Agricultural Equipment' : 'Add New Agricultural Equipment'}
            </h2>

            <form onSubmit={handleSaveEquipment} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Equipment Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={eqName}
                    onChange={(e) => setEqName(e.target.value)}
                    placeholder="e.g. Swaraj 855 FE 52 HP Tractor"
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Equipment Category *
                  </label>
                  <select
                    value={eqCategory}
                    onChange={(e) => setEqCategory(e.target.value as EquipmentCategory)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm bg-white"
                  >
                    {EQUIPMENT_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={eqBrand}
                    onChange={(e) => setEqBrand(e.target.value)}
                    placeholder="e.g. Mahindra / Swaraj"
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    value={eqModel}
                    onChange={(e) => setEqModel(e.target.value)}
                    placeholder="e.g. 855 FE 4WD"
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Manufacturing Year *
                  </label>
                  <input
                    type="number"
                    min={2005}
                    max={2026}
                    required
                    value={eqYear}
                    onChange={(e) => setEqYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Rental Price Per Hour (₹) *
                  </label>
                  <input
                    type="number"
                    min={50}
                    required
                    value={eqPriceHour}
                    onChange={(e) => setEqPriceHour(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Rental Price Per Day (₹) *
                  </label>
                  <input
                    type="number"
                    min={200}
                    required
                    value={eqPriceDay}
                    onChange={(e) => setEqPriceDay(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={eqLocation}
                    onChange={(e) => setEqLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">
                  Equipment Photo URL (Optional — defaults to category photo)
                </label>
                <input
                  type="text"
                  value={eqImage}
                  onChange={(e) => setEqImage(e.target.value)}
                  placeholder="Leave blank to use verified category photo"
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={eqDesc}
                  onChange={(e) => setEqDesc(e.target.value)}
                  placeholder="Describe horsepower, condition, and suitable field tasks..."
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
                <label className="inline-flex items-center gap-2 font-semibold text-[#1A241B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eqOpAvailable}
                    onChange={(e) => setEqOpAvailable(e.target.checked)}
                    className="accent-[#2E6F40]"
                  />
                  <span>Operator Available</span>
                </label>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Operator Charge / Day (₹)
                  </label>
                  <input
                    type="number"
                    value={eqOpCharge}
                    onChange={(e) => setEqOpCharge(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-[#DCE2D8] rounded bg-white font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Required Operator Type
                  </label>
                  <input
                    type="text"
                    value={eqReqOpType}
                    onChange={(e) => setEqReqOpType(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#DCE2D8] rounded bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">
                  Rental Terms &amp; Conditions
                </label>
                <input
                  type="text"
                  value={eqTerms}
                  onChange={(e) => setEqTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#2E6F40] hover:bg-[#245832] text-white font-semibold rounded-md text-sm"
                >
                  {editingEquipId ? 'Update Equipment' : 'Add Equipment'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('my_equipment')}
                  className="px-4 py-2.5 border border-[#DCE2D8] rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ================================================================
            VIEW 3: OWNER BOOKING MANAGEMENT & POST-RETURN INSPECTION
           ================================================================ */}
        {activeTab === 'bookings' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">
              Booking Requests, Driver Assignment &amp; Post-Return Inspection
            </h2>

            {bookings.length === 0 ? (
              <div className="bg-white border border-[#DCE2D8] rounded-lg p-8 text-center text-sm text-[#4E5D50]">
                No booking requests yet.
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((b) => (
                  <div
                    key={b.booking_id}
                    className="bg-white border border-[#DCE2D8] rounded-lg p-5 space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#E6EBE2]">
                      <div>
                        <div className="text-xs text-[#4E5D50] font-mono-tabular">
                          Booking #{b.booking_id} · {b.start_date} to {b.end_date} ({b.duration_value}{' '}
                          {b.duration_type}) · Status:{' '}
                          <span className="font-bold text-[#1A241B]">{b.booking_status}</span>
                        </div>
                        <h3 className="text-base font-bold text-[#1A241B] mt-0.5">
                          {b.equipment_name}
                        </h3>
                      </div>

                      <div className="font-mono-tabular text-xs md:text-right">
                        <div className="text-sm font-bold text-[#1A241B]">
                          Total: ₹{Number(b.total_price).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[#4E5D50]">
                          10% Advance: ₹{b.advance_amount} · 90% Remaining: ₹{b.remaining_amount} ·{' '}
                          <span className="font-semibold text-[#2E6F40]">{b.payment_status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#4E5D50]">
                      <div>
                        <span className="font-semibold text-[#1A241B] block">Farmer / Customer:</span>
                        {b.farmer_name} ({b.farmer_mobile})
                        <br />
                        Location: {b.work_location}
                      </div>
                      <div>
                        <span className="font-semibold text-[#1A241B] block">Operator Requirement:</span>
                        {b.operator_required ? (
                          b.driver_name ? (
                            <span>
                              Assigned Driver: {b.driver_name} ({b.driver_mobile}) —{' '}
                              {b.driver_assignment?.job_status}
                            </span>
                          ) : (
                            <span className="text-[#B45309] font-semibold">
                              Operator Required — Please Assign Driver
                            </span>
                          )
                        ) : (
                          <span>Not Required (Self-Operated)</span>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-[#1A241B] block">Inspection &amp; Rating:</span>
                        {b.inspection ? (
                          <span>
                            Inspected ({b.inspection.equipment_condition}) · Extra Charges: ₹
                            {b.inspection.additional_charges}
                          </span>
                        ) : (
                          <span>Not inspected yet</span>
                        )}
                      </div>
                    </div>

                    {/* Owner Action Bar */}
                    <div className="pt-3 border-t border-[#E6EBE2] flex flex-wrap items-center gap-2.5">
                      {b.booking_status === 'Pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleBookingStatusUpdate(b.booking_id, 'Accepted')}
                            className="px-4 py-1.5 bg-[#2E6F40] text-white text-xs font-semibold rounded"
                          >
                            Accept Booking
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBookingStatusUpdate(b.booking_id, 'Cancelled')}
                            className="px-4 py-1.5 border border-red-200 text-red-700 text-xs font-semibold rounded hover:bg-red-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {b.operator_required &&
                        ['Pending', 'Accepted', 'Driver Assigned', 'Active'].includes(
                          b.booking_status,
                        ) && (
                          <button
                            type="button"
                            onClick={() => openDriverAssignModal(b)}
                            className="px-3.5 py-1.5 border border-[#2E6F40] text-[#2E6F40] hover:bg-[#F4F7F2] text-xs font-semibold rounded inline-flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {b.driver_id ? 'Reassign Driver' : 'Assign Compatible Driver'}
                          </button>
                        )}

                      {/* Inspect Returned Equipment */}
                      {(b.booking_status === 'Returned' || b.booking_status === 'Active') && (
                        <button
                          type="button"
                          onClick={() => {
                            setInspectModalBooking(b);
                            setInsCondition('Good');
                            setInsHasDamage(false);
                            setInsExtraCharges(0);
                          }}
                          className="px-3.5 py-1.5 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-semibold rounded inline-flex items-center gap-1"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          Inspect Returned Equipment
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openChat(b)}
                        className="px-3.5 py-1.5 border border-[#DCE2D8] hover:bg-[#F7F8F5] text-xs font-semibold rounded inline-flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Contact Farmer / Driver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================================================================
            VIEW 4: COMPATIBLE DRIVERS DIRECTORY
           ================================================================ */}
        {activeTab === 'drivers' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">
              Registered Agricultural Equipment Operators &amp; Drivers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {drivers.map((drv) => (
                <div
                  key={drv.user_id}
                  className="bg-white border border-[#DCE2D8] rounded-lg p-5 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#1A241B]">{drv.full_name}</h3>
                    <span
                      className={`font-semibold ${
                        drv.is_online ? 'text-[#2E6F40]' : 'text-[#4E5D50]'
                      }`}
                    >
                      {drv.is_online ? 'ONLINE & Available' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="text-[#4E5D50] font-mono-tabular">
                    Mobile: {drv.mobile} · License: {drv.license_number} ({drv.license_status}) · Rating:{' '}
                    {drv.average_rating}★
                  </div>
                  <div>Service Area: {drv.service_area}</div>
                  <div className="pt-2 border-t border-[#E6EBE2]">
                    <div className="font-semibold text-[#1A241B] mb-1">
                      Equipment Operated &amp; Experience:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {drv.skills.map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-xs text-[#1A241B] bg-[#F7F8F5] px-2.5 py-1 rounded border border-[#DCE2D8] font-mono-tabular"
                        >
                          {sk.category} → {sk.experience_years} yrs
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================
            VIEW 5: OWNER ANALYTICS & CUSTOMER REVIEWS
           ================================================================ */}
        {activeTab === 'analytics' && (
          <section className="space-y-6">
            <div className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#1A241B]">
                Owner Revenue &amp; Equipment Usage Analytics
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE2D8] text-[#4E5D50]">
                      <th className="py-2.5 px-3">Equipment Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Bookings</th>
                      <th className="py-2.5 px-3 text-right">Rental Days</th>
                      <th className="py-2.5 px-3 text-right">Rating</th>
                      <th className="py-2.5 px-3 text-right">Revenue Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EBE2] font-mono-tabular">
                    {myEquipment.map((eq) => {
                      const eqBookings = bookings.filter(
                        (b) => b.equipment_id === eq.equipment_id && b.booking_status !== 'Cancelled',
                      );
                      const rentalDays = eqBookings.reduce(
                        (s, b) => s + Number(b.duration_value || 1),
                        0,
                      );
                      const eqRev = eqBookings
                        .filter((b) => b.payment_status === 'Fully Paid')
                        .reduce((s, b) => s + Number(b.total_price), 0);
                      return (
                        <tr key={eq.equipment_id} className="hover:bg-[#F7F8F5]">
                          <td className="py-3 px-3 font-sans font-semibold text-[#1A241B]">
                            {eq.equipment_name}
                          </td>
                          <td className="py-3 px-3 font-sans">{eq.category}</td>
                          <td className="py-3 px-3 text-right">{eqBookings.length}</td>
                          <td className="py-3 px-3 text-right">{rentalDays} days</td>
                          <td className="py-3 px-3 text-right">{eq.average_rating}★</td>
                          <td className="py-3 px-3 text-right font-bold text-[#2E6F40]">
                            ₹{eqRev.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-3">
              <h3 className="text-base font-bold text-[#1A241B]">Customer Reviews on Your Equipment</h3>
              {bookings.filter((b) => b.review).length === 0 ? (
                <p className="text-xs text-[#4E5D50]">No completed reviews yet.</p>
              ) : (
                bookings
                  .filter((b) => b.review)
                  .map((b) => (
                    <div
                      key={b.booking_id}
                      className="p-3.5 bg-[#F7F8F5] border border-[#DCE2D8] rounded text-xs"
                    >
                      <div className="font-bold text-[#1A241B]">
                        {b.equipment_name} — {b.review?.equipment_rating}★ by {b.farmer_name}
                      </div>
                      <div className="text-[#4E5D50] mt-0.5">
                        Reason: {b.review?.reason_category} · &ldquo;{b.review?.comment}&rdquo;
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        )}

        {/* ================================================================
            VIEW 6: OWNER PROFILE & PAYMENT METHODS CONFIGURATION
           ================================================================ */}
        {activeTab === 'profile' && (
          <section className="max-w-2xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">
              Owner Profile &amp; Accepted Payment Methods
            </h2>
            <form onSubmit={handleSaveOwnerProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Owner Name</label>
                  <input
                    type="text"
                    required
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Mobile Number</label>
                  <input
                    type="text"
                    required
                    value={profMobile}
                    onChange={(e) => setProfMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">
                  Business / Farm Name
                </label>
                <input
                  type="text"
                  required
                  value={profBusiness}
                  onChange={(e) => setProfBusiness(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Area / City</label>
                  <input
                    type="text"
                    required
                    value={profAreaCity}
                    onChange={(e) => setProfAreaCity(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={profAddress}
                    onChange={(e) => setProfAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#F7F8F5] border border-[#DCE2D8] rounded space-y-3">
                <div className="font-bold text-[#1A241B]">
                  Accepted Payment Methods (Farmers will only see methods you enable here)
                </div>
                <div className="flex flex-wrap gap-5 text-sm">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profUpi}
                      onChange={(e) => setProfUpi(e.target.checked)}
                      className="accent-[#2E6F40]"
                    />
                    <span>UPI</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profBank}
                      onChange={(e) => setProfBank(e.target.checked)}
                      className="accent-[#2E6F40]"
                    />
                    <span>Bank Transfer</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profCash}
                      onChange={(e) => setProfCash(e.target.checked)}
                      className="accent-[#2E6F40]"
                    />
                    <span>Cash</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4E5D50] mb-1">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      value={profUpiId}
                      onChange={(e) => setProfUpiId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#DCE2D8] rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#4E5D50] mb-1">
                      Bank Account Details Note
                    </label>
                    <input
                      type="text"
                      value={profBankNote}
                      onChange={(e) => setProfBankNote(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#DCE2D8] rounded"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2E6F40] text-white text-sm font-semibold rounded-md"
              >
                Save Owner Profile
              </button>
            </form>
          </section>
        )}

        {/* REPORT A PROBLEM */}
        {activeTab === 'report' && (
          <section className="max-w-xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">Report a Problem to Admin</h2>
            <form onSubmit={handleSubmitSupportTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded bg-white"
                >
                  <option value="Booking Problem">Booking Problem</option>
                  <option value="Payment Problem">Payment Problem</option>
                  <option value="Equipment Problem">Equipment Problem</option>
                  <option value="Driver Problem">Driver Problem</option>
                  <option value="Account Problem">Account Problem</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-[#2E6F40] text-white font-semibold rounded"
              >
                Submit Support Ticket
              </button>
            </form>
          </section>
        )}
      </main>

      {/* ====================================================================
          MODAL 1: ASSIGN COMPATIBLE DRIVER (DSA MATCHING RANKING)
         ==================================================================== */}
      {assignModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1A241B]">
                  Assign Compatible Driver (Booking #{assignModalBooking.booking_id})
                </h3>
                <p className="text-xs text-[#4E5D50]">
                  Required Category: {assignModalBooking.equipment_category} · Location:{' '}
                  {assignModalBooking.work_location}
                </p>
              </div>
              <button type="button" onClick={() => setAssignModalBooking(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDriverAssign} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#1A241B] mb-1">
                  Select Driver (Sorted by Compatibility Score):
                </label>
                <select
                  value={selectedDriverForAssign}
                  onChange={(e) => setSelectedDriverForAssign(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded bg-white"
                >
                  {matchedDriversForAssign.map((d) => (
                    <option key={d.user_id} value={d.user_id}>
                      {d.full_name} · {assignModalBooking.equipment_category} Exp:{' '}
                      {d.category_experience_years} yrs · {d.average_rating}★ · Score:{' '}
                      {d.compatibility_score}% ({d.is_online ? 'Online' : 'Offline'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1A241B] mb-1">
                  Operator Instructions
                </label>
                <input
                  type="text"
                  value={assignInstructions}
                  onChange={(e) => setAssignInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2E6F40] text-white font-semibold rounded-md text-sm"
              >
                Confirm Driver Assignment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: EQUIPMENT RETURN INSPECTION BY OWNER
         ==================================================================== */}
      {inspectModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#1A241B]">
                  Equipment Return Inspection (Booking #{inspectModalBooking.booking_id})
                </h3>
                <p className="text-xs text-[#4E5D50]">
                  After confirmation, the remaining 90% payment becomes payable by the Farmer.
                </p>
              </div>
              <button type="button" onClick={() => setInspectModalBooking(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Equipment Condition
                  </label>
                  <select
                    value={insCondition}
                    onChange={(e) => setInsCondition(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded bg-white"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Any Damage?</label>
                  <select
                    value={insHasDamage ? 'yes' : 'no'}
                    onChange={(e) => setInsHasDamage(e.target.value === 'yes')}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded bg-white"
                  >
                    <option value="no">No Damage</option>
                    <option value="yes">Yes — Damage Reported</option>
                  </select>
                </div>
              </div>

              {insHasDamage && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-red-50 border border-red-200 rounded">
                  <div>
                    <label className="block font-semibold text-red-800 mb-1">
                      Damage Description
                    </label>
                    <input
                      type="text"
                      required
                      value={insDamageDesc}
                      onChange={(e) => setInsDamageDesc(e.target.value)}
                      placeholder="Describe damaged part"
                      className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-red-800 mb-1">
                      Additional Charges (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={insExtraCharges}
                      onChange={(e) => setInsExtraCharges(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-red-200 rounded font-mono-tabular"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">Additional Notes</label>
                <input
                  type="text"
                  value={insNotes}
                  onChange={(e) => setInsNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">
                  Optional Inspection Photo URL
                </label>
                <input
                  type="text"
                  value={insPhoto}
                  onChange={(e) => setInsPhoto(e.target.value)}
                  placeholder="Optional photo URL of returned machine"
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2E6F40] text-white font-semibold rounded-md text-sm"
              >
                Confirm Inspection &amp; Unlock 90% Final Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: CHAT MODAL (OWNER ↔ FARMER / DRIVER)
         ==================================================================== */}
      {chatBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-2">
              <div>
                <h3 className="text-sm font-bold">
                  Booking #{chatBooking.booking_id} Chat — {chatBooking.equipment_name}
                </h3>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setChatTarget('farmer')}
                    className={`px-2 py-0.5 text-[11px] rounded border ${
                      chatTarget === 'farmer'
                        ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                        : 'border-[#DCE2D8]'
                    }`}
                  >
                    Farmer: {chatBooking.farmer_name}
                  </button>
                  {chatBooking.driver_id && (
                    <button
                      type="button"
                      onClick={() => setChatTarget('driver')}
                      className={`px-2 py-0.5 text-[11px] rounded border ${
                        chatTarget === 'driver'
                          ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                          : 'border-[#DCE2D8]'
                      }`}
                    >
                      Driver: {chatBooking.driver_name}
                    </button>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => setChatBooking(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-60 overflow-y-auto bg-[#F7F8F5] border border-[#DCE2D8] rounded p-3 space-y-2 text-xs">
              {chatMessages.map((m) => (
                <div
                  key={m.message_id}
                  className={`p-2 rounded border ${
                    m.sender_id === user.user_id
                      ? 'bg-[#E9EFE6] border-[#2E6F40]/30 ml-8'
                      : 'bg-white border-[#DCE2D8] mr-8'
                  }`}
                >
                  <div className="font-semibold">{m.sender_name}</div>
                  <div>{m.message_text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type message..."
                className="flex-1 px-3 py-2 border border-[#DCE2D8] rounded text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#2E6F40] text-white text-xs font-semibold rounded inline-flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
