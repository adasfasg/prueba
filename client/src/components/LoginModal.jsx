import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_PRESETS, getDashboardRoute } from '../context/AuthContext';
import { 
  X, Lock, User, Mail, AlertCircle, Sparkles, CheckCircle2, 
  KeyRound, ArrowLeft, RefreshCw, ShieldCheck
} from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const { requestLogin, verify2FA, resend2FA } = useAuth();
  const navigate = useNavigate();

  // Step 1: Credentials, Step 2: 2FA OTP
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  // 2FA session details from backend
  const [tempToken, setTempToken] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devOtp, setDevOtp] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  if (!isOpen) return null;

  // Step 1: Submit credentials (username/email + password)
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await requestLogin(identifier, password);
      if (data.requires_2fa) {
        setTempToken(data.temp_token);
        setMaskedEmail(data.masked_email);
        setDevOtp(data.dev_otp);
        setStep(2);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit 6-digit OTP code
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await verify2FA(tempToken, otpCode);
      onClose();
      // Reset state for next open
      setStep(1);
      setIdentifier('');
      setPassword('');
      setOtpCode('');
      navigate(getDashboardRoute(user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!tempToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await resend2FA(tempToken);
      setResendSuccess(true);
      if (data.dev_otp) setDevOtp(data.dev_otp);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setIdentifier(preset.username || preset.email);
    setPassword(preset.pass);
    setError(null);
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setOtpCode('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              {step === 1 ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-white">
                {step === 1 ? 'Acceso a PMForgeX' : 'Verificación de Seguridad'}
              </h3>
              <p className="text-xs text-slate-400">
                {step === 1 ? 'Ingreso con Usuario y Contraseña' : 'Código de Acceso 2FA por Correo'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-400 text-xs animate-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Resend success alert */}
        {resendSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Nuevo código de verificación enviado a tu correo.</span>
          </div>
        )}

        {/* ========================================================
            PASO 1: Ingreso de Usuario / Correo + Contraseña
        ======================================================== */}
        {step === 1 && (
          <div>
            {/* Demo Fast-Switch Buttons con Nombre de Usuario */}
            <div className="mt-4 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
                <span className="flex items-center gap-1 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Acceso Rápido por Rol (1-Click Presets):</span>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-left">
                {DEMO_PRESETS.map((p) => (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-all truncate hover:scale-[1.02] cursor-pointer ${p.badgeColor}`}
                    title={`Usuario: ${p.username} | ${p.label}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Usuario o Correo Electrónico
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Ej. admin o admin@pmforgex.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continuar al Código 2FA</span>
                    <KeyRound className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            PASO 2: Verificación de Código 2FA / OTP enviado al Correo
        ======================================================== */}
        {step === 2 && (
          <div className="mt-4 space-y-5 animate-in slide-in-from-right-2 duration-200">
            
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-2">
                <Mail className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-300">
                Hemos enviado un código de acceso de 6 dígitos a tu correo:
              </p>
              <div className="text-sm font-bold font-mono text-amber-400 bg-slate-950 py-1 px-3 rounded-lg border border-slate-800 inline-block">
                {maskedEmail}
              </div>
            </div>

            {/* Helper Box para pruebas inmediatas en desarrollo */}
            {devOtp && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-400">Código Generado para Pruebas:</span>
                <div 
                  onClick={() => setOtpCode(devOtp)}
                  className="font-mono text-xl font-extrabold text-white tracking-widest cursor-pointer hover:text-amber-400 transition-colors"
                  title="Haz clic para autocompletar este código"
                >
                  {devOtp}
                </div>
                <span className="text-[10px] text-slate-400 block">(Haz clic para autocompletar)</span>
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 text-center">
                  Ingresa el Código de 6 Dígitos
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-2xl font-mono tracking-[10px] font-extrabold placeholder:text-slate-700 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <span className="text-[10px] text-slate-500 text-center block mt-1.5">
                  El código caduca en 10 minutos.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verificar e Iniciar Sesión</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleBackToStep1}
                  className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Usuario</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reenviar Código</span>
                </button>
              </div>

            </form>

          </div>
        )}

      </div>
    </div>
  );
}
