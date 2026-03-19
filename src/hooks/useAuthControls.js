import { useEffect, useState } from "react";
import {
  authenticateStaff,
  clearStoredSession,
  requestPasswordReset,
  updateOwnPassword,
  logAppEvent
} from "../lib/api";
import { subscribeToAuthChanges } from "../lib/supabase";
import { loginInitialState } from "../app/constants";

export function useAuthControls({ refreshData, setActiveView, resetWorkspace }) {
  const [loginForm, setLoginForm] = useState(loginInitialState);
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [passwordResetFeedback, setPasswordResetFeedback] = useState("");
  const [isRequestingPasswordReset, setIsRequestingPasswordReset] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [isFinishingRecovery, setIsFinishingRecovery] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setPasswordResetFeedback("");
      }
    });

    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setIsRecoveryMode(true);
    }

    return unsubscribe;
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setIsAuthenticating(true);
    setAuthError("");

    try {
      const nextSession = await authenticateStaff(loginForm.email, loginForm.password);
      setLoginForm(loginInitialState);
      setActiveView(nextSession.role === "admin" ? "admin" : "panel");
      await logAppEvent({
        eventType: "auth.login",
        message: `${nextSession.email} autenticado com sucesso`
      });
      await refreshData(nextSession);
    } catch (error) {
      setAuthError(error.message || "Nao foi possivel autenticar.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleRequestPasswordReset(event) {
    event.preventDefault();

    if (!recoveryEmail.trim()) {
      setPasswordResetFeedback("Informe o email para recuperar a senha.");
      return;
    }

    setIsRequestingPasswordReset(true);
    setPasswordResetFeedback("");

    try {
      await requestPasswordReset(recoveryEmail);
      setPasswordResetFeedback("Link de recuperacao enviado para o email informado.");
    } catch (error) {
      setPasswordResetFeedback(error.message || "Nao foi possivel enviar a recuperacao.");
    } finally {
      setIsRequestingPasswordReset(false);
    }
  }

  async function handleFinishRecovery(event) {
    event.preventDefault();

    if (recoveryPassword.trim().length < 6) {
      setPasswordResetFeedback("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setIsFinishingRecovery(true);
    setPasswordResetFeedback("");

    try {
      await updateOwnPassword(recoveryPassword.trim());
      setPasswordResetFeedback("Senha atualizada. Voce ja pode entrar normalmente.");
      setRecoveryPassword("");
      setIsRecoveryMode(false);
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      setPasswordResetFeedback(error.message || "Nao foi possivel redefinir a senha.");
    } finally {
      setIsFinishingRecovery(false);
    }
  }

  async function handleLogout() {
    await clearStoredSession();
    resetWorkspace();
    await refreshData(null);
  }

  return {
    loginForm,
    setLoginForm,
    authError,
    isAuthenticating,
    recoveryEmail,
    setRecoveryEmail,
    passwordResetFeedback,
    isRequestingPasswordReset,
    isRecoveryMode,
    recoveryPassword,
    setRecoveryPassword,
    isFinishingRecovery,
    handleLogin,
    handleRequestPasswordReset,
    handleFinishRecovery,
    handleLogout
  };
}
