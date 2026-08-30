import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, AlertCircle, Check, Copy } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle, signInWithCredentials } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('ovi.it');
  const [password, setPassword] = useState('');
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyHostname = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.hostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithCredentials(username, password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'সিস্টেমে প্রবেশ করতে সমস্যা হয়েছে। (Failed to enter the system.)');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/popup-closed-by-user') {
        // Just ignore if the user closed the popup
        setError('');
      } else if (err?.code === 'auth/unauthorized-domain' || (err?.message && err.message.includes('unauthorized-domain'))) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'your-domain';
        setError(`এই ডোমেইনটি (${hostname}) ফায়ারবেস-এ অথরাইজড ডোমেইন হিসেবে যুক্ত করা নেই। অনুগ্রহ করে ফায়ারবেস কনসোলে এই ডোমেইনটি যুক্ত করুন অথবা ইউজার আইডি "ovi.it" এবং পাসওয়ার্ড "5656" দিয়ে সরাসরি অফলাইন এডমিন হিসেবে সাইন-ইন করুন। (This domain "${hostname}" is not authorized in Firebase. Please add this domain to Authorized Domains in Firebase Console, or sign in using User ID "ovi.it" and Password "5656".)`);
      } else {
        setError('গুগল লগইন করতে সমস্যা হয়েছে। (Google Login failed.)');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="l-form relative min-h-screen w-full bg-[#f8fafc] flex items-center justify-center overflow-hidden font-sans" id="login-container">
      
      {/* Bedimcode style background decorative circle shapes */}
      <div className="shape1 absolute w-[200px] h-[200px] lg:w-[400px] lg:h-[400px] rounded-full -top-[7rem] -left-[3.5rem] lg:-top-[11rem] lg:-left-[6.5rem] bg-gradient-to-b from-[#12192C]/15 to-transparent pointer-events-none z-0"></div>
      <div className="shape2 absolute w-[200px] h-[200px] lg:w-[300px] lg:h-[300px] rounded-full -bottom-[6rem] -right-[5.5rem] lg:-right-[6.5rem] bg-gradient-to-b from-[#12192C]/15 to-transparent rotate-180 pointer-events-none z-0"></div>

      {/* Main Responsive Grid Layout (exactly Bedimcode styling) */}
      <div className="form z-10 w-full max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] items-center justify-center gap-12 lg:gap-20">
        
        {/* Left Column: Big Brand Logo & Name (visible on desktop) without border or backgrounds */}
        <div className="form__img hidden lg:flex flex-col items-center justify-center text-center space-y-6" id="desktop-brand-showcase">
          <img 
            src="https://lh3.googleusercontent.com/d/1x7Fp3Wsk8PqHLmMePPaah1wPdjs4SSvr" 
            alt="BSK Logo" 
            referrerPolicy="no-referrer"
            className="w-80 h-80 lg:w-96 lg:h-96 object-contain" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fb = e.currentTarget.nextElementSibling as HTMLElement;
              if (fb) fb.style.display = 'block';
            }}
          />
          <div style={{ display: 'none' }} className="w-80 h-80 lg:w-96 lg:h-96 text-[#12192C] flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-72 h-72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="24" r="9" fill="#12192C" />
              <path d="M12,46 C24,42 32,32 44,48 C50,56 60,78 72,78 L84,78 C88,78 86,64 80,54 C74,44 64,24 52,14 C48,10 40,24 36,32 C30,42 16,48 12,46 Z" fill="#12192C" />
              <path d="M16,84 L88,84 C92,84 94,80 92,76 C88,72 82,72 74,72 L24,72 C18,72 14,76 16,84 Z" fill="#12192C" opacity="0.8" />
            </svg>
          </div>
        </div>

        {/* Right Column: Clean Form content with NO background boxes, borders, or text overload */}
        <div className="form__content w-full max-w-[320px] mx-auto flex flex-col justify-center" id="login-box-card">
          
          <h1 className="form__title text-3xl font-medium text-[#12192C] mb-8 text-center tracking-tight">
            Login
          </h1>

          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold border border-red-100 flex items-start gap-2 text-left">
              <AlertCircle size={14} className="shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input Field */}
            <div className={`relative flex items-center border-b py-2 mb-6 transition-colors duration-300 ${usernameFocused ? 'border-[#12192C]' : 'border-[#8590AD]/40'}`}>
              <span className={`mr-3 transition-colors duration-300 ${usernameFocused ? 'text-[#12192C]' : 'text-[#8590AD]'}`}>
                <User size={18} />
              </span>
              <div className="relative flex-1">
                <label 
                  className={`absolute left-0 transition-all duration-300 pointer-events-none ${
                    usernameFocused || username ? 'top-[-1.1rem] text-[10px] text-[#12192C] font-bold uppercase tracking-wider' : 'top-0.5 text-xs text-[#8590AD] font-medium'
                  }`}
                >
                  Username
                </label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  className="w-full bg-transparent border-none outline-none text-xs font-semibold text-[#12192C] pt-1"
                />
              </div>
            </div>

            {/* Password Input Field */}
            <div className={`relative flex items-center border-b py-2 mb-8 transition-colors duration-300 ${passwordFocused ? 'border-[#12192C]' : 'border-[#8590AD]/40'}`}>
              <span className={`mr-3 transition-colors duration-300 ${passwordFocused ? 'text-[#12192C]' : 'text-[#8590AD]'}`}>
                <Lock size={18} />
              </span>
              <div className="relative flex-1">
                <label 
                  className={`absolute left-0 transition-all duration-300 pointer-events-none ${
                    passwordFocused || password ? 'top-[-1.1rem] text-[10px] text-[#12192C] font-bold uppercase tracking-wider' : 'top-0.5 text-xs text-[#8590AD] font-medium'
                  }`}
                >
                  Password
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="w-full bg-transparent border-none outline-none text-xs font-semibold text-[#12192C] pt-1"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="form__button w-full py-3.5 bg-[#12192C] hover:bg-[#1f2a47] text-white font-medium rounded-lg hover:shadow-lg hover:shadow-slate-900/10 active:scale-[0.99] transition-all duration-300 text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : 'Login'}
            </button>

            {/* Google Account Authentication button */}
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 bg-white text-[#12192C] border border-slate-200 hover:bg-slate-50 font-semibold rounded-lg hover:shadow-sm active:scale-[0.99] transition-all duration-200 text-xs cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-8.83z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.32 14.24c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.51H1.21A11.94 11.94 0 000 12c0 2.01.5 3.93 1.21 5.49l4.11-3.25z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.18 2.12 1.21 5.51l4.11 3.25c.94-2.85 3.57-4.96 6.68-4.96z" />
              </svg>
              <span>Sign in with Google Account</span>
            </button>


          </form>
        </div>
      </div>

    </div>
  );
}
