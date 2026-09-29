import React, { useState } from 'react';
import { UserProfile, UserRole, EquipmentCategory, DriverSkill } from '../types';
import { MapPin, Check, AlertCircle, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface AuthViewsProps {
  initialMode?: 'login' | 'register';
  selectedRole: UserRole;
  lang?: 'en' | 'hi';
  onSuccess: (user: UserProfile) => void;
  onBackToRoles: () => void;
}

const ALL_SKILL_CATEGORIES: (EquipmentCategory | 'Other')[] = [
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

const ROLE_META: Record<
  UserRole,
  {
    titleEn: string;
    titleHi: string;
    regTitleEn: string;
    regTitleHi: string;
    demoEmail: string;
    demoMobile: string;
  }
> = {
  owner: {
    titleEn: 'Owner Login',
    titleHi: 'ओनर लॉगिन (Owner Login)',
    regTitleEn: 'Owner Registration',
    regTitleHi: 'ओनर पंजीकरण (Owner Registration)',
    demoEmail: 'suresh@khetmitra.in',
    demoMobile: '9812044556',
  },
  farmer: {
    titleEn: 'Customer Login',
    titleHi: 'कस्टमर लॉगिन (Customer Login)',
    regTitleEn: 'Customer Registration',
    regTitleHi: 'कस्टमर पंजीकरण (Customer Registration)',
    demoEmail: 'ramesh@khetmitra.in',
    demoMobile: '9812011223',
  },
  driver: {
    titleEn: 'Driver Login',
    titleHi: 'ड्राइवर लॉगिन (Driver Login)',
    regTitleEn: 'Driver Registration',
    regTitleHi: 'ड्राइवर पंजीकरण (Driver Registration)',
    demoEmail: 'vikram@khetmitra.in',
    demoMobile: '9812099001',
  },
  admin: {
    titleEn: 'Admin Login',
    titleHi: 'एडमिन लॉगिन (Admin Login)',
    regTitleEn: 'Admin Registration',
    regTitleHi: 'एडमिन पंजीकरण',
    demoEmail: 'admin@khetmitra.in',
    demoMobile: '9000011111',
  },
};

export const AuthViews: React.FC<AuthViewsProps> = ({
  initialMode = 'login',
  selectedRole,
  lang = 'en',
  onSuccess,
  onBackToRoles,
}) => {
  const activeRoleMeta = ROLE_META[selectedRole] || ROLE_META.farmer;

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Unified Login States (All visible on the same screen - no tabs)
  const [phoneInput, setPhoneInput] = useState(activeRoleMeta.demoMobile);
  const [emailInput, setEmailInput] = useState(activeRoleMeta.demoEmail);
  const [loginPassword, setLoginPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Login States (preserved functionality)
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Google Login States
  const [googleEmail] = useState('');
  const [googleName] = useState('');

  // Forgot Password States
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');

  // Registration States (No Aadhaar anywhere)
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [areaCity, setAreaCity] = useState('');

  // Owner specific fields
  const [businessName, setBusinessName] = useState('');
  const [acceptsUpi, setAcceptsUpi] = useState(true);
  const [acceptsBank, setAcceptsBank] = useState(true);
  const [acceptsCash, setAcceptsCash] = useState(true);
  const [upiId, setUpiId] = useState('');

  // Driver specific fields
  const [serviceArea, setServiceArea] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [totalExperienceYears, setTotalExperienceYears] = useState(3);
  const [dailyWageRate, setDailyWageRate] = useState(800);
  const [driverSkills, setDriverSkills] = useState<Record<string, { selected: boolean; years: number }>>({
    Tractor: { selected: true, years: 3 },
    Harvester: { selected: false, years: 2 },
    JCB: { selected: false, years: 2 },
    Rotavator: { selected: true, years: 2 },
    Seeder: { selected: false, years: 1 },
    Thresher: { selected: false, years: 1 },
    Cultivator: { selected: false, years: 2 },
    Sprayer: { selected: false, years: 1 },
    Other: { selected: false, years: 1 },
  });

  // 1. Google Sign-In Handler for Selected Role
  const handleGoogleSignIn = async (customEmail?: string, customName?: string) => {
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          email: customEmail || googleEmail.trim() || activeRoleMeta.demoEmail,
          full_name: customName || googleName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Google Sign-In failed.');
      } else {
        onSuccess(data.user);
      }
    } catch {
      setError('Connection error during Google Sign-In.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Phone Number OTP Handlers for Selected Role
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: phoneInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send OTP.');
      } else {
        setOtpSent(true);
        setOtpCode(data.demo_otp || '123456');
        setInfoMessage(`${data.message}. Verification code: ${data.demo_otp || '123456'}`);
      }
    } catch {
      setError('Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: phoneInput,
          otp: otpCode,
          role: selectedRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid OTP.');
      } else {
        onSuccess(data.user);
      }
    } catch {
      setError('Error verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Unified Mobile / Email & Password Login Handler
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (otpSent && otpCode.trim().length >= 4) {
      await handleVerifyOtp(e);
      return;
    }

    const cleanPhone = phoneInput.trim();
    const cleanEmail = emailInput.trim();

    if (!cleanPhone && !cleanEmail) {
      setError('Please enter your Mobile Number or Email Address.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your Password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile: cleanPhone,
          email: cleanEmail,
          identifier: cleanEmail || cleanPhone,
          password: loginPassword,
          role: selectedRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid login credentials.');
      } else {
        onSuccess(data.user);
      }
    } catch {
      setError('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setAreaCity('Baran, Rajasthan');
      setAddress('Kota-Baran Agricultural Belt');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(3);
        const lon = pos.coords.longitude.toFixed(3);
        setAreaCity(`Baran, Rajasthan (${lat}, ${lon})`);
        if (!address) setAddress('Current Location');
      },
      () => {
        setAreaCity('Baran, Rajasthan');
        if (!address) setAddress('Hadoti Agricultural Belt');
      },
    );
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const skillsArray: DriverSkill[] = Object.entries(driverSkills)
      .filter(([, val]) => val.selected)
      .map(([cat, val]) => ({
        category: cat as EquipmentCategory | 'Other',
        experience_years: Number(val.years) || 1,
      }));

    if (selectedRole === 'driver' && skillsArray.length === 0) {
      setError('Please select at least one equipment type that you can operate.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          full_name: fullName,
          mobile,
          email,
          password,
          confirm_password: confirmPassword,
          address,
          area_city: areaCity,
          business_name: businessName,
          accepts_upi: acceptsUpi,
          accepts_bank_transfer: acceptsBank,
          accepts_cash: acceptsCash,
          upi_id: upiId,
          service_area: serviceArea || areaCity,
          license_number: licenseNumber,
          total_experience_years: totalExperienceYears,
          daily_wage_rate: dailyWageRate,
          skills: skillsArray,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed.');
      } else {
        onSuccess(data.user);
      }
    } catch {
      setError('Network error while creating your account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier,
          new_password: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to reset password.');
      } else {
        setInfoMessage(data.message);
        setTimeout(() => setMode('login'), 1200);
      }
    } catch {
      setError('Error resetting password.');
    } finally {
      setLoading(false);
    }
  };

  const displayTitle =
    mode === 'login'
      ? lang === 'hi'
        ? activeRoleMeta.titleHi
        : activeRoleMeta.titleEn
      : mode === 'register'
      ? lang === 'hi'
        ? activeRoleMeta.regTitleHi
        : activeRoleMeta.regTitleEn
      : lang === 'hi'
      ? 'पासवर्ड रीसेट करें (Reset Password)'
      : 'Reset Password';

  return (
    <div className="min-h-screen bg-[#F7F8F5] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-[#DCE2D8] rounded-lg p-6 sm:p-8">
        {/* Back button to Role Selection Page */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E6EBE2]">
          <h1 className="text-xl font-bold text-[#1A241B]">{displayTitle}</h1>
          <button
            type="button"
            onClick={onBackToRoles}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4E5D50] hover:text-[#1A241B] px-2.5 py-1.5 rounded border border-[#DCE2D8] whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {lang === 'hi' ? 'वापस (Back)' : 'Back'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2 text-xs text-emerald-800">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* LOGIN VIEW FOR SELECTED ROLE ONLY (All fields visible directly - NO tabs) */}
        {mode === 'login' && (
          <div className="space-y-4">
            {/* Continue with Google Button */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleGoogleSignIn()}
              className="w-full py-2.5 px-4 bg-white hover:bg-[#F7F8F5] text-[#1A241B] border border-[#DCE2D8] rounded-md text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>
                {lang === 'hi' ? 'Google से लॉगिन करें' : 'Continue with Google'}
              </span>
            </button>

            <form onSubmit={handlePasswordLogin} className="space-y-3.5">
              {/* Mobile Number Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#1A241B]">
                    {lang === 'hi' ? 'मोबाइल नंबर (Mobile Number)' : 'Mobile Number'}
                  </label>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSendOtp}
                    className="text-[11px] font-medium text-[#2E6F40] hover:underline"
                  >
                    {lang === 'hi' ? 'OTP भेजें' : 'Send OTP'}
                  </button>
                </div>
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 border-[#DCE2D8] bg-[#F7F8F5] rounded-l-md text-xs font-mono-tabular text-[#4E5D50]">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value);
                      setOtpSent(false);
                    }}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded-r-md text-sm font-mono-tabular focus:outline-none focus:border-[#2E6F40]"
                  />
                </div>
              </div>

              {otpSent && (
                <div>
                  <label className="block text-xs font-semibold text-[#1A241B] mb-1">
                    {lang === 'hi' ? '6-अंकों का OTP दर्ज करें' : 'Enter 6-Digit OTP'}
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2 border border-[#DCE2D8] rounded-md text-sm font-mono-tabular focus:outline-none focus:border-[#2E6F40]"
                  />
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-[#1A241B] mb-1">
                  {lang === 'hi' ? 'ईमेल (Email)' : 'Email'}
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={activeRoleMeta.demoEmail}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded-md text-sm focus:outline-none focus:border-[#2E6F40]"
                />
              </div>

              {/* Password Input + Show/Hide Password + Forgot Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#1A241B]">
                    {lang === 'hi' ? 'पासवर्ड (Password)' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs font-medium text-[#2E6F40] hover:underline"
                  >
                    {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-3 pr-20 py-2 border border-[#DCE2D8] rounded-md text-sm focus:outline-none focus:border-[#2E6F40]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center gap-1 text-xs font-semibold text-[#4E5D50] hover:text-[#1A241B]"
                    aria-label={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>{lang === 'hi' ? 'छुपाएं' : 'Hide'}</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>{lang === 'hi' ? 'दिखाएं' : 'Show'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2E6F40] hover:bg-[#245832] text-white font-semibold rounded-md text-sm transition-colors"
              >
                {loading
                  ? 'Signing in...'
                  : lang === 'hi'
                  ? 'लॉगिन करें (Login)'
                  : 'Login'}
              </button>
            </form>

            {/* Register Link */}
            <div className="pt-3 border-t border-[#E6EBE2] text-center text-xs text-[#4E5D50]">
              {lang === 'hi' ? 'नया खाता बनाना चाहते हैं?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="font-semibold text-[#2E6F40] hover:underline"
              >
                {lang === 'hi' ? 'पंजीकरण करें (Register)' : 'Register Here'}
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#1A241B] mb-1">
                Registered Email or Mobile Number
              </label>
              <input
                type="text"
                required
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
                placeholder="Enter email or 10-digit mobile"
                className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1A241B] mb-1">
                New Password (min 6 chars)
              </label>
              <input
                type="password"
                required
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#2E6F40] text-white font-semibold rounded"
              >
                Reset Password
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="px-4 py-2 border border-[#DCE2D8] rounded font-semibold"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {/* REGISTER MODE FOR SELECTED ROLE */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            <div className="p-2.5 bg-[#F4F7F2] border border-[#DCE2D8] rounded text-[#2E6F40] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                {selectedRole === 'farmer'
                  ? 'Customer Registration (No Aadhaar Required)'
                  : selectedRole === 'owner'
                  ? 'Owner Registration'
                  : 'Driver Registration'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#1A241B] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1A241B] mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm font-mono-tabular"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#1A241B] mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#1A241B] mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1A241B] mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#1A241B]">Area / City *</label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="text-[11px] text-[#2E6F40] hover:underline inline-flex items-center gap-0.5"
                  >
                    <MapPin className="w-3 h-3" /> Detect
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={areaCity}
                  onChange={(e) => setAreaCity(e.target.value)}
                  placeholder="e.g. Karnal, Haryana"
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1A241B] mb-1">Address *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Village / Landmark"
                  className="w-full px-3 py-2 border border-[#DCE2D8] rounded text-sm"
                />
              </div>
            </div>

            {selectedRole === 'owner' && (
              <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded space-y-2">
                <div>
                  <label className="block font-semibold text-[#1A241B] mb-1">
                    Business / Farm Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Gill Agro Machinery Center"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#DCE2D8] rounded"
                  />
                </div>
                <div className="flex gap-4 pt-1">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={acceptsUpi}
                      onChange={(e) => setAcceptsUpi(e.target.checked)}
                      className="accent-[#2E6F40]"
                    />
                    UPI
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={acceptsBank}
                      onChange={(e) => setAcceptsBank(e.target.checked)}
                      className="accent-[#2E6F40]"
                    />
                    Bank Transfer
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={acceptsCash}
                      onChange={(e) => setAcceptsCash(e.target.checked)}
                      className="accent-[#2E6F40]"
                    />
                    Cash
                  </label>
                </div>
              </div>
            )}

            {selectedRole === 'driver' && (
              <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-[#1A241B] mb-1">
                      Driving License No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="HR-05-20200041821"
                      className="w-full px-2.5 py-1.5 bg-white border border-[#DCE2D8] rounded font-mono-tabular"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1A241B] mb-1">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={totalExperienceYears}
                      onChange={(e) => setTotalExperienceYears(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-[#DCE2D8] rounded font-mono-tabular"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-[#1A241B] mb-1">
                    Select Equipment You Can Operate:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ALL_SKILL_CATEGORIES.map((cat) => {
                      const sk = driverSkills[cat];
                      return (
                        <label
                          key={cat}
                          className="inline-flex items-center gap-1.5 p-1.5 bg-white border border-[#DCE2D8] rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={sk.selected}
                            onChange={() =>
                              setDriverSkills((prev) => ({
                                ...prev,
                                [cat]: { ...sk, selected: !sk.selected },
                              }))
                            }
                            className="accent-[#2E6F40]"
                          />
                          <span className="truncate">{cat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2E6F40] hover:bg-[#245832] text-white font-semibold rounded-md text-sm"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>

            <div className="text-center pt-2 text-[#4E5D50]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-semibold text-[#2E6F40] hover:underline"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
