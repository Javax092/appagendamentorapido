import { createDateOptions } from "../utils/schedule";

export const dateOptions = createDateOptions(12);

export const loginInitialState = { email: "", password: "" };

export const blockInitialState = {
  barberId: "",
  date: dateOptions[0],
  blockType: "unavailable",
  title: "",
  startTime: "12:00",
  endTime: "13:00",
  isAllDay: false,
  notes: ""
};

export const emptyBrandConfig = {
  logoText: "O Pai ta on",
  businessWhatsapp: "5592986202729",
  metaWebhookConfigured: false
};

export const emptyStaffForm = {
  id: "",
  fullName: "",
  email: "",
  role: "barber",
  barberId: "",
  password: "",
  isActive: true
};

export const emptyGalleryPostForm = {
  id: "",
  title: "",
  caption: "",
  tag: "",
  imagePath: "",
  imageUrl: "",
  sortOrder: 1,
  isActive: true
};
