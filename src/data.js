export const barbers = [
  {
    id: "lucas",
    name: "Lucas",
    shortCode: "LC",
    role: "Master barber",
    phone: "5592999991111",
    specialty: "Precisao, acabamento classico e atendimento premium.",
    bio: "Perfil ideal para corte social, executivo e clientes recorrentes.",
    photoKey: "heritage",
    heroTagline: "Corte social de assinatura com cadencia premium.",
    workingHours: {
      start: "09:00",
      end: "20:00"
    },
    breakRanges: [{ start: "12:00", end: "13:00" }],
    daysOff: [0]
  },
  {
    id: "luquinhas",
    name: "Luquinhas",
    shortCode: "LQ",
    role: "Style specialist",
    phone: "5592999992222",
    specialty: "Visagismo, barba premium e finalizacao moderna.",
    bio: "Ideal para combo completo, barba e servicos de detalhe.",
    photoKey: "editorial",
    heroTagline: "Acabamento moderno para agenda de alto giro.",
    workingHours: {
      start: "10:00",
      end: "21:00"
    },
    breakRanges: [{ start: "14:00", end: "15:00" }],
    daysOff: [1]
  }
];

export const services = [
  {
    id: "svc-lucas-1",
    barberId: "lucas",
    name: "Corte assinatura",
    badge: "Mais pedido",
    price: 55,
    duration: 45,
    category: "Cabelo",
    description: "Tesoura, maquina e acabamento classico para cliente recorrente.",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "svc-lucas-2",
    barberId: "lucas",
    name: "Barba com toalha",
    badge: "Toalha quente",
    price: 38,
    duration: 30,
    category: "Barba",
    description: "Contorno detalhado com relaxamento e balm.",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "svc-lucas-3",
    barberId: "lucas",
    name: "Acabamento rapido",
    badge: "Express",
    price: 25,
    duration: 20,
    category: "Detalhes",
    description: "Pezinho, nuca e alinhamento para manutencao.",
    isActive: true,
    sortOrder: 3
  },
  {
    id: "svc-luquinhas-1",
    barberId: "luquinhas",
    name: "Fade premium",
    badge: "Alta demanda",
    price: 60,
    duration: 50,
    category: "Cabelo",
    description: "Degrade preciso com finalizacao e textura.",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "svc-luquinhas-2",
    barberId: "luquinhas",
    name: "Combo style",
    badge: "Experiencia completa",
    price: 92,
    duration: 80,
    category: "Combo",
    description: "Corte, barba e finalizacao para sessao completa.",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "svc-luquinhas-3",
    barberId: "luquinhas",
    name: "Design de sobrancelha",
    badge: "Detalhe fino",
    price: 18,
    duration: 20,
    category: "Detalhes",
    description: "Alinhamento rapido para completar o visual.",
    isActive: true,
    sortOrder: 3
  }
];

export const sampleAppointments = [
  {
    id: "LC-0318-01",
    barberId: "lucas",
    clientId: "customer-1",
    clientName: "Rafael Souza",
    clientWhatsapp: "5592999991234",
    serviceIds: ["svc-lucas-1", "svc-lucas-2"],
    date: "2026-03-18",
    startTime: "09:00",
    endTime: "10:10",
    status: "confirmed",
    totalPrice: 93,
    createdAt: "2026-03-17T10:00:00-04:00",
    updatedAt: "2026-03-17T10:00:00-04:00",
    notes: "Cliente recorrente"
  },
  {
    id: "LC-0318-02",
    barberId: "lucas",
    clientId: "customer-2",
    clientName: "Bruno Alves",
    clientWhatsapp: "5592988884545",
    serviceIds: ["svc-lucas-1"],
    date: "2026-03-18",
    startTime: "13:30",
    endTime: "14:25",
    status: "confirmed",
    totalPrice: 55,
    createdAt: "2026-03-17T10:10:00-04:00",
    updatedAt: "2026-03-17T10:10:00-04:00",
    notes: "Primeira visita"
  },
  {
    id: "LQ-0318-01",
    barberId: "luquinhas",
    clientId: "customer-3",
    clientName: "Matheus Lima",
    clientWhatsapp: "5592977772233",
    serviceIds: ["svc-luquinhas-2"],
    date: "2026-03-18",
    startTime: "10:00",
    endTime: "11:30",
    status: "confirmed",
    totalPrice: 92,
    createdAt: "2026-03-17T10:20:00-04:00",
    updatedAt: "2026-03-17T10:20:00-04:00",
    notes: ""
  }
];

export const scheduleBlocks = [
  {
    id: "block-1",
    barberId: "lucas",
    title: "Almoco operacional",
    blockType: "lunch",
    date: "2026-03-19",
    startTime: "12:00",
    endTime: "13:00",
    isAllDay: false,
    notes: ""
  }
];

export const customers = [
  {
    id: "customer-1",
    fullName: "Rafael Souza",
    whatsapp: "5592999991234",
    email: "",
    notes: "Cliente recorrente, prefere acabamento classico.",
    visitCount: 4,
    completedVisitCount: 3,
    cancelledVisitCount: 1,
    lifetimeValue: 276,
    averageTicket: 69,
    cadenceDays: 18,
    lastAppointmentAt: "2026-03-18T09:00:00-04:00",
    firstAppointmentAt: "2025-12-01T09:00:00-04:00",
    lastServiceNames: ["Corte assinatura", "Barba com toalha"]
  },
  {
    id: "customer-2",
    fullName: "Bruno Alves",
    whatsapp: "5592988884545",
    email: "",
    notes: "Primeira visita, converte bem em combo premium.",
    visitCount: 1,
    completedVisitCount: 0,
    cancelledVisitCount: 0,
    lifetimeValue: 55,
    averageTicket: 55,
    cadenceDays: 0,
    lastAppointmentAt: "2026-03-18T13:30:00-04:00",
    firstAppointmentAt: "2026-03-18T13:30:00-04:00",
    lastServiceNames: ["Corte assinatura"]
  }
];

export const notificationQueue = [
  {
    id: "notif-1",
    appointmentId: "LC-0318-01",
    barberId: "lucas",
    customerId: "customer-1",
    type: "confirmation",
    channel: "whatsapp",
    status: "queued",
    provider: "official_whatsapp_pending",
    recipient: "5592999991234",
    scheduledFor: "2026-03-17T10:00:00-04:00",
    messageTemplate: "Oi Rafael Souza, seu horario com Lucas foi confirmado.",
    sentAt: null,
    createdAt: "2026-03-17T10:00:00-04:00"
  }
];

export const staffMembers = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    email: "admin@opaitaon.com",
    fullName: "Administrador",
    role: "admin",
    barberId: null,
    isActive: true
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    email: "lucas@opaitaon.com",
    fullName: "Lucas",
    role: "barber",
    barberId: "lucas",
    isActive: true
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    email: "luquinhas@opaitaon.com",
    fullName: "Luquinhas",
    role: "barber",
    barberId: "luquinhas",
    isActive: true
  }
];

export const appEventLogs = [
  {
    id: "log-1",
    level: "info",
    eventType: "booking.created",
    message: "Reserva criada com fila automatica preparada.",
    source: "web",
    createdAt: "2026-03-17T10:00:00-04:00"
  }
];

export const galleryPosts = [
  {
    id: "post-1",
    title: "Fade premium",
    caption: "Degrade limpo com acabamento de linha e finalizacao fosca.",
    imageKey: "post-fade",
    tag: "Alta demanda"
  },
  {
    id: "post-2",
    title: "Barba com toalha",
    caption: "Contorno preciso, toalha quente e desenho de volume natural.",
    imageKey: "post-beard",
    tag: "Experiencia"
  },
  {
    id: "post-3",
    title: "Corte assinatura",
    caption: "Leitura de volume e acabamento classico para cliente recorrente.",
    imageKey: "post-classic",
    tag: "Assinatura"
  }
];

export const brandConfig = {
  logoText: "O Pai ta on",
  businessWhatsapp: "5592986202729",
  heroTitle: "O Pai ta on",
  heroDescription: "Agenda premium com equipe conectada, CRM de clientes e visual pronto para operacao publicada.",
  logoImagePath: "",
  logoImageUrl: "",
  metaWebhookConfigured: false
};

export const demoStaffSession = {
  userId: "local-admin",
  email: "admin@opaitaon.com",
  fullName: "Administrador",
  role: "admin",
  barberId: null
};
