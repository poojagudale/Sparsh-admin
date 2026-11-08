import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { loginWithEmail, loginWithGoogle } from '../api/authApi';
import heroImg from '../assets/hero.jpg';
import sparshLogo from '../assets/sparsh-logo.jpg';
import styles from './Login.module.scss';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleBtnWidth, setGoogleBtnWidth] = useState(380);
  const googleWrapperRef = useRef(null);

  const { saveAuth } = useAuth();
  const navigate = useNavigate();

  // Clear any previous non-admin session so the login page always opens cleanly
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sparsh_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.role !== 'ADMIN') {
          localStorage.removeItem('sparsh_token');
          localStorage.removeItem('sparsh_user');
        }
      }
    } catch (e) {
      console.warn('Session verification warning:', e);
    }
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (googleWrapperRef.current) {
        const clientWidth = googleWrapperRef.current.clientWidth;
        if (clientWidth > 0) {
          // Google GSI button width allowed range: 200px to 400px
          const clamped = Math.min(400, Math.max(200, Math.floor(clientWidth)));
          setGoogleBtnWidth(clamped);
        }
      }
    };
    updateWidth();
    const timer = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // ── Local Admin Login ──────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const authResponse = await loginWithEmail(email, password);

      // Verify role from backend database response
      if (authResponse.role !== 'ADMIN') {
        setError('Access denied: Your account does not have Administrator privileges.');
        return;
      }

      saveAuth(authResponse);

      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
      } else {
        localStorage.removeItem('remember_me');
      }

      navigate('/home');
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth Login for Admin ───────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      if (!credentialResponse || !credentialResponse.credential) {
        throw new Error('Google credential token was not received.');
      }

      // Extract picture from token payload if available
      let googlePicture = null;
      try {
        const payloadBase64 = credentialResponse.credential.split('.')[1];
        if (payloadBase64) {
          const parsed = JSON.parse(atob(payloadBase64));
          googlePicture = parsed.picture || null;
        }
      } catch (tokenParseErr) {
        console.warn('Could not extract Google payload locally:', tokenParseErr);
      }

      // Authenticate with backend and verify role from database
      const authResponse = await loginWithGoogle(credentialResponse.credential);

      if (authResponse.role !== 'ADMIN') {
        setError(
          `Access denied: The account does not have Administrator privileges.`
        );
        return;
      }

      if (googlePicture && !authResponse.profilePicture) {
        authResponse.profilePicture = googlePicture;
      }

      saveAuth(authResponse);
      navigate('/home');
    } catch (err) {
      console.error('Google Auth Admin Error:', err);
      const msg = err.response?.data?.message || err.message || 'Google sign-in failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    console.error('Google sign-in component reported error:', err);
    setError('Google sign-in was cancelled or failed.');
  };

  return (
    <div className={styles.splitPageContainer}>
      <div className={styles.layoutWrapper}>

        {/* ── LEFT SIDE (50%): Image Banner with Overlay ── */}
        <motion.div
          className={styles.imageColumn}
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className={styles.imageBg} style={{ backgroundImage: `url(${heroImg})` }} />
          <div className={styles.imageOverlay} />
          <div className={styles.floatingContent}>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Welcome Back
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              Beauty Begins Here
            </motion.p>
          </div>
        </motion.div>

        {/* ── RIGHT SIDE (50%): Glassmorphism Form Card ── */}
        <motion.div
          className={styles.formColumn}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className={styles.backToHome}>
            <Link to="/">&larr; Back to Home</Link>
          </div>

          <motion.div
            className={styles.loginCard}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className={styles.header}>
              <img src={sparshLogo} alt="Sparsh Salon & Spa" className={styles.logoBadge} />
              <h1>Welcome Back</h1>
              <p>Sign in to continue to SPARSH Admin</p>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <form className={styles.form} onSubmit={handleLogin}>
              <div className={styles.inputGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className={styles.optionsRow}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember Me</span>
                </label>
                <a href="#forgot" className={styles.forgotLink} onClick={(e) => {
                  e.preventDefault();
                  alert("Please contact your salon management to reset your administrator password.");
                }}>
                  Forgot Password?
                </a>
              </div>

              <motion.button
                type="submit"
                className={styles.submitBtn}
                disabled={loading}
                id="login-submit-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </motion.button>
            </form>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <div ref={googleWrapperRef} className={styles.googleBtnWrapper} id="google-login-btn">
              <GoogleLogin
                key={googleBtnWidth}
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                shape="rectangular"
                size="large"
                text="signin_with"
                width={googleBtnWidth}
              />
            </div>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
};

export default Login;
