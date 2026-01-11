
export type UserRole = 'member' | 'admin';
export type RSVPStatus = 'pendiente' | 'si' | 'no';

export interface User {
  id: string;
  email: string;
  name?: string; // display_name
  birthday?: string;
  avatar?: string;
  activeTeamId?: string;
}

export interface Team {
  id: string;
  name: string;
  join_code: string;
  createdAt: string;
  role?: UserRole;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface Invite {
  id: string;
  merendolaId: string;
  userId: string;
  status: RSVPStatus;
  respondedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'MERENDOLA_INVITE' | 'SYSTEM';
  payload: {
    merendolaId: string;
    title: string;
    date: string;
    creatorName: string;
  };
  readAt?: string;
  createdAt: string;
}

export interface AppEvent {
  id: string;
  userId: string;
  team_id: string;
  title: string;
  contribution: string;
  date: string;
  time: string;
  description?: string;
  location?: string;
  userName?: string;
  confirmedUserIds: string[]; // Legacy - We will prioritize invites now
  comments: Comment[];
  start_time: string;
  end_time: string;
}


export interface SyncError {
  step: string;
  code?: string;
  message: string;
}

export interface AppState {
  user: User | null;
  team: Team | null;
  teams: Team[];
  events: AppEvent[];
  teamMembers: User[];
  notifications: Notification[];
  invites: Invite[];
  syncError: SyncError | null;
  loading: boolean;
}
