import React, { useEffect, useState, useContext } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { verifyEmail } = useContext(AuthContext);
  const navigate = useNavigate();

  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email address, please wait...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided in the link. Please check your email link.');
      return;
    }

    const performVerification = async () => {
      try {
        const data = await verifyEmail(token);
        setStatus('success');
        setMessage(data.message || 'Email verified successfully! Redirecting...');
        setTimeout(() => {
          navigate('/analyze');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. The link may be invalid or expired.');
      }
    };

    performVerification();
  }, [token]);

  return (
    <div className="container" style={{ maxWidth: '500px', marginTop: '50px' }}>
      <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
        <h2>Email Verification</h2>

        {status === 'verifying' && (
          <div style={{ margin: '20px 0' }}>
            <p>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div style={{ margin: '20px 0' }}>
            <div style={{ color: '#16a34a', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
              ✓ {message}
            </div>
            <p style={{ color: '#666' }}>You will be redirected automatically, or click below:</p>
            <Link to="/analyze" style={{ display: 'inline-block', marginTop: '12px', className: 'button' }}>
              Go to Dashboard
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div style={{ margin: '20px 0' }}>
            <div className="error-message" style={{ marginBottom: '16px' }}>
              {message}
            </div>
            <p style={{ color: '#666' }}>
              Need a new link? <Link to="/login">Login to resend verification link</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
