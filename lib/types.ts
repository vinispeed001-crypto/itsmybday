export type RequestStatus = "pending" | "approved" | "denied";

export type ClassificationType =
  | "tudo_vip"
  | "vip_ate_hora"
  | "valor_genero"
  | "pagar_antecipado";

export type IntegrationEventType =
  | "getin_reservation"
  | "whatsapp_notification"
  | "pensanoevento_export";

export type IntegrationEventStatus = "pending_manual" | "sent" | "failed";

export interface Venue {
  id: string;
  name: string;
  slug: string;
}

export interface AvailabilitySlot {
  id: string;
  venue_id: string;
  event_date: string; // ISO date, e.g. "2026-09-12"
  time: string; // e.g. "23:00"
  is_open: boolean;
}

export interface GuestRequest {
  id: string;
  venue_id: string;
  requester_name: string;
  event_date: string;
  event_time: string;
  quantity: number;
  instagram: string;
  whatsapp: string;
  referred_by_profile_id: string | null;
  status: RequestStatus;
  denial_reason: string | null;
  created_at: string;
}

export interface Classification {
  id: string;
  request_id: string;
  type: ClassificationType;
  vip_until_time: string | null;
  value_male: number | null;
  value_female: number | null;
  advance_payment_note: string | null;
}

export interface GuestList {
  id: string;
  request_id: string;
  max_men: number;
  max_women: number;
  deadline_at: string; // ISO timestamp
  share_token: string;
}

export interface GuestListEntry {
  id: string;
  guest_list_id: string;
  name: string;
  gender: "male" | "female";
  created_at: string;
}
