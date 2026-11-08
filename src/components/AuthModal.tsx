import { useState } from 'react';
import { LogIn, UserPlus, X, Eye, EyeOff, BookOpen, Mail, KeyRound } from 'lucide-react';
import { signIn, signUp, sendPasswordResetEmail, updatePassword } from '../services/supabaseService';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: AuthMode;
}

export default function AuthModal({ onClose, onSuccess, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const clearMessages = () => { setError(''); setSuccessMsg(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: authError } = await signIn(email, password);
        if (authError) throw authError;
        onSuccess();
        onClose();

      } else if (mode === 'register') {
        const { error: authError } = await signUp(email, password);
        if (authError) throw authError;
        setSuccessMsg('Cuenta creada exitosamente. Revisa tu correo para confirmar tu cuenta, luego inicia sesión.');
        setMode('login');

      } else if (mode === 'forgot') {
        const { error: authError } = await sendPasswordResetEmail(email);
        if (authError) throw authError;
        setSuccessMsg('Te enviamos un enlace de recuperación. Revisa tu bandeja de entrada (y la carpeta de spam).');

      } else if (mode === 'reset') {
        if (newPassword !== confirmPassword) {
          setError('Las contraseñas no coinciden.');
          return;
        }
        const { error: authError } = await updatePassword(newPassword);
        if (authError) throw authError;
        setSuccessMsg('Contraseña actualizada correctamente. Ya puedes usar tu nueva contraseña.');
        setTimeout(() => { onSuccess(); onClose(); }, 2000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar la solicitud';
      if (message.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos.');
      } else if (message.includes('Email not confirmed')) {
        setError('Debes confirmar tu correo antes de iniciar sesión.');
      } else if (message.includes('User already registered')) {
        setError('Este correo ya está registrado. Inicia sesión.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: AuthMode) => { setMode(next); clearMessages(); };

  const isResetMode = mode === 'reset';

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div className="auth-modal-logo">
            <BookOpen size={28} color="#003087" />
            <span>Tu Opinión Cuenta</span>
          </div>
          <button className="auth-btn-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {!isResetMode && (
          <div className="auth-mode-tabs">
            <button
              className={`auth-tab ${mode === 'login' || mode === 'forgot' ? 'active' : ''}`}
              onClick={() => switchMode('login')}
            >
              <LogIn size={16} />
              Iniciar Sesión
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode('register')}
            >
              <UserPlus size={16} />
              Registrarse
            </button>
          </div>
        )}

        {isResetMode && (
          <div className="auth-reset-header">
            <KeyRound size={22} color="#003087" />
            <span>Nueva contraseña</span>
          </div>
        )}

        {mode === 'forgot' && (
          <p className="auth-section-subtitle">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>

          {/* Email — login, register, forgot */}
          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <div className="form-group">
              <label htmlFor="auth-email">Correo electrónico</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@upt.pe"
                required
                autoComplete="email"
              />
            </div>
          )}

          {/* Password — login, register */}
          {(mode === 'login' || mode === 'register') && (
            <div className="form-group">
              <label htmlFor="auth-password">Contraseña</label>
              <div className="auth-password-wrapper">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="auth-toggle-password"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {mode === 'register' && (
                <span className="auth-hint">Mínimo 6 caracteres</span>
              )}
            </div>
          )}

          {/* Forgot password link */}
          {mode === 'login' && (
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => switchMode('forgot')}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {/* New password fields — reset mode */}
          {mode === 'reset' && (
            <>
              <div className="form-group">
                <label htmlFor="auth-new-password">Nueva contraseña</label>
                <div className="auth-password-wrapper">
                  <input
                    id="auth-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-toggle-password"
                    onClick={() => setShowNewPassword(v => !v)}
                    aria-label={showNewPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span className="auth-hint">Mínimo 6 caracteres</span>
              </div>
              <div className="form-group">
                <label htmlFor="auth-confirm-password">Confirmar contraseña</label>
                <div className="auth-password-wrapper">
                  <input
                    id="auth-confirm-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </>
          )}

          {error && <div className="auth-error">{error}</div>}
          {successMsg && <div className="auth-success">{successMsg}</div>}

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="spinner-small" />
            ) : mode === 'login' ? (
              <LogIn size={18} />
            ) : mode === 'register' ? (
              <UserPlus size={18} />
            ) : mode === 'forgot' ? (
              <Mail size={18} />
            ) : (
              <KeyRound size={18} />
            )}
            {loading
              ? 'Procesando...'
              : mode === 'login'
              ? 'Iniciar Sesión'
              : mode === 'register'
              ? 'Crear Cuenta'
              : mode === 'forgot'
              ? 'Enviar enlace de recuperación'
              : 'Guardar nueva contraseña'}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              className="auth-back-link"
              onClick={() => switchMode('login')}
            >
              ← Volver a iniciar sesión
            </button>
          )}
        </form>

        <p className="auth-info-text">
          Tus datos de evaluación se guardarán de forma segura en la nube y podrás acceder desde cualquier computadora.
        </p>
      </div>
    </div>
  );
}
