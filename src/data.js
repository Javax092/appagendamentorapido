export const barbers = [
  {
    id: "lucas",
    name: "Lucas",
    shortCode: "LC",
    role: "Master barber",
    phone: "5592999991111",
    specialty: "Corte social refinado, acabamento preciso e atendimento de assinatura.",
    bio: "Indicado para quem busca imagem alinhada, corte executivo e constancia no padrao de atendimento.",
    photoKey: "heritage",
    heroTagline: "Corte social de assinatura com presenca e acabamento limpo.",
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
    specialty: "Visagismo, barba premium e leitura moderna de estilo.",
    bio: "Ideal para transformacao completa, barba marcada e servicos de detalhe com linguagem atual.",
    photoKey: "editorial",
    heroTagline: "Acabamento moderno com desenho forte e leitura atual.",
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
    name: "Corte de assinatura",
    badge: "Mais reservado",
    price: 55,
    duration: 45,
    category: "Cabelo",
    description: "Tesoura, maquina e acabamento preciso para manter uma imagem alinhada do inicio ao fim.",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "svc-lucas-2",
    barberId: "lucas",
    name: "Barba completa",
    badge: "Toalha quente",
    price: 38,
    duration: 30,
    category: "Barba",
    description: "Contorno detalhado, toalha quente e finalizacao para uma barba mais firme e bem desenhada.",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "svc-lucas-3",
    barberId: "lucas",
    name: "Acabamento executivo",
    badge: "Manutencao",
    price: 25,
    duration: 20,
    category: "Detalhes",
    description: "Pezinho, nuca e alinhamento rapido para manter o corte sempre limpo.",
    isActive: true,
    sortOrder: 3
  },
  {
    id: "svc-luquinhas-1",
    barberId: "luquinhas",
    name: "Fade de assinatura",
    badge: "Alta procura",
    price: 60,
    duration: 50,
    category: "Cabelo",
    description: "Degrade preciso com transicao limpa, textura controlada e acabamento de alto nivel.",
    isActive: true,
    sortOrder: 1
  },
  {
    id: "svc-luquinhas-2",
    barberId: "luquinhas",
    name: "Combo de presenca",
    badge: "Experiencia completa",
    price: 92,
    duration: 80,
    category: "Combo",
    description: "Corte, barba e finalizacao em uma sessao completa para elevar a imagem com consistencia.",
    isActive: true,
    sortOrder: 2
  },
  {
    id: "svc-luquinhas-3",
    barberId: "luquinhas",
    name: "Sobrancelha alinhada",
    badge: "Detalhe fino",
    price: 18,
    duration: 20,
    category: "Detalhes",
    description: "Alinhamento preciso para fechar o visual com mais definicao.",
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
    lastServiceNames: ["Corte de assinatura", "Barba completa"]
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
    lastServiceNames: ["Corte de assinatura"]
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
    title: "Agenda premium",
    caption: "Reserva direta com leitura forte de marca para converter o cliente logo na entrada.",
    imageKey: "post-fade",
    tag: "Reserva"
  },
  {
    id: "post-2",
    title: "Barba de presenca",
    caption: "Contorno limpo, volume equilibrado e acabamento de alto nivel para uma imagem mais forte.",
    imageKey: "post-beard",
    tag: "Barba premium"
  },
  {
    id: "post-3",
    title: "Ambiente que vende",
    caption: "Espaco real, atmosfera premium e uma presenca visual que aumenta a confianca na marca.",
    imageKey: "post-classic",
    tag: "Experiencia"
  }
];

export const brandConfig = {
  logoText: "O Pai ta on",
  businessWhatsapp: "5592986202729",
  heroTitle: "O Pai ta on",
  heroDescription: "Barbearia com imagem forte, atendimento preciso e agendamento direto para uma experiencia mais profissional do inicio ao fim.",
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
