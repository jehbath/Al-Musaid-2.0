import { useEffect, useState } from "react";
import "./AuthModal.css";
import { login } from "./services/api";

// نافذة تسجيل الدخول
// إنشاء الحسابات يتم من قبل البنك، لذلك لا يوجد تسجيل حساب جديد في التطبيق
function AuthModal({ notice = "", onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // إغلاق النافذة بزر Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };

    window.addEventListener("keydown", handleKey);

    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, submitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      const user = await login(email.trim(), password);

      onSuccess(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="auth-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          className="auth-close"
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          disabled={submitting}
        >
          ×
        </button>

        <div className="auth-header">
          <div className="brand-logo auth-logo">
            <span>M</span>
          </div>

          <h2 id="auth-title">تسجيل الدخول</h2>

          <p>سجّل دخولك للوصول إلى رصيدك ومعاملاتك.</p>
        </div>

        {notice && <div className="auth-notice">{notice}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>البريد الإلكتروني</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
              dir="ltr"
              required
              autoFocus
            />
          </label>

          <label className="auth-field">
            <span>كلمة المرور</span>
            <div className="auth-password">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                dir="ltr"
                maxLength={128}
                required
              />
              <button
                type="button"
                className="auth-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? "إخفاء" : "إظهار"}
              </button>
            </div>
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? "جارٍ التحميل..." : "دخول"}
          </button>
        </form>

        <p className="auth-footer">
          ليس لديك حساب؟ تواصل مع البنك أو زر أقرب فرع لفتح حساب.
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
