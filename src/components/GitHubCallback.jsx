import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GitHubCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      
      if (!code) {
        // If no code, try to get data from backend callback
        // The backend might have already set localStorage via script
        const githubId = localStorage.getItem('githubId');
        const userId = localStorage.getItem('userId');
        
        if (githubId && userId) {
          // Already authenticated, redirect to main app
          navigate('/', { replace: true });
          return;
        } else {
          // No auth data, redirect to login
          navigate('/login', { replace: true });
          return;
        }
      }

      // If we have a code, the backend should handle it
      // Redirect to backend callback which will set localStorage and redirect back
      window.location.href = `/github/callback?code=${code}`;
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only depend on searchParams, navigate is stable

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1>Completing GitHub authentication...</h1>
      <p>Please wait while we redirect you.</p>
    </div>
  );
};

export default GitHubCallback;

