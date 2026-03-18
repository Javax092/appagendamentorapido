export function WhatsappView({ visibleWhatsappAppointments, hydrateAppointmentView }) {
  return (
    <section className="layout-grid single-column">
      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="mini-badge">Relacionamento</span>
            <h2>Central de WhatsApp</h2>
          </div>
          <p>Atalhos manuais continuam disponiveis para atendimento rapido e remarcacoes pontuais.</p>
        </div>

        <div className="whatsapp-grid">
          {visibleWhatsappAppointments.slice().reverse().map((appointment) => {
            const hydrated = hydrateAppointmentView(appointment);

            return (
              <article key={appointment.id} className="whatsapp-card">
                <div>
                  <span className="tag">{appointment.id}</span>
                  <h3>{appointment.clientName}</h3>
                  <p>{hydrated.barber?.name || "Sem profissional"}</p>
                  <span className={`status-pill ${appointment.status}`}>{appointment.status}</span>
                </div>
                <div className="actions-stack">
                  <a className="primary-button" href={hydrated.clientWhatsappLink} target="_blank" rel="noreferrer">
                    Falar com cliente
                  </a>
                  <a className="secondary-button" href={hydrated.barberWhatsappLink} target="_blank" rel="noreferrer">
                    Falar com barbeiro
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
