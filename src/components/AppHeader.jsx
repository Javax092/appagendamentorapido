import editorialPortrait from "../assets/portrait-editorial.svg";
import heroBackdrop from "../assets/hero-backdrop.svg";
import logoMark from "../assets/logo-mark.svg";
import heritagePortrait from "../assets/portrait-heritage.svg";
import { formatCurrency } from "../utils/schedule";

const roleLabels = {
  client: "Cliente",
  barber: "Barbeiro",
  admin: "Admin"
};

const portraitMap = {
  heritage: heritagePortrait,
  editorial: editorialPortrait
};

export function AppHeader({
  selectedBarber,
  session,
  loginForm,
  onLoginFormChange,
  onLogin,
  onLogout,
  authError,
  isAuthenticating,
  recoveryEmail,
  onRecoveryEmailChange,
  onRequestPasswordReset,
  isRequestingPasswordReset,
  passwordResetFeedback,
  isRecoveryMode,
  recoveryPassword,
  onRecoveryPasswordChange,
  onFinishRecovery,
  isFinishingRecovery,
  adminStats,
  queuedNotifications,
  brandConfig
}) {
  return (
    <header className="hero-card">
      <div className="hero-copy">
        <div className="brand-lockup">
          <img className="brand-logo" src={brandConfig.logoImageUrl || logoMark} alt={brandConfig.logoText} />
          <div>
            <span className="eyebrow">Operacao publicada</span>
            <h1>{brandConfig.heroTitle || brandConfig.logoText}</h1>
          </div>
        </div>
        <p>
          {brandConfig.heroDescription ||
            "Agenda premium com autenticacao real, RLS por perfil, catalogo por barbeiro, CRM de clientes, time gerenciado e fila pronta para WhatsApp oficial."}
        </p>
        <div className="hero-pills">
          <span>RLS no banco</span>
          <span>Equipe com acesso real</span>
          <span>CRM de clientes</span>
          <span>WhatsApp oficial</span>
          <span>Galeria visual</span>
        </div>
        <div className="brand-inline">
          <strong>WhatsApp comercial</strong>
          <span>{brandConfig.businessWhatsapp}</span>
        </div>
      </div>

      <div className="hero-visual">
        <img className="hero-backdrop" src={heroBackdrop} alt="Ambiente da barbearia" />
        <div className="spotlight-card">
          <span className="mini-badge">Destaque</span>
          <div className="spotlight-row">
            <img
              className="spotlight-portrait"
              src={portraitMap[selectedBarber?.photoKey] ?? heritagePortrait}
              alt={selectedBarber?.name ?? "Profissional"}
            />
            <div>
              <strong>{selectedBarber?.name}</strong>
              <p>{selectedBarber?.heroTagline}</p>
            </div>
          </div>
          <small>Catalogo proprio • agenda propria • permissao isolada</small>
        </div>
      </div>

      <div className="hero-stats">
        <div className="stat-card">
          <strong>{adminStats.today}</strong>
          <span>atendimentos hoje</span>
        </div>
        <div className="stat-card">
          <strong>{formatCurrency(adminStats.todayRevenue)}</strong>
          <span>faturamento do dia</span>
        </div>
        <div className="stat-card">
          <strong>{queuedNotifications.length}</strong>
          <span>automacoes na fila</span>
        </div>
        <div className="stat-card auth-card">
          <span className="mini-badge">{roleLabels[session?.role ?? "client"]}</span>
          {session ? (
            <>
              <strong>{session.fullName}</strong>
              <span>{session.email}</span>
              <button className="secondary-button compact-button" onClick={onLogout}>
                Sair
              </button>
            </>
          ) : (
            <>
              {isRecoveryMode ? (
                <form className="auth-form" onSubmit={onFinishRecovery}>
                  <input
                    type="password"
                    placeholder="Nova senha"
                    value={recoveryPassword}
                    onChange={(event) => onRecoveryPasswordChange(event.target.value)}
                  />
                  <button className="primary-button compact-button" type="submit" disabled={isFinishingRecovery}>
                    {isFinishingRecovery ? "Atualizando..." : "Definir nova senha"}
                  </button>
                  {passwordResetFeedback ? <small>{passwordResetFeedback}</small> : null}
                </form>
              ) : (
                <>
                  <form className="auth-form" onSubmit={onLogin}>
                    <input
                      type="email"
                      placeholder="Email da equipe"
                      value={loginForm.email}
                      onChange={(event) => onLoginFormChange("email", event.target.value)}
                    />
                    <input
                      type="password"
                      placeholder="Senha"
                      value={loginForm.password}
                      onChange={(event) => onLoginFormChange("password", event.target.value)}
                    />
                    <button className="primary-button compact-button" type="submit" disabled={isAuthenticating}>
                      {isAuthenticating ? "Entrando..." : "Entrar"}
                    </button>
                    {authError ? <small>{authError}</small> : null}
                  </form>

                  <form className="auth-form recovery-form" onSubmit={onRequestPasswordReset}>
                    <input
                      type="email"
                      placeholder="Recuperar senha por email"
                      value={recoveryEmail}
                      onChange={(event) => onRecoveryEmailChange(event.target.value)}
                    />
                    <button className="secondary-button compact-button" type="submit" disabled={isRequestingPasswordReset}>
                      {isRequestingPasswordReset ? "Enviando..." : "Recuperar senha"}
                    </button>
                    {passwordResetFeedback ? <small>{passwordResetFeedback}</small> : null}
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
