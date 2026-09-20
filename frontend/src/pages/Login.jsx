import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { login, resendVerification } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setIsUnverified(false);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/analyze');
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.isVerified === false) {
        setIsUnverified(true);
        setError(errData.error || 'Please verify your email address before logging in.');
      } else {
        setError(errData?.error || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setInfoMessage('');
    try {
      const res = await resendVerification(email);
      setInfoMessage(res.message || 'Verification email resent successfully! Please check your inbox.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '450px', marginTop: '40px' }}>
      <div className="card">
        <h2>Login to SRS Ambiguity Detector</h2>
        {error && <div className="error-message">{error}</div>}
        {infoMessage && (
          <div style={{ color: '#16a34a', padding: '10px', background: '#f0fdf4', borderRadius: '4px', marginBottom: '16px', border: '1px solid #bbf7d0' }}>
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="******"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {isUnverified && (
          <div style={{ marginTop: '16px', padding: '12px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#92400e' }}>
              Didn't receive the verification email or link expired?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              style={{ background: '#d97706', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}
            >
              {resending ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>
        )}

        <p style={{ marginTop: '16px' }}>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
