import { useState } from 'react';
import { LogIn, UserPlus, X, Eye, EyeOff, BookOpen } from 'lucide-react';
import { signIn, signUp } from '../services/supabaseService';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error: authError } = await signIn(email, password);
        if (authError) throw authError;
        onSuccess();
        onClose();
      } else {
        const { error: authError } = await signUp(email, password);
        if (authError) throw authError;
        setSuccessMsg('Cuenta creada exitosamente. Revisa tu correo para confirmar tu cuenta, luego inicia sesión.');
        setMode('login');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al autenticar';
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

        <div className="auth-mode-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
          >
            <LogIn size={16} />
            Iniciar Sesión
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
          >
            <UserPlus size={16} />
            Registrarse
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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

          {error && <div className="auth-error">{error}</div>}
          {successMsg && <div className="auth-success">{successMsg}</div>}

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? (
              <span className="spinner-small" />
            ) : mode === 'login' ? (
              <LogIn size={18} />
            ) : (
              <UserPlus size={18} />
            )}
            {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="auth-info-text">
          Tus datos de evaluación se guardarán de forma segura en la nube y podrás acceder desde cualquier computadora.
        </p>
      </div>
    </div>
  );
}
