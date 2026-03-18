const brandLogo = "/paitaon.png";

export function AutomationsView({
  visibleNotifications,
  brandConfig,
  onProcessQueue,
  isProcessingQueue,
  queueFeedback
}) {
  return (
    <section className="layout-grid single-column">
      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="mini-badge">Automacoes</span>
            <h2>Fila de mensagens</h2>
          </div>
          <p>Confirmacoes e lembretes enviados pelo numero {brandConfig.businessWhatsapp}.</p>
        </div>

        <div className="automation-toolbar">
          <div className="automation-badge">
            <img className="automation-brand-image" src={brandLogo} alt="Logo da barbearia" />
            <strong>Meta Cloud API</strong>
            <span>
              {brandConfig.metaWebhookConfigured
                ? "Ambiente pronto para envio."
                : "Falta configurar token e phone number id."}
            </span>
          </div>
          <button className="primary-button" onClick={onProcessQueue} disabled={isProcessingQueue}>
            {isProcessingQueue ? "Processando..." : "Processar fila"}
          </button>
        </div>

        {queueFeedback ? <div className="infra-banner">{queueFeedback}</div> : null}

        <div className="automation-list">
          {visibleNotifications.map((notification) => (
            <article key={notification.id} className="automation-card">
              <div>
                <span className="tag">{notification.type}</span>
                <h3>{notification.recipient}</h3>
                <p>{notification.businessNumber} • {notification.provider}</p>
              </div>
              <div className="automation-meta">
                <strong>{new Date(notification.scheduledFor).toLocaleString("pt-BR")}</strong>
                <span className={`status-pill ${notification.status === "queued" ? "confirmed" : "completed"}`}>
                  {notification.status}
                </span>
                <small>Tentativas: {notification.attemptCount}</small>
              </div>
              <p className="automation-message">{notification.messageTemplate}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
