import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";

declare global {
  interface Window {
    google?: any;
  }
}

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenClientRef = useRef<any>(null);
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);

  // Read Google Client ID from Vite environment variables
  const googleClientId =
    (import.meta as any).env.VITE_GOOGLE_CLIENT_ID ||
    "";

  // Handle token response from Google
  const handleAuthSuccess = useCallback(
    async (authPayload: { credential?: string; access_token?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await apiClient.post("/api/auth/google", authPayload);
        setSession(data.access_token, data.refresh_token);
        const me = await apiClient.get("/api/auth/me", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        setUser(me.data);
        navigate("/dashboard");
      } catch (err: any) {
        setError(
          err?.response?.data?.detail || "Google authentication failed. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [navigate, setSession, setUser]
  );

  // Initialize Google Identity Services
  useEffect(() => {
    if (!googleClientId) return;

    const initGsi = () => {
      if (window.google?.accounts?.oauth2) {
        // Initialize OAuth 2.0 token client for clean popup auth flow
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "email profile openid",
          callback: (tokenResponse: any) => {
            if (tokenResponse.error) {
              setError(`Google Sign-In canceled: ${tokenResponse.error}`);
              return;
            }
            if (tokenResponse.access_token) {
              handleAuthSuccess({ access_token: tokenResponse.access_token });
            }
          },
        });
      }

      if (window.google?.accounts?.id) {
        // Also initialize ID token flow (for One Tap if desired)
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (response.credential) {
              handleAuthSuccess({ credential: response.credential });
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };

    if (window.google?.accounts) {
      initGsi();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts) {
          clearInterval(timer);
          initGsi();
        }
      }, 250);
      return () => clearInterval(timer);
    }
  }, [googleClientId, handleAuthSuccess]);

  // Trigger Google sign in
  const triggerGoogleSignIn = () => {
    setError(null);

    if (!googleClientId) {
      setError(
        "Google OAuth Client ID is not configured yet. Please add VITE_GOOGLE_CLIENT_ID to your frontend .env file."
      );
      return;
    }

    // Prefer OAuth2 popup client for explicit button clicks
    if (tokenClientRef.current) {
      tokenClientRef.current.requestAccessToken();
      return;
    }

    // Fallback to Google ID prompt if token client is still mounting
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }

    setError("Google Sign-In is initializing. Please click again in a moment.");
  };

  return {
    triggerGoogleSignIn,
    loading,
    error,
    setError,
    googleClientId,
  };
}

