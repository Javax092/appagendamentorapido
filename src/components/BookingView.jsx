import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { formatCurrency, formatDateLabel, formatLongDate } from "../utils/schedule";

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function groupSlotsByPeriod(slots) {
  return {
    morning: slots.filter((slot) => Number(slot.value.slice(0, 2)) < 12),
    afternoon: slots.filter((slot) => Number(slot.value.slice(0, 2)) >= 12)
  };
}

function ProgressDots({ steps, currentStep }) {
  return (
    <div className="booking-progress-sticky">
      <div className="booking-progress-dots">
        {steps.map((step, index) => {
          const isCurrent = currentStep === index;
          const isDone = step.complete || index < currentStep;

          return (
            <div
              key={step.id}
              className={`booking-progress-dot ${isCurrent ? "current" : ""} ${isDone ? "done" : ""}`}
            >
              <span>{isDone ? "✓" : index + 1}</span>
              <small>{step.label}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepFrame({ children, direction, stepKey }) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.section
        key={stepKey}
        className="booking-step-frame"
        custom={direction}
        initial={{ opacity: 0, x: direction >= 0 ? 42 : -42 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction >= 0 ? -42 : 42 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        {children}
      </motion.section>
    </AnimatePresence>
  );
}

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
  recommendedSlots,
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
  confirmation,
  bookingProgress,
  bookingStatusMessage,
  bookingMomentLabel,
  isBookingReady
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const slotsByPeriod = useMemo(() => groupSlotsByPeriod(availableSlots), [availableSlots]);
  const canAdvance = [
    Boolean(selectedBarberId),
    selectedServiceIds.length > 0,
    Boolean(selectedTime),
    isBookingReady
  ];

  function goToStep(nextStep) {
    setDirection(nextStep > currentStep ? 1 : -1);
    setCurrentStep(nextStep);
  }

  function handleAdvance() {
    if (currentStep < 3 && canAdvance[currentStep]) {
      goToStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  }

  async function handleConfirm() {
    const result = await onConfirmBooking();
    if (result?.ok) {
      setDirection(1);
      setCurrentStep(3);
    }
  }

  return (
    <section className="booking-wizard-shell">
      <div className="glass-card booking-wizard-card">
        <ProgressDots steps={bookingProgress.steps} currentStep={currentStep} />

        <StepFrame direction={direction} stepKey={`step-${currentStep}`}>
          {currentStep === 0 ? (
            <div className="booking-step-content">
              <div className="booking-step-head">
                <span className="mini-badge">Passo 1</span>
                <h2>Escolha o profissional</h2>
                <p>{bookingStatusMessage}</p>
              </div>

              <div className="booking-barber-compact-grid">
                {barbers.map((barber) => (
                  <button
                    key={barber.id}
                    className={`booking-barber-compact-card ${selectedBarberId === barber.id ? "active" : ""}`}
                    onClick={() => onSelectBarber(barber.id)}
                  >
                    <div className="booking-avatar">{getInitials(barber.name)}</div>
                    <strong>{barber.name}</strong>
                    <small>{barber.specialty}</small>
                    <span>{barber.workingHours.start} - {barber.workingHours.end}</span>
                  </button>
                ))}
              </div>

              <div className="booking-step-actions">
                <button className="secondary-button" onClick={onResetBooking} type="button">
                  Limpar
                </button>
                <button className="primary-button" onClick={handleAdvance} type="button" disabled={!canAdvance[0]}>
                  Proximo
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="booking-step-content">
              <div className="booking-step-head">
                <span className="mini-badge">Passo 2</span>
                <h2>Selecione os servicos</h2>
                <p>Monte seu atendimento com selecao multipla.</p>
              </div>

              <div className="booking-services-pills">
                {bookingServices.map((service) => {
                  const active = selectedServiceIds.includes(service.id);

                  return (
                    <button
                      key={service.id}
                      className={`booking-service-pill ${active ? "active" : ""}`}
                      onClick={() => onToggleService(service.id)}
                      type="button"
                    >
                      <strong>{service.name}</strong>
                      <span>{formatCurrency(service.price)}</span>
                    </button>
                  );
                })}
              </div>

              <div className="booking-step-footer">
                <div className="booking-inline-total">
                  <strong>Total</strong>
                  <span>{formatCurrency(totals.subtotal)} • {totals.totalDuration} min</span>
                </div>
                <div className="booking-step-actions">
                  <button className="secondary-button" onClick={handleBack} type="button">
                    Voltar
                  </button>
                  <button className="primary-button" onClick={handleAdvance} type="button" disabled={!canAdvance[1]}>
                    Proximo
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="booking-step-content">
              <div className="booking-step-head">
                <span className="mini-badge">Passo 3</span>
                <h2>Escolha data e horario</h2>
                <p>Slots com leitura visual de disponibilidade.</p>
              </div>

              <div className="day-row booking-day-row">
                {dateOptions.map((date) => (
                  <button
                    key={date}
                    className={`day-chip ${selectedDate === date ? "active" : ""}`}
                    onClick={() => onSelectDate(date)}
                    type="button"
                  >
                    {formatDateLabel(date)}
                  </button>
                ))}
              </div>

              <div className="booking-time-periods">
                <div className="booking-time-period">
                  <strong>Manha</strong>
                  <div className="booking-time-grid-compact">
                    {slotsByPeriod.morning.map((slot) => (
                      <button
                        key={slot.value}
                        className={`time-chip time-chip-${slot.heat || "blocked"} ${recommendedSlots.some((item) => item.value === slot.value) ? "recommended" : ""} ${selectedTime === slot.value ? "active" : ""}`}
                        disabled={slot.disabled || isLoading}
                        onClick={() => onSelectTime(slot.value)}
                        type="button"
                      >
                        <span>{slot.value}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="booking-time-period">
                  <strong>Tarde</strong>
                  <div className="booking-time-grid-compact">
                    {slotsByPeriod.afternoon.map((slot) => (
                      <button
                        key={slot.value}
                        className={`time-chip time-chip-${slot.heat || "blocked"} ${recommendedSlots.some((item) => item.value === slot.value) ? "recommended" : ""} ${selectedTime === slot.value ? "active" : ""}`}
                        disabled={slot.disabled || isLoading}
                        onClick={() => onSelectTime(slot.value)}
                        type="button"
                      >
                        <span>{slot.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="heatmap-legend booking-legend-tight">
                <span><i className="heat-dot heat-easy" /> Facil</span>
                <span><i className="heat-dot heat-tight" /> Recomendado</span>
                <span><i className="heat-dot heat-blocked" /> Bloqueado</span>
              </div>

              <div className="booking-step-actions">
                <button className="secondary-button" onClick={handleBack} type="button">
                  Voltar
                </button>
                <button className="primary-button" onClick={handleAdvance} type="button" disabled={!canAdvance[2]}>
                  Proximo
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="booking-step-content">
              <div className="booking-step-head">
                <span className="mini-badge">Passo 4</span>
                <h2>Confirme seus dados</h2>
                <p>{bookingMomentLabel}</p>
              </div>

              <div className="booking-summary-collapsed">
                <strong>{selectedBarber?.name || "-"}</strong>
                <span>{summaryServices || "Selecione servicos"}</span>
                <span>{formatLongDate(selectedDate)} • {selectedTime || "Sem horario"}</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>

              <div className="form-grid booking-form-grid">
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
                </label>
                <label className="full">
                  Observacao
                  <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} />
                </label>
              </div>

              {confirmation ? (
                <motion.div
                  className="confirmation-box booking-confirmation-inline"
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.34, ease: "easeOut" }}
                >
                  <div className="celebration-row" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="confirmation-top">
                    <span className="mini-badge">Confirmado</span>
                    <strong>{confirmation.id}</strong>
                  </div>
                  <div className="confirmation-check">✓</div>
                  <p>
                    Reserva confirmada para {formatLongDate(confirmation.date)} as {confirmation.startTime} com{" "}
                    {confirmation.barber?.name}.
                  </p>
                </motion.div>
              ) : null}

              <div className="booking-step-actions">
                <button className="secondary-button" onClick={handleBack} type="button">
                  Voltar
                </button>
                <button
                  className="primary-button"
                  onClick={handleConfirm}
                  type="button"
                  disabled={!isBookingReady || isSaving || isLoading}
                >
                  {isSaving ? "Salvando..." : "Confirmar"}
                </button>
              </div>
            </div>
          ) : null}
        </StepFrame>
      </div>
    </section>
  );
}
