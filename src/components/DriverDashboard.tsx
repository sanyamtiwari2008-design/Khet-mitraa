import React, { useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  DriverSkill,
  EquipmentCategory,
  NotificationItem,
  ChatMessage,
} from '../types';
import {
  Bell,
  MoreVertical,
  MapPin,
  Check,
  AlertCircle,
  MessageSquare,
  Send,
  X,
  Power,
} from 'lucide-react';

interface DriverDashboardProps {
  user: UserProfile;
  onUpdateUser: (u: UserProfile) => void;
  onLogout: () => void;
}

const ALL_CATEGORIES: (EquipmentCategory | 'Other')[] = [
  'Tractor',
  'Harvester',
  'JCB',
  'Rotavator',
  'Seeder',
  'Thresher',
  'Cultivator',
  'Sprayer',
  'Other',
];

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  user,
  onUpdateUser,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<
    'jobs' | 'location' | 'earnings' | 'availability' | 'profile' | 'report'
  >('jobs');

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isOnline, setIsOnline] = useState(user.driver_profile?.is_online ?? true);
  const [currentLocation, setCurrentLocation] = useState(
    user.driver_profile?.current_location || user.area_city || 'Karnal, Haryana',
  );
  const [serviceArea, setServiceArea] = useState(
    user.driver_profile?.service_area || 'Karnal & Panipat (30 km radius)',
  );

  // Profile & Skills editor state
  const [profName, setProfName] = useState(user.full_name);
  const [profMobile, setProfMobile] = useState(user.mobile);
  const [profAddress, setProfAddress] = useState(user.address);
  const [profAreaCity, setProfAreaCity] = useState(user.area_city);
  const [licenseNumber, setLicenseNumber] = useState(
    user.driver_profile?.license_number || 'HR-05-20190048291',
  );
  const [licensePhoto, setLicensePhoto] = useState(
    user.driver_profile?.license_photo ||
      'https://placehold.co/600x380/e9efe6/1a241b?text=Driving+License+Document',
  );
  const [totalExpYears, setTotalExpYears] = useState(
    user.driver_profile?.total_experience_years || 5,
  );
  const [dailyWage, setDailyWage] = useState(user.driver_profile?.daily_wage_rate || 800);

  // Build skills map from user.skills
  const buildSkillsState = () => {
    const map: Record<string, { selected: boolean; years: number }> = {};
    ALL_CATEGORIES.forEach((cat) => {
      const found = user.skills?.find((s) => s.category === cat);
      map[cat] = {
        selected: Boolean(found),
        years: found ? Number(found.experience_years) : 2,
      };
    });
    return map;
  };
  const [skillsMap, setSkillsMap] = useState<Record<string, { selected: boolean; years: number }>>(
    buildSkillsState,
  );

  // Chat modal state
  const [chatJob, setChatJob] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatTarget, setChatTarget] = useState<'farmer' | 'owner'>('farmer');

  // Support ticket
  const [ticketCategory, setTicketCategory] = useState('Driver Problem');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDriverData = useCallback(async () => {
    try {
      const [jRes, nRes, uRes] = await Promise.all([
        fetch(`/api/drivers/${user.user_id}/jobs`),
        fetch(`/api/notifications/${user.user_id}`),
        fetch(`/api/users/${user.user_id}`),
      ]);
      if (jRes.ok) setJobs(await jRes.json());
      if (nRes.ok) setNotifications(await nRes.json());
      if (uRes.ok) {
        const updated = await uRes.json();
        setIsOnline(updated.driver_profile?.is_online ?? true);
      }
    } catch {
      // silent
    }
  }, [user.user_id]);

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  const handleToggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    try {
      const res = await fetch(`/api/drivers/${user.user_id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_online: nextState, current_location: currentLocation }),
      });
      if (res.ok) {
        showToast(
          'success',
          `You are now ${
            nextState
              ? 'ONLINE — Available for compatible equipment operator jobs!'
              : 'OFFLINE — Hidden from new job matching.'
          }`,
        );
      }
    } catch {
      showToast('error', 'Failed to update availability status.');
    }
  };

  const handleJobStatusChange = async (assignmentId: number, nextStatus: string) => {
    try {
      const res = await fetch(`/api/driver-jobs/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_status: nextStatus }),
      });
      if (res.ok) {
        showToast('success', `Job status updated to '${nextStatus}'.`);
        fetchDriverData();
      }
    } catch {
      showToast('error', 'Failed to update job status.');
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setCurrentLocation('Karnal Grain Market Sector 12');
      showToast('success', 'Location updated.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const locStr = `Karnal (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`;
        setCurrentLocation(locStr);
        await fetch(`/api/drivers/${user.user_id}/availability`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_location: locStr }),
        });
        showToast('success', `Current GPS location updated to ${locStr}`);
      },
      () => {
        showToast('error', 'Unable to read browser GPS. Using manual location.');
      },
    );
  };

  const handleSaveDriverProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSkills: DriverSkill[] = Object.entries(skillsMap)
      .filter(([, val]) => val.selected)
      .map(([cat, val]) => ({
        category: cat as EquipmentCategory | 'Other',
        experience_years: Number(val.years) || 1,
      }));

    if (updatedSkills.length === 0) {
      showToast('error', 'Please select at least one equipment category you can operate.');
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
          service_area: serviceArea,
          license_number: licenseNumber,
          license_photo: licensePhoto,
          total_experience_years: totalExpYears,
          daily_wage_rate: dailyWage,
          current_location: currentLocation,
          skills: updatedSkills,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdateUser(data.user);
        showToast('success', 'Driver profile, license & equipment skills updated!');
      }
    } catch {
      showToast('error', 'Failed to update driver profile.');
    }
  };

  const openChat = async (job: any) => {
    if (!job.booking) return;
    setChatJob(job);
    setChatTarget('farmer');
    try {
      const res = await fetch(`/api/messages/${job.booking.booking_id}`);
      if (res.ok) setChatMessages(await res.json());
    } catch {
      setChatMessages([]);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatJob?.booking || !chatInput.trim()) return;
    const receiverId =
      chatTarget === 'owner' ? chatJob.booking.owner_id : chatJob.booking.farmer_id;
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: chatJob.booking.booking_id,
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
        setActiveTab('jobs');
      }
    } catch {
      showToast('error', 'Failed to submit support ticket.');
    }
  };

  const newJobRequests = jobs.filter((j) => j.job_status === 'Requested');
  const activeOrUpcomingJobs = jobs.filter((j) =>
    ['Accepted', 'On the Way', 'Started'].includes(j.job_status),
  );
  const completedJobs = jobs.filter((j) => j.job_status === 'Completed');
  const totalEarnings = completedJobs.reduce((sum, j) => sum + Number(j.job_amount || 800), 0);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const currentVerificationStatus =
    user.driver_profile?.verification_status || user.driver_profile?.license_status || 'Incomplete';
  const isVerifiedDriver = currentVerificationStatus === 'Verified';

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSkills: DriverSkill[] = Object.entries(skillsMap)
      .filter(([, val]) => val.selected)
      .map(([cat, val]) => ({
        category: cat as EquipmentCategory | 'Other',
        experience_years: Number(val.years) || 1,
      }));
    try {
      const res = await fetch(`/api/drivers/${user.user_id}/submit-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_number: licenseNumber,
          license_photo: licensePhoto,
          years_of_experience: totalExpYears,
          service_area: serviceArea,
          city: profAreaCity,
          skills: updatedSkills,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onUpdateUser(data.user);
        showToast('success', data.message || 'Verification documents submitted for Admin review.');
      } else {
        showToast('error', data.error || 'Failed to submit verification.');
      }
    } catch {
      showToast('error', 'Network error submitting driver verification.');
    }
  };

  if (!isVerifiedDriver) {
    return (
      <div className="min-h-screen bg-[#F7F8F5] text-[#1A241B]">
        <header className="sticky top-0 z-30 bg-white border-b border-[#DCE2D8] px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight text-[#1A241B]">
            Khet Mitra — Driver Verification Gate
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md text-xs font-semibold"
          >
            Logout
          </button>
        </header>

        {toast && (
          <div className="max-w-3xl mx-auto px-4 pt-4">
            <div
              className={`p-3.5 rounded-md border flex items-center justify-between text-sm ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <span>{toast.text}</span>
              <button type="button" onClick={() => setToast(null)} className="text-xs underline">
                Dismiss
              </button>
            </div>
          </div>
        )}

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <div className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-[#B45309]">
                Backend Enforced Access Restriction — Verification Status: {currentVerificationStatus}
              </div>
              <h1 className="text-lg font-bold text-[#1A241B]">
                Driver Dashboard &amp; Job Access Locked Until Verified
              </h1>
              <p className="text-xs text-[#4E5D50]">
                As enforced by the Khet Mitra backend and MySQL <code className="font-mono">driver_profiles</code> table, a driver cannot access the Driver Dashboard or accept equipment operation jobs until{' '}
                <code className="font-mono font-bold">verification_status = &apos;Verified&apos;</code>.
              </p>
              {user.driver_profile?.verification_notes && (
                <div className="text-xs font-semibold text-[#1A241B] pt-1">
                  Admin Verification Notes: &ldquo;{user.driver_profile.verification_notes}&rdquo;
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitVerification} className="space-y-4 text-xs">
              <h2 className="text-sm font-bold text-[#1A241B] border-b border-[#E6EBE2] pb-2">
                Submit / Update Driving License &amp; Equipment Expertise for Admin Verification
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Driving License Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. RJ-20-DL-20210045"
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Driving License Photo URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={licensePhoto}
                    onChange={(e) => setLicensePhoto(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={totalExpYears}
                    onChange={(e) => setTotalExpYears(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Service Area (Districts / Tehsils) *
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    placeholder="e.g. Kota, Baran, Bundi, Jhalawar"
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1A241B] mb-2">
                  Select Agricultural Equipment Categories You Can Operate:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ALL_CATEGORIES.map((cat) => {
                    const item = skillsMap[cat] || { selected: false, years: 2 };
                    return (
                      <div
                        key={cat}
                        className="p-2.5 border border-[#DCE2D8] rounded bg-[#F7F8F5] space-y-1.5"
                      >
                        <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(item.selected)}
                            onChange={(e) =>
                              setSkillsMap((prev) => ({
                                ...prev,
                                [cat]: { ...item, selected: e.target.checked },
                              }))
                            }
                            className="accent-[#2E6F40]"
                          />
                          <span>{cat}</span>
                        </label>
                        {item.selected && (
                          <div>
                            <label className="block text-[10px] text-[#4E5D50]">Exp (Years)</label>
                            <input
                              type="number"
                              min={1}
                              max={40}
                              value={item.years || 2}
                              onChange={(e) =>
                                setSkillsMap((prev) => ({
                                  ...prev,
                                  [cat]: { selected: true, years: Number(e.target.value) },
                                }))
                              }
                              className="w-full px-2 py-1 border border-[#DCE2D8] rounded bg-white font-mono-tabular"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2E6F40] hover:bg-[#245832] text-white font-semibold rounded-md text-xs"
              >
                Submit Documents for Admin Verification
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1A241B]">
      {/* TOP NAVIGATION BAR (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE2D8] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveTab('jobs')}
          className="text-xl font-bold tracking-tight text-[#1A241B] whitespace-nowrap"
        >
          Khet Mitra
        </button>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4E5D50]">
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'jobs' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            My Jobs ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'location' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            My Location
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('earnings')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'earnings' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Earnings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('availability')}
            className={`hover:text-[#1A241B] whitespace-nowrap ${
              activeTab === 'availability' ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
            }`}
          >
            Availability &amp; Skills
          </button>
        </nav>

        <div className="flex items-center gap-2.5 relative">
          {/* ONLINE / OFFLINE Toggle Button */}
          <button
            type="button"
            onClick={handleToggleOnline}
            className={`px-3 py-1.5 text-xs font-bold rounded-md border inline-flex items-center gap-1.5 whitespace-nowrap ${
              isOnline
                ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                : 'bg-[#F0F3EE] text-[#4E5D50] border-[#DCE2D8]'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={async () => {
                setNotifOpen(!notifOpen);
                setMenuOpen(false);
                if (!notifOpen && unreadCount > 0) {
                  await fetch(`/api/notifications/${user.user_id}/read`, { method: 'PATCH' });
                  fetchDriverData();
                }
              }}
              className="p-2 rounded-md border border-[#DCE2D8] hover:bg-[#F7F8F5] relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#B45309] text-white text-[10px] font-bold rounded-full flex items-center justify-center font-mono-tabular">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#DCE2D8] rounded-lg shadow-lg p-3 z-50">
                <div className="flex justify-between pb-2 mb-2 border-b border-[#E6EBE2] text-xs font-bold">
                  <span>Driver Notifications</span>
                  <button type="button" onClick={() => setNotifOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-[#E6EBE2]">
                  {notifications.map((n) => (
                    <div key={n.notification_id} className="py-2 text-xs">
                      <div className="font-semibold">{n.title}</div>
                      <div className="text-[#4E5D50]">{n.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                  Driver Profile &amp; License
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('report');
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#F7F8F5]"
                >
                  Report a Problem
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
        {/* DRIVER DASHBOARD SUMMARY HEADER */}
        <section className="bg-white border border-[#DCE2D8] rounded-lg p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E6EBE2]">
            <div>
              <h1 className="text-xl font-bold text-[#1A241B]">
                Driver / Operator Dashboard — {user.full_name}
              </h1>
              <p className="text-xs text-[#4E5D50] font-mono-tabular mt-0.5">
                License: {licenseNumber} ({user.driver_profile?.license_status || 'Verified'}) · Current Location:{' '}
                {currentLocation} · Status:{' '}
                <span className="font-bold text-[#2E6F40]">
                  {isOnline ? 'ONLINE (Available for Matching)' : 'OFFLINE'}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Online Status</div>
              <div className="text-base font-bold text-[#2E6F40] mt-0.5">
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">New Job Requests</div>
              <div className="text-lg font-bold text-[#B45309] font-mono-tabular mt-0.5">
                {newJobRequests.length}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Active / Upcoming</div>
              <div className="text-lg font-bold text-[#1A241B] font-mono-tabular mt-0.5">
                {activeOrUpcomingJobs.length}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Completed Jobs</div>
              <div className="text-lg font-bold text-[#1A241B] font-mono-tabular mt-0.5">
                {completedJobs.length}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Total Earnings</div>
              <div className="text-lg font-bold text-[#2E6F40] font-mono-tabular mt-0.5">
                ₹{totalEarnings.toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] text-[#4E5D50]">Operator Rating</div>
              <div className="text-lg font-bold text-[#1A241B] font-mono-tabular mt-0.5">
                {user.driver_profile?.average_rating || 4.9}★
              </div>
            </div>
          </div>

          {/* 4 MAIN BUTTONS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('jobs')}
              className={`py-2.5 px-4 rounded-md text-xs sm:text-sm font-semibold border transition-colors ${
                activeTab === 'jobs'
                  ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                  : 'bg-[#F7F8F5] hover:bg-[#E9EFE6] border-[#DCE2D8]'
              }`}
            >
              1. My Jobs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('location')}
              className={`py-2.5 px-4 rounded-md text-xs sm:text-sm font-semibold border transition-colors ${
                activeTab === 'location'
                  ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                  : 'bg-[#F7F8F5] hover:bg-[#E9EFE6] border-[#DCE2D8]'
              }`}
            >
              2. My Location
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('earnings')}
              className={`py-2.5 px-4 rounded-md text-xs sm:text-sm font-semibold border transition-colors ${
                activeTab === 'earnings'
                  ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                  : 'bg-[#F7F8F5] hover:bg-[#E9EFE6] border-[#DCE2D8]'
              }`}
            >
              3. Earnings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('availability')}
              className={`py-2.5 px-4 rounded-md text-xs sm:text-sm font-semibold border transition-colors ${
                activeTab === 'availability'
                  ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                  : 'bg-[#F7F8F5] hover:bg-[#E9EFE6] border-[#DCE2D8]'
              }`}
            >
              4. Availability &amp; Skills
            </button>
          </div>
        </section>

        {/* ================================================================
            TAB 1: MY JOBS (REQUESTED, ACCEPTED, ON THE WAY, STARTED, COMPLETED)
           ================================================================ */}
        {activeTab === 'jobs' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">
              Operator Job Requests &amp; Active Assignments
            </h2>
            {jobs.length === 0 ? (
              <div className="bg-white border border-[#DCE2D8] rounded-lg p-8 text-center text-sm text-[#4E5D50]">
                No job assignments yet. Stay ONLINE to receive matching equipment operation jobs.
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => {
                  const b = job.booking;
                  return (
                    <div
                      key={job.assignment_id}
                      className="bg-white border border-[#DCE2D8] rounded-lg p-5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E6EBE2]">
                        <div>
                          <div className="text-xs text-[#4E5D50] font-mono-tabular">
                            Job Assignment #{job.assignment_id} · Booking #{job.booking_id} · Status:{' '}
                            <span className="font-bold text-[#1A241B]">{job.job_status}</span>
                          </div>
                          <h3 className="text-base font-bold text-[#1A241B] mt-0.5">
                            {b?.equipment_name || 'Agricultural Equipment Operation'}
                          </h3>
                        </div>
                        <div className="font-mono-tabular text-sm font-bold text-[#2E6F40]">
                          Operator Pay: ₹{Number(job.job_amount).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {b && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#4E5D50]">
                          <div>
                            <span className="font-semibold text-[#1A241B] block">Farmer Details:</span>
                            {b.farmer_name} ({b.farmer_mobile})
                            <br />
                            Work Location: {b.work_location}
                          </div>
                          <div>
                            <span className="font-semibold text-[#1A241B] block">Equipment &amp; Owner:</span>
                            Owner: {b.owner_name} ({b.owner_mobile})
                            <br />
                            Dates: {b.start_date} to {b.end_date} ({b.duration_value} {b.duration_type})
                          </div>
                          <div>
                            <span className="font-semibold text-[#1A241B] block">Instructions:</span>
                            {job.instructions || b.special_instructions || 'Standard field operation'}
                          </div>
                        </div>
                      )}

                      {/* Job Status Workflow Controls */}
                      <div className="pt-3 border-t border-[#E6EBE2] flex flex-wrap items-center gap-2.5">
                        {job.job_status === 'Requested' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleJobStatusChange(job.assignment_id, 'Accepted')}
                              className="px-4 py-1.5 bg-[#2E6F40] text-white text-xs font-semibold rounded"
                            >
                              Accept Job
                            </button>
                            <button
                              type="button"
                              onClick={() => handleJobStatusChange(job.assignment_id, 'Rejected')}
                              className="px-4 py-1.5 border border-red-200 text-red-700 text-xs font-semibold rounded hover:bg-red-50"
                            >
                              Reject Job
                            </button>
                          </>
                        )}

                        {job.job_status === 'Accepted' && (
                          <button
                            type="button"
                            onClick={() => handleJobStatusChange(job.assignment_id, 'On the Way')}
                            className="px-4 py-1.5 bg-[#2E6F40] text-white text-xs font-semibold rounded"
                          >
                            Mark &ldquo;On the Way&rdquo; to Farm
                          </button>
                        )}

                        {(job.job_status === 'Accepted' || job.job_status === 'On the Way') && (
                          <button
                            type="button"
                            onClick={() => handleJobStatusChange(job.assignment_id, 'Started')}
                            className="px-4 py-1.5 bg-[#2E6F40] text-white text-xs font-semibold rounded"
                          >
                            Start Job
                          </button>
                        )}

                        {job.job_status === 'Started' && (
                          <button
                            type="button"
                            onClick={() => handleJobStatusChange(job.assignment_id, 'Completed')}
                            className="px-4 py-1.5 bg-[#B45309] text-white text-xs font-semibold rounded"
                          >
                            Complete Job &amp; Return Equipment
                          </button>
                        )}

                        {b && (
                          <button
                            type="button"
                            onClick={() => openChat(job)}
                            className="px-3.5 py-1.5 border border-[#DCE2D8] hover:bg-[#F7F8F5] text-xs font-semibold rounded inline-flex items-center gap-1"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Chat with Farmer / Owner
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ================================================================
            TAB 2: MY LOCATION & SERVICE AREA
           ================================================================ */}
        {activeTab === 'location' && (
          <section className="max-w-xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">
              Driver Current Location &amp; Service Area
            </h2>
            <p className="text-xs text-[#4E5D50]">
              Your location is used by Khet Mitra&apos;s driver matching algorithm to connect you with nearby farmers and equipment owners.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#4E5D50]">Current Location</label>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    className="text-[#2E6F40] font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Use Browser Geolocation
                  </button>
                </div>
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">
                  Preferred Service Area / Districts
                </label>
                <input
                  type="text"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveDriverProfile}
                className="px-5 py-2.5 bg-[#2E6F40] text-white font-semibold rounded-md text-sm"
              >
                Save Location Settings
              </button>
            </div>
          </section>
        )}

        {/* ================================================================
            TAB 3: EARNINGS & RATINGS
           ================================================================ */}
        {activeTab === 'earnings' && (
          <section className="space-y-4">
            <div className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#1A241B]">Operator Earnings &amp; Job History</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE2D8] text-[#4E5D50]">
                      <th className="py-2 px-3">Job ID</th>
                      <th className="py-2 px-3">Equipment</th>
                      <th className="py-2 px-3">Farmer &amp; Location</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Job Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EBE2] font-mono-tabular">
                    {jobs.map((j) => (
                      <tr key={j.assignment_id}>
                        <td className="py-2.5 px-3">#{j.assignment_id}</td>
                        <td className="py-2.5 px-3 font-sans font-semibold">
                          {j.booking?.equipment_name || 'Equipment'}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {j.booking?.farmer_name} · {j.booking?.work_location}
                        </td>
                        <td className="py-2.5 px-3 font-sans">{j.job_status}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#2E6F40]">
                          ₹{j.job_amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================
            TAB 4 & 5: AVAILABILITY, PROFILE, DRIVING LICENSE & EQUIPMENT SKILLS
           ================================================================ */}
        {(activeTab === 'availability' || activeTab === 'profile') && (
          <section className="max-w-3xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-4">
              <div>
                <h2 className="text-lg font-bold text-[#1A241B]">
                  Driver Profile, Driving License &amp; Equipment Skills
                </h2>
                <p className="text-xs text-[#4E5D50]">
                  Specify which agricultural machines you operate and your years of experience for each.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleOnline}
                className={`px-4 py-2 rounded-md text-xs font-bold ${
                  isOnline ? 'bg-[#2E6F40] text-white' : 'bg-[#F0F3EE] text-[#1A241B]'
                }`}
              >
                Status: {isOnline ? 'ONLINE' : 'OFFLINE'}
              </button>
            </div>

            <form onSubmit={handleSaveDriverProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">Driver Name</label>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Driving License Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Total Experience (Years)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={totalExpYears}
                    onChange={(e) => setTotalExpYears(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#4E5D50] mb-1">
                    Daily Operator Rate (₹/day)
                  </label>
                  <input
                    type="number"
                    min={300}
                    value={dailyWage}
                    onChange={(e) => setDailyWage(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">
                  Driving License Photo URL / Document (Verification Status:{' '}
                  <span className="text-[#2E6F40] font-bold">
                    {user.driver_profile?.license_status || 'Verified'}
                  </span>
                  )
                </label>
                <input
                  type="text"
                  value={licensePhoto}
                  onChange={(e) => setLicensePhoto(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1A241B] mb-2">
                  Agricultural Equipment You Can Operate &amp; Experience Per Machine:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ALL_CATEGORIES.map((cat) => {
                    const item = skillsMap[cat] || { selected: false, years: 1 };
                    return (
                      <div
                        key={cat}
                        className={`p-2.5 rounded border flex items-center justify-between ${
                          item.selected
                            ? 'bg-[#F4F7F2] border-[#2E6F40]'
                            : 'bg-white border-[#DCE2D8]'
                        }`}
                      >
                        <label className="inline-flex items-center gap-2 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() =>
                              setSkillsMap((prev) => ({
                                ...prev,
                                [cat]: { ...item, selected: !item.selected },
                              }))
                            }
                            className="accent-[#2E6F40]"
                          />
                          <span>{cat}</span>
                        </label>
                        {item.selected && (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              max={35}
                              value={item.years}
                              onChange={(e) =>
                                setSkillsMap((prev) => ({
                                  ...prev,
                                  [cat]: { selected: true, years: Number(e.target.value) },
                                }))
                              }
                              className="w-12 px-1.5 py-0.5 border border-[#DCE2D8] rounded bg-white text-right font-mono-tabular"
                            />
                            <span className="text-[11px] text-[#4E5D50]">yrs</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#2E6F40] hover:bg-[#245832] text-white font-semibold rounded-md text-sm"
              >
                Save Driver Profile &amp; Skills
              </button>
            </form>
          </section>
        )}

        {activeTab === 'report' && (
          <section className="max-w-xl mx-auto bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">Report a Problem to Support</h2>
            <form onSubmit={handleSubmitSupportTicket} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#4E5D50] mb-1">Category</label>
                <select
                  value={ticketCategory}
                  onChange={(e) => setTicketCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded bg-white"
                >
                  <option value="Driver Problem">Driver / Job Problem</option>
                  <option value="Payment Problem">Payment Problem</option>
                  <option value="Equipment Problem">Equipment Problem</option>
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

      {/* CHAT MODAL (DRIVER ↔ FARMER / OWNER) */}
      {chatJob && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE2D8] rounded-lg max-w-lg w-full p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E6EBE2] pb-2">
              <div>
                <h3 className="text-sm font-bold">
                  Job #{chatJob.assignment_id} Chat — {chatJob.booking?.equipment_name}
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
                    Farmer: {chatJob.booking?.farmer_name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatTarget('owner')}
                    className={`px-2 py-0.5 text-[11px] rounded border ${
                      chatTarget === 'owner'
                        ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                        : 'border-[#DCE2D8]'
                    }`}
                  >
                    Owner: {chatJob.booking?.owner_name}
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setChatJob(null)}>
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
