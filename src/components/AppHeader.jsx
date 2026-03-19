import heroBackdrop from "../assets/hero-backdrop.svg";
import { formatCurrency } from "../utils/schedule";

const customLogo = "/paitaon.png";
const customSpotlightPortrait = "/paion2.png";

const roleLabels = {
  client: "Cliente",
  barber: "Barbeiro",
  admin: "Admin"
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
  brandConfig,
  themeMode,
  onToggleTheme,
  canInstallApp,
  onInstallApp
}) {
  return (
    <header className="hero-card">
      <div className="hero-copy">
        <div className="brand-lockup">
          <img className="brand-logo" src={brandConfig.logoImageUrl || customLogo} alt={brandConfig.logoText} />
          <div>
            <span className="eyebrow">Barbearia</span>
            <h1>{brandConfig.logoText}</h1>
          </div>
        </div>
        <p>
          {brandConfig.heroDescription ||
            "Barbearia com imagem forte, atendimento preciso e agendamento direto para uma experiencia premium."}
        </p>
        <div className="brand-inline hero-meta">
          <strong>Contato</strong>
          <span>{brandConfig.businessWhatsapp}</span>
        </div>
        <div className="hero-actions">
          {canInstallApp ? (
            <button className="primary-button compact-button" onClick={onInstallApp} type="button">
              Instalar app
            </button>
          ) : null}
          <button className="secondary-button compact-button" onClick={onToggleTheme} type="button">
            {themeMode === "dark" ? "Modo claro" : "Modo escuro"}
          </button>
          <span className="tag">PWA pronto</span>
        </div>
      </div>

      <div className="hero-visual">
        <img className="hero-backdrop" src={heroBackdrop} alt="Ambiente da barbearia" />
        <div className="spotlight-card">
          <span className="mini-badge">Destaque</span>
          <div className="spotlight-row">
            <img
              className="spotlight-portrait"
              src={customSpotlightPortrait}
              alt="Corte em destaque"
            />
            <div>
              <strong>{selectedBarber?.name || "Atendimento de assinatura"}</strong>
              <p>{selectedBarber?.heroTagline || "Corte, barba e acabamento com leitura profissional em cada detalhe."}</p>
            </div>
          </div>
          <small>Reserva online com apresentacao premium e confirmacao rapida.</small>
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
        {session?.role ? (
          <div className="stat-card">
            <strong>{roleLabels[session.role]}</strong>
            <span>perfil conectado</span>
          </div>
        ) : (
          <div className="stat-card">
            <strong>{queuedNotifications.length}</strong>
            <span>mensagens na fila</span>
          </div>
        )}
        <div className="stat-card auth-card">
          {session ? (
            <>
              <span className="mini-badge">{roleLabels[session.role]}</span>
              <strong>{session.fullName}</strong>
              <span>{session.email}</span>
              <button className="secondary-button compact-button" onClick={onLogout}>
                Sair
              </button>
            </>
          ) : (
            <>
              {isRecoveryMode ? (
                <>
                  <div className="auth-heading">
                    <span className="mini-badge">Recuperacao</span>
                    <p>Defina a nova senha para voltar ao painel.</p>
                  </div>
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
                </>
              ) : (
                <>
                  <div className="auth-heading">
                    <span className="mini-badge">Equipe</span>
                    <p>Acesso rapido para barbeiros e administracao.</p>
                  </div>
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

                  <div className="auth-divider" />
                  <form className="auth-form recovery-form" onSubmit={onRequestPasswordReset}>
                    <input
                      type="email"
                      placeholder="Email para recuperar senha"
                      value={recoveryEmail}
                      onChange={(event) => onRecoveryEmailChange(event.target.value)}
                    />
                    <button className="secondary-button compact-button" type="submit" disabled={isRequestingPasswordReset}>
                      {isRequestingPasswordReset ? "Enviando..." : "Enviar link"}
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
