import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL;

function Callback() {
  const [status, setStatus] = useState('Authenticating...');
  const navigate = useNavigate();

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const returnedState = urlParams.get('state');
      const savedState = sessionStorage.getItem('oauth_state');

      // Validate the state parameter to prevent CSRF
      if (returnedState !== savedState) {
        setStatus('Error: State mismatch — possible CSRF attack.');
        return;
      }

      if (!code) {
        setStatus('Error: No authorization code found.');
        return;
      }

      try {
        // Send code to Django backend to exchange for access token
        const response = await fetch(`${API_URL}/api/auth/github/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (data.access_token) {
          sessionStorage.setItem('github_token', data.access_token);
          sessionStorage.removeItem('oauth_state');
          navigate('/dashboard');
        } else {
          setStatus(`Authentication failed: ${data.error || 'Unknown error'}`);
        }
      } catch (error) {
        setStatus(`Error: ${error.message}`);
      }
    };

    exchangeCodeForToken();
  }, [navigate]);

  return (
    <div className="callback-container">
      <div className="spinner"></div>
      <h2>{status}</h2>
    </div>
  );
}

export default Callback;
