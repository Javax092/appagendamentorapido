import { formatCurrency, formatLongDate } from "../utils/schedule";

export function PanelView({
  session,
  barbers,
  selectedPanelBarberId,
  onSelectPanelBarber,
  selectedPanelBarber,
  managedServices,
  serviceEditorForm,
  onBeginEditService,
  onServiceEditorChange,
  onSaveService,
  isSavingService,
  serviceActionId,
  onToggleServiceActive,
  onBeginCreateService,
  serviceFeedback,
  panelAppointments,
  hydrateAppointmentView,
  onStatusChange,
  statusUpdateId,
  getAppointmentServiceList
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingAppointments = panelAppointments.filter((appointment) => {
    const appointmentDate = new Date(`${appointment.date}T12:00:00`);
    return appointmentDate >= today;
  });

  const agendaAppointments = upcomingAppointments.length ? upcomingAppointments : panelAppointments;
  const confirmedCount = agendaAppointments.filter((appointment) => appointment.status === "confirmed").length;
  const completedCount = agendaAppointments.filter((appointment) => appointment.status === "completed").length;
  const cancelledCount = agendaAppointments.filter((appointment) => appointment.status === "cancelled").length;
  const isBarber = session?.role === "barber";

  return (
    <section className="layout-grid single-column">
      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="mini-badge">Equipe</span>
            <h2>{isBarber ? "Minha agenda" : "Agenda da equipe"}</h2>
          </div>
          <p>
            {isBarber
              ? "Painel operacional para cadastrar servicos e acompanhar atendimentos reservados."
              : "Visualize a agenda do profissional selecionado e ajuste o catalogo quando necessario."}
          </p>
        </div>

        {session?.role === "admin" ? (
          <div className="panel-toolbar">
            <div className="pill-switch">
              {barbers.map((barber) => (
                <button
                  key={barber.id}
                  className={selectedPanelBarberId === barber.id ? "active" : ""}
                  onClick={() => onSelectPanelBarber(barber.id)}
                >
                  {barber.name}
                </button>
              ))}
            </div>
            {selectedPanelBarber ? (
              <div className="panel-meta">
                <strong>{selectedPanelBarber.name}</strong>
                <span>{selectedPanelBarber.bio}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {session ? (
          <div className="service-manager">
            <div className="section-head compact">
              <div>
                <span className="mini-badge">Servicos</span>
                <h2>{isBarber ? "Novo servico" : "Servicos do profissional"}</h2>
              </div>
              <p>
                {isBarber
                  ? "O barbeiro edita e cadastra servicos sem expor o catalogo nesta area."
                  : "Preco, duracao e disponibilidade continuam isolados por barbeiro."}
              </p>
            </div>

            <div className="service-manager-layout">
              {!isBarber ? (
                <div className="service-list">
                  {managedServices.map((service) => (
                    <button
                      key={service.id}
                      className={`service-card ${serviceEditorForm?.id === service.id ? "active" : ""} ${service.isActive ? "" : "inactive"}`}
                      onClick={() => onBeginEditService(service)}
                    >
                      <span className="tag">{service.isActive ? service.badge : "Inativo"}</span>
                      <div className="service-topline">
                        <strong>{service.name}</strong>
                        <span>{formatCurrency(service.price)}</span>
                      </div>
                      <small>{service.category}</small>
                      <p>{service.description}</p>
                      <em>{service.duration} min</em>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="subsection-card service-summary-card">
                  <span className="mini-badge">Ativos</span>
                  <strong>{managedServices.filter((service) => service.isActive).length} servicos publicados</strong>
                  <p>
                    O catalogo completo fica no menu principal do cliente. Aqui o barbeiro trabalha apenas no cadastro
                    e ajuste de servicos.
                  </p>
                </div>
              )}

              <form className="subsection-card service-editor" onSubmit={onSaveService}>
                <div className="section-head compact">
                  <div>
                    <span className="mini-badge">Editor</span>
                    <h2>{serviceEditorForm?.id ? "Atualizar servico" : "Novo servico"}</h2>
                  </div>
                </div>

                <div className="form-grid">
                  <label>
                    Nome
                    <input
                      value={serviceEditorForm?.name ?? ""}
                      onChange={(event) => onServiceEditorChange("name", event.target.value)}
                    />
                  </label>
                  <label>
                    Badge
                    <input
                      value={serviceEditorForm?.badge ?? ""}
                      onChange={(event) => onServiceEditorChange("badge", event.target.value)}
                    />
                  </label>
                  <label>
                    Preco
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={serviceEditorForm?.price ?? ""}
                      onChange={(event) => onServiceEditorChange("price", event.target.value)}
                    />
                  </label>
                  <label>
                    Duracao
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={serviceEditorForm?.duration ?? ""}
                      onChange={(event) => onServiceEditorChange("duration", event.target.value)}
                    />
                  </label>
                  <label>
                    Categoria
                    <input
                      value={serviceEditorForm?.category ?? ""}
                      onChange={(event) => onServiceEditorChange("category", event.target.value)}
                    />
                  </label>
                  <label>
                    Ordem
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={serviceEditorForm?.sortOrder ?? ""}
                      onChange={(event) => onServiceEditorChange("sortOrder", event.target.value)}
                    />
                  </label>
                  <label className="full">
                    Descricao
                    <textarea
                      value={serviceEditorForm?.description ?? ""}
                      onChange={(event) => onServiceEditorChange("description", event.target.value)}
                    />
                  </label>
                </div>

                <div className="actions-row">
                  <button className="primary-button" type="submit" disabled={isSavingService}>
                    {isSavingService ? "Salvando..." : "Salvar servico"}
                  </button>
                  {serviceEditorForm?.id ? (
                    <button
                      className="secondary-button danger-button"
                      type="button"
                      onClick={() =>
                        onToggleServiceActive(
                          managedServices.find((service) => service.id === serviceEditorForm.id) ?? serviceEditorForm
                        )
                      }
                      disabled={serviceActionId === serviceEditorForm.id}
                    >
                      {serviceActionId === serviceEditorForm.id
                        ? "Atualizando..."
                        : managedServices.find((service) => service.id === serviceEditorForm.id)?.isActive
                          ? "Desativar"
                          : "Reativar"}
                    </button>
                  ) : null}
                  <button className="secondary-button" type="button" onClick={onBeginCreateService}>
                    Novo servico
                  </button>
                </div>
                {serviceFeedback ? <p className="feedback-line">{serviceFeedback}</p> : null}
              </form>
            </div>
          </div>
        ) : null}

        <div className="section-head compact agenda-head">
          <div>
            <span className="mini-badge">Acompanhamento</span>
            <h2>{isBarber ? "Horarios reservados" : "Agenda operacional"}</h2>
          </div>
          <p>
            {agendaAppointments.length
              ? "Consulte status, servicos e contato do cliente para atendimento rapido."
              : "Nenhum agendamento encontrado para este contexto."}
          </p>
        </div>

        <div className="admin-stats panel-stats">
          <div className="metric-card">
            <strong>{agendaAppointments.length}</strong>
            <span>agendamentos visiveis</span>
          </div>
          <div className="metric-card">
            <strong>{confirmedCount}</strong>
            <span>confirmados</span>
          </div>
          <div className="metric-card">
            <strong>{completedCount}</strong>
            <span>concluidos</span>
          </div>
          <div className="metric-card">
            <strong>{cancelledCount}</strong>
            <span>cancelados</span>
          </div>
        </div>

        <div className="agenda-list">
          {agendaAppointments.map((appointment) => {
            const bookedServices = getAppointmentServiceList(appointment);
            const hydrated = hydrateAppointmentView(appointment);

            return (
              <article key={appointment.id} className="agenda-card">
                <div className="agenda-main">
                  <div className="agenda-topline">
                    <span className="tag">{appointment.id}</span>
                    <span className={`status-pill ${appointment.status}`}>{appointment.status}</span>
                  </div>
                  <h3>{appointment.clientName}</h3>
                  <p>{bookedServices.map((service) => service.name).join(", ")}</p>
                  <div className="agenda-contact">
                    <strong>Contato</strong>
                    <span>{appointment.clientWhatsapp}</span>
                  </div>
                  {appointment.notes ? (
                    <div className="agenda-contact">
                      <strong>Observacoes</strong>
                      <span>{appointment.notes}</span>
                    </div>
                  ) : null}
                </div>
                <div className="agenda-meta">
                  <strong>{formatLongDate(appointment.date)}</strong>
                  <span>{appointment.startTime} ate {appointment.endTime}</span>
                  <small>Total {formatCurrency(appointment.totalPrice || 0)}</small>
                  <div className="actions-stack">
                    <a className="primary-button" href={hydrated.clientWhatsappLink} target="_blank" rel="noreferrer">
                      Falar com cliente
                    </a>
                    {!isBarber ? (
                      <a className="secondary-button" href={hydrated.barberWhatsappLink} target="_blank" rel="noreferrer">
                        Falar com barbeiro
                      </a>
                    ) : null}
                    <button
                      className="secondary-button compact-button"
                      type="button"
                      disabled={statusUpdateId === appointment.id || appointment.status === "completed"}
                      onClick={() => onStatusChange(appointment.id, "completed")}
                    >
                      {statusUpdateId === appointment.id && appointment.status !== "completed"
                        ? "Atualizando..."
                        : "Marcar concluido"}
                    </button>
                    <button
                      className="secondary-button compact-button danger-button"
                      type="button"
                      disabled={statusUpdateId === appointment.id || appointment.status === "cancelled"}
                      onClick={() => onStatusChange(appointment.id, "cancelled")}
                    >
                      {statusUpdateId === appointment.id && appointment.status !== "cancelled"
                        ? "Atualizando..."
                        : "Cancelar"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!agendaAppointments.length ? (
          <div className="notice-box">
            Nenhum horario reservado no momento. Quando surgirem agendamentos, eles aparecerao aqui com status e
            contato do cliente.
          </div>
        ) : null}
      </section>
    </section>
  );
}
