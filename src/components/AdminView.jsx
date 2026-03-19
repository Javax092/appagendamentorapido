import { formatCurrency, formatDateLabel, formatLongDate } from "../utils/schedule";
import { formatProjectionCurrency, getFavoriteServices, getLoyaltyProfile } from "../utils/experience";

export function AdminView({
  adminStats,
  occupancyStats,
  occupancyHeatmap,
  revenueProjection,
  customers,
  reactivationCandidates,
  scheduleConflicts,
  weeklyDemandNarrative,
  realtimeStatusLabel,
  customerDrafts,
  onCustomerDraftChange,
  onSaveCustomerNotes,
  customerActionId,
  blockForm,
  onBlockFormChange,
  onCreateBlock,
  blockFeedback,
  barbers,
  scheduleBlocks,
  blockActionId,
  onDeleteBlock,
  editorForm,
  onEditorChange,
  editorAvailableSlots,
  editorServicesCatalog,
  onToggleEditorService,
  onSaveAppointmentEdits,
  isUpdatingAppointment,
  editorTotals,
  staffMembers,
  staffForm,
  onStaffFormChange,
  onSaveStaff,
  isSavingStaff,
  staffActionId,
  onEditStaffMember,
  onToggleStaffActive,
  onResetStaffPassword,
  staffFeedback,
  brandConfig,
  onBrandConfigChange,
  onSaveBrandSettings,
  isSavingBrand,
  onUploadBrandLogo,
  galleryPosts,
  galleryEditorForm,
  onGalleryEditorChange,
  onSaveGalleryPost,
  isSavingGalleryPost,
  galleryActionId,
  onEditGalleryPost,
  onCreateGalleryPost,
  onToggleGalleryPostActive,
  onUploadGalleryImage,
  logs,
  adminBarberFilter,
  onAdminBarberFilterChange,
  adminStatusFilter,
  onAdminStatusFilterChange,
  adminDateFilter,
  onAdminDateFilterChange,
  dateOptions,
  adminAppointments,
  onBeginEditAppointment,
  statusUpdateId,
  onStatusChange,
  hydrateAppointmentView,
  getAppointmentServiceList
}) {
  return (
    <section className="layout-grid single-column">
      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="mini-badge">Gestao</span>
            <h2>Controle da barbearia</h2>
          </div>
          <p>Agenda, equipe, marca e operacao em um painel direto.</p>
        </div>

        <div className="admin-stats">
          <div className="metric-card">
            <strong>{formatCurrency(adminStats.grossRevenue)}</strong>
            <span>faturamento total</span>
          </div>
          <div className="metric-card">
            <strong>{formatCurrency(adminStats.averageTicket)}</strong>
            <span>ticket medio</span>
          </div>
          <div className="metric-card">
            <strong>{occupancyStats.rate.toFixed(0)}%</strong>
            <span>ocupacao hoje</span>
          </div>
          <div className="metric-card">
            <strong>{customers.length}</strong>
            <span>clientes no CRM</span>
          </div>
        </div>

        <div className="ops-banner">
          <span className="mini-badge">Ao vivo</span>
          <strong>{realtimeStatusLabel}</strong>
          <p>{weeklyDemandNarrative}</p>
        </div>

        <div className="finance-strip">
          <div className="finance-card">
            <span>Receita do dia</span>
            <strong>{formatCurrency(adminStats.todayRevenue)}</strong>
          </div>
          <div className="finance-card">
            <span>Reservas confirmadas</span>
            <strong>{adminStats.confirmed}</strong>
          </div>
          <div className="finance-card">
            <span>Atendimentos concluidos</span>
            <strong>{adminStats.completed}</strong>
          </div>
          <div className="finance-card">
            <span>Lider em receita</span>
            <strong>{adminStats.topBarber?.barber?.name || "-"}</strong>
          </div>
        </div>

        <div className="finance-strip projection-strip">
          <div className="finance-card">
            <span>Projecao de receita</span>
            <strong>{formatProjectionCurrency(revenueProjection.projectedRevenue)}</strong>
          </div>
          <div className="finance-card">
            <span>Pipeline confirmado</span>
            <strong>{formatProjectionCurrency(revenueProjection.pipelineRevenue)}</strong>
          </div>
          <div className="finance-card">
            <span>Ticket projetado</span>
            <strong>{formatProjectionCurrency(revenueProjection.projectedTicket)}</strong>
          </div>
          <div className="finance-card">
            <span>Conflitos detectados</span>
            <strong>{scheduleConflicts.length}</strong>
          </div>
        </div>

        <div className="admin-columns">
          <section className="subsection-card">
            <div className="section-head compact">
              <div>
                <span className="mini-badge">Heatmap</span>
                <h2>Ocupacao da semana</h2>
              </div>
              <p>Leitura rapida de janelas fortes e fracas por profissional.</p>
            </div>

            <div className="occupancy-heatmap">
              {occupancyHeatmap.map((row) => (
                <div key={row.barberId} className="occupancy-row">
                  <strong>{row.barberName}</strong>
                  <div className="occupancy-cells">
                    {row.cells.map((cell) => (
                      <div
                        key={`${row.barberId}-${cell.date}`}
                        className={`occupancy-cell occupancy-${cell.heat}`}
                        title={`${cell.label} • ${cell.tooltip}`}
                      >
                        <span>{cell.label.split(",")[0]}</span>
                        <strong>{Math.round(cell.occupancyRate)}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="subsection-card">
            <div className="section-head compact">
              <div>
                <span className="mini-badge">Conflitos</span>
                <h2>Operacao sem atrito</h2>
              </div>
              <p>Duplo encaixe e sobreposicao aparecem antes de virarem problema.</p>
            </div>

            {scheduleConflicts.length ? (
              <div className="block-list">
                {scheduleConflicts.map((conflict) => (
                  <article key={conflict.id} className="block-card conflict-card">
                    <div>
                      <span className="tag">Conflito</span>
                      <strong>{formatLongDate(conflict.date)}</strong>
                      <p>
                        {conflict.appointments[0].clientName} x {conflict.appointments[1].clientName}
                      </p>
                      <small>
                        {conflict.appointments[0].startTime} ate {conflict.appointments[1].endTime}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="notice-box">Nenhum conflito ativo na agenda.</div>
            )}
          </section>
        </div>

        <div className="admin-columns">
          <section className="subsection-card">
            <div className="section-head compact">
              <div>
                <span className="mini-badge">Equipe</span>
                <h2>Acesso da equipe</h2>
              </div>
              <p>Crie, ajuste e recupere acessos da equipe.</p>
            </div>

            <form className="form-grid" onSubmit={onSaveStaff}>
              <label>
                Nome
                <input value={staffForm.fullName} onChange={(event) => onStaffFormChange("fullName", event.target.value)} />
              </label>
              <label>
                Email
                <input type="email" value={staffForm.email} onChange={(event) => onStaffFormChange("email", event.target.value)} />
              </label>
              <label>
                Perfil
                <select value={staffForm.role} onChange={(event) => onStaffFormChange("role", event.target.value)}>
                  <option value="barber">Barbeiro</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label>
                Barbeiro vinculado
                <select value={staffForm.barberId} onChange={(event) => onStaffFormChange("barberId", event.target.value)}>
                  <option value="">Sem vinculo</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Senha
                <input
                  type="password"
                  value={staffForm.password}
                  onChange={(event) => onStaffFormChange("password", event.target.value)}
                  placeholder={staffForm.id ? "Preencha para trocar a senha" : "Obrigatoria para novo usuario"}
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={staffForm.isActive}
                  onChange={(event) => onStaffFormChange("isActive", event.target.checked)}
                />
                Usuario ativo
              </label>
              <div className="actions-row">
                <button className="primary-button" type="submit" disabled={isSavingStaff}>
                  {isSavingStaff ? "Salvando..." : staffForm.id ? "Atualizar equipe" : "Criar membro"}
                </button>
              </div>
              {staffFeedback ? <p className="feedback-line">{staffFeedback}</p> : null}
            </form>

            <div className="staff-list">
              {staffMembers.map((staff) => (
                <article key={staff.id} className="block-card">
                  <div>
                    <span className="tag">{staff.role}</span>
                    <strong>{staff.fullName}</strong>
                    <p>{staff.email}</p>
                    <small>{staff.barberId || "Operacao geral"}</small>
                  </div>
                  <button
                    className="secondary-button compact-button"
                    onClick={() => onToggleStaffActive(staff)}
                    disabled={staffActionId === staff.id}
                  >
                    {staffActionId === staff.id ? "Atualizando..." : staff.isActive ? "Desativar" : "Reativar"}
                  </button>
                  <button className="secondary-button compact-button" onClick={() => onEditStaffMember(staff)}>
                    Editar
                  </button>
                  <button className="secondary-button compact-button" onClick={() => onResetStaffPassword(staff)}>
                    Resetar senha
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="subsection-card">
            <div className="section-head compact">
              <div>
                <span className="mini-badge">Marca</span>
                <h2>Logo e galeria</h2>
              </div>
              <p>Cliente pode trocar logo, capa e posts visuais sem mexer no codigo.</p>
            </div>

            <form className="form-grid" onSubmit={onSaveBrandSettings}>
              <label>
                Texto da logo
                <input value={brandConfig.logoText} onChange={(event) => onBrandConfigChange("logoText", event.target.value)} />
              </label>
              <label>
                WhatsApp comercial
                <input value={brandConfig.businessWhatsapp} onChange={(event) => onBrandConfigChange("businessWhatsapp", event.target.value)} />
              </label>
              <label className="full">
                Hero title
                <input value={brandConfig.heroTitle} onChange={(event) => onBrandConfigChange("heroTitle", event.target.value)} />
              </label>
              <label className="full">
                Hero descricao
                <textarea value={brandConfig.heroDescription} onChange={(event) => onBrandConfigChange("heroDescription", event.target.value)} />
              </label>
              <label className="full">
                Logo
                <input type="file" accept="image/*" onChange={(event) => onUploadBrandLogo(event.target.files?.[0] ?? null)} />
              </label>
              <div className="actions-row">
                <button className="primary-button" type="submit" disabled={isSavingBrand}>
                  {isSavingBrand ? "Salvando..." : "Salvar marca"}
                </button>
              </div>
              {staffFeedback ? <p className="feedback-line">{staffFeedback}</p> : null}
            </form>

            <div className="section-head compact">
              <div>
                <span className="mini-badge">Posts</span>
                <h2>Galeria do layout</h2>
              </div>
            </div>

            <form className="form-grid" onSubmit={onSaveGalleryPost}>
              <label>
                Titulo
                <input value={galleryEditorForm.title} onChange={(event) => onGalleryEditorChange("title", event.target.value)} />
              </label>
              <label>
                Tag
                <input value={galleryEditorForm.tag} onChange={(event) => onGalleryEditorChange("tag", event.target.value)} />
              </label>
              <label>
                Ordem
                <input type="number" min="1" value={galleryEditorForm.sortOrder} onChange={(event) => onGalleryEditorChange("sortOrder", event.target.value)} />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={galleryEditorForm.isActive}
                  onChange={(event) => onGalleryEditorChange("isActive", event.target.checked)}
                />
                Post ativo
              </label>
              <label className="full">
                Legenda
                <textarea value={galleryEditorForm.caption} onChange={(event) => onGalleryEditorChange("caption", event.target.value)} />
              </label>
              <label className="full">
                Imagem do post
                <input type="file" accept="image/*" onChange={(event) => onUploadGalleryImage(event.target.files?.[0] ?? null)} />
              </label>
              <div className="actions-row">
                <button className="primary-button" type="submit" disabled={isSavingGalleryPost}>
                  {isSavingGalleryPost ? "Salvando..." : galleryEditorForm.id ? "Atualizar post" : "Criar post"}
                </button>
                <button className="secondary-button" type="button" onClick={onCreateGalleryPost}>
                  Novo post
                </button>
              </div>
            </form>

            <div className="block-list">
              {galleryPosts.map((post) => {
                return (
                  <article key={post.id} className="block-card">
                    <div>
                      <span className="tag">{post.tag}</span>
                      <strong>{post.title}</strong>
                      <p>{post.caption}</p>
                      <small>{post.imagePath || "Usando visual fallback local"}</small>
                    </div>
                    <div className="actions-stack">
                      <button className="secondary-button compact-button" onClick={() => onEditGalleryPost(post)}>
                        Editar
                      </button>
                      <button
                        className="secondary-button compact-button"
                        onClick={() => onToggleGalleryPostActive(post)}
                        disabled={galleryActionId === post.id}
                      >
                        {galleryActionId === post.id ? "Atualizando..." : post.isActive ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="admin-columns">
          <section className="subsection-card">
            <div className="section-head compact">
              <div>
                <span className="mini-badge">Bloqueios</span>
                <h2>Agenda manual</h2>
              </div>
              <p>Cadastre folgas, almocos e indisponibilidades por data.</p>
            </div>

            <form className="form-grid block-form" onSubmit={onCreateBlock}>
              <label>
                Profissional
                <select value={blockForm.barberId} onChange={(event) => onBlockFormChange("barberId", event.target.value)}>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data
                <input type="date" value={blockForm.date} onChange={(event) => onBlockFormChange("date", event.target.value)} />
              </label>
              <label>
                Tipo
                <select value={blockForm.blockType} onChange={(event) => onBlockFormChange("blockType", event.target.value)}>
                  <option value="unavailable">Indisponivel</option>
                  <option value="lunch">Almoco</option>
                  <option value="day_off">Folga</option>
                </select>
              </label>
              <label className="full">
                Titulo
                <input value={blockForm.title} onChange={(event) => onBlockFormChange("title", event.target.value)} />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={blockForm.isAllDay}
                  onChange={(event) => onBlockFormChange("isAllDay", event.target.checked)}
                />
                Bloqueio o dia todo
              </label>
              {!blockForm.isAllDay ? (
                <>
                  <label>
                    Inicio
                    <input type="time" value={blockForm.startTime} onChange={(event) => onBlockFormChange("startTime", event.target.value)} />
                  </label>
                  <label>
                    Fim
                    <input type="time" value={blockForm.endTime} onChange={(event) => onBlockFormChange("endTime", event.target.value)} />
                  </label>
                </>
              ) : null}
              <label className="full">
                Observacoes
                <textarea value={blockForm.notes} onChange={(event) => onBlockFormChange("notes", event.target.value)} />
              </label>
              <div className="actions-row">
                <button className="primary-button" type="submit">
                  Salvar bloqueio
                </button>
              </div>
              {blockFeedback ? <p className="feedback-line">{blockFeedback}</p> : null}
            </form>

            <div className="block-list">
              {scheduleBlocks.map((block) => {
                const blockBarber = barbers.find((barber) => barber.id === block.barberId);
                return (
                  <article key={block.id} className="block-card">
                    <div>
                      <span className="tag">{block.blockType}</span>
                      <strong>{block.title || "Bloqueio operacional"}</strong>
                      <p>
                        {blockBarber?.name || "Equipe"} • {formatLongDate(block.date)}
                      </p>
                      <small>{block.isAllDay ? "Dia todo" : `${block.startTime} ate ${block.endTime}`}</small>
                    </div>
                    <button
                      className="secondary-button compact-button"
                      onClick={() => onDeleteBlock(block.id)}
                      disabled={blockActionId === block.id}
                    >
                      {blockActionId === block.id ? "Removendo..." : "Remover"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="admin-columns">
          <section className="subsection-card">
            <div className="section-head compact">
              <div>
                <span className="mini-badge">Edicao</span>
                <h2>Remarcar e editar</h2>
              </div>
              <p>Abra um agendamento para alterar servicos, data, horario, profissional ou status.</p>
            </div>

            {editorForm ? (
              <div className="editor-card">
                <div className="form-grid">
                  <label>
                    Cliente
                    <input value={editorForm.clientName} onChange={(event) => onEditorChange("clientName", event.target.value)} />
                  </label>
                  <label>
                    WhatsApp
                    <input value={editorForm.clientWhatsapp} onChange={(event) => onEditorChange("clientWhatsapp", event.target.value)} />
                  </label>
                  <label>
                    Profissional
                    <select value={editorForm.barberId} onChange={(event) => onEditorChange("barberId", event.target.value)}>
                      {barbers.map((barber) => (
                        <option key={barber.id} value={barber.id}>
                          {barber.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select value={editorForm.status} onChange={(event) => onEditorChange("status", event.target.value)}>
                      <option value="confirmed">Confirmado</option>
                      <option value="in-progress">Em andamento</option>
                      <option value="done">Concluido</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </label>
                  <label>
                    Data
                    <input type="date" value={editorForm.date} onChange={(event) => onEditorChange("date", event.target.value)} />
                  </label>
                  <label>
                    Horario
                    <select value={editorForm.startTime} onChange={(event) => onEditorChange("startTime", event.target.value)}>
                      <option value="">Selecione</option>
                      {editorAvailableSlots.map((slot) => (
                        <option key={slot.value} value={slot.value} disabled={slot.disabled}>
                          {slot.value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="full">
                    Servicos
                    <div className="service-grid compact-grid">
                      {editorServicesCatalog.map((service) => {
                        const active = editorForm.serviceIds.includes(service.id);
                        return (
                          <button
                            type="button"
                            key={service.id}
                            className={`service-card compact-card ${active ? "active" : ""}`}
                            onClick={() => onToggleEditorService(service.id)}
                          >
                            <strong>{service.name}</strong>
                            <small>{formatCurrency(service.price)}</small>
                          </button>
                        );
                      })}
                    </div>
                  </label>
                  <label className="full">
                    Observacoes
                    <textarea value={editorForm.notes} onChange={(event) => onEditorChange("notes", event.target.value)} />
                  </label>
                </div>

                <div className="editor-summary">
                  <span>Total recalculado: {formatCurrency(editorTotals.subtotal)}</span>
                  <span>Tempo reservado: {editorTotals.totalDuration} min</span>
                </div>

                <div className="actions-row">
                  <button className="primary-button" onClick={onSaveAppointmentEdits} disabled={isUpdatingAppointment}>
                    {isUpdatingAppointment ? "Salvando..." : "Salvar alteracoes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="notice-box">
                Selecione um agendamento abaixo para abrir o editor e remarcar.
              </div>
            )}
          </section>

          <section className="subsection-card">
            <div className="section-head compact">
              <div>
                <span className="mini-badge">Monitoramento</span>
                <h2>Logs recentes</h2>
              </div>
              <p>Base minima para acompanhar erros, booking events e operacao.</p>
            </div>

            <div className="log-list">
              {logs.map((log) => (
                <article key={log.id} className="automation-card">
                  <div>
                    <span className="tag">{log.level}</span>
                    <h3>{log.eventType}</h3>
                    <p>{log.message}</p>
                  </div>
                  <div className="automation-meta">
                    <strong>{new Date(log.createdAt).toLocaleString("pt-BR")}</strong>
                    <small>{log.source}</small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="section-head">
          <div>
            <span className="mini-badge">CRM</span>
            <h2>Cadastro completo de clientes</h2>
          </div>
          <p>Historico, frequencia, ticket medio, ultimo atendimento e observacoes internas.</p>
        </div>

        {reactivationCandidates.length ? (
          <div className="reactivation-strip">
            {reactivationCandidates.map((candidate) => (
              <article key={candidate.id} className="reactivation-card">
                <span className="tag">{candidate.segment}</span>
                <strong>{candidate.fullName}</strong>
                <p>{candidate.favoriteServices}</p>
                <div className="actions-row">
                  <a className="secondary-button compact-button" href={candidate.whatsappLink} target="_blank" rel="noreferrer">
                    Reativar cliente
                  </a>
                  <a className="secondary-button compact-button" href={candidate.businessWhatsappLink} target="_blank" rel="noreferrer">
                    Abrir no comercial
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        <div className="customer-grid">
          {customers.map((customer) => {
            const loyalty = getLoyaltyProfile(customer);

            return (
              <article key={customer.id} className={`customer-card loyalty-${loyalty.tier}`}>
                <div className="customer-topline">
                  <div>
                    <strong>{customer.fullName}</strong>
                    <span>{customer.whatsapp}</span>
                  </div>
                  <span className={`tag loyalty-badge loyalty-badge-${loyalty.tier}`}>{loyalty.label}</span>
                </div>
                <div className="customer-metrics">
                  <span>Score: {loyalty.score}</span>
                  <span>Ticket medio: {formatCurrency(customer.averageTicket)}</span>
                  <span>Lifetime: {formatCurrency(customer.lifetimeValue)}</span>
                  <span>Cadencia: {customer.cadenceDays.toFixed(0)} dias</span>
                  <span>
                    Ultimo atendimento:{" "}
                    {customer.lastAppointmentAt
                      ? new Date(customer.lastAppointmentAt).toLocaleDateString("pt-BR")
                      : "-"}
                  </span>
                </div>
                <p>{loyalty.tone}</p>
                <p>Favoritos: {getFavoriteServices(customer)}</p>
                <textarea
                  value={customerDrafts[customer.id] ?? customer.notes}
                  onChange={(event) => onCustomerDraftChange(customer.id, event.target.value)}
                  placeholder="Observacoes internas"
                />
                <button
                  className="secondary-button compact-button"
                  onClick={() => onSaveCustomerNotes(customer)}
                  disabled={customerActionId === customer.id}
                >
                  {customerActionId === customer.id ? "Salvando..." : "Salvar observacao"}
                </button>
              </article>
            );
          })}
        </div>

        <div className="admin-filters">
          <label>
            Profissional
            <select value={adminBarberFilter} onChange={(event) => onAdminBarberFilterChange(event.target.value)}>
              <option value="all">Todos</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={adminStatusFilter} onChange={(event) => onAdminStatusFilterChange(event.target.value)}>
              <option value="all">Todos</option>
              <option value="confirmed">Confirmado</option>
              <option value="in-progress">Em andamento</option>
              <option value="done">Concluido</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>
          <label>
            Data
            <select value={adminDateFilter} onChange={(event) => onAdminDateFilterChange(event.target.value)}>
              <option value="all">Todas</option>
              {dateOptions.map((date) => (
                <option key={date} value={date}>
                  {formatDateLabel(date)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-list">
          {adminAppointments.map((appointment) => {
            const hydrated = hydrateAppointmentView(appointment);
            const bookedServices = getAppointmentServiceList(appointment);

            return (
              <article key={appointment.id} className="admin-card">
                <div className="admin-card-main">
                  <div className="admin-card-head">
                    <span className="tag">{appointment.id}</span>
                    <span className={`status-pill ${appointment.status}`}>
                      {appointment.status === "in-progress"
                        ? "Em andamento"
                        : appointment.status === "done" || appointment.status === "completed"
                          ? "Concluido"
                          : appointment.status === "cancelled"
                            ? "Cancelado"
                            : "Confirmado"}
                    </span>
                  </div>
                  <h3>{appointment.clientName}</h3>
                  <p>{bookedServices.map((service) => service.name).join(", ")}</p>
                  <div className="admin-card-meta">
                    <span>{hydrated.barber?.name || "-"}</span>
                    <span>{formatLongDate(appointment.date)}</span>
                    <span>{appointment.startTime} ate {appointment.endTime}</span>
                    <span>{appointment.clientWhatsapp}</span>
                    <span>{formatCurrency(appointment.totalPrice)}</span>
                  </div>
                </div>
                <div className="admin-card-actions">
                  <button className="secondary-button" onClick={() => onBeginEditAppointment(appointment)}>
                    Editar
                  </button>
                  <button
                    className="secondary-button"
                    disabled={statusUpdateId === appointment.id || appointment.status === "confirmed"}
                    onClick={() => onStatusChange(appointment.id, "confirmed")}
                  >
                    {statusUpdateId === appointment.id ? "Atualizando..." : "Confirmar"}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={statusUpdateId === appointment.id || appointment.status === "in-progress" || appointment.status === "done"}
                    onClick={() => onStatusChange(appointment.id, "in-progress")}
                  >
                    {statusUpdateId === appointment.id ? "Atualizando..." : "Iniciar"}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={statusUpdateId === appointment.id || appointment.status === "done"}
                    onClick={() => onStatusChange(appointment.id, "done")}
                  >
                    {statusUpdateId === appointment.id ? "Atualizando..." : "Concluir"}
                  </button>
                  <button
                    className="secondary-button danger-button"
                    disabled={statusUpdateId === appointment.id || appointment.status === "cancelled"}
                    onClick={() => onStatusChange(appointment.id, "cancelled")}
                  >
                    {statusUpdateId === appointment.id ? "Atualizando..." : "Cancelar"}
                  </button>
                  <a className="primary-button" href={hydrated.barberWhatsappLink} target="_blank" rel="noreferrer">
                    Avisar barbeiro
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
