import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const Register = () => {
  const [step, setStep] = useState(1); // 1: Info Form, 2: OTP Verification Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { register, verifyRegistrationOtp, resendOtp } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const data = await register(name, email, password);
      setStep(2);
      setInfoMessage(data.message || `A 6-digit OTP code has been sent to ${email}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      await verifyRegistrationOtp(email, otp);
      navigate('/analyze');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');
    setInfoMessage('');
    try {
      const data = await resendOtp(email, 'registration');
      setInfoMessage(data.message || 'A new 6-digit OTP code has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '450px', marginTop: '40px' }}>
      <div className="card">
        <h2>{step === 1 ? 'Register New Account' : 'Verify Email with OTP'}</h2>

        {error && <div className="error-message">{error}</div>}
        {infoMessage && (
          <div style={{ color: '#16a34a', padding: '10px', background: '#f0fdf4', borderRadius: '4px', marginBottom: '16px', border: '1px solid #bbf7d0', fontSize: '14px' }}>
            {infoMessage}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRegisterSubmit}>
            <div>
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

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
              <label htmlFor="password">Password (min 6 characters)</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="******"
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Continue with OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <p style={{ color: '#4b5563', fontSize: '14px', marginBottom: '16px' }}>
              Please enter the 6-digit OTP sent to <strong>{email}</strong>
            </p>

            <div>
              <label htmlFor="otp">6-Digit Verification Code</label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                required
                maxLength={6}
                minLength={6}
                placeholder="123456"
                style={{ letterSpacing: '4px', fontSize: '18px', textAlign: 'center', fontWeight: 'bold' }}
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Verifying OTP...' : 'Verify OTP & Complete Registration'}
            </button>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                style={{ background: 'transparent', color: '#2563eb', border: 'none', padding: '0', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}
              >
                {resending ? 'Sending...' : 'Resend OTP'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{ background: 'transparent', color: '#6b7280', border: 'none', padding: '0', cursor: 'pointer', fontSize: '14px' }}
              >
                Change Details
              </button>
            </div>
          </form>
        )}

        <p style={{ marginTop: '20px' }}>
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
