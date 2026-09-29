import React, { useState } from 'react';
import { UserProfile, UserRole } from './types';
import { AuthViews } from './components/AuthViews';
import { FarmerDashboard } from './components/FarmerDashboard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { AdminDashboard } from './components/AdminAndDocsModals';

export default function App() {
  // Step 1: 'language' -> First page with ONLY Website Name, Language Selection (Hindi/English), and Continue button
  // Step 2: 'role_select' -> Second page with ONLY three login options: 1. Owner Login, 2. Customer Login, 3. Driver Login
  // Step 3: 'role_login' -> Displays ONLY the selected login interface before authentication completes
  const [step, setStep] = useState<'language' | 'role_select' | 'role_login'>('language');
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [selectedRole, setSelectedRole] = useState<UserRole>('farmer');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleUpdateUser = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStep('language');
  };

  // ============================================================================
  // AUTHENTICATED DASHBOARDS (Only visible AFTER completing login)
  // ============================================================================
  if (currentUser) {
    if (currentUser.role === 'farmer') {
      return (
        <FarmerDashboard
          user={currentUser}
          lang={lang}
          onSetLang={setLang}
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
        />
      );
    }
    if (currentUser.role === 'owner') {
      return (
        <OwnerDashboard
          user={currentUser}
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
        />
      );
    }
    if (currentUser.role === 'driver') {
      return (
        <DriverDashboard
          user={currentUser}
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
        />
      );
    }
    if (currentUser.role === 'admin') {
      return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
    }
  }

  // ============================================================================
  // FIRST PAGE: ONLY WEBSITE NAME, LANGUAGE SELECTION (HINDI / ENGLISH) & CONTINUE
  // ============================================================================
  if (step === 'language') {
    return (
      <div className="min-h-screen bg-[#F7F8F5] text-[#1A241B] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-[#DCE2D8] rounded-lg p-8 text-center space-y-8">
          {/* Website Name Only */}
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1A241B]">
            Khet Mitra
          </h1>

          {/* Language Selection Section */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-[#4E5D50]">
              Language Selection / भाषा चुनें
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLang('hi')}
                className={`py-3 px-4 rounded-md border text-sm font-semibold transition-colors ${
                  lang === 'hi'
                    ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                    : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8] hover:border-[#2E6F40]'
                }`}
              >
                Hindi (हिन्दी)
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`py-3 px-4 rounded-md border text-sm font-semibold transition-colors ${
                  lang === 'en'
                    ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                    : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8] hover:border-[#2E6F40]'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={() => setStep('role_select')}
            className="w-full py-3 px-6 bg-[#2E6F40] hover:bg-[#245832] text-white font-semibold rounded-md text-sm transition-colors"
          >
            {lang === 'hi' ? 'आगे बढ़ें (Continue)' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SECOND PAGE: THREE TYPES OF LOGIN (1. OWNER LOGIN, 2. CUSTOMER LOGIN, 3. DRIVER LOGIN)
  // ============================================================================
  if (step === 'role_select') {
    return (
      <div className="min-h-screen bg-[#F7F8F5] text-[#1A241B] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white border border-[#DCE2D8] rounded-lg p-8 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-[#1A241B]">Khet Mitra</h1>
            <p className="text-sm text-[#4E5D50]">
              {lang === 'hi'
                ? 'अपना लॉगिन प्रकार चुनें'
                : 'Select Your Login Type'}
            </p>
          </div>

          <div className="space-y-3">
            {/* 1. Owner Login */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('owner');
                setStep('role_login');
              }}
              className="w-full py-3.5 px-5 bg-[#F7F8F5] hover:bg-[#2E6F40] hover:text-white text-[#1A241B] border border-[#DCE2D8] hover:border-[#2E6F40] rounded-md text-left font-semibold text-sm flex items-center justify-between transition-colors"
            >
              <span>
                1. {lang === 'hi' ? 'ओनर लॉगिन (Owner Login)' : 'Owner Login'}
              </span>
              <span aria-hidden="true">→</span>
            </button>

            {/* 2. Customer Login */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('farmer');
                setStep('role_login');
              }}
              className="w-full py-3.5 px-5 bg-[#F7F8F5] hover:bg-[#2E6F40] hover:text-white text-[#1A241B] border border-[#DCE2D8] hover:border-[#2E6F40] rounded-md text-left font-semibold text-sm flex items-center justify-between transition-colors"
            >
              <span>
                2. {lang === 'hi' ? 'कस्टमर लॉगिन (Customer Login)' : 'Customer Login'}
              </span>
              <span aria-hidden="true">→</span>
            </button>

            {/* 3. Driver Login */}
            <button
              type="button"
              onClick={() => {
                setSelectedRole('driver');
                setStep('role_login');
              }}
              className="w-full py-3.5 px-5 bg-[#F7F8F5] hover:bg-[#2E6F40] hover:text-white text-[#1A241B] border border-[#DCE2D8] hover:border-[#2E6F40] rounded-md text-left font-semibold text-sm flex items-center justify-between transition-colors"
            >
              <span>
                3. {lang === 'hi' ? 'ड्राइवर लॉगिन (Driver Login)' : 'Driver Login'}
              </span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setStep('language')}
              className="text-xs font-medium text-[#4E5D50] hover:text-[#1A241B] hover:underline"
            >
              ← {lang === 'hi' ? 'भाषा बदलें (Change Language)' : 'Back to Language Selection'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // THIRD STEP: SELECTED LOGIN INTERFACE ONLY
  // ============================================================================
  return (
    <AuthViews
      key={selectedRole}
      initialMode="login"
      selectedRole={selectedRole}
      lang={lang}
      onSuccess={handleAuthSuccess}
      onBackToRoles={() => setStep('role_select')}
    />
  );
}
