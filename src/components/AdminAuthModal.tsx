import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Mail, 
  Clock, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: any) => void;
}

type AuthScreen = 'login' | 'otp_verification' | 'reset_password' | 'success';

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  // Navigation Screen State
  const [screen, setScreen] = useState<AuthScreen>('login');
  
  // Screen A: Login
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Screen B: OTP
  const [otpCode, setOtpCode] = useState('');
  const [targetEmail, setTargetEmail] = useState('alisher981322@gmail.com');
  const [maskedEmail, setMaskedEmail] = useState('a*****2@gmail.com');
  const [otpTimer, setOtpTimer] = useState<number>(300); // 5 minutes (300s)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Screen C: Set New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // General States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setScreen('login');
      setPassword('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setInfoMessage(null);
      setResetToken(null);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  // Handle countdown timer for OTP
  useEffect(() => {
    if (isTimerRunning && otpTimer > 0) {
      timerRef.current = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (otpTimer === 0) {
      setIsTimerRunning(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, otpTimer]);

  if (!isOpen) return null;

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Submit Login (Screen A)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || '') + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to authenticate administrator.');
      }

      // Save token locally
      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
      }

      onLoginSuccess(data.token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please verify your password.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Request OTP (Transitions to Screen B)
  const handleRequestOtp = async () => {
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || '') + '/api/admin/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate OTP passcode.');
      }

      if (data.emailMasked) {
        setMaskedEmail(data.emailMasked);
      }
      // Ensure OTP input starts completely empty and blank - user must type manually
      setOtpCode('');

      // Start 5 min countdown
      setOtpTimer(300);
      setIsTimerRunning(true);
      setScreen('otp_verification');
      setInfoMessage(data.message || 'OTP code dispatched to administrator email.');
    } catch (err: any) {
      setError(err.message || 'Error requesting OTP verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Verify OTP (Screen B -> Screen C)
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || '') + '/api/admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Invalid or expired OTP code.');
      }

      // Store reset token and unlock Screen C
      setResetToken(data.resetToken);
      setScreen('reset_password');
      setInfoMessage('Verification successful! You can now set a new password.');
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Change Password (Screen C)
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) {
      setError('Session expired. Please verify OTP again.');
      setScreen('otp_verification');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || '') + '/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          newPassword,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setScreen('success');
      setInfoMessage('Administrator password successfully updated!');
    } catch (err: any) {
      setError(err.message || 'Error changing password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0F131D] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-white overflow-hidden">
        
        {/* Subtle Luxury Gradient glow at top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600"></div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white transition-all cursor-pointer"
          title="Close Admin Authentication"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Branding */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#D4AF37] via-[#C5A880] to-[#997B4D] p-[1.5px] shadow-lg flex-shrink-0">
            <div className="w-full h-full bg-[#141822] rounded-[14px] flex items-center justify-center text-amber-300">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-serif-luxury text-white tracking-wide">
                PureSmile Admin
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                Secure
              </span>
            </div>
            <p className="text-xs text-stone-400 font-mono">
              Clinical Operations & Database Console
            </p>
          </div>
        </div>

        {/* Global Notifications inside Modal */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {infoMessage && (
          <div className="mb-5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{infoMessage}</div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN A: ADMIN PASSWORD LOGIN                           */}
        {/* ======================================================== */}
        {screen === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-300 font-mono">
                  Administrator Password
                </label>
                <span className="text-[11px] text-amber-400/80 font-mono">
                  PureSmile Master Key
                </span>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator master password..."
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-stone-900/90 border border-stone-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-stone-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleRequestOtp}
                className="text-amber-400 hover:text-amber-300 underline underline-offset-4 font-medium transition-colors cursor-pointer"
              >
                Forgot or Change Password? (Send OTP)
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold uppercase tracking-widest text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Master Key...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate as Admin</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* SCREEN B: OTP VERIFICATION (6-digit, 5-min timer)       */}
        {/* ======================================================== */}
        {screen === 'otp_verification' && (
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-5">
            <div className="bg-stone-900/60 p-3.5 rounded-2xl border border-stone-800 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Mail className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="text-stone-400">Security Passcode Dispatched to:</div>
                <div className="font-mono font-bold text-amber-300">{maskedEmail}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  (Check server CMD terminal for local code)
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-300 font-mono">
                  6-Digit OTP Code
                </label>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(otpTimer)}</span>
                </div>
              </div>
              <input 
                type="text" 
                maxLength={6}
                autoFocus
                required
                autoComplete="off"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[12px] text-2xl font-mono py-3.5 rounded-xl bg-stone-900 border border-stone-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-stone-600 outline-none transition-all font-bold"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setScreen('login')}
                className="text-stone-400 hover:text-stone-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={loading || otpTimer > 270} // 30s resend cooldown
                className="text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer disabled:opacity-40"
              >
                {otpTimer > 270 ? `Resend in ${otpTimer - 270}s` : 'Resend Code'}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6 || otpTimer === 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold uppercase tracking-widest text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating Code...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Verify OTP Passcode</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* SCREEN C: SET NEW PASSWORD                               */}
        {/* ======================================================== */}
        {screen === 'reset_password' && (
          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Identity verified via OTP. Choose your new administrator password.</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 font-mono mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input 
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters..."
                  className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-stone-900 border border-stone-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-stone-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 font-mono mb-1.5">
                Confirm New Password
              </label>
              <input 
                type={showNewPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password..."
                className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-stone-500 outline-none transition-all"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold uppercase tracking-widest text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Committing New Key...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save & Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* SCREEN SUCCESS: PASSWORD CHANGED                         */}
        {/* ======================================================== */}
        {screen === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif-luxury text-white">
                Password Successfully Updated
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Your new administrator credentials have been securely committed to the server.
              </p>
            </div>
            <button
              onClick={() => {
                setScreen('login');
                setPassword('');
                setError(null);
                setInfoMessage(null);
              }}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs uppercase tracking-wider transition-all"
            >
              Proceed to Admin Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
