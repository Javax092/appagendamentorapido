import { useEffect, useMemo, useState } from "react";
import {
  createScheduleBlock,
  deleteScheduleBlock,
  processNotificationQueue,
  resetStaffPassword,
  saveBrandSettings,
  saveGalleryPost,
  saveStaffMember,
  setGalleryPostActive,
  toggleStaffMemberActive,
  updateCustomerNotes,
  uploadMediaAsset
} from "../lib/api";
import { blockInitialState, dateOptions, emptyGalleryPostForm, emptyStaffForm } from "../app/constants";
import {
  buildTabs,
  calculateAdminStats,
  calculateOccupancyStats,
  filterAdminAppointments,
  getVisibleAppointments,
  getVisibleNotifications
} from "../utils/dashboard";
import {
  buildOccupancyHeatmap,
  buildRevenueProjection,
  buildReactivationCandidates,
  buildWeeklyDemandNarrative,
  detectScheduleConflicts
} from "../utils/experience";

export function useAdminDashboard({
  barbers,
  appointments,
  bookingSchedule,
  scheduleBlocks,
  customers,
  notifications,
  galleryPosts,
  session,
  refreshData,
  setCustomers,
  brandConfig,
  setBrandConfig,
  brandEditor,
  setBrandEditor
}) {
  const [adminBarberFilter, setAdminBarberFilter] = useState("all");
  const [adminStatusFilter, setAdminStatusFilter] = useState("all");
  const [adminDateFilter, setAdminDateFilter] = useState("all");
  const [blockForm, setBlockForm] = useState(blockInitialState);
  const [blockFeedback, setBlockFeedback] = useState("");
  const [blockActionId, setBlockActionId] = useState("");
  const [customerDrafts, setCustomerDrafts] = useState({});
  const [customerActionId, setCustomerActionId] = useState("");
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [staffActionId, setStaffActionId] = useState("");
  const [staffFeedback, setStaffFeedback] = useState("");
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [queueFeedback, setQueueFeedback] = useState("");
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [galleryEditorForm, setGalleryEditorForm] = useState(emptyGalleryPostForm);
  const [isSavingGalleryPost, setIsSavingGalleryPost] = useState(false);
  const [galleryActionId, setGalleryActionId] = useState("");

  useEffect(() => {
    if (!barbers.length) {
      return;
    }

    setBlockForm((current) => ({
      ...current,
      barberId: current.barberId || barbers[0].id
    }));
  }, [barbers]);

  useEffect(() => {
    setGalleryEditorForm((current) => (current.id ? current : galleryPosts[0] ?? emptyGalleryPostForm));
  }, [galleryPosts]);

  const tabs = useMemo(() => buildTabs(session), [session]);
  const visibleWhatsappAppointments = useMemo(
    () => getVisibleAppointments(appointments, session),
    [appointments, session]
  );
  const visibleNotifications = useMemo(
    () => getVisibleNotifications(notifications, session),
    [notifications, session]
  );
  const queuedNotifications = visibleNotifications.filter((item) => item.status === "queued");

  const adminAppointments = useMemo(
    () =>
      filterAdminAppointments(appointments, {
        barberId: adminBarberFilter,
        status: adminStatusFilter,
        date: adminDateFilter
      }),
    [adminBarberFilter, adminDateFilter, adminStatusFilter, appointments]
  );

  const adminStats = useMemo(
    () => calculateAdminStats(appointments, barbers, dateOptions[0]),
    [appointments, barbers]
  );

  const occupancyStats = useMemo(
    () => calculateOccupancyStats(barbers, bookingSchedule, scheduleBlocks, dateOptions[0]),
    [barbers, bookingSchedule, scheduleBlocks]
  );
  const occupancyHeatmap = useMemo(
    () => buildOccupancyHeatmap(barbers, bookingSchedule, scheduleBlocks, dateOptions.slice(0, 7)),
    [barbers, bookingSchedule, scheduleBlocks]
  );
  const revenueProjection = useMemo(
    () => buildRevenueProjection(appointments, dateOptions[0]),
    [appointments]
  );
  const reactivationCandidates = useMemo(
    () => buildReactivationCandidates(customers, brandConfig.businessWhatsapp),
    [brandConfig.businessWhatsapp, customers]
  );
  const scheduleConflicts = useMemo(() => detectScheduleConflicts(appointments), [appointments]);
  const weeklyDemandNarrative = useMemo(
    () => buildWeeklyDemandNarrative(occupancyHeatmap),
    [occupancyHeatmap]
  );

  async function handleCreateBlock(event) {
    event.preventDefault();

    if (!blockForm.title.trim()) {
      setBlockFeedback("Informe um titulo para o bloqueio.");
      return;
    }

    if (!blockForm.isAllDay && (!blockForm.startTime || !blockForm.endTime)) {
      setBlockFeedback("Defina inicio e fim para o bloqueio.");
      return;
    }

    try {
      await createScheduleBlock(blockForm, session);
      setBlockForm({
        ...blockInitialState,
        barberId: blockForm.barberId || barbers[0]?.id || "",
        date: blockForm.date
      });
      setBlockFeedback("Bloqueio salvo com sucesso.");
      await refreshData(session);
    } catch (error) {
      setBlockFeedback(error.message || "Nao foi possivel salvar o bloqueio.");
    }
  }

  async function handleDeleteBlock(blockId) {
    setBlockActionId(blockId);

    try {
      await deleteScheduleBlock(blockId);
      await refreshData(session);
    } finally {
      setBlockActionId("");
    }
  }

  async function handleSaveCustomerNotes(customer) {
    setCustomerActionId(customer.id);

    try {
      const saved = await updateCustomerNotes(customer.id, customerDrafts[customer.id] ?? customer.notes);
      setCustomers((current) => current.map((item) => (item.id === customer.id ? saved.data : item)));
    } finally {
      setCustomerActionId("");
    }
  }

  async function handleSaveStaff(event) {
    event.preventDefault();

    if (!staffForm.fullName.trim() || !staffForm.email.trim()) {
      setStaffFeedback("Preencha nome e email.");
      return;
    }

    setIsSavingStaff(true);
    setStaffFeedback("");

    try {
      await saveStaffMember(staffForm);
      setStaffForm(emptyStaffForm);
      setStaffFeedback("Equipe atualizada.");
      await refreshData(session);
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel salvar a equipe.");
    } finally {
      setIsSavingStaff(false);
    }
  }

  function handleEditStaffMember(staff) {
    setStaffForm({
      id: staff.id,
      fullName: staff.fullName,
      email: staff.email,
      role: staff.role,
      barberId: staff.barberId ?? "",
      password: "",
      isActive: staff.isActive
    });
    setStaffFeedback("");
  }

  async function handleResetStaffPassword(staff) {
    const nextPassword = window.prompt(`Nova senha para ${staff.fullName}:`);
    if (!nextPassword) {
      return;
    }

    setStaffActionId(staff.id);

    try {
      await resetStaffPassword(staff.id, nextPassword);
      setStaffFeedback(`Senha redefinida para ${staff.fullName}.`);
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel redefinir a senha.");
    } finally {
      setStaffActionId("");
    }
  }

  async function handleToggleStaffActive(staff) {
    setStaffActionId(staff.id);

    try {
      await toggleStaffMemberActive(staff.id, !staff.isActive);
      await refreshData(session);
    } finally {
      setStaffActionId("");
    }
  }

  async function handleProcessQueue() {
    setIsProcessingQueue(true);
    setQueueFeedback("");

    try {
      const result = await processNotificationQueue(20);
      setQueueFeedback(
        result.data?.error
          ? result.data.error
          : `Fila processada. ${result.data?.processed ?? 0} notificacoes enviadas/tentadas.`
      );
      await refreshData(session);
    } catch (error) {
      setQueueFeedback(error.message || "Nao foi possivel processar a fila.");
    } finally {
      setIsProcessingQueue(false);
    }
  }

  async function handleSaveBrandSettings(event) {
    event.preventDefault();
    setIsSavingBrand(true);

    try {
      const saved = await saveBrandSettings(brandEditor, session);
      setBrandConfig(saved.data);
      setBrandEditor(saved.data);
      setStaffFeedback("Marca atualizada.");
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel salvar a marca.");
    } finally {
      setIsSavingBrand(false);
    }
  }

  async function handleUploadBrandLogo(file) {
    if (!file) {
      return;
    }

    try {
      const uploaded = await uploadMediaAsset(file, "branding", session);
      setBrandEditor((current) => ({
        ...current,
        logoImagePath: uploaded.data.path,
        logoImageUrl: uploaded.data.publicUrl
      }));
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel enviar a logo.");
    }
  }

  async function handleSaveGalleryPost(event) {
    event.preventDefault();

    if (!galleryEditorForm.title.trim()) {
      setStaffFeedback("Informe o titulo do post.");
      return;
    }

    setIsSavingGalleryPost(true);

    try {
      const saved = await saveGalleryPost(galleryEditorForm, session);
      setGalleryEditorForm(saved.data);
      await refreshData(session);
      setStaffFeedback("Post da galeria salvo.");
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel salvar o post.");
    } finally {
      setIsSavingGalleryPost(false);
    }
  }

  async function handleToggleGalleryPostActive(post) {
    setGalleryActionId(post.id);

    try {
      await setGalleryPostActive(post.id, !post.isActive, session);
      await refreshData(session);
    } finally {
      setGalleryActionId("");
    }
  }

  async function handleUploadGalleryImage(file) {
    if (!file) {
      return;
    }

    try {
      const uploaded = await uploadMediaAsset(file, "gallery", session);
      setGalleryEditorForm((current) => ({
        ...current,
        imagePath: uploaded.data.path,
        imageUrl: uploaded.data.publicUrl
      }));
    } catch (error) {
      setStaffFeedback(error.message || "Nao foi possivel enviar a imagem.");
    }
  }

  function resetWorkspace() {
    setStaffForm(emptyStaffForm);
  }

  return {
    tabs,
    visibleWhatsappAppointments,
    visibleNotifications,
    queuedNotifications,
    adminAppointments,
    adminStats,
    occupancyStats,
    occupancyHeatmap,
    revenueProjection,
    reactivationCandidates,
    scheduleConflicts,
    weeklyDemandNarrative,
    adminBarberFilter,
    setAdminBarberFilter,
    adminStatusFilter,
    setAdminStatusFilter,
    adminDateFilter,
    setAdminDateFilter,
    blockForm,
    setBlockForm,
    blockFeedback,
    blockActionId,
    customerDrafts,
    setCustomerDrafts,
    customerActionId,
    staffForm,
    setStaffForm,
    isSavingStaff,
    staffActionId,
    staffFeedback,
    isProcessingQueue,
    queueFeedback,
    isSavingBrand,
    galleryEditorForm,
    setGalleryEditorForm,
    isSavingGalleryPost,
    galleryActionId,
    handleCreateBlock,
    handleDeleteBlock,
    handleSaveCustomerNotes,
    handleSaveStaff,
    handleEditStaffMember,
    handleResetStaffPassword,
    handleToggleStaffActive,
    handleProcessQueue,
    handleSaveBrandSettings,
    handleUploadBrandLogo,
    handleSaveGalleryPost,
    handleToggleGalleryPostActive,
    handleUploadGalleryImage,
    resetWorkspace
  };
}
