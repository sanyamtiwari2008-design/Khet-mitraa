import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { Check, Shield, Database, Code2, X, Copy } from 'lucide-react';

interface AdminDashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenDocs?: () => void;
}

const MYSQL_17_TABLES = [
  'users',
  'farmer_profiles',
  'owner_profiles',
  'driver_profiles',
  'driver_equipment',
  'equipment',
  'equipment_images',
  'bookings',
  'booking_status_history',
  'driver_assignments',
  'payments',
  'equipment_inspections',
  'reviews',
  'saved_equipment',
  'messages',
  'notifications',
  'support_tickets',
] as const;

export const MysqlInspectorPanel: React.FC = () => {
  const [mysqlData, setMysqlData] = useState<any | null>(null);
  const [sourceFiles, setSourceFiles] = useState<Record<string, string>>({});
  const [selectedTable, setSelectedTable] = useState<string>('users');
  const [selectedFile, setSelectedFile] = useState<string>('schema.sql');
  const [subView, setSubView] = useState<'tables' | 'code'>('tables');
  const [copied, setCopied] = useState(false);

  const fetchMysqlInspector = useCallback(async () => {
    try {
      const [tRes, fRes] = await Promise.all([
        fetch('/api/mysql/tables'),
        fetch('/api/mysql/files'),
      ]);
      if (tRes.ok) setMysqlData(await tRes.json());
      if (fRes.ok) setSourceFiles(await fRes.json());
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchMysqlInspector();
  }, [fetchMysqlInspector]);

  const currentRows: any[] = mysqlData?.tables?.[selectedTable] || [];
  const columns = currentRows.length > 0 ? Object.keys(currentRows[0]) : [];

  const handleCopyCode = () => {
    const text = sourceFiles[selectedFile] || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6EBE2]">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#2E6F40]" />
            <h2 className="text-lg font-bold text-[#1A241B]">
              Normalized MySQL Database: <code className="font-mono text-[#2E6F40]">khet_mitra</code> (17 Relational Tables)
            </h2>
          </div>
          <p className="text-xs text-[#4E5D50] mt-0.5">
            Inspect live relational rows across all 17 MySQL tables or view/copy the Python Flask backend (<code className="font-mono">app.py</code>, <code className="font-mono">database.py</code>, <code className="font-mono">schema.sql</code>, <code className="font-mono">seed.sql</code>).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView('tables')}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold border ${
              subView === 'tables'
                ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8]'
            }`}
          >
            Live 17 MySQL Tables
          </button>
          <button
            type="button"
            onClick={() => setSubView('code')}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold border inline-flex items-center gap-1.5 ${
              subView === 'code'
                ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            schema.sql / seed.sql / app.py / database.py
          </button>
          <button
            type="button"
            onClick={fetchMysqlInspector}
            className="px-3 py-1.5 rounded text-xs font-semibold border border-[#DCE2D8] hover:bg-[#F7F8F5]"
          >
            Refresh Live Data
          </button>
        </div>
      </div>

      {subView === 'tables' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {MYSQL_17_TABLES.map((tbl, index) => {
              const count = mysqlData?.tables?.[tbl]?.length ?? 0;
              return (
                <button
                  key={tbl}
                  type="button"
                  onClick={() => setSelectedTable(tbl)}
                  className={`px-2.5 py-1.5 rounded text-xs font-mono-tabular border transition-colors ${
                    selectedTable === tbl
                      ? 'bg-[#2E6F40] text-white border-[#2E6F40] font-semibold'
                      : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8] hover:border-[#2E6F40]'
                  }`}
                >
                  {index + 1}. {tbl} ({count})
                </button>
              );
            })}
          </div>

          <div className="border border-[#DCE2D8] rounded-md overflow-hidden">
            <div className="bg-[#F7F8F5] px-4 py-2.5 border-b border-[#DCE2D8] flex items-center justify-between text-xs font-mono-tabular">
              <span className="font-bold text-[#1A241B]">
                SELECT * FROM khet_mitra.{selectedTable};
              </span>
              <span className="text-[#2E6F40] font-semibold">
                {currentRows.length} row(s) in table
              </span>
            </div>

            {currentRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#4E5D50]">
                No rows currently in <code className="font-mono">{selectedTable}</code>.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse text-xs font-mono-tabular">
                  <thead>
                    <tr className="bg-[#F0F3EE] border-b border-[#DCE2D8] text-[#4E5D50]">
                      {columns.map((col) => (
                        <th key={col} className="py-2 px-3 whitespace-nowrap font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EBE2]">
                    {currentRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#F7F8F5]">
                        {columns.map((col) => {
                          const val = row[col];
                          const formatted =
                            val === null || val === undefined
                              ? 'NULL'
                              : typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val);
                          return (
                            <td
                              key={col}
                              className="py-2 px-3 max-w-xs truncate"
                              title={formatted}
                            >
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {['schema.sql', 'seed.sql', 'database.py', 'app.py', 'requirements.txt'].map(
                (fileName) => (
                  <button
                    key={fileName}
                    type="button"
                    onClick={() => setSelectedFile(fileName)}
                    className={`px-3 py-1.5 rounded text-xs font-mono-tabular font-semibold border ${
                      selectedFile === fileName
                        ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                        : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8]'
                    }`}
                  >
                    {fileName}
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-[#2E6F40] text-white rounded text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied to Clipboard!' : `Copy ${selectedFile}`}
            </button>
          </div>

          <pre className="p-4 bg-[#1A241B] text-[#F7F8F5] rounded-md text-xs font-mono-tabular overflow-x-auto max-h-[520px] leading-relaxed">
            {sourceFiles[selectedFile] || 'Loading file content...'}
          </pre>
        </div>
      )}
    </div>
  );
};

export const MysqlDatabaseModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#F7F8F5] border border-[#DCE2D8] rounded-lg max-w-6xl w-full p-5 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-[#DCE2D8]">
          <span className="text-sm font-bold text-[#1A241B]">
            Khet Mitra — MySQL Database (khet_mitra) &amp; Python Flask Integration
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded border border-[#DCE2D8] bg-white hover:bg-red-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <MysqlInspectorPanel />
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<
    'users' | 'drivers' | 'equipment' | 'bookings' | 'payments' | 'tickets' | 'mysql'
  >('users');
  const [roleFilter, setRoleFilter] = useState<'all' | 'farmer' | 'owner' | 'driver'>('all');
  const [overview, setOverview] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [driverNotes, setDriverNotes] = useState<Record<number, string>>({});

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        setOverview(await res.json());
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleToggleUserStatus = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        setToast('User account status updated in MySQL users table.');
        setTimeout(() => setToast(null), 3000);
        fetchOverview();
      }
    } catch {
      // silent
    }
  };

  const handleVerifyOwner = async (userId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/owners/${userId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification_status: status }),
      });
      if (res.ok) {
        setToast(`Owner verification_status updated to '${status}'.`);
        setTimeout(() => setToast(null), 3000);
        fetchOverview();
      }
    } catch {
      // silent
    }
  };

  const handleVerifyDriverLicense = async (driverId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/verify-license`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          verification_notes:
            driverNotes[driverId] || `Admin set driver verification status to ${status}.`,
        }),
      });
      if (res.ok) {
        setToast(`Driver verification_status updated to '${status}'.`);
        setTimeout(() => setToast(null), 3000);
        fetchOverview();
      }
    } catch {
      // silent
    }
  };

  const handleVerifyEquipment = async (
    equipmentId: number,
    verification_status?: string,
    availability_status?: string,
  ) => {
    try {
      const res = await fetch(`/api/admin/equipment/${equipmentId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification_status, availability_status }),
      });
      if (res.ok) {
        setToast(`Equipment #${equipmentId} updated.`);
        setTimeout(() => setToast(null), 3000);
        fetchOverview();
      }
    } catch {
      // silent
    }
  };

  const handleResolveTicket = async (ticketId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/support-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          admin_response:
            replyText[ticketId] || 'Issue reviewed and resolved by Khet Mitra Support.',
        }),
      });
      if (res.ok) {
        setToast(`Support Ticket #${ticketId} updated to ${status}.`);
        setTimeout(() => setToast(null), 3000);
        fetchOverview();
      }
    } catch {
      // silent
    }
  };

  const stats = overview?.stats || {
    total_users: 0,
    total_farmers: 0,
    total_owners: 0,
    total_drivers: 0,
    total_equipment: 0,
    total_bookings: 0,
    total_payment_volume: 0,
    open_tickets: 0,
  };

  const filteredUsers = (overview?.users || []).filter((u: any) =>
    roleFilter === 'all' ? true : u.role === roleFilter,
  );

  return (
    <div className="min-h-screen bg-[#F7F8F5] text-[#1A241B]">
      {/* TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE2D8] px-4 md:px-8 py-3.5 flex items-center justify-between">
        <span className="text-xl font-bold tracking-tight text-[#1A241B]">Khet Mitra</span>

        <nav className="hidden md:flex items-center gap-4 text-xs lg:text-sm font-medium text-[#4E5D50]">
          {[
            { id: 'users', label: 'Users & Owners' },
            { id: 'drivers', label: 'Driver Verification' },
            { id: 'equipment', label: 'Equipment Approval' },
            { id: 'bookings', label: 'Bookings' },
            { id: 'payments', label: 'Payments' },
            { id: 'tickets', label: `Support Tickets (${stats.open_tickets})` },
            { id: 'mysql', label: 'MySQL (17 Tables) & Flask Code' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`hover:text-[#1A241B] whitespace-nowrap ${
                activeTab === t.id ? 'text-[#2E6F40] font-semibold underline underline-offset-4' : ''
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('mysql')}
            className="px-3 py-1.5 text-xs font-semibold border border-[#2E6F40] text-[#2E6F40] rounded hover:bg-[#E9EFE6]"
          >
            MySQL DB
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-1.5 text-xs font-semibold bg-red-700 text-white rounded hover:bg-red-800"
          >
            Logout ({user.full_name.split(' ')[0]})
          </button>
        </div>
      </header>

      {toast && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-700" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* PLATFORM STATISTICS */}
        <section className="bg-white border border-[#DCE2D8] rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6EBE2]">
            <div>
              <h1 className="text-xl font-bold text-[#1A241B]">
                Khet Mitra — Platform Administration &amp; MySQL Control Center
              </h1>
              <p className="text-xs text-[#4E5D50]">
                Security Policy Enforced: Passwords are stored as salted PBKDF2-SHA256 hashes and never exposed in plain text. No Farmer Aadhaar data is collected.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono-tabular">
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] font-sans text-[#4E5D50]">Total Users</div>
              <div className="text-lg font-bold">{stats.total_users}</div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] font-sans text-[#4E5D50]">Farmers</div>
              <div className="text-lg font-bold text-[#2E6F40]">{stats.total_farmers}</div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] font-sans text-[#4E5D50]">Owners</div>
              <div className="text-lg font-bold">{stats.total_owners}</div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] font-sans text-[#4E5D50]">Drivers</div>
              <div className="text-lg font-bold">{stats.total_drivers}</div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] font-sans text-[#4E5D50]">Equipment</div>
              <div className="text-lg font-bold">{stats.total_equipment}</div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] font-sans text-[#4E5D50]">Bookings</div>
              <div className="text-lg font-bold">{stats.total_bookings}</div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] font-sans text-[#4E5D50]">Demo Payments</div>
              <div className="text-lg font-bold text-[#2E6F40]">
                ₹{Number(stats.total_payment_volume).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="p-3 bg-[#F7F8F5] border border-[#DCE2D8] rounded">
              <div className="text-[11px] font-sans text-[#4E5D50]">Open Tickets</div>
              <div className="text-lg font-bold text-[#B45309]">{stats.open_tickets}</div>
            </div>
          </div>
        </section>

        {/* USERS & OWNERS MANAGEMENT */}
        {activeTab === 'users' && (
          <section className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#1A241B]">
                Manage Users, Verify Owners &amp; Activate/Deactivate Accounts
              </h2>
              <div className="flex gap-1.5 p-1 bg-[#F0F3EE] rounded border border-[#DCE2D8] text-xs">
                {(['all', 'farmer', 'owner', 'driver'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1 rounded font-semibold capitalize ${
                      roleFilter === r ? 'bg-[#2E6F40] text-white' : 'text-[#1A241B]'
                    }`}
                  >
                    {r === 'all' ? 'All Roles' : `${r}s`}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#DCE2D8] text-[#4E5D50]">
                    <th className="py-2.5 px-3">ID</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Mobile / Email</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Password Hash Security</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EBE2]">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.user_id} className="hover:bg-[#F7F8F5]">
                      <td className="py-2.5 px-3 font-mono-tabular">#{u.user_id}</td>
                      <td className="py-2.5 px-3 font-semibold">{u.full_name}</td>
                      <td className="py-2.5 px-3 uppercase font-mono-tabular">{u.role}</td>
                      <td className="py-2.5 px-3 font-mono-tabular">
                        {u.mobile} · {u.email}
                      </td>
                      <td className="py-2.5 px-3">{u.area_city}</td>
                      <td className="py-2.5 px-3 text-[#4E5D50] inline-flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-[#2E6F40]" />
                        {u.password_security}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={
                            u.is_active ? 'text-[#2E6F40] font-bold' : 'text-red-700 font-bold'
                          }
                        >
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {u.role === 'owner' && (
                          <button
                            type="button"
                            onClick={() => handleVerifyOwner(u.user_id, 'Verified')}
                            className="px-2.5 py-1 bg-[#2E6F40] text-white rounded font-semibold"
                          >
                            Verify Owner
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u.user_id)}
                            className="px-2.5 py-1 border border-[#DCE2D8] rounded hover:bg-white font-semibold"
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* DRIVER LICENSE VERIFICATION (ALL 5 STATUSES) */}
        {activeTab === 'drivers' && (
          <section className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A241B]">
                Verify Drivers &amp; Review Driving-License Submissions
              </h2>
              <p className="text-xs text-[#4E5D50]">
                Backend Enforcement: A driver is blocked from accessing the Driver Dashboard or job actions unless <code className="font-mono">verification_status = &apos;Verified&apos;</code>.
              </p>
            </div>
            <div className="space-y-3">
              {(overview?.drivers || []).map((drv: any) => {
                const vStatus = drv.verification_status || drv.license_status || 'Incomplete';
                return (
                  <div
                    key={drv.driver_id}
                    className="p-4 border border-[#DCE2D8] rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[#1A241B]">
                        {drv.full_name} ({drv.mobile}) — Driver ID #{drv.driver_id}
                      </div>
                      <div className="text-[#4E5D50] font-mono-tabular">
                        License Number: <strong>{drv.license_number}</strong> · Experience:{' '}
                        {drv.total_experience_years} years · Current Status:{' '}
                        <span
                          className={`font-bold ${
                            vStatus === 'Verified' ? 'text-[#2E6F40]' : 'text-[#B45309]'
                          }`}
                        >
                          {vStatus}
                        </span>
                      </div>
                      <div>
                        Equipment Expertise:{' '}
                        {(drv.skills || [])
                          .map((s: any) => `${s.category} (${s.experience_years} yrs)`)
                          .join(' · ')}
                      </div>
                      <div className="pt-1">
                        <input
                          type="text"
                          value={driverNotes[drv.driver_id] ?? (drv.verification_notes || '')}
                          onChange={(e) =>
                            setDriverNotes((prev) => ({
                              ...prev,
                              [drv.driver_id]: e.target.value,
                            }))
                          }
                          placeholder="Verification notes for driver..."
                          className="w-full sm:w-96 px-2.5 py-1 border border-[#DCE2D8] rounded"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Verified',
                        'Pending Verification',
                        'Correction Required',
                        'Rejected',
                        'Incomplete',
                      ].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleVerifyDriverLicense(drv.driver_id, st)}
                          className={`px-3 py-1.5 rounded font-semibold border ${
                            vStatus === st
                              ? 'bg-[#2E6F40] text-white border-[#2E6F40]'
                              : 'bg-[#F7F8F5] text-[#1A241B] border-[#DCE2D8] hover:border-[#2E6F40]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* EQUIPMENT APPROVAL & AVAILABILITY */}
        {activeTab === 'equipment' && (
          <section className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">
              Approve / Reject Equipment &amp; Manage Availability
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#DCE2D8] text-[#4E5D50]">
                    <th className="py-2 px-3">ID</th>
                    <th className="py-2 px-3">Equipment</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Owner</th>
                    <th className="py-2 px-3">Location</th>
                    <th className="py-2 px-3">Verification</th>
                    <th className="py-2 px-3">Availability</th>
                    <th className="py-2 px-3 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EBE2] font-mono-tabular">
                  {(overview?.equipment || []).map((eq: any) => (
                    <tr key={eq.equipment_id}>
                      <td className="py-2.5 px-3">#{eq.equipment_id}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold">{eq.equipment_name}</td>
                      <td className="py-2.5 px-3 font-sans">{eq.category}</td>
                      <td className="py-2.5 px-3 font-sans">{eq.owner_name}</td>
                      <td className="py-2.5 px-3 font-sans">{eq.location}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-[#2E6F40]">
                        {eq.verification_status || 'Verified'}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {eq.availability_status || (eq.is_available ? 'Available' : 'Unavailable')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleVerifyEquipment(eq.equipment_id, 'Verified', 'Available')}
                          className="px-2 py-1 bg-[#2E6F40] text-white rounded font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyEquipment(eq.equipment_id, 'Verified', 'Maintenance')}
                          className="px-2 py-1 border border-[#DCE2D8] rounded font-semibold"
                        >
                          Maintenance
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifyEquipment(eq.equipment_id, 'Rejected', 'Unavailable')}
                          className="px-2 py-1 border border-red-200 text-red-700 rounded font-semibold"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* BOOKINGS */}
        {activeTab === 'bookings' && (
          <section className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">All Bookings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#DCE2D8] text-[#4E5D50]">
                    <th className="py-2 px-3">Booking ID</th>
                    <th className="py-2 px-3">Farmer</th>
                    <th className="py-2 px-3">Equipment</th>
                    <th className="py-2 px-3">Dates</th>
                    <th className="py-2 px-3">Booking Status</th>
                    <th className="py-2 px-3">Payment Status</th>
                    <th className="py-2 px-3 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EBE2] font-mono-tabular">
                  {(overview?.bookings || []).map((b: any) => (
                    <tr key={b.booking_id}>
                      <td className="py-2.5 px-3">#{b.booking_id}</td>
                      <td className="py-2.5 px-3 font-sans">{b.farmer_name}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold">{b.equipment_name}</td>
                      <td className="py-2.5 px-3">
                        {b.start_date} → {b.end_date}
                      </td>
                      <td className="py-2.5 px-3 font-sans">{b.booking_status}</td>
                      <td className="py-2.5 px-3 font-sans text-[#2E6F40] font-semibold">
                        {b.payment_status}
                      </td>
                      <td className="py-2.5 px-3 text-right">₹{b.total_price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* PAYMENTS */}
        {activeTab === 'payments' && (
          <section className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">
              Recorded DEMO PAYMENTS (10% Advance &amp; 90% Remaining)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono-tabular">
                <thead>
                  <tr className="border-b border-[#DCE2D8] text-[#4E5D50] font-sans">
                    <th className="py-2 px-3">Payment ID</th>
                    <th className="py-2 px-3">Booking</th>
                    <th className="py-2 px-3">Stage</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Reference</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EBE2]">
                  {(overview?.payments || []).map((p: any) => (
                    <tr key={p.payment_id}>
                      <td className="py-2.5 px-3">#{p.payment_id}</td>
                      <td className="py-2.5 px-3">Booking #{p.booking_id}</td>
                      <td className="py-2.5 px-3">{p.payment_stage}</td>
                      <td className="py-2.5 px-3 font-sans">{p.payment_method}</td>
                      <td className="py-2.5 px-3">{p.transaction_ref}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#2E6F40]">
                        ₹{p.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* SUPPORT TICKETS & COMPLAINTS */}
        {activeTab === 'tickets' && (
          <section className="bg-white border border-[#DCE2D8] rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1A241B]">
              Support Tickets &amp; Reported Problems
            </h2>
            <div className="space-y-3">
              {(overview?.support_tickets || []).map((t: any) => (
                <div
                  key={t.ticket_id}
                  className="p-4 border border-[#DCE2D8] rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1A241B]">
                      Ticket #{t.ticket_id} · {t.category} — {t.subject}
                    </span>
                    <span className="font-semibold text-[#2E6F40]">{t.status}</span>
                  </div>
                  <div className="text-[#4E5D50]">
                    Submitted by: {t.user_name} ({t.user_role}) — &ldquo;{t.description}&rdquo;
                  </div>
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={replyText[t.ticket_id] ?? (t.admin_response || '')}
                      onChange={(e) =>
                        setReplyText((prev) => ({ ...prev, [t.ticket_id]: e.target.value }))
                      }
                      placeholder="Write admin resolution response..."
                      className="flex-1 px-3 py-1.5 border border-[#DCE2D8] rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleResolveTicket(t.ticket_id, 'Resolved')}
                      className="px-4 py-1.5 bg-[#2E6F40] text-white font-semibold rounded"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MYSQL 17-TABLE DATABASE & PYTHON FLASK CODE INSPECTOR */}
        {activeTab === 'mysql' && <MysqlInspectorPanel />}
      </main>
    </div>
  );
};
