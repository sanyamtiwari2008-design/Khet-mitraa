import React, { useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  EquipmentItem,
  BookingRecord,
  NotificationItem,
  SupportTicket,
  ChatMessage,
  MatchedDriver,
  EQUIPMENT_CATEGORIES,
  TRANSLATIONS,
} from '../types';
import {
  Search,
  Bell,
  MoreVertical,
  MapPin,
  Bookmark,
  Mic,
  Send,
  X,
  Check,
  AlertCircle,
  MessageSquare,
  SlidersHorizontal,
} from 'lucide-react';
import { LeafletEquipmentMap } from './LeafletEquipmentMap';

interface FarmerDashboardProps {
  user: UserProfile;
  lang: 'en' | 'hi';
  onSetLang: (l: 'en' | 'hi') => void;
  onUpdateUser: (u: UserProfile) => void;
  onLogout: () => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  user,
  lang,
  onSetLang,
  onUpdateUser,
  onLogout,
}) => {
  const t = TRANSLATIONS[lang];

  // Active sub-view inside Farmer Dashboard
  const [activeTab, setActiveTab] = useState<
    | 'home'
    | 'category_page'
    | 'equipment_detail'
    | 'bookings'
    | 'saved'
    | 'profile'
    | 'activity'
    | 'settings'
    | 'security'
    | 'help'
    | 'report'
  >('home');
  const [equipmentPageStep, setEquipmentPageStep] = useState<'details' | 'booking'>('details');
  const [previousTab, setPreviousTab] = useState<'home' | 'category_page' | 'saved'>('home');

  // Menus & Modals
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [aiTalkOpen, setAiTalkOpen] = useState(false);
  const [postReqOpen, setPostReqOpen] = useState(false);
  const [showLeafletMap, setShowLeafletMap] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [bookingModalEquip, setBookingModalEquip] = useState<EquipmentItem | null>(null);
  const [chatBooking, setChatBooking] = useState<BookingRecord | null>(null);
  const [reviewBooking, setReviewBooking] = useState<BookingRecord | null>(null);
  const [paymentModalBooking, setPaymentModalBooking] = useState<{
    booking: BookingRecord;
    stage: 'Advance_10_Percent' | 'Remaining_90_Percent';
  } | null>(null);

  // Data state
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [demoOwners, setDemoOwners] = useState<any[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [savedEquipment, setSavedEquipment] = useState<EquipmentItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [compatibleDrivers, setCompatibleDrivers] = useState<MatchedDriver[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter states (Keep demo data separate from real registered users)
  const [filterDataSource, setFilterDataSource] = useState<'all' | 'demo' | 'real'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMaxDistance, setFilterMaxDistance] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterOnlyAvailable, setFilterOnlyAvailable] = useState(false);
  const [filterOperatorMode, setFilterOperatorMode] = useState<'all' | 'with' | 'without'>('all');
  const [filterMinRating, setFilterMinRating] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const [sortBy, setSortBy] = useState('price_asc');
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number }>({
    lat: user.latitude || 25.15,
    lon: user.longitude || 76.2,
  });

  // AI Talk states
  const [aiPrompt, setAiPrompt] = useState('I need a tractor near Baran for 2 days with operator');
  const [aiListening, setAiListening] = useState(false);
  const [aiResult, setAiResult] = useState<{
    parsed: any;
    matches: EquipmentItem[];
  } | null>(null);

  // Post Requirement form states
  const [reqEquipment, setReqEquipment] = useState('Tractor');
  const [reqWork, setReqWork] = useState('');
  const [reqStartDate, setReqStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0],
  );
  const [reqEndDate, setReqEndDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
  );
  const [reqDays, setReqDays] = useState(2);
  const [reqLocation, setReqLocation] = useState(user.area_city || 'Baran, Rajasthan');
  const [reqBudget, setReqBudget] = useState(5000);
  const [reqOperator, setReqOperator] = useState(true);
  const [reqInstructions, setReqInstructions] = useState('');
  const [reqMatches, setReqMatches] = useState<EquipmentItem[] | null>(null);

  // Booking form states
  const [bookStartDate, setBookStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0],
  );
  const [bookEndDate, setBookEndDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
  );
  const [bookDurationType, setBookDurationType] = useState<'days' | 'hours'>('days');
  const [bookDurationValue, setBookDurationValue] = useState(2);
  const [bookLocation, setBookLocation] = useState(
    `${user.address}, ${user.area_city}`,
  );
  const [bookOperatorRequired, setBookOperatorRequired] = useState(true);
  const [bookSelectedDriverId, setBookSelectedDriverId] = useState<number | ''>('');
  const [bookInstructions, setBookInstructions] = useState('');

  // Payment modal states
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');

  // Review modal states
  const [revEquipStars, setRevEquipStars] = useState(5);
  const [revDriverStars, setRevDriverStars] = useState(5);
  const [revReason, setRevReason] = useState('Equipment Performance');
  const [revComment, setRevComment] = useState('');

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatTargetRole, setChatTargetRole] = useState<'owner' | 'driver'>('owner');

  // Profile edit states (Strictly NO Aadhaar fields!)
  const [profName, setProfName] = useState(user.full_name);
  const [profMobile, setProfMobile] = useState(user.mobile);
  const [profAddress, setProfAddress] = useState(user.address);
  const [profAreaCity, setProfAreaCity] = useState(user.area_city);
  const [profPhoto, setProfPhoto] = useState(user.profile_photo || '');

  // Security password change states
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Report a problem / Support ticket states
  const [ticketCategory, setTicketCategory] = useState('Booking Problem');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEquipment = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (filterCategory && filterCategory !== 'All') params.set('category', filterCategory);
    if (filterLocation.trim()) params.set('location', filterLocation.trim());
    if (filterMaxDistance) params.set('max_distance', filterMaxDistance);
    if (filterMaxPrice) params.set('max_price', filterMaxPrice);
    if (filterOnlyAvailable) params.set('only_available', 'true');
    if (filterOperatorMode !== 'all') params.set('operator_mode', filterOperatorMode);
    if (filterMinRating) params.set('min_rating', filterMinRating);
    if (filterDataSource !== 'all') params.set('data_source', filterDataSource);
    params.set('sort_by', sortBy);
    params.set('lat', String(userCoords.lat));
    params.set('lon', String(userCoords.lon));

    try {
      const [eqRes, demoRes] = await Promise.all([
        fetch(`/api/equipment?${params.toString()}`),
        fetch('/api/demo-owners'),
      ]);
      if (eqRes.ok) {
        const data = await eqRes.json();
        setEquipmentList(data);
      }
      if (demoRes.ok) {
        const ownersData = await demoRes.json();
        setDemoOwners(ownersData);
      }
    } catch {
      // silent
    }
  }, [
    searchQuery,
    filterCategory,
    filterLocation,
    filterMaxDistance,
    filterMaxPrice,
    filterOnlyAvailable,
    filterOperatorMode,
    filterMinRating,
    filterDataSource,
    sortBy,
    userCoords,
  ]);

  const fetchFarmerData = useCallback(async () => {
    try {
      const [bRes, sRes, nRes, tRes] = await Promise.all([
        fetch(`/api/bookings?farmer_id=${user.user_id}`),
        fetch(`/api/saved-equipment/${user.user_id}`),
        fetch(`/api/notifications/${user.user_id}`),
        fetch(`/api/support-tickets?user_id=${user.user_id}`),
      ]);
      if (bRes.ok) setBookings(await bRes.json());
      if (sRes.ok) setSavedEquipment(await sRes.json());
      if (nRes.ok) setNotifications(await nRes.json());
      if (tRes.ok) setTickets(await tRes.json());
    } catch {
      // silent
    }
  }, [user.user_id]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  useEffect(() => {
    fetchFarmerData();
  }, [fetchFarmerData]);

  // Open dedicated Equipment Page (Next Page) and load compatible drivers via DSA matching
  const openEquipmentPage = async (
    equip: EquipmentItem,
    initialStep: 'details' | 'booking' = 'details',
  ) => {
    if (activeTab === 'home' || activeTab === 'category_page' || activeTab === 'saved') {
      setPreviousTab(activeTab);
    }
    setSelectedEquipment(equip);
    setBookingModalEquip(equip);
    setEquipmentPageStep(initialStep);
    setBookOperatorRequired(equip.operator_available);
    setBookSelectedDriverId('');
    setActiveTab('equipment_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await fetch(
        `/api/drivers/match?category=${encodeURIComponent(equip.category)}&location=${encodeURIComponent(
          equip.location,
        )}`,
      );
      if (res.ok) {
        const drivers: MatchedDriver[] = await res.json();
        setCompatibleDrivers(drivers);
        const topMatch = drivers.find((d) => d.operates_requested_category && d.is_online);
        if (topMatch) setBookSelectedDriverId(topMatch.user_id);
      }
    } catch {
      setCompatibleDrivers([]);
    }
  };

  const openBookingModal = async (equip: EquipmentItem) => {
    await openEquipmentPage(equip, 'booking');
  };

  const handleOpenCategoryPage = (categoryName: string) => {
    setFilterCategory(categoryName);
    setActiveTab('category_page');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUseNearbyLocation = () => {
    setActiveTab('home');
    setShowLeafletMap(true);
    setSortBy('distance');
    setFilterMaxDistance('');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: Number(pos.coords.latitude.toFixed(4)),
            lon: Number(pos.coords.longitude.toFixed(4)),
          });
          showToast('success', 'Sorted equipment by nearest distance from your current location.');
        },
        () => {
          showToast('success', 'Showing nearby equipment across Rajasthan on the interactive map.');
        },
      );
    } else {
      showToast('success', 'Showing nearby equipment sorted by distance.');
    }
  };

  const handleToggleSaveEquipment = async (equipId: number) => {
    try {
      const res = await fetch('/api/saved-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmer_id: user.user_id, equipment_id: equipId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message);
        fetchFarmerData();
      }
    } catch {
      showToast('error', 'Failed to update saved equipment.');
    }
  };

  const handleRunAiTalk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch('/api/ai-talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiPrompt }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiResult(data);
      } else {
        showToast('error', data.error || 'Could not parse requirement.');
      }
    } catch {
      showToast('error', 'Error processing requirement.');
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast(
        'error',
        'Voice input is not supported in this browser window. Please type your requirement below.',
      );
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.onstart = () => setAiListening(true);
    recognition.onend = () => setAiListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setAiPrompt(transcript);
      }
    };
    recognition.start();
  };

  const handlePostRequirementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: user.user_id,
          farmer_name: user.full_name,
          equipment_required: reqEquipment,
          work_requirement: reqWork,
          start_date: reqStartDate,
          end_date: reqEndDate,
          num_days: reqDays,
          location: reqLocation,
          budget: reqBudget,
          operator_required: reqOperator,
          additional_instructions: reqInstructions,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReqMatches(data.matches);
        showToast('success', `Requirement posted! Found ${data.matches.length} matching equipment.`);
      } else {
        showToast('error', data.error || 'Failed to post requirement.');
      }
    } catch {
      showToast('error', 'Failed to submit requirement.');
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModalEquip) return;
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: user.user_id,
          equipment_id: bookingModalEquip.equipment_id,
          start_date: bookStartDate,
          end_date: bookEndDate,
          duration_type: bookDurationType,
          duration_value: bookDurationValue,
          work_location: bookLocation,
          operator_required: bookOperatorRequired,
          driver_id: bookOperatorRequired && bookSelectedDriverId ? Number(bookSelectedDriverId) : null,
          special_instructions: bookInstructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Booking failed.');
      } else {
        showToast(
          'success',
          `Booking #${data.booking_id} requested! Once Owner accepts, pay 10% advance (₹${data.advance_amount}) to activate.`,
        );
        setBookingModalEquip(null);
        setSelectedEquipment(null);
        fetchFarmerData();
        setActiveTab('bookings');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      showToast('error', 'Network error while creating booking.');
    }
  };

  const handleProcessDemoPayment = async () => {
    if (!paymentModalBooking) return;
    try {
      const res = await fetch(`/api/bookings/${paymentModalBooking.booking.booking_id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: paymentModalBooking.stage,
          payment_method: selectedPaymentMethod,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          'success',
          paymentModalBooking.stage === 'Advance_10_Percent'
            ? `10% Advance Demo Payment (₹${data.advance_amount}) recorded via ${selectedPaymentMethod}. Booking is now Active!`
            : `90% Remaining Demo Payment (₹${data.remaining_amount}) recorded via ${selectedPaymentMethod}. Booking is now Completed!`,
        );
        setPaymentModalBooking(null);
        fetchFarmerData();
      } else {
        showToast('error', data.error || 'Payment failed.');
      }
    } catch {
      showToast('error', 'Error processing demo payment.');
    }
  };

  const handleMarkReturned = async (bookingId: number) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/return`, { method: 'POST' });
      if (res.ok) {
        showToast('success', 'Equipment marked as Returned! Owner has been notified for inspection.');
        fetchFarmerData();
      }
    } catch {
      showToast('error', 'Failed to mark equipment returned.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    try {
      const res = await fetch(`/api/bookings/${reviewBooking.booking_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_id: user.user_id,
          equipment_rating: revEquipStars,
          driver_rating: reviewBooking.driver_id ? revDriverStars : null,
          reason_category: revReason,
          comment: revComment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Thank you! Your rating and review have been saved.');
        setReviewBooking(null);
        setRevComment('');
        fetchFarmerData();
        fetchEquipment();
      } else {
        showToast('error', data.error || 'Failed to submit rating.');
      }
    } catch {
      showToast('error', 'Failed to submit review.');
    }
  };

  const openBookingChat = async (b: BookingRecord) => {
    setChatBooking(b);
    setChatTargetRole('owner');
    try {
      const res = await fetch(`/api/messages/${b.booking_id}`);
      if (res.ok) setChatMessages(await res.json());
    } catch {
      setChatMessages([]);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatBooking || !chatInput.trim()) return;
    const receiverId =
      chatTargetRole === 'driver' && chatBooking.driver_id
        ? chatBooking.driver_id
        : chatBooking.owner_id;
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
      showToast('error', 'Could not send message.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/users/${user.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profName,
          mobile: profMobile,
          address: profAddress,
          area_city: profAreaCity,
          profile_photo: profPhoto,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdateUser(data.user);
        showToast('success', 'Farmer profile updated (No Aadhaar required).');
      } else {
        showToast('error', data.error || 'Could not update profile.');
      }
    } catch {
      showToast('error', 'Failed to update profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id,
          current_password: currPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message);
        setCurrPassword('');
        setNewPassword('');
      } else {
        showToast('error', data.error || 'Failed to update password.');
      }
    } catch {
      showToast('error', 'Failed to update password.');
    }
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
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
        showToast('success', 'Support ticket submitted! Our team will assist you shortly.');
        setTicketSubject('');
        setTicketDesc('');
        fetchFarmerData();
      }
    } catch {
      showToast('error', 'Failed to submit support ticket.');
    }
  };

  const markNotificationsRead = async () => {
    try {
      await fetch(`/api/notifications/${user.user_id}/read`, { method: 'PATCH' });
      fetchFarmerData();
    } catch {
      // silent
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const savedIds = new Set(savedEquipment.map((s) => s.equipment_id));

  // Price preview inside Booking Modal
  const calcPreviewCosts = () => {
    if (!bookingModalEquip) return { eqCost: 0, opCost: 0, total: 0, advance: 0, remaining: 0 };
    const unit =
      bookDurationType === 'hours'
        ? Number(bookingModalEquip.price_per_hour)
        : Number(bookingModalEquip.price_per_day);
    const eqCost = Math.round(unit * bookDurationValue);
    const opCost = bookOperatorRequired
      ? Math.round(
          (bookDurationType === 'hours' ? 120 : Number(bookingModalEquip.operator_charge_per_day || 700)) *
            bookDurationValue,
        )
      : 0;
    const total = eqCost + opCost;
    const advance = Math.round(total * 0.1);
    const remaining = total - advance;
    return { eqCost, opCost, total, advance, remaining };
  };
  const previewCosts = calcPreviewCosts();

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1A241B]">
      {/* TOP NAVIGATION BAR (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE2D8] px-4 md:px-8 py-3.5 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="text-xl font-bold tracking-tight text-[#1A241B] whitespace-nowrap"
        >
          Khet Mitra
        </button>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4E5D50]">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'home' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Marketplace
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'bookings' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            My Bookings ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'saved' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Saved Equipment ({savedEquipment.length})
          </button>
          <button
            type="button"
            onClick={() => setAiTalkOpen(true)}
            className="hover:text-[#1A241B] whitespace-nowrap"
          >
            AI Talk
          </button>
        </nav>

        {/* Zone 3: Primary actions (Notifications, Profile, Three-Dot Menu) */}
        <div className="flex items-center gap-2.5 relative">
          <button
            type="button"
            onClick={() => onSetLang(lang === 'en' ? 'hi' : 'en')}
            className="px-2.5 py-1.5 text-xs font-medium border border-[#DCE2D8] rounded hover:bg-[#F7F8F5] whitespace-nowrap"
          >
            {lang === 'en' ? 'हिन्दी' : 'English'}
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen(!notifOpen);
                setMenuOpen(false);
                if (!notifOpen && unreadCount > 0) markNotificationsRead();
              }}
              className="p-2 rounded-md border border-[#DCE2D8] hover:bg-[#F7F8F5] relative"
              aria-label="Notifications"
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
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E6EBE2]">
                  <span className="text-xs font-bold text-[#1A241B]">Notifications</span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-[#4E5D50] hover:text-[#1A241B]"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[#E6EBE2]">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[#4E5D50] py-4 text-center">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.notification_id} className="py-2.5 text-xs">
                        <div className="font-semibold text-[#1A241B]">{n.title}</div>
                        <div className="text-[#4E5D50] mt-0.5">{n.message}</div>
                        <div className="text-[11px] text-[#4E5D50] mt-1 font-mono-tabular">
                          {n.event_type} · {new Date(n.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Button */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="px-3 py-1.5 text-xs font-semibold border border-[#DCE2D8] rounded-md hover:bg-[#F7F8F5] whitespace-nowrap"
          >
            {user.full_name.split(' ')[0]} (Farmer)
          </button>

          {/* Three-Dot Menu (All 9 Requested Options) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(!menuOpen);
                setNotifOpen(false);
              }}
              className="p-2 rounded-md border border-[#DCE2D8] hover:bg-[#F7F8F5]"
              aria-label="More Options Menu"
            >
              <MoreVertical className="w-4 h-4 text-[#1A241B]" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#DCE2D8] rounded-lg shadow-lg py-1.5 z-50 text-sm">
                {[
                  { id: 'profile', label: 'My Profile' },
                  { id: 'bookings', label: 'My Bookings' },
                  { id: 'activity', label: 'My Activity' },
                  { id: 'saved', label: 'Saved Equipment' },
                  { id: 'settings', label: 'Settings' },
                  { id: 'security', label: 'Security (Change Password)' },
                  { id: 'help', label: 'Help & Support (FAQ)' },
                  { id: 'report', label: 'Report a Problem' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-[#F7F8F5] text-[#1A241B]"
                  >
                    {item.label}
                  </button>
                ))}
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

      {/* TOAST BANNER */}
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
                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
              )}
              <span>{toast.text}</span>
            </div>
            <button type="button" onClick={() => setToast(null)} className="text-xs underline ml-4">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT VIEWPORT */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* ================================================================
            TAB 1: HOME (SEARCH BAR + 4 MAIN BUTTONS + 8 CATEGORIES + CATALOG)
           ================================================================ */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Large Search Bar + 4 Horizontal Action Buttons */}
            <section className="bg-white border border-[#DCE2D8] rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-[#1A241B]">
                    {t.whatEquipmentNeed}
                  </h1>
                  <p className="text-xs text-[#4E5D50] mt-0.5">
                    Logged in as {user.full_name} · Location: {user.area_city}
                  </p>
                </div>
              </div>

              {/* Large Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-[#4E5D50] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="What equipment do you need? (e.g. Tractor, Harvester, Thresher in Baran, Anta, Kota, Bundi, Jhalawar...)"
                    className="w-full pl-11 pr-4 py-3 border border-[#DCE2D8] rounded-md text-sm focus:outline-none focus:border-[#2E6F40]"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchEquipment}
                  className="px-6 py-3 bg-[#2E6F40] hover:bg-[#245832] text-white font-semibold rounded-md text-sm whitespace-nowrap transition-colors"
                >
                  Search Equipment
                </button>
              </div>

              {/* FOUR MAIN BUTTONS IN ONE HORIZONTAL ROW */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleUseNearbyLocation}
                  className="py-2.5 px-4 bg-[#F7F8F5] hover:bg-[#E9EFE6] border border-[#DCE2D8] rounded-md text-sm font-semibold text-[#1A241B] text-center whitespace-nowrap transition-colors"
                >
                  1. {t.nearbyEquipment}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReqMatches(null);
                    setPostReqOpen(true);
                  }}
                  className="py-2.5 px-4 bg-[#F7F8F5] hover:bg-[#E9EFE6] border border-[#DCE2D8] rounded-md text-sm font-semibold text-[#1A241B] text-center whitespace-nowrap transition-colors"
                >
                  2. {t.postRequirement}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bookings')}
                  className="py-2.5 px-4 bg-[#F7F8F5] hover:bg-[#E9EFE6] border border-[#DCE2D8] rounded-md text-sm font-semibold text-[#1A241B] text-center whitespace-nowrap transition-colors"
                >
                  3. {t.myBookings}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiTalkOpen(true);
                    handleRunAiTalk();
                  }}
                  className="py-2.5 px-4 bg-[#2E6F40] hover:bg-[#245832] text-white rounded-md text-sm font-semibold text-center whitespace-nowrap transition-colors"
                >
                  4. {t.aiTalk}
                </button>
              </div>
            </section>

            {/* 8 EQUIPMENT CATEGORIES */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#1A241B]">Equipment Categories</h2>
                {filterCategory !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setFilterCategory('All')}
                    className="text-xs font-semibold text-[#2E6F40] hover:underline"
                  >
                    Show All Categories
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {EQUIPMENT_CATEGORIES.map((cat) => {
                  const isSelected = filterCategory === cat.name;
                  const availCount = equipmentList.filter(
                    (e) => e.category === cat.name && e.is_available,
                  ).length;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => handleOpenCategoryPage(cat.name)}
                      className={`text-left bg-white border rounded-lg overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                        isSelected
                          ? 'border-[#2E6F40] ring-1 ring-[#2E6F40]'
                          : 'border-[#DCE2D8] hover:border-[#2E6F40]'
                      }`}
                    >
                      <div className="h-24 w-full bg-[#E9EFE6] overflow-hidden">
                        <img
                          src={cat.image}
                          alt={cat.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-bold text-[#1A241B] truncate">
                          {lang === 'hi' ? cat.nameHi : cat.name}
                        </div>
                        <div className="text-[11px] text-[#4E5D50] mt-0.5 font-mono-tabular">
                          From ₹{cat.startingPriceDay}/day
                        </div>
                        <div className="text-[11px] text-[#2E6F40] font-semibold mt-0.5 flex items-center justify-between">
                          <span>{availCount > 0 ? `${availCount} Available` : 'Open →'}</span>
                          <span aria-hidden="true">→</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/*EQUIPMENT SEARCH FILTERS */}
            <section className="bg-white border border-[#DCE2D8] rounded-lg p-5 space-y-4">
              {/* Quick Rajasthan Location Filter Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-[#4E5D50] mr-1">Rajasthan Locations:</span>
                  {[
                    'All',
                    'Kota',
                    'Baran',
                    'Anta',
                    'Atru',
                    'Sangod',
                    'Kaithoon',
                    'Bundi',
                    'Jhalawar',
                    'Jaipur',
                  ].map((loc) => {
                    const activeLoc =
                      (loc === 'All' && !filterLocation) ||
                      filterLocation.toLowerCase() === loc.toLowerCase();
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setFilterLocation(loc === 'All' ? '' : loc)}
                        className={`px-2.5 py-1 rounded border font-medium transition-colors ${
                          activeLoc
                            ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                            : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8] hover:border-[#2E6F40]'
                        }`}
                      >
                        {loc}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setShowLeafletMap(!showLeafletMap)}
                  className="px-3 py-1 rounded border border-[#2E6F40] text-[#2E6F40] font-semibold hover:bg-[#E9EFE6]"
                >
                  {showLeafletMap ? 'Hide Map View' : 'Show Interactive Map (Leaflet)'}
                </button>
              </div>

              {showLeafletMap && (
                <LeafletEquipmentMap
                  equipmentList={equipmentList}
                  userCoords={userCoords}
                  onSelectEquipment={(item) => openEquipmentPage(item, 'details')}
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-2 border-b border-[#E6EBE2]">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#2E6F40]" />
                  <h2 className="text-base font-bold text-[#1A241B]">
                    Filter &amp; Sort Equipment ({equipmentList.length} listings)
                  </h2>
                </div>

                {/* DSA Merge Sort Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#4E5D50] font-medium">Sort By (Merge Sort):</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2.5 py-1.5 border border-[#DCE2D8] rounded bg-[#F7F8F5] font-medium text-[#1A241B]"
                  >
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="distance">Distance: Nearest First</option>
                    <option value="rating">Rating: Highest First</option>
                    <option value="availability">Availability First</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-[#4E5D50] mb-1">Equipment Type</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#DCE2D8] rounded bg-white"
                  >
                    <option value="All">All Categories</option>
                    {EQUIPMENT_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#4E5D50] mb-1">Location / City</label>
                  <input
                    type="text"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    placeholder="e.g. Baran, Anta, Kota, Bundi"
                    className="w-full px-2.5 py-1.5 border border-[#DCE2D8] rounded"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#4E5D50] mb-1">Max Price / Day (₹)</label>
                  <input
                    type="number"
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-2.5 py-1.5 border border-[#DCE2D8] rounded font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#4E5D50] mb-1">Operator Option</label>
                  <select
                    value={filterOperatorMode}
                    onChange={(e) => setFilterOperatorMode(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-[#DCE2D8] rounded bg-white"
                  >
                    <option value="all">With or Without Operator</option>
                    <option value="with">With Operator Available</option>
                    <option value="without">Without Operator (Self)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#4E5D50] mb-1">Minimum Rating</label>
                  <select
                    value={filterMinRating}
                    onChange={(e) => setFilterMinRating(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#DCE2D8] rounded bg-white"
                  >
                    <option value="">Any Rating</option>
                    <option value="4.5">4.5★ &amp; above</option>
                    <option value="4.0">4.0★ &amp; above</option>
                    <option value="3.5">3.5★ &amp; above</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#4E5D50] mb-1">Date &amp; Duration</label>
                  <div className="flex gap-1">
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-2/3 px-1.5 py-1.5 border border-[#DCE2D8] rounded text-[11px]"
                    />
                    <input
                      type="number"
                      min={1}
                      value={filterDuration}
                      onChange={(e) => setFilterDuration(e.target.value)}
                      placeholder="Days"
                      className="w-1/3 px-1.5 py-1.5 border border-[#DCE2D8] rounded text-[11px] font-mono-tabular"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[#E6EBE2] text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer text-[#1A241B]">
                  <input
                    type="checkbox"
                    checked={filterOnlyAvailable}
                    onChange={(e) => setFilterOnlyAvailable(e.target.checked)}
                    className="accent-[#2E6F40]"
                  />
                  <span>Show only currently available equipment</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCategory('All');
                    setFilterLocation('');
                    setFilterMaxDistance('');
                    setFilterMaxPrice('');
                    setFilterOnlyAvailable(false);
                    setFilterOperatorMode('all');
                    setFilterMinRating('');
                    setFilterDate('');
                    setFilterDuration('');
                    setFilterDataSource('all');
                    setSortBy('price_asc');
                  }}
                  className="text-xs font-medium text-[#4E5D50] hover:text-[#1A241B] underline"
                >
                  Reset All Filters
                </button>
              </div>
            </section>

            {/* EQUIPMENT RESULT CARDS */}
            <section>
              {equipmentList.length === 0 ? (
                <div className="bg-white border border-[#DCE2D8] rounded-lg p-10 text-center">
                  <p className="text-base font-semibold text-[#1A241B]">
                    No agricultural equipment matched your current filters.
                  </p>
                  <p className="text-xs text-[#4E5D50] mt-1">
                    Try clearing one of your price or location filters, or post a custom requirement.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {equipmentList.map((item) => {
                    const isSaved = savedIds.has(item.equipment_id);
                    return (
                      <div
                        key={item.equipment_id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openEquipmentPage(item, 'details')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openEquipmentPage(item, 'details');
                          }
                        }}
                        className="bg-white border border-[#DCE2D8] rounded-lg overflow-hidden flex flex-col justify-between hover:border-[#2E6F40] hover:shadow-md transition-all cursor-pointer text-left"
                      >
                        <div>
                          <div className="h-52 w-full bg-[#E9EFE6] relative overflow-hidden">
                            <img
                              src={item.image_url}
                              alt={item.equipment_name}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                              className="w-full h-full object-cover"
                            />

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSaveEquipment(item.equipment_id);
                              }}
                              className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-md border border-[#DCE2D8]"
                              title={isSaved ? 'Remove from Saved' : 'Save Equipment'}
                            >
                              <Bookmark
                                className={`w-4 h-4 ${
                                  isSaved ? 'fill-[#2E6F40] text-[#2E6F40]' : 'text-[#1A241B]'
                                }`}
                              />
                            </button>
                          </div>

                          <div className="p-5">
                            {/* Category · Brand · Older/Used Year */}
                            <div className="text-xs text-[#4E5D50] flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-[#2E6F40]">{item.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[#1A241B]">{item.brand}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">
                                {item.manufacturing_year} Older/Used Model
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-[#1A241B] mt-1.5 hover:text-[#2E6F40]">
                              {item.equipment_name}
                            </h3>

                            {/* Older/Used Model Information */}
                            <div className="mt-2 p-2 bg-[#F7F8F5] border border-[#DCE2D8] rounded text-[11px] text-[#1A241B]">
                              <span className="font-semibold">Model &amp; Used Condition: </span>
                              {item.used_condition_note || `${item.model} (${item.manufacturing_year} Used Machine)`}
                            </div>

                            {/* Owner Profile Block with Licensed Agricultural Avatar */}
                            <div className="mt-3 pt-3 border-t border-[#E6EBE2] flex items-center gap-2.5">
                              <img
                                src={
                                  item.owner_profile_photo ||
                                  '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg'
                                }
                                alt={item.owner_name}
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-full object-cover border border-[#DCE2D8] shrink-0"
                              />
                              <div className="text-xs min-w-0">
                                <div className="font-bold text-[#1A241B] truncate">
                                  {item.owner_name}
                                </div>
                                <div className="text-[11px] text-[#4E5D50] flex flex-wrap items-center gap-1">
                                  <span>{item.location}</span>
                                </div>
                              </div>
                            </div>

                            {/* Detailed Specs: Experience, Availability, Operator Availability, Description, Rating */}
                            <div className="text-xs text-[#4E5D50] mt-3 space-y-1">
                              <div>
                                <span className="font-semibold text-[#1A241B]">Experience: </span>
                                {item.experience_years || item.owner_experience_years || 10} Years Agricultural Machinery Experience
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-[#1A241B]">Availability:</span>
                                <span
                                  className={
                                    item.is_available
                                      ? 'text-[#2E6F40] font-semibold'
                                      : 'text-red-700 font-semibold'
                                  }
                                >
                                  {item.is_available ? 'Available' : 'Currently Unavailable'}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-[#1A241B]">Operator:</span>
                                <span>
                                  {item.operator_available
                                    ? `Available (+₹${item.operator_charge_per_day}/day)`
                                    : 'Self-Operated Only'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#4E5D50] line-clamp-2 pt-0.5">
                                {item.description}
                              </p>
                              <div className="font-mono-tabular text-[#1A241B] pt-1 font-semibold">
                                Rating:{' '}
                                <span className="text-[#B45309]">
                                  {item.rating_label ||
                                    `${item.average_rating}★ (${item.review_count} reviews)`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-3 border-t border-[#E6EBE2] flex items-center justify-between gap-3">
                          <div className="font-mono-tabular">
                            <div className="text-base font-bold text-[#1A241B]">
                              ₹{item.price_per_day.toLocaleString('en-IN')}{' '}
                              <span className="text-xs font-normal text-[#4E5D50]">/ day</span>
                            </div>
                            <div className="text-xs text-[#4E5D50]">
                              Rental Price: ₹{item.price_per_hour} / hour
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEquipmentPage(item, 'details');
                              }}
                              className="px-3 py-2 text-xs font-semibold border border-[#DCE2D8] rounded-md hover:bg-[#F7F8F5] whitespace-nowrap"
                            >
                              {t.viewDetails} →
                            </button>
                            <button
                              type="button"
                              disabled={!item.is_available}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEquipmentPage(item, 'booking');
                              }}
                              className="px-3.5 py-2 text-xs font-semibold bg-[#2E6F40] hover:bg-[#245832] text-white rounded-md whitespace-nowrap disabled:opacity-40"
                            >
                              {t.bookNow} →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* RAJASTHAN EQUIPMENT OWNER PROFILES SECTION (Baran, Anta, Atru, Kota, Sangod, Kaithoon, Bundi, Jhalawar) */}
            {demoOwners.length > 0 && filterDataSource !== 'real' && (
              <section className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E6EBE2]">
                  <div>
                    <h2 className="text-lg font-bold text-[#1A241B]">
                      Equipment Owner Profiles — Rajasthan (Hadoti Region)
                    </h2>
                    <p className="text-xs text-[#4E5D50]">
                      Agricultural machinery providers across Baran, Anta, Atru, Kota, Sangod, Kaithoon, Bundi, and Jhalawar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {demoOwners.map((owner) => {
                    const eq = owner.equipment?.[0];
                    return (
                      <div
                        key={owner.user_id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (eq) openEquipmentPage(eq, 'details');
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && eq) {
                            e.preventDefault();
                            openEquipmentPage(eq, 'details');
                          }
                        }}
                        className="p-4 bg-[#F7F8F5] border border-[#DCE2D8] hover:border-[#2E6F40] hover:shadow-md rounded-lg flex flex-col justify-between space-y-3 text-xs cursor-pointer transition-all text-left"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={owner.profile_photo}
                              alt={owner.full_name}
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-full object-cover border border-[#DCE2D8] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-[#1A241B] leading-snug">
                                {owner.full_name}
                              </div>
                              <div className="text-[11px] text-[#2E6F40] font-semibold">
                                {owner.location}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 text-[11px] text-[#4E5D50] pt-1 border-t border-[#E6EBE2]">
                            <div>
                              <span className="font-semibold text-[#1A241B]">Center: </span>
                              {owner.business_name}
                            </div>
                            <div>
                              <span className="font-semibold text-[#1A241B]">Experience: </span>
                              {owner.experience_years} Years Farming &amp; Machinery Experience
                            </div>
                            <div>
                              <span className="font-semibold text-[#1A241B]">Rating: </span>
                              <span className="text-[#B45309] font-semibold">
                                {owner.demo_rating_label}
                              </span>
                            </div>
                            {eq && (
                              <div className="pt-1">
                                <span className="font-semibold text-[#1A241B]">Used Machine: </span>
                                {eq.equipment_name} ({eq.manufacturing_year} Used Model · ₹{eq.price_per_hour}/hr · ₹{eq.price_per_day}/day)
                              </div>
                            )}
                          </div>
                        </div>

                        {eq && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEquipmentPage(eq, 'details');
                            }}
                            className="w-full py-1.5 px-3 bg-white hover:bg-[#2E6F40] hover:text-white text-[#1A241B] border border-[#DCE2D8] rounded font-semibold transition-colors text-center"
                          >
                            Open Equipment Page →
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ================================================================
            DEDICATED CATEGORY EQUIPMENT PAGE (NEXT PAGE WHEN CLICKING A CATEGORY)
           ================================================================ */}
        {activeTab === 'category_page' && (
          <div className="space-y-6">
            <div className="bg-white border border-[#DCE2D8] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setFilterCategory('All');
                    setActiveTab('home');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E6F40] hover:underline mb-2"
                >
                  ← {lang === 'hi' ? 'सभी श्रेणियों पर वापस जाएं (Back to All Equipment)' : 'Back to All Equipment Categories'}
                </button>
                <h1 className="text-xl md:text-2xl font-bold text-[#1A241B]">
                  {filterCategory === 'All' ? 'All Agricultural Equipment' : `${filterCategory} Equipment Listings`}
                </h1>
                <p className="text-xs text-[#4E5D50] mt-0.5">
                  Click on any {filterCategory === 'All' ? 'equipment' : filterCategory.toLowerCase()} card below to open its full details and proceed to booking.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {EQUIPMENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setFilterCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                      filterCategory === cat.name
                        ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                        : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8] hover:border-[#2E6F40]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {equipmentList.length === 0 ? (
              <div className="bg-white border border-[#DCE2D8] rounded-lg p-10 text-center space-y-3">
                <p className="text-base font-semibold text-[#1A241B]">
                  No {filterCategory} listings matched your current filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFilterLocation('');
                    setFilterMaxPrice('');
                    setFilterDataSource('all');
                  }}
                  className="px-4 py-2 bg-[#2E6F40] text-white text-xs font-semibold rounded-md"
                >
                  Show All {filterCategory} Listings
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipmentList.map((item) => {
                  return (
                    <div
                      key={item.equipment_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openEquipmentPage(item, 'details')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openEquipmentPage(item, 'details');
                        }
                      }}
                      className="bg-white border border-[#DCE2D8] rounded-lg overflow-hidden flex flex-col justify-between hover:border-[#2E6F40] hover:shadow-md transition-all cursor-pointer text-left"
                    >
                      <div>
                        <div className="h-52 w-full bg-[#E9EFE6] relative overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.equipment_name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="p-5 space-y-2">
                          <div className="text-xs text-[#4E5D50] flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-[#2E6F40]">{item.category}</span>
                            <span>·</span>
                            <span className="font-semibold text-[#1A241B]">{item.brand}</span>
                            <span>·</span>
                            <span className="font-mono-tabular">
                              {item.manufacturing_year} Older/Used Model
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-[#1A241B]">
                            {item.equipment_name}
                          </h3>
                          <div className="text-xs text-[#4E5D50]">
                            Owner: <strong className="text-[#1A241B]">{item.owner_name}</strong> · Location:{' '}
                            <strong className="text-[#1A241B]">{item.location}</strong>
                          </div>
                          <p className="text-xs text-[#4E5D50] line-clamp-2">{item.description}</p>
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-3 border-t border-[#E6EBE2] flex items-center justify-between gap-3">
                        <div className="font-mono-tabular">
                          <div className="text-base font-bold text-[#1A241B]">
                            ₹{item.price_per_day.toLocaleString('en-IN')}{' '}
                            <span className="text-xs font-normal text-[#4E5D50]">/ day</span>
                          </div>
                          <div className="text-xs text-[#4E5D50]">₹{item.price_per_hour} / hour</div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEquipmentPage(item, 'details');
                          }}
                          className="px-4 py-2 bg-[#2E6F40] hover:bg-[#245832] text-white text-xs font-semibold rounded-md whitespace-nowrap"
                        >
                          Select &amp; Continue →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            DEDICATED EQUIPMENT DETAILS & BOOKING PAGE (NEXT PAGE WHEN CLICKING ANY EQUIPMENT)
           ================================================================ */}
        {activeTab === 'equipment_detail' && selectedEquipment && (
          <div className="space-y-6">
            {/* Top Navigation & Step Progress Bar */}
            <div className="bg-white border border-[#DCE2D8] rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => setActiveTab(previousTab)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E6F40] hover:underline mb-1"
                >
                  ← {lang === 'hi' ? 'उपकरण सूची पर वापस जाएं (Back to Equipment List)' : 'Back to Equipment Marketplace'}
                </button>
                <h1 className="text-xl sm:text-2xl font-bold text-[#1A241B] mt-1">
                  {selectedEquipment.equipment_name}
                </h1>
              </div>

              {/* 2-Step Page Switcher */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEquipmentPageStep('details')}
                  className={`px-3.5 py-2 rounded-md text-xs font-semibold border transition-colors ${
                    equipmentPageStep === 'details'
                      ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                      : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8]'
                  }`}
                >
                  1. Equipment Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBookingModalEquip(selectedEquipment);
                    setEquipmentPageStep('booking');
                  }}
                  className={`px-3.5 py-2 rounded-md text-xs font-semibold border transition-colors ${
                    equipmentPageStep === 'booking'
                      ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                      : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8]'
                  }`}
                >
                  2. Book &amp; Select Operator →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN (7 Cols): Equipment Photo, Specs, Older/Used Condition & Fictional Demo Owner */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border border-[#DCE2D8] rounded-lg overflow-hidden">
                  <div className="h-72 sm:h-80 w-full bg-[#E9EFE6] relative">
                    <img
                      src={selectedEquipment.image_url}
                      alt={selectedEquipment.equipment_name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 bg-black/70 text-white px-3.5 py-2 rounded">
                      <span className="text-xs font-semibold">
                        {selectedEquipment.category} · {selectedEquipment.brand} · {selectedEquipment.manufacturing_year} Used Model
                      </span>
                      <span className="text-sm font-bold font-mono-tabular">
                        ₹{selectedEquipment.price_per_day}/day · ₹{selectedEquipment.price_per_hour}/hr
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Older / Used Model Information */}
                    <div className="p-3.5 bg-[#F7F8F5] border border-[#DCE2D8] rounded-md text-xs text-[#1A241B]">
                      <div className="font-bold text-[#2E6F40] mb-1">
                        Older / Used Model &amp; Field Condition Information
                      </div>
                      <div>
                        {selectedEquipment.used_condition_note ||
                          `Used ${selectedEquipment.manufacturing_year} Model (${selectedEquipment.model}) in regular agricultural field working condition.`}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h3 className="text-sm font-bold text-[#1A241B] mb-1">Equipment Description</h3>
                      <p className="text-xs sm:text-sm text-[#4E5D50] leading-relaxed">
                        {selectedEquipment.description}
                      </p>
                    </div>

                    {/* Complete Specifications Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono-tabular">
                      <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
                        <div className="text-[#4E5D50] font-sans">Daily Rental Price</div>
                        <div className="text-base font-bold text-[#1A241B] mt-0.5">
                          ₹{selectedEquipment.price_per_day}/day
                        </div>
                      </div>
                      <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
                        <div className="text-[#4E5D50] font-sans">Hourly Rental Price</div>
                        <div className="text-base font-bold text-[#1A241B] mt-0.5">
                          ₹{selectedEquipment.price_per_hour}/hour
                        </div>
                      </div>
                      <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
                        <div className="text-[#4E5D50] font-sans">Availability</div>
                        <div
                          className={`text-sm font-bold mt-0.5 ${
                            selectedEquipment.is_available ? 'text-[#2E6F40]' : 'text-red-700'
                          }`}
                        >
                          {selectedEquipment.is_available ? 'Available Now' : 'Unavailable'}
                        </div>
                      </div>
                      <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
                        <div className="text-[#4E5D50] font-sans">Operator Availability</div>
                        <div className="text-xs font-bold text-[#1A241B] mt-0.5">
                          {selectedEquipment.operator_available
                            ? `Available (+₹${selectedEquipment.operator_charge_per_day}/day)`
                            : 'Self-Operated'}
                        </div>
                      </div>
                      <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
                        <div className="text-[#4E5D50] font-sans">Experience</div>
                        <div className="text-xs font-bold text-[#1A241B] mt-0.5">
                          {selectedEquipment.experience_years || 10} Years Experience
                        </div>
                      </div>
                      <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
                        <div className="text-[#4E5D50] font-sans">Rating</div>
                        <div className="text-xs font-bold text-[#B45309] mt-0.5">
                          {selectedEquipment.rating_label ||
                            `${selectedEquipment.average_rating}★ (${selectedEquipment.review_count || 0} reviews)`}
                        </div>
                      </div>
                    </div>

                    {/* Owner Profile Card */}
                    <div className="p-4 bg-[#F4F7F2] border border-[#DCE2D8] rounded-md flex items-center gap-3.5">
                      <img
                        src={
                          selectedEquipment.owner_profile_photo ||
                          '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg'
                        }
                        alt={selectedEquipment.owner_name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-full object-cover border border-[#DCE2D8] shrink-0"
                      />
                      <div className="text-xs space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-[#1A241B]">
                            {selectedEquipment.owner_name}
                          </span>
                        </div>
                        <div className="text-[#4E5D50]">
                          Location: <strong className="text-[#1A241B]">{selectedEquipment.location}</strong> · Center:{' '}
                          <strong className="text-[#1A241B]">{selectedEquipment.business_name}</strong>
                        </div>
                        <div className="text-[11px] text-[#4E5D50]">
                          Contact: {selectedEquipment.owner_mobile} · Terms: {selectedEquipment.terms_and_conditions}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (5 Cols): Interactive Next-Step Booking Form */}
              <div className="lg:col-span-5">
                <div className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4 sticky top-20">
                  <div className="border-b border-[#E6EBE2] pb-3">
                    <span className="px-2.5 py-0.5 bg-[#2E6F40] text-white text-[11px] font-bold rounded">
                      Step 2 of 2 — Complete Booking
                    </span>
                    <h2 className="text-lg font-bold text-[#1A241B] mt-1.5">
                      Book This Equipment
                    </h2>
                    <p className="text-xs text-[#4E5D50]">
                      Select your dates, duration, and operator preference below to submit your booking request.
                    </p>
                  </div>

                  <form onSubmit={handleConfirmBooking} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-[#4E5D50] mb-1">Start Date *</label>
                        <input
                          type="date"
                          required
                          value={bookStartDate}
                          onChange={(e) => setBookStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#4E5D50] mb-1">End Date *</label>
                        <input
                          type="date"
                          required
                          value={bookEndDate}
                          onChange={(e) => setBookEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-[#4E5D50] mb-1">Duration Type</label>
                        <select
                          value={bookDurationType}
                          onChange={(e) => setBookDurationType(e.target.value as 'days' | 'hours')}
                          className="w-full px-3 py-2 border border-[#DCE2D8] rounded bg-white"
                        >
                          <option value="days">Days (₹{selectedEquipment.price_per_day}/day)</option>
                          <option value="hours">Hours (₹{selectedEquipment.price_per_hour}/hour)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-[#4E5D50] mb-1">
                          Number of {bookDurationType === 'days' ? 'Days' : 'Hours'} *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          required
                          value={bookDurationValue}
                          onChange={(e) => setBookDurationValue(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-[#4E5D50]">
                          Farm Work Location / Village *
                        </label>
                        <button
                          type="button"
                          onClick={() => setBookLocation(`${user.address}, ${user.area_city}`)}
                          className="text-[11px] text-[#2E6F40] hover:underline inline-flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" /> Use Saved Address
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={bookLocation}
                        onChange={(e) => setBookLocation(e.target.value)}
                        className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                      />
                    </div>

                    <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded space-y-2">
                      <label className="inline-flex items-center gap-2 font-semibold text-[#1A241B] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bookOperatorRequired}
                          onChange={(e) => setBookOperatorRequired(e.target.checked)}
                          className="accent-[#2E6F40]"
                        />
                        <span>
                          Request Skilled Driver / Operator (+₹
                          {selectedEquipment.operator_charge_per_day}/day)
                        </span>
                      </label>

                      {bookOperatorRequired && (
                        <div>
                          <label className="block text-[11px] text-[#4E5D50] mb-1">
                            Compatible Online Drivers (Matched via Skill &amp; Experience):
                          </label>
                          <select
                            value={bookSelectedDriverId}
                            onChange={(e) =>
                              setBookSelectedDriverId(e.target.value ? Number(e.target.value) : '')
                            }
                            className="w-full px-2.5 py-1.5 border border-[#DCE2D8] rounded bg-white"
                          >
                            <option value="">Let Equipment Owner Assign Compatible Driver</option>
                            {compatibleDrivers.map((d) => (
                              <option key={d.user_id} value={d.user_id}>
                                {d.full_name} · {selectedEquipment.category} Exp: {d.category_experience_years}{' '}
                                yrs · {d.average_rating}★ · Match: {d.compatibility_score}%
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-[#4E5D50] mb-1">
                        Special Field Instructions (Optional)
                      </label>
                      <input
                        type="text"
                        value={bookInstructions}
                        onChange={(e) => setBookInstructions(e.target.value)}
                        placeholder="Crop type, acreage, or gate landmark"
                        className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                      />
                    </div>

                    {/* Transparent Two-Stage Payment Breakdown */}
                    <div className="p-3.5 bg-[#F4F7F2] border border-[#DCE2D8] rounded-md font-mono-tabular space-y-1">
                      <div className="flex justify-between">
                        <span>Equipment Rental Cost:</span>
                        <span>₹{previewCosts.eqCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Operator / Driver Charge:</span>
                        <span>₹{previewCosts.opCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-[#1A241B] border-t border-[#DCE2D8] pt-1">
                        <span>Total Rental Amount:</span>
                        <span>₹{previewCosts.total.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[#2E6F40] font-semibold pt-1">
                        <span>Stage 1 — 10% Advance (after Owner accepts):</span>
                        <span>₹{previewCosts.advance.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[#4E5D50]">
                        <span>Stage 2 — 90% Remaining (after inspection):</span>
                        <span>₹{previewCosts.remaining.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedEquipment.is_available}
                      className="w-full py-3 bg-[#2E6F40] hover:bg-[#245832] text-white font-semibold rounded-md text-sm disabled:opacity-40 transition-colors"
                    >
                      Confirm Booking &amp; Proceed →
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 2: MY BOOKINGS (COMPLETE 17-STEP WORKFLOW & TWO-STAGE PAYMENT)
           ================================================================ */}
        {activeTab === 'bookings' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#1A241B]">My Equipment Bookings</h1>
                <p className="text-xs text-[#4E5D50] mt-0.5">
                  Track status, pay 10% advance or 90% remaining balance after inspection, chat with Owner/Driver, and rate completed bookings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="px-4 py-2 text-xs font-semibold bg-[#2E6F40] text-white rounded-md"
              >
                + Book More Equipment
              </button>
            </div>

            {bookings.length === 0 ? (
              <div className="bg-white border border-[#DCE2D8] rounded-lg p-10 text-center">
                <p className="text-base font-semibold">You have no bookings yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('home')}
                  className="mt-3 px-4 py-2 bg-[#2E6F40] text-white text-xs font-semibold rounded-md"
                >
                  Browse Equipment Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((b) => (
                  <div
                    key={b.booking_id}
                    className="bg-white border border-[#DCE2D8] rounded-lg p-5 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-[#E6EBE2]">
                      <div>
                        <div className="text-xs text-[#4E5D50] font-mono-tabular">
                          Booking #{b.booking_id} · {b.start_date} to {b.end_date} ({b.duration_value}{' '}
                          {b.duration_type}) · Status:{' '}
                          <span className="font-bold text-[#1A241B]">{b.booking_status}</span>
                        </div>
                        <h3 className="text-base font-bold text-[#1A241B] mt-1">
                          {b.equipment_name}
                        </h3>
                      </div>

                      <div className="text-left md:text-right font-mono-tabular">
                        <div className="text-sm font-bold text-[#1A241B]">
                          Total: ₹{Number(b.total_price).toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-[#4E5D50]">
                          10% Advance: ₹{b.advance_amount} · 90% Remaining: ₹{b.remaining_amount} · Payment:{' '}
                          <span className="font-semibold text-[#2E6F40]">{b.payment_status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#4E5D50]">
                      <div>
                        <div className="font-semibold text-[#1A241B]">Owner &amp; Location</div>
                        <div>Owner: {b.owner_name} ({b.owner_mobile})</div>
                        <div>Work Site: {b.work_location}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-[#1A241B]">Operator / Driver Details</div>
                        {b.operator_required ? (
                          b.driver_name ? (
                            <div>
                              Assigned Driver: {b.driver_name} ({b.driver_mobile}) · Job Status:{' '}
                              <span className="font-semibold text-[#1A241B]">
                                {b.driver_assignment?.job_status || 'Assigned'}
                              </span>
                            </div>
                          ) : (
                            <div>Operator Requested (Awaiting Owner driver assignment)</div>
                          )
                        ) : (
                          <div>Self-Operated (No operator requested)</div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-[#1A241B]">Inspection &amp; Review</div>
                        {b.inspection ? (
                          <div>
                            Inspected: <span className="font-semibold">{b.inspection.equipment_condition}</span>{' '}
                            {b.inspection.additional_charges > 0
                              ? `(+₹${b.inspection.additional_charges} damage charge)`
                              : '(No extra charges)'}
                          </div>
                        ) : (
                          <div>Post-return inspection pending</div>
                        )}
                        {b.review && (
                          <div className="text-[#2E6F40] font-semibold mt-0.5">
                            Rated: Equipment {b.review.equipment_rating}★
                            {b.review.driver_rating ? ` · Driver ${b.review.driver_rating}★` : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive Workflow Actions for Farmer */}
                    <div className="pt-3 border-t border-[#E6EBE2] flex flex-wrap items-center gap-2.5">
                      {/* Stage 1: 10% Advance Payment */}
                      {(b.booking_status === 'Accepted' || b.booking_status === 'Driver Assigned') &&
                        b.payment_status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => {
                              const defaultMethod = b.owner_payment_methods.upi
                                ? 'UPI'
                                : b.owner_payment_methods.bank_transfer
                                ? 'Bank Transfer'
                                : 'Cash';
                              setSelectedPaymentMethod(defaultMethod);
                              setPaymentModalBooking({ booking: b, stage: 'Advance_10_Percent' });
                            }}
                            className="px-4 py-2 bg-[#2E6F40] hover:bg-[#245832] text-white text-xs font-semibold rounded-md"
                          >
                            Pay 10% Advance (₹{b.advance_amount}) [DEMO PAYMENT]
                          </button>
                        )}

                      {/* Mark Equipment Returned */}
                      {b.booking_status === 'Active' && (
                        <button
                          type="button"
                          onClick={() => handleMarkReturned(b.booking_id)}
                          className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-semibold rounded-md"
                        >
                          Mark Equipment Returned
                        </button>
                      )}

                      {/* Stage 2: 90% Remaining Payment (After Owner Inspection) */}
                      {b.booking_status === 'Inspected' && b.payment_status !== 'Fully Paid' && (
                        <button
                          type="button"
                          onClick={() => {
                            const defaultMethod = b.owner_payment_methods.upi
                              ? 'UPI'
                              : b.owner_payment_methods.bank_transfer
                              ? 'Bank Transfer'
                              : 'Cash';
                            setSelectedPaymentMethod(defaultMethod);
                            setPaymentModalBooking({ booking: b, stage: 'Remaining_90_Percent' });
                          }}
                          className="px-4 py-2 bg-[#2E6F40] hover:bg-[#245832] text-white text-xs font-semibold rounded-md"
                        >
                          Pay Remaining 90% (₹{b.remaining_amount}) [DEMO PAYMENT]
                        </button>
                      )}

                      {/* Rate Equipment & Driver (Only after Completed, No duplicates) */}
                      {b.booking_status === 'Completed' && !b.review && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewBooking(b);
                            setRevEquipStars(5);
                            setRevDriverStars(5);
                          }}
                          className="px-4 py-2 bg-[#2E6F40] hover:bg-[#245832] text-white text-xs font-semibold rounded-md"
                        >
                          Rate Equipment &amp; Driver
                        </button>
                      )}

                      {/* Chat with Owner / Driver */}
                      <button
                        type="button"
                        onClick={() => openBookingChat(b)}
                        className="px-3.5 py-2 border border-[#DCE2D8] hover:bg-[#F7F8F5] text-xs font-semibold rounded-md inline-flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Chat with Owner / Driver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 3: MY SAVED EQUIPMENT
           ================================================================ */}
        {activeTab === 'saved' && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-[#1A241B]">My Saved Equipment</h1>
            {savedEquipment.length === 0 ? (
              <div className="bg-white border border-[#DCE2D8] rounded-lg p-8 text-center">
                <p className="text-sm text-[#4E5D50]">
                  You have not saved any equipment yet. Click the bookmark icon on any listing to save it here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {savedEquipment.map((item) => (
                  <div
                    key={item.equipment_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEquipmentPage(item, 'details')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openEquipmentPage(item, 'details');
                      }
                    }}
                    className="bg-white border border-[#DCE2D8] hover:border-[#2E6F40] hover:shadow-md rounded-lg p-4 flex flex-col justify-between cursor-pointer transition-all text-left"
                  >
                    <div>
                      <img
                        src={item.image_url}
                        alt={item.equipment_name}
                        referrerPolicy="no-referrer"
                        className="w-full h-40 object-cover rounded mb-3"
                      />
                      <div className="text-xs text-[#4E5D50]">
                        {item.category} · {item.location}
                      </div>
                      <h3 className="text-base font-bold text-[#1A241B] mt-1">{item.equipment_name}</h3>
                      <div className="text-sm font-bold text-[#2E6F40] mt-2 font-mono-tabular">
                        ₹{item.price_per_day}/day · ₹{item.price_per_hour}/hr
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E6EBE2]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEquipmentPage(item, 'booking');
                        }}
                        className="flex-1 py-2 bg-[#2E6F40] text-white text-xs font-semibold rounded"
                      >
                        Book Now →
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSaveEquipment(item.equipment_id);
                        }}
                        className="px-3 py-2 border border-red-200 text-red-700 text-xs font-semibold rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            TAB 4: FARMER PROFILE (Strictly NO Aadhaar Number or Upload!)
           ================================================================ */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-6">
            <div>
              <h1 className="text-xl font-bold text-[#1A241B]">Farmer / Customer Profile</h1>
              <p className="text-xs text-[#4E5D50] mt-0.5">
                Manage your personal details, farm location, booking history, and reviews given. (Privacy Assured: No Aadhaar number or Aadhaar document is ever requested.)
              </p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#4E5D50] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E5D50] mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    required
                    value={profMobile}
                    onChange={(e) => setProfMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#4E5D50] mb-1">
                    Email (Read-only)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full px-3 py-2 border border-[#DCE2D8] bg-[#F7F8F5] rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E5D50] mb-1">
                    Optional Profile Photo URL
                  </label>
                  <input
                    type="text"
                    value={profPhoto}
                    onChange={(e) => setProfPhoto(e.target.value)}
                    placeholder="Optional profile photo link"
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#4E5D50] mb-1">Area / City</label>
                  <input
                    type="text"
                    required
                    value={profAreaCity}
                    onChange={(e) => setProfAreaCity(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#4E5D50] mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={profAddress}
                    onChange={(e) => setProfAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2E6F40] hover:bg-[#245832] text-white text-sm font-semibold rounded-md"
              >
                Save Profile Changes
              </button>
            </form>

            <div className="pt-4 border-t border-[#E6EBE2] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-[#F7F8F5] rounded border border-[#DCE2D8]">
                <div className="text-[#4E5D50]">Total Bookings</div>
                <div className="text-lg font-bold text-[#1A241B] font-mono-tabular mt-0.5">
                  {bookings.length}
                </div>
              </div>
              <div className="p-3 bg-[#F7F8F5] rounded border border-[#DCE2D8]">
                <div className="text-[#4E5D50]">Saved Equipment</div>
                <div className="text-lg font-bold text-[#1A241B] font-mono-tabular mt-0.5">
                  {savedEquipment.length}
                </div>
              </div>
              <div className="p-3 bg-[#F7F8F5] rounded border border-[#DCE2D8]">
                <div className="text-[#4E5D50]">Reviews Given</div>
                <div className="text-lg font-bold text-[#1A241B] font-mono-tabular mt-0.5">
                  {bookings.filter((b) => b.review).length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 5: MY ACTIVITY / SETTINGS / SECURITY / HELP / REPORT PROBLEM
           ================================================================ */}
        {activeTab === 'activity' && (
          <div className="max-w-3xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h1 className="text-xl font-bold text-[#1A241B]">My Activity &amp; Reviews Given</h1>
            <div className="space-y-3">
              {bookings.map((b) => (
                <div key={b.booking_id} className="p-3.5 border border-[#DCE2D8] rounded text-xs">
                  <div className="font-semibold text-[#1A241B]">
                    Booking #{b.booking_id}: {b.equipment_name}
                  </div>
                  <div className="text-[#4E5D50] mt-0.5">
                    Status: {b.booking_status} · Payment: {b.payment_status} · Total: ₹{b.total_price}
                  </div>
                  {b.review && (
                    <div className="mt-1 text-[#2E6F40]">
                      Your Review ({b.review.equipment_rating}★): &ldquo;{b.review.comment}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h1 className="text-xl font-bold text-[#1A241B]">Account &amp; Language Settings</h1>
            <div className="flex items-center justify-between py-3 border-b border-[#E6EBE2]">
              <div>
                <div className="text-sm font-semibold">Platform Language</div>
                <div className="text-xs text-[#4E5D50]">Switch between English and Hindi (हिन्दी)</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onSetLang('en')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                    lang === 'en' ? 'bg-[#2E6F40] text-white border-[#2E6F40]' : 'border-[#DCE2D8]'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onSetLang('hi')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded border ${
                    lang === 'hi' ? 'bg-[#2E6F40] text-white border-[#2E6F40]' : 'border-[#DCE2D8]'
                  }`}
                >
                  हिन्दी (Hindi)
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h1 className="text-xl font-bold text-[#1A241B]">Security — Change Password</h1>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E5D50] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currPassword}
                  onChange={(e) => setCurrPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E5D50] mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-[#2E6F40] text-white text-xs font-semibold rounded"
              >
                Update Password
              </button>
            </form>
          </div>
        )}

        {activeTab === 'help' && (
          <div className="max-w-3xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h1 className="text-xl font-bold text-[#1A241B]">Help &amp; Support — Frequently Asked Questions</h1>
            <div className="space-y-3 text-sm">
              <div className="p-4 bg-[#F7F8F5] rounded border border-[#DCE2D8]">
                <div className="font-semibold">1. How does the 10% Advance and 90% Remaining payment work?</div>
                <p className="text-xs text-[#4E5D50] mt-1">
                  Once the Equipment Owner accepts your booking request, you pay a 10% advance to confirm and activate the booking. After the work is finished and the Owner inspects the returned equipment, you pay the remaining 90% balance.
                </p>
              </div>
              <div className="p-4 bg-[#F7F8F5] rounded border border-[#DCE2D8]">
                <div className="font-semibold">2. Do Farmers need to upload an Aadhaar Card on Khet Mitra?</div>
                <p className="text-xs text-[#4E5D50] mt-1">
                  No. Khet Mitra strictly does NOT ask Farmers/Customers for an Aadhaar number or Aadhaar document upload anywhere.
                </p>
              </div>
              <div className="p-4 bg-[#F7F8F5] rounded border border-[#DCE2D8]">
                <div className="font-semibold">3. Need to report an issue with a booking or payment?</div>
                <button
                  type="button"
                  onClick={() => setActiveTab('report')}
                  className="mt-2 px-3 py-1.5 bg-[#2E6F40] text-white text-xs font-semibold rounded"
                >
                  Open Report a Problem Form
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="max-w-2xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-5">
            <div>
              <h1 className="text-xl font-bold text-[#1A241B]">Report a Problem / Submit Support Ticket</h1>
              <p className="text-xs text-[#4E5D50] mt-0.5">
                Select a problem category and describe your issue for the Khet Mitra Admin team.
              </p>
            </div>

            <form onSubmit={handleCreateSupportTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4E5D50] mb-1">
                  Report Category
                </label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm bg-white"
                >
                  <option value="Booking Problem">Booking Problem</option>
                  <option value="Payment Problem">Payment Problem</option>
                  <option value="Equipment Problem">Equipment Problem</option>
                  <option value="Driver Problem">Driver Problem</option>
                  <option value="Owner Problem">Owner Problem</option>
                  <option value="Account Problem">Account Problem</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E5D50] mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Brief summary of the issue"
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#4E5D50] mb-1">
                  Detailed Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Explain the booking ID or issue details..."
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2E6F40] text-white text-xs font-semibold rounded-md"
              >
                Submit Support Ticket
              </button>
            </form>

            {tickets.length > 0 && (
              <div className="pt-4 border-t border-[#E6EBE2] space-y-2">
                <h3 className="text-xs font-bold text-[#1A241B]">Your Submitted Support Tickets</h3>
                {tickets.map((tk) => (
                  <div key={tk.ticket_id} className="p-3 bg-[#F7F8F5] rounded border border-[#DCE2D8] text-xs">
                    <div className="font-semibold">
                      #{tk.ticket_id} · {tk.category} — {tk.subject} ({tk.status})
                    </div>
                    <div className="text-[#4E5D50] mt-0.5">{tk.description}</div>
                    {tk.admin_response && (
                      <div className="mt-1 text-[#2E6F40] font-medium">
                        Admin Response: {tk.admin_response}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ====================================================================
          MODAL 1: AI TALK (RULE-BASED VOICE / TEXT REQUIREMENT PARSER)
         ==================================================================== */}
      {aiTalkOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#1A241B]">
                  AI Talk — Smart Requirement Finder
                </h2>
                <p className="text-xs text-[#4E5D50]">
                  Type or speak your requirement. Powered by Khet Mitra&apos;s deterministic Python/JS Rule-Based Parser.
                </p>
              </div>
              <button type="button" onClick={() => setAiTalkOpen(false)}>
                <X className="w-5 h-5 text-[#4E5D50]" />
              </button>
            </div>

            <form onSubmit={handleRunAiTalk} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder='Example: "I need a harvester near Karnal for 3 days with operator"'
                  className="flex-1 px-3.5 py-2.5 border border-[#DCE2D8] rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  className={`px-3.5 py-2.5 border rounded-md inline-flex items-center gap-1.5 text-xs font-semibold ${
                    aiListening
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-[#DCE2D8] hover:bg-[#F7F8F5]'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  {aiListening ? 'Listening...' : 'Speak'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2E6F40] text-white text-xs font-semibold rounded-md"
                >
                  Find Matches
                </button>
              </div>
            </form>

            {aiResult && (
              <div className="space-y-4 pt-2">
                <div className="p-3.5 bg-[#F7F8F5] border border-[#DCE2D8] rounded-md text-xs space-y-1">
                  <div className="font-bold text-[#1A241B]">
                    Extracted Requirement Parameters ({aiResult.parsed.parser_mode}):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    <div>
                      <span className="text-[#4E5D50] block">Equipment Type:</span>
                      <span className="font-semibold text-[#2E6F40]">
                        {aiResult.parsed.equipment_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#4E5D50] block">Location:</span>
                      <span className="font-semibold">{aiResult.parsed.location}</span>
                    </div>
                    <div>
                      <span className="text-[#4E5D50] block">Duration:</span>
                      <span className="font-semibold font-mono-tabular">
                        {aiResult.parsed.duration}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#4E5D50] block">Target Date:</span>
                      <span className="font-semibold font-mono-tabular">
                        {aiResult.parsed.suggested_date}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#4E5D50] block">Operator Needed:</span>
                      <span className="font-semibold">
                        {aiResult.parsed.operator_required ? 'Yes (With Operator)' : 'Optional / Self'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <div className="text-xs font-bold text-[#1A241B]">
                    Matching Equipment ({aiResult.matches.length} found):
                  </div>
                  {aiResult.matches.map((m) => (
                    <div
                      key={m.equipment_id}
                      className="p-3 border border-[#DCE2D8] rounded-md flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-[#1A241B]">{m.equipment_name}</div>
                        <div className="text-xs text-[#4E5D50] font-mono-tabular">
                          {m.location} · ₹{m.price_per_day}/day · {m.average_rating}★
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAiTalkOpen(false);
                          setBookDurationValue(aiResult.parsed.duration_value || 2);
                          setBookOperatorRequired(Boolean(aiResult.parsed.operator_required));
                          openBookingModal(m);
                        }}
                        className="px-3.5 py-1.5 bg-[#2E6F40] text-white text-xs font-semibold rounded whitespace-nowrap"
                      >
                        Book Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: POST REQUIREMENT
         ==================================================================== */}
      {postReqOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-3">
              <h2 className="text-lg font-bold text-[#1A241B]">Post Agricultural Requirement</h2>
              <button type="button" onClick={() => setPostReqOpen(false)}>
                <X className="w-5 h-5 text-[#4E5D50]" />
              </button>
            </div>

            <form onSubmit={handlePostRequirementSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Farmer Name</label>
                  <input
                    type="text"
                    disabled
                    value={user.full_name}
                    className="w-full px-3 py-2 border border-[#DCE2D8] bg-[#F7F8F5] rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Equipment Required *
                  </label>
                  <select
                    value={reqEquipment}
                    onChange={(e) => setReqEquipment(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded bg-white"
                  >
                    {EQUIPMENT_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">Work Requirement *</label>
                <input
                  type="text"
                  required
                  value={reqWork}
                  onChange={(e) => setReqWork(e.target.value)}
                  placeholder="e.g. Deep ploughing and rotavator seedbed preparation for 8 acres"
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={reqStartDate}
                    onChange={(e) => setReqStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={reqEndDate}
                    onChange={(e) => setReqEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Number of Days</label>
                  <input
                    type="number"
                    min={1}
                    value={reqDays}
                    onChange={(e) => setReqDays(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={reqLocation}
                    onChange={(e) => setReqLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Max Daily Budget (₹)
                  </label>
                  <input
                    type="number"
                    value={reqBudget}
                    onChange={(e) => setReqBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Operator Required
                  </label>
                  <select
                    value={reqOperator ? 'yes' : 'no'}
                    onChange={(e) => setReqOperator(e.target.value === 'yes')}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded bg-white"
                  >
                    <option value="yes">Yes — With Operator</option>
                    <option value="no">No — Equipment Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">
                  Additional Instructions
                </label>
                <input
                  type="text"
                  value={reqInstructions}
                  onChange={(e) => setReqInstructions(e.target.value)}
                  placeholder="Any specific implement attachment or timing instructions"
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2E6F40] hover:bg-[#245832] text-white font-semibold rounded-md text-sm"
              >
                Find Suitable Equipment
              </button>
            </form>

            {reqMatches && (
              <div className="pt-3 border-t border-[#E6EBE2] space-y-2 max-h-56 overflow-y-auto">
                <div className="text-xs font-bold text-[#1A241B]">
                  Suitable Equipment Matches ({reqMatches.length}):
                </div>
                {reqMatches.map((m) => (
                  <div
                    key={m.equipment_id}
                    className="p-3 border border-[#DCE2D8] rounded flex items-center justify-between"
                  >
                    <div className="text-xs">
                      <div className="font-bold text-[#1A241B]">{m.equipment_name}</div>
                      <div className="text-[#4E5D50] font-mono-tabular">
                        {m.location} · ₹{m.price_per_day}/day · Owner: {m.owner_name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPostReqOpen(false);
                        openBookingModal(m);
                      }}
                      className="px-3 py-1.5 bg-[#2E6F40] text-white text-xs font-semibold rounded"
                    >
                      Select &amp; Book
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: EQUIPMENT DETAILS VIEW
         ==================================================================== */}
      {selectedEquipment && activeTab !== 'equipment_detail' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-2xl w-full p-6 space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-[#E6EBE2] pb-3 gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#1A241B]">
                  {selectedEquipment.equipment_name}
                </h2>
              </div>
              <button type="button" onClick={() => setSelectedEquipment(null)}>
                <X className="w-5 h-5 text-[#4E5D50]" />
              </button>
            </div>

            <img
              src={selectedEquipment.image_url}
              alt={selectedEquipment.equipment_name}
              referrerPolicy="no-referrer"
              className="w-full h-60 object-cover rounded-md bg-[#E9EFE6]"
            />

            {/* Owner Card inside Modal */}
            <div className="p-3.5 bg-[#F4F7F2] border border-[#DCE2D8] rounded-md flex items-center gap-3">
              <img
                src={
                  selectedEquipment.owner_profile_photo ||
                  '/src/assets/images/demo_owner_agri_avatar_1790613107070.jpg'
                }
                alt={selectedEquipment.owner_name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border border-[#DCE2D8] shrink-0"
              />
              <div className="text-xs space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-[#1A241B]">
                    {selectedEquipment.owner_name}
                  </span>
                </div>
                <div className="text-[#4E5D50]">
                   Rajasthan Location: <strong className="text-[#1A241B]">{selectedEquipment.location}</strong> · Experience:{' '}
                  <strong className="text-[#1A241B]">
                    {selectedEquipment.experience_years || selectedEquipment.owner_experience_years || 10} Years
                  </strong>
                </div>
                <div className="text-[11px] text-[#4E5D50]">
                  Contact: {selectedEquipment.owner_mobile}
                </div>
              </div>
            </div>

            <div className="text-xs text-[#4E5D50] space-y-2">
              <div className="font-mono-tabular text-[#1A241B] font-semibold">
                Brand: {selectedEquipment.brand} · Model: {selectedEquipment.model} (
                {selectedEquipment.manufacturing_year}) · Category: {selectedEquipment.category}
              </div>
              <div className="p-2.5 bg-[#F7F8F5] border border-[#DCE2D8] rounded text-[#1A241B]">
                <span className="font-semibold">Older / Used Model Information: </span>
                {selectedEquipment.used_condition_note ||
                  `Used ${selectedEquipment.manufacturing_year} Model in field working condition`}
              </div>
              <p className="text-sm text-[#1A241B]">{selectedEquipment.description}</p>
              <div className="p-3 bg-[#F7F8F5] rounded border border-[#DCE2D8] grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono-tabular">
                <div>Rental Price (Hourly): ₹{selectedEquipment.price_per_hour}/hour</div>
                <div>Daily Price: ₹{selectedEquipment.price_per_day}/day</div>
                <div>
                  Availability:{' '}
                  <span className="font-bold text-[#2E6F40]">
                    {selectedEquipment.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div>
                  Operator Availability:{' '}
                  {selectedEquipment.operator_available
                    ? `Available (+₹${selectedEquipment.operator_charge_per_day}/day)`
                    : 'Not Included'}
                </div>
                <div>
                  Experience: {selectedEquipment.experience_years || 10} Years
                </div>
                <div>
                  Rating:{' '}
                  <span className="font-bold text-[#B45309]">
                    {selectedEquipment.rating_label ||
                      `${selectedEquipment.average_rating}★ (${selectedEquipment.review_count || 0} reviews)`}
                  </span>
                </div>
              </div>
              <div>
                <span className="font-semibold text-[#1A241B]">Terms &amp; Conditions: </span>
                {selectedEquipment.terms_and_conditions}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6EBE2]">
              <button
                type="button"
                onClick={() => setSelectedEquipment(null)}
                className="px-4 py-2 border border-[#DCE2D8] text-xs font-semibold rounded-md"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const eq = selectedEquipment;
                  setSelectedEquipment(null);
                  openBookingModal(eq);
                }}
                className="px-5 py-2 bg-[#2E6F40] text-white text-xs font-semibold rounded-md"
              >
                Proceed to Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 4: BOOK EQUIPMENT & OPERATOR SELECTION
         ==================================================================== */}
      {bookingModalEquip && activeTab !== 'equipment_detail' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-3">
              <div>
                <h2 className="text-lg font-bold text-[#1A241B]">Confirm Equipment Booking</h2>
                <p className="text-xs text-[#4E5D50]">{bookingModalEquip.equipment_name}</p>
              </div>
              <button type="button" onClick={() => setBookingModalEquip(null)}>
                <X className="w-5 h-5 text-[#4E5D50]" />
              </button>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={bookStartDate}
                    onChange={(e) => setBookStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={bookEndDate}
                    onChange={(e) => setBookEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Duration Type</label>
                  <select
                    value={bookDurationType}
                    onChange={(e) => setBookDurationType(e.target.value as 'days' | 'hours')}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded bg-white"
                  >
                    <option value="days">Days (₹{bookingModalEquip.price_per_day}/day)</option>
                    <option value="hours">Hours (₹{bookingModalEquip.price_per_hour}/hour)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Number of {bookDurationType === 'days' ? 'Days' : 'Hours'} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    required
                    value={bookDurationValue}
                    onChange={(e) => setBookDurationValue(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-[#4E5D50]">
                    Farm Work Location / Village *
                  </label>
                  <button
                    type="button"
                    onClick={() => setBookLocation(`${user.address}, ${user.area_city}`)}
                    className="text-[11px] text-[#2E6F40] hover:underline inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" /> Use Saved Farm Address
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={bookLocation}
                  onChange={(e) => setBookLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                />
              </div>

              <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded space-y-2">
                <label className="inline-flex items-center gap-2 font-semibold text-[#1A241B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bookOperatorRequired}
                    onChange={(e) => setBookOperatorRequired(e.target.checked)}
                    className="accent-[#2E6F40]"
                  />
                  <span>
                    Request Skilled Driver / Operator (+₹
                    {bookingModalEquip.operator_charge_per_day}/day)
                  </span>
                </label>

                {bookOperatorRequired && (
                  <div>
                    <label className="block text-[11px] text-[#4E5D50] mb-1">
                      Compatible Online Drivers (Matched via DSA Skill &amp; Experience Ranking):
                    </label>
                    <select
                      value={bookSelectedDriverId}
                      onChange={(e) =>
                        setBookSelectedDriverId(e.target.value ? Number(e.target.value) : '')
                      }
                      className="w-full px-2.5 py-1.5 border border-[#DCE2D8] rounded bg-white"
                    >
                      <option value="">Let Equipment Owner Assign Compatible Driver</option>
                      {compatibleDrivers.map((d) => (
                        <option key={d.user_id} value={d.user_id}>
                          {d.full_name} · {bookingModalEquip.category} Exp: {d.category_experience_years}{' '}
                          yrs · {d.average_rating}★ · Match Score: {d.compatibility_score}%
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">
                  Special Field Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={bookInstructions}
                  onChange={(e) => setBookInstructions(e.target.value)}
                  placeholder="Crop type, acreage, or gate landmark"
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                />
              </div>

              {/* Transparent Two-Stage Payment Breakdown */}
              <div className="p-3.5 bg-[#F4F7F2] border border-[#DCE2D8] rounded-md font-mono-tabular space-y-1">
                <div className="flex justify-between">
                  <span>Equipment Rental Cost:</span>
                  <span>₹{previewCosts.eqCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Operator / Driver Charge:</span>
                  <span>₹{previewCosts.opCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#1A241B] border-t border-[#DCE2D8] pt-1">
                  <span>Total Rental Amount:</span>
                  <span>₹{previewCosts.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#2E6F40] font-semibold pt-1">
                  <span>Stage 1 — 10% Advance (after Owner accepts):</span>
                  <span>₹{previewCosts.advance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#4E5D50]">
                  <span>Stage 2 — 90% Remaining (after return inspection):</span>
                  <span>₹{previewCosts.remaining.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2E6F40] hover:bg-[#245832] text-white font-semibold rounded-md text-sm"
              >
                Confirm Booking Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 5: TWO-STAGE DEMO PAYMENT MODAL (SHOWS ONLY OWNER-ENABLED METHODS)
         ==================================================================== */}
      {paymentModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#1A241B]">
                  {paymentModalBooking.stage === 'Advance_10_Percent'
                    ? 'Pay 10% Advance Payment (DEMO PAYMENT)'
                    : 'Pay 90% Remaining Balance (DEMO PAYMENT)'}
                </h2>
                <p className="text-xs text-[#4E5D50]">
                  Booking #{paymentModalBooking.booking.booking_id} · Clearly labeled Demo Payment recorded in database.
                </p>
              </div>
              <button type="button" onClick={() => setPaymentModalBooking(null)}>
                <X className="w-5 h-5 text-[#4E5D50]" />
              </button>
            </div>

            <div className="p-3.5 bg-[#F7F8F5] border border-[#DCE2D8] rounded font-mono-tabular text-sm">
              <div className="text-xs text-[#4E5D50]">Amount Payable Now:</div>
              <div className="text-xl font-bold text-[#2E6F40]">
                ₹
                {paymentModalBooking.stage === 'Advance_10_Percent'
                  ? paymentModalBooking.booking.advance_amount
                  : paymentModalBooking.booking.remaining_amount}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[#1A241B]">
                Select Payment Method (Enabled by Owner {paymentModalBooking.booking.owner_name}):
              </div>
              <div className="space-y-2">
                {paymentModalBooking.booking.owner_payment_methods.upi && (
                  <label className="flex items-center justify-between p-2.5 border border-[#DCE2D8] rounded cursor-pointer">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <input
                        type="radio"
                        name="paymethod"
                        checked={selectedPaymentMethod === 'UPI'}
                        onChange={() => setSelectedPaymentMethod('UPI')}
                        className="accent-[#2E6F40]"
                      />
                      UPI ({paymentModalBooking.booking.owner_payment_methods.upi_id})
                    </span>
                  </label>
                )}
                {paymentModalBooking.booking.owner_payment_methods.bank_transfer && (
                  <label className="flex items-center justify-between p-2.5 border border-[#DCE2D8] rounded cursor-pointer">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <input
                        type="radio"
                        name="paymethod"
                        checked={selectedPaymentMethod === 'Bank Transfer'}
                        onChange={() => setSelectedPaymentMethod('Bank Transfer')}
                        className="accent-[#2E6F40]"
                      />
                      Bank Transfer ({paymentModalBooking.booking.owner_payment_methods.bank_note})
                    </span>
                  </label>
                )}
                {paymentModalBooking.booking.owner_payment_methods.cash && (
                  <label className="flex items-center justify-between p-2.5 border border-[#DCE2D8] rounded cursor-pointer">
                    <span className="inline-flex items-center gap-2 font-medium">
                      <input
                        type="radio"
                        name="paymethod"
                        checked={selectedPaymentMethod === 'Cash'}
                        onChange={() => setSelectedPaymentMethod('Cash')}
                        className="accent-[#2E6F40]"
                      />
                      Cash at Farm / Yard
                    </span>
                  </label>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleProcessDemoPayment}
              className="w-full py-2.5 bg-[#2E6F40] hover:bg-[#245832] text-white text-sm font-semibold rounded-md"
            >
              Confirm Demo Payment
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 6: RATE EQUIPMENT & DRIVER (1 TO 5 STARS)
         ==================================================================== */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-3">
              <h2 className="text-base font-bold text-[#1A241B]">
                Rate Equipment &amp; Driver (Booking #{reviewBooking.booking_id})
              </h2>
              <button type="button" onClick={() => setReviewBooking(null)}>
                <X className="w-5 h-5 text-[#4E5D50]" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1A241B] mb-1">
                  1. Equipment Rating ({reviewBooking.equipment_name})
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRevEquipStars(star)}
                      className={`px-3 py-1.5 rounded border font-mono-tabular font-bold ${
                        revEquipStars >= star
                          ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                          : 'border-[#DCE2D8]'
                      }`}
                    >
                      {star}★
                    </button>
                  ))}
                </div>
              </div>

              {reviewBooking.driver_id && (
                <div>
                  <label className="block font-semibold text-[#1A241B] mb-1">
                    2. Driver / Operator Rating ({reviewBooking.driver_name})
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRevDriverStars(star)}
                        className={`px-3 py-1.5 rounded border font-mono-tabular font-bold ${
                          revDriverStars >= star
                            ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                            : 'border-[#DCE2D8]'
                        }`}
                      >
                        {star}★
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#1A241B] mb-1">Primary Reason</label>
                <select
                  value={revReason}
                  onChange={(e) => setRevReason(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded bg-white"
                >
                  <option value="Equipment Condition">Equipment Condition</option>
                  <option value="Equipment Performance">Equipment Performance</option>
                  <option value="Driver Behavior">Driver Behavior</option>
                  <option value="Driver Punctuality">Driver Punctuality</option>
                  <option value="Communication">Communication</option>
                  <option value="Service Quality">Service Quality</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1A241B] mb-1">
                  Review Comment (Optional)
                </label>
                <textarea
                  rows={3}
                  value={revComment}
                  onChange={(e) => setRevComment(e.target.value)}
                  placeholder="Share your experience with the machine and operator..."
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#2E6F40] text-white font-semibold rounded-md text-sm"
              >
                Submit Rating &amp; Review
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 7: BOOKING CHAT SYSTEM (FARMER ↔ OWNER / DRIVER)
         ==================================================================== */}
      {chatBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-[#1A241B]">
                  Booking #{chatBooking.booking_id} Chat — {chatBooking.equipment_name}
                </h3>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setChatTargetRole('owner')}
                    className={`px-2 py-0.5 text-[11px] rounded border ${
                      chatTargetRole === 'owner'
                        ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                        : 'border-[#DCE2D8]'
                    }`}
                  >
                    Owner: {chatBooking.owner_name}
                  </button>
                  {chatBooking.driver_id && (
                    <button
                      type="button"
                      onClick={() => setChatTargetRole('driver')}
                      className={`px-2 py-0.5 text-[11px] rounded border ${
                        chatTargetRole === 'driver'
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
                <X className="w-4 h-4 text-[#4E5D50]" />
              </button>
            </div>

            <div className="h-64 overflow-y-auto bg-[#F7F8F5] border border-[#DCE2D8] rounded p-3 space-y-2 text-xs">
              {chatMessages.length === 0 ? (
                <p className="text-center text-[#4E5D50] py-10">
                  No messages yet. Start a conversation about this booking.
                </p>
              ) : (
                chatMessages.map((m) => (
                  <div
                    key={m.message_id}
                    className={`p-2.5 rounded border ${
                      m.sender_id === user.user_id
                        ? 'bg-[#E9EFE6] border-[#2E6F40]/30 ml-8'
                        : 'bg-white border-[#DCE2D8] mr-8'
                    }`}
                  >
                    <div className="font-semibold text-[#1A241B]">{m.sender_name}</div>
                    <div className="text-[#1A241B] mt-0.5">{m.message_text}</div>
                    <div className="text-[10px] text-[#4E5D50] mt-1 font-mono-tabular">
                      {new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChatMessage} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Message ${chatTargetRole === 'driver' ? 'Driver' : 'Owner'}...`}
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
