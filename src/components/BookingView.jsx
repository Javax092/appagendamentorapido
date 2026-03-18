import editorialPortrait from "../assets/portrait-editorial.svg";
import heritagePortrait from "../assets/portrait-heritage.svg";
import { formatCurrency, formatDateLabel, formatLongDate } from "../utils/schedule";

const showcaseImage = "/paion2.png";

const portraitMap = {
  heritage: heritagePortrait,
  editorial: editorialPortrait
};

export function BookingView({
  barbers,
  selectedBarberId,
  onSelectBarber,
  bookingServices,
  selectedServiceIds,
  onToggleService,
  dateOptions,
  selectedDate,
  onSelectDate,
  availableSlots,
  selectedTime,
  onSelectTime,
  clientName,
  onClientNameChange,
  clientWhatsapp,
  onClientWhatsappChange,
  notes,
  onNotesChange,
  onConfirmBooking,
  onResetBooking,
  isSaving,
  isLoading,
  selectedBarber,
  summaryServices,
  totals,
  confirmation
}) {
  return (
    <section className="layout-grid">
      <section className="glass-card">
        <div className="section-head">
          <div>
            <span className="mini-badge">Reserva</span>
            <h2>Escolha o profissional</h2>
          </div>
          <p>Selecione o barbeiro e monte o atendimento em poucos passos.</p>
        </div>

        <div className="barber-grid">
          {barbers.map((barber) => (
            <button
              key={barber.id}
              className={`barber-card ${selectedBarberId === barber.id ? "active" : ""}`}
              onClick={() => onSelectBarber(barber.id)}
            >
              <img
                className="portrait-frame"
                src={portraitMap[barber.photoKey] ?? heritagePortrait}
                alt={barber.name}
              />
              <div>
                <span className="tag">{barber.role}</span>
                <strong>{barber.name}</strong>
                <p>{barber.specialty}</p>
                <small>
                  Expediente {barber.workingHours.start} - {barber.workingHours.end}
                </small>
              </div>
            </button>
          ))}
        </div>

        <div className="section-head">
          <div>
            <span className="mini-badge">Catalogo</span>
            <h2>Monte o atendimento</h2>
          </div>
          <p>Servicos e valores do profissional selecionado.</p>
        </div>

        <div className="service-grid">
          {bookingServices.map((service) => {
            const active = selectedServiceIds.includes(service.id);
            return (
              <button
                key={service.id}
                className={`service-card ${active ? "active" : ""}`}
                onClick={() => onToggleService(service.id)}
              >
                <span className="tag">{service.badge}</span>
                <div className="service-topline">
                  <strong>{service.name}</strong>
                  <span>{formatCurrency(service.price)}</span>
                </div>
                <small>{service.category}</small>
                <p>{service.description}</p>
                <em>{service.duration} min</em>
              </button>
            );
          })}
        </div>

        <div className="section-head">
          <div>
            <span className="mini-badge">Disponibilidade</span>
            <h2>Escolha data e horario</h2>
          </div>
          <p>Somente horarios realmente disponiveis.</p>
        </div>

        <div className="day-row">
          {dateOptions.map((date) => (
            <button
              key={date}
              className={`day-chip ${selectedDate === date ? "active" : ""}`}
              onClick={() => onSelectDate(date)}
            >
              {formatDateLabel(date)}
            </button>
          ))}
        </div>

        <div className="time-grid">
          {availableSlots.map((slot) => (
            <button
              key={slot.value}
              className={`time-chip ${selectedTime === slot.value ? "active" : ""}`}
              disabled={slot.disabled || isLoading}
              onClick={() => onSelectTime(slot.value)}
            >
              {slot.value}
            </button>
          ))}
        </div>

        <div className="section-head">
          <div>
            <span className="mini-badge">Cliente</span>
            <h2>Confirme os dados</h2>
          </div>
          <p>Dados para confirmar o atendimento com rapidez.</p>
        </div>

        <div className="form-grid">
          <label>
            Nome
            <input value={clientName} onChange={(event) => onClientNameChange(event.target.value)} />
          </label>
          <label>
            WhatsApp
            <input
              type="tel"
              inputMode="numeric"
              maxLength={20}
              placeholder="(92) 99999-9999"
              value={clientWhatsapp}
              onChange={(event) => onClientWhatsappChange(event.target.value)}
            />
            <small className="field-hint">Use DDD e numero com WhatsApp ativo.</small>
          </label>
          <label className="full">
            Observacoes
            <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} />
          </label>
        </div>

        <div className="actions-row">
          <button className="primary-button" onClick={onConfirmBooking} disabled={isSaving || isLoading}>
            {isSaving ? "Salvando..." : "Confirmar reserva"}
          </button>
          <button className="secondary-button" onClick={onResetBooking}>
            Limpar formulario
          </button>
        </div>
      </section>

      <aside className="glass-card summary-card">
        <div className="section-head">
          <div>
            <span className="mini-badge">Resumo</span>
            <h2>Sua reserva</h2>
          </div>
        </div>

        <div className="summary-visual">
          <img src={showcaseImage} alt="Corte em destaque da barbearia" />
          <div className="summary-visual-copy">
            <strong>{selectedBarber?.name || "Atendimento premium"}</strong>
            <span>{selectedBarber?.specialty || "Corte, barba e acabamento com atendimento profissional."}</span>
          </div>
        </div>

        <dl className="summary-list">
          <div><dt>Profissional</dt><dd>{selectedBarber?.name || "-"}</dd></div>
          <div><dt>Servicos</dt><dd>{summaryServices || "Selecione ao menos um servico"}</dd></div>
          <div><dt>Data</dt><dd>{formatLongDate(selectedDate)}</dd></div>
          <div><dt>Horario</dt><dd>{selectedTime || "Selecione um horario"}</dd></div>
          <div><dt>Tempo reservado</dt><dd>{totals.totalDuration} min</dd></div>
          <div><dt>Total</dt><dd>{formatCurrency(totals.subtotal)}</dd></div>
        </dl>

        {confirmation ? (
          <div className="confirmation-box">
            <div className="confirmation-top">
              <span className="mini-badge">Confirmado</span>
              <strong>{confirmation.id}</strong>
            </div>
            <p>
              Reserva confirmada para {formatLongDate(confirmation.date)} as {confirmation.startTime} com{" "}
              {confirmation.barber?.name}.
            </p>
            <div className="confirmation-details">
              <span>Cliente: {confirmation.clientName}</span>
              <span>WhatsApp: {confirmation.clientWhatsapp}</span>
            </div>
            <div className="actions-stack">
              <a className="primary-button" href={confirmation.clientWhatsappLink} target="_blank" rel="noreferrer">
                Enviar confirmacao
              </a>
              <a className="secondary-button" href={confirmation.barberWhatsappLink} target="_blank" rel="noreferrer">
                Avisar barbeiro
              </a>
              <a className="secondary-button" href={confirmation.rescheduleWhatsappLink} target="_blank" rel="noreferrer">
                Remarcar no WhatsApp
              </a>
              <a className="secondary-button danger-button" href={confirmation.cancelWhatsappLink} target="_blank" rel="noreferrer">
                Cancelar no WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div className="notice-box">
            Revise os dados e finalize o agendamento.
          </div>
        )}
      </aside>
    </section>
  );
}
