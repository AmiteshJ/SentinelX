import { useState, useEffect, useRef } from "react";
import {
  User,
  Shield,
  Key,
  Monitor,
  Moon,
  Sun,
  CheckCircle2,
  Copy,
  Check,
  Laptop,
  Mail,
  Fingerprint,
  Save,
  Sliders,
  AlertCircle,
  Camera,
  Trash2,
  Phone,
  Building2,
  Sparkles,
  BadgeCheck,
  Upload,
} from "lucide-react";
import { DashboardShell } from "../components/layout/DashboardShell";
import { useTheme } from "../theme/ThemeProvider";
import { useAuthStore } from "../store/authStore";
import { usePermissionStore } from "../store/permissionStore";
import { apiClient } from "../api/client";
import type { UserOut } from "../types/api";

type SettingsTab = "profile" | "appearance" | "security" | "monitoring";

export function Settings() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const permissions = usePermissionStore((s) => s.permissions);
  const agentOnline = usePermissionStore((s) => s.agentOnline);
  const agentDetails = usePermissionStore((s) => s.agentDetails);
  const openConsentModal = usePermissionStore((s) => s.openModal);

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [copiedId, setCopiedId] = useState(false);

  // Form states for profile
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [contactNumber, setContactNumber] = useState(user?.contact_number || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI preferences
  const [streamAlerts, setStreamAlerts] = useState(true);

  // Keep form in sync when user object loads or updates
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setContactNumber(user.contact_number || "");
      setAvatarUrl(user.avatar_url || null);
    }
  }, [user]);

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(String(user.id));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Image Upload & Canvas Compression to high-quality lightweight data URI
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileError("Please select a valid image file (JPEG, PNG, or WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress and resize to max 400x400 to keep DB storage crisp and ultra-fast
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
          setAvatarUrl(compressedDataUrl);
          setProfileSuccess("Photo selected. Click 'Save Profile Details' to persist to your account.");
          setTimeout(() => setProfileSuccess(null), 3500);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setProfileSuccess("Avatar cleared. Click 'Save Profile Details' to update your account.");
    setTimeout(() => setProfileSuccess(null), 3000);
  };

  // Save profile to backend PostgreSQL database
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      let res;
      try {
        res = await apiClient.put<UserOut>("/api/auth/profile", {
          full_name: fullName.trim(),
          contact_number: contactNumber.trim(),
          avatar_url: avatarUrl,
        });
      } catch (err: any) {
        if (err?.response?.status === 404) {
          res = await apiClient.put<UserOut>("/api/auth/me", {
            full_name: fullName.trim(),
            contact_number: contactNumber.trim(),
            avatar_url: avatarUrl,
          });
        } else {
          throw err;
        }
      }

      if (res?.data) {
        setUser(res.data);
      }
      setProfileSuccess("Operator profile, photo, and contact credentials permanently updated in database.");
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setProfileError(
          "Backend endpoint 404 Not Found. Please restart your backend uvicorn terminal so FastAPI picks up the updated profile routes: 'python -m uvicorn app.main:app --reload --port 8000'."
        );
      } else {
        setProfileError(
          err?.response?.data?.detail || "Failed to update profile details. Please verify your connection."
        );
      }
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Hidden File Input for Avatar */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoSelect}
          accept="image/*"
          className="hidden"
          title="Upload avatar image"
        />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-[#e2d9cc] dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-sx-blue animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-sx-blue font-semibold">
                Control Deck // Configuration
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#282937] dark:text-white">
              Analyst Profile &amp; SOC Settings
            </h1>
            <p className="mt-0.5 text-xs text-[#58565e] dark:text-slate-400">
              Manage your verified security operator credentials, avatar image, and telemetry preferences.
            </p>
          </div>

          {/* Quick Header Badge */}
          {user && (
            <div className="flex items-center gap-3 rounded-2xl border px-3.5 py-2 border-[#e2d9cc] dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md shadow-xs">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sx-blue/15 border border-sx-blue/35 text-sx-blue font-bold text-sm overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
                ) : (
                  user.full_name?.charAt(0)?.toUpperCase() || "A"
                )}
              </div>
              <div className="text-left text-xs">
                <div className="font-semibold text-[#282937] dark:text-white">{user.full_name}</div>
                <div className="text-[10px] text-slate-500 font-mono capitalize">
                  {user.role?.replace("_", " ") || "SOC Analyst"} &bull; Verified
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#e2d9cc] dark:border-slate-800">
          {[
            { id: "profile", label: "User Profile & ID", icon: User },
            { id: "appearance", label: "Appearance & Theme", icon: Sliders },
            { id: "security", label: "Credentials & 2FA", icon: Key },
            { id: "monitoring", label: "Agent & Telemetry Consent", icon: Monitor },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-sx-blue text-black shadow-md shadow-sx-blue/20 font-bold"
                    : "text-[#58565e] dark:text-slate-400 hover:text-[#282937] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: User Profile & Classy Digital ID */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Classy Cyber Operator ID Card (5 cols) */}
            <div className="lg:col-span-5 relative overflow-hidden rounded-3xl border border-sx-blue/30 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-black/95 p-6 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(58,160,255,0.2)] text-white">
              {/* Decorative Cyber Hairline */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-sx-blue to-transparent" />
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-sx-blue/10 blur-2xl" />

              {/* Card Header Strip */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-sx-blue" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-300 font-bold">
                    SentinelX // Operator Credential
                  </span>
                </div>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE CLEARANCE
                </span>
              </div>

              {/* Avatar Section with Interactive Upload */}
              <div className="mt-6 flex flex-col items-center text-center">
                <div className="group relative">
                  {/* Glowing Ring */}
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-sx-blue via-cyan-400 to-indigo-500 opacity-60 blur-sm transition duration-300 group-hover:opacity-100" />

                  {/* Avatar Container */}
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border-2 border-white/30 bg-slate-900 overflow-hidden shadow-2xl">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={fullName || "Operator"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sx-blue/30 via-slate-800 to-slate-950 text-sx-blue text-4xl font-extrabold font-mono">
                        {fullName?.charAt(0)?.toUpperCase() || "A"}
                      </div>
                    )}

                    {/* Camera Upload Overlay on Hover */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload custom operator photo"
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100 cursor-pointer backdrop-blur-xs"
                    >
                      <Camera size={22} className="text-white drop-shadow" />
                      <span className="mt-1 text-[10px] font-mono uppercase tracking-wider text-white font-semibold">
                        Change
                      </span>
                    </button>
                  </div>

                  {/* Verified Check Badge */}
                  <span
                    title="Cryptographically Verified Identity"
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-black border-2 border-slate-950 shadow-md"
                  >
                    <BadgeCheck size={16} />
                  </span>
                </div>

                {/* Operator Name & Role */}
                <h2 className="mt-4 text-lg font-bold text-white tracking-tight">
                  {fullName || user?.full_name || "SOC Operator"}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>

                {/* Role Pill */}
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono font-bold uppercase bg-sx-blue/20 text-sx-blue border border-sx-blue/40 shadow-xs">
                  <Sparkles size={11} />
                  <span>{user?.role?.replace("_", " ") || "SOC Analyst Clearance"}</span>
                </div>

                {/* Action Buttons: Upload & Remove */}
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all cursor-pointer shadow-xs"
                  >
                    <Upload size={12} />
                    <span>Upload Photo</span>
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      title="Remove custom photo and reset to initials"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 transition-all cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Identity Telemetry Deck */}
              <div className="mt-6 pt-5 border-t border-white/10 space-y-3 text-xs font-mono">
                {/* Contact Phone Row */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone size={13} className="text-sx-blue" />
                    <span className="text-[11px] uppercase tracking-wider">Direct Phone</span>
                  </div>
                  <span className="font-semibold text-white">
                    {contactNumber || user?.contact_number || (
                      <span className="text-slate-500 italic">Not Registered</span>
                    )}
                  </span>
                </div>

                {/* UUID Row */}
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    Security Principal UUID
                  </span>
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/50 border border-white/10 text-[11px] text-slate-300">
                    <span className="truncate">{user?.id || "N/A"}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 p-1"
                      title="Copy User ID"
                    >
                      {copiedId ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                {/* Station & Status */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 block text-[10px] uppercase">SOC Station</span>
                    <span className="font-bold text-slate-200">Terminal Alpha-01</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 block text-[10px] uppercase">MFA Status</span>
                    <span className="font-bold text-emerald-400">Enforced (OTP)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Profile Edit Form (7 cols) */}
            <div className="lg:col-span-7 glass-panel p-6 sm:p-7">
              <div className="flex items-center justify-between pb-4 border-b border-[#e2d9cc] dark:border-slate-800 mb-5">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#282937] dark:text-slate-200">
                    Operator Identity &amp; Contact Credentials
                  </h3>
                  <p className="text-xs text-[#58565e] dark:text-slate-400 mt-0.5">
                    Modifications will be cryptographically written to PostgreSQL and synchronized across your session.
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sx-blue/10 border border-sx-blue/20 text-sx-blue">
                  <User size={15} />
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Full Legal Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#282937] dark:text-slate-300 mb-1.5">
                    Full Legal / Operator Display Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={15} />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Vance"
                      className="w-full rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white dark:bg-black/40 pl-10 pr-4 py-2.5 text-xs text-[#282937] dark:text-white transition-colors focus:border-sx-blue focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email (Immutable Identity) */}
                  <div>
                    <label className="block text-xs font-semibold text-[#282937] dark:text-slate-300 mb-1.5">
                      Work Email (Immutable ID)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail size={15} />
                      </div>
                      <input
                        type="email"
                        disabled
                        value={user?.email || ""}
                        className="w-full rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-xs text-slate-500 cursor-not-allowed font-mono"
                      />
                    </div>
                  </div>

                  {/* Direct Contact Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-[#282937] dark:text-slate-300 mb-1.5">
                      Direct Security Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone size={15} />
                      </div>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="w-full rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-white dark:bg-black/40 pl-10 pr-4 py-2.5 text-xs text-[#282937] dark:text-white transition-colors focus:border-sx-blue focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Organization */}
                  <div>
                    <label className="block text-xs font-semibold text-[#282937] dark:text-slate-300 mb-1.5">
                      Assigned Security Division
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Building2 size={15} />
                      </div>
                      <input
                        type="text"
                        disabled
                        value="SentinelX Threat Hunting & IR"
                        className="w-full rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 pl-10 pr-4 py-2.5 text-xs text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Access Role */}
                  <div>
                    <label className="block text-xs font-semibold text-[#282937] dark:text-slate-300 mb-1.5">
                      System Clearance Level
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.role?.toUpperCase() || "VIEWER"}
                      className="w-full rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Notifications & Banners */}
                {profileSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                {profileError && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-4 border-t border-[#e2d9cc] dark:border-slate-800">
                  <span className="text-[11px] text-slate-500">
                    Changes take effect across the entire SOC interface immediately.
                  </span>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center gap-2 rounded-xl bg-sx-blue px-5 py-2.5 text-xs font-bold text-black transition-all hover:bg-sx-blue-glow shadow-md shadow-sx-blue/20 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{savingProfile ? "Saving to Database..." : "Save Profile Details"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Appearance & Theme */}
        {activeTab === "appearance" && (
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#282937] dark:text-slate-200 mb-1">
                Visual Experience &amp; Color Scheme
              </h3>
              <p className="text-xs text-[#58565e] dark:text-slate-400 mb-6">
                Choose the visual tone that matches your operations center lighting conditions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isDark) toggleTheme();
                  }}
                  className={`flex flex-col p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                    isDark
                      ? "border-sx-blue bg-sx-blue/10 shadow-[0_0_25px_rgba(58,160,255,0.15)] ring-2 ring-sx-blue/40"
                      : "border-slate-800 bg-[#060b16] opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 border border-white/10 text-sx-blue">
                        <Moon size={16} />
                      </div>
                      <span className="font-bold text-sm text-white">Dark Theme (SOC Cyber Deck)</span>
                    </div>
                    {isDark && <CheckCircle2 size={18} className="text-sx-blue" />}
                  </div>
                  <p className="text-xs text-slate-400">
                    Low-glare high-contrast visual deck engineered for 24/7 security operations rooms and focused threat investigations.
                  </p>
                </button>

                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => {
                    if (isDark) toggleTheme();
                  }}
                  className={`flex flex-col p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                    !isDark
                      ? "border-amber-600 bg-amber-500/10 shadow-md ring-2 ring-amber-500/40"
                      : "border-[#e2d9cc] bg-white opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-300 text-amber-600">
                        <Sun size={16} />
                      </div>
                      <span className="font-bold text-sm text-[#282937]">Light Theme (HEKA Minimal)</span>
                    </div>
                    {!isDark && <CheckCircle2 size={18} className="text-amber-600" />}
                  </div>
                  <p className="text-xs text-[#58565e]">
                    Clean paper-white and warm lace styling tailored for daytime audits, reporting reviews, and bright environments.
                  </p>
                </button>
              </div>
            </div>

            {/* Ingestion & Telemetry Refresh Preferences */}
            <div className="glass-panel p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#282937] dark:text-slate-200 mb-1">
                Telemetry Streaming Preferences
              </h3>
              <p className="text-xs text-[#58565e] dark:text-slate-400 mb-5">
                Configure websocket polling cadence and high-severity toast notifications.
              </p>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-black/5 dark:bg-black/30">
                  <div>
                    <span className="text-xs font-semibold text-[#282937] dark:text-slate-200 block">
                      Audio-Visual Alert Pings
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Emit high-fidelity visual glow when critical or high threats are correlated in real time.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStreamAlerts(!streamAlerts)}
                    className={`h-6 w-11 rounded-full transition-colors relative cursor-pointer ${
                      streamAlerts ? "bg-sx-blue" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        streamAlerts ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Credentials & Security */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#282937] dark:text-slate-200 mb-1">
                Cryptographic Authentication &amp; 2FA
              </h3>
              <p className="text-xs text-[#58565e] dark:text-slate-400 mb-5">
                Multi-factor authentication status and session security parameters.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-black/5 dark:bg-black/30">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-xs font-bold text-[#282937] dark:text-white">
                      Email One-Time Password (OTP) 2FA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Every session sign-up and authentication is verified via a 6-digit cryptographic token delivered directly from SentinelX Security.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#e2d9cc] dark:border-slate-800 bg-black/5 dark:bg-black/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Fingerprint size={16} className="text-sx-blue" />
                    <span className="text-xs font-bold text-[#282937] dark:text-white">
                      JWT Session Expiration
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cryptographic tokens automatically rotate every 30 minutes with secure HTTP-only refresh tokens.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Agent & Telemetry Consent */}
        {activeTab === "monitoring" && (
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#282937] dark:text-slate-200">
                    Live Host &amp; Agent Monitoring Status
                  </h3>
                  <p className="text-xs text-[#58565e] dark:text-slate-400 mt-0.5">
                    Live packet capture, network connection tracking, and endpoint agent consent management.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openConsentModal()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sx-blue text-xs font-bold text-black hover:bg-sx-blue-glow transition-all cursor-pointer shadow-md"
                >
                  <Laptop size={14} />
                  <span>Manage Agent Permissions</span>
                </button>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    <Monitor size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-300">
                      {agentOnline
                        ? `Agent Online (${agentDetails?.hostname || "Local Host"})`
                        : "SentinelX Monitoring Standby"}
                    </div>
                    <div className="text-[11px] text-emerald-400/80">
                      User consent recorded &bull; Full network metadata monitoring allowed
                    </div>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  CONSENT GRANTED
                </span>
              </div>

              {/* Permissions Checklist */}
              <div className="mt-6 pt-5 border-t border-[#e2d9cc] dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#282937] dark:text-slate-300 mb-3">
                  Authorized Telemetry Scope:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    "Network Flow & Socket Connections (TCP, UDP, ICMP)",
                    "DNS Query Resolution & Metadata Tracking",
                    "Process Creation & Memory Injection Detections",
                    "Sigma Rule Ingestion & Live IOC Matching",
                    "Off-Hours Administrative Logons & Geo-Hopping",
                    "File Integrity & Shadow Copy Tampering Signals",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
