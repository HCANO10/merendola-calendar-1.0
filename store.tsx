
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Team, Snack, AppState, Comment, Notification, Invite, RSVPStatus } from './types';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

interface StoreContextType {
  state: AppState;
  session: Session | null;
  authLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any, error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPasswordForEmail: (email: string) => Promise<{ data: any, error: any }>;
  updateUser: (updates: Partial<User>) => void;
  createTeam: (name: string) => Promise<void>;
  joinTeam: (code: string) => Promise<void>;
  setTeam: (team: Team) => void;
  addSnack: (snack: Omit<Snack, 'id' | 'userId' | 'teamId' | 'confirmedUserIds' | 'comments'>) => Promise<void>;
  editSnack: (id: string, updates: Partial<Snack>) => void;
  deleteSnack: (id: string) => void;
  toggleAttendance: (snackId: string) => void;
  respondToInvite: (merendolaId: string, status: RSVPStatus) => void;
  markNotificationRead: (id: string) => void;
  addComment: (snackId: string, text: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const MOCK_TEAM_MEMBERS: User[] = [
  { id: 'u2', name: 'Laura Martínez', email: 'laura@empresa.es', birthday: '1995-05-12', avatar: 'https://i.pravatar.cc/150?u=laura' },
  { id: 'u3', name: 'Carlos Sanz', email: 'carlos@empresa.es', birthday: '1988-12-24', avatar: 'https://i.pravatar.cc/150?u=carlos' },
  { id: 'u4', name: 'Elena Peñas', email: 'elena@empresa.es', birthday: '1992-08-15', avatar: 'https://i.pravatar.cc/150?u=elena' },
];

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [state, setState] = useState<AppState>(() => {
    // Initial state loading
    const saved = localStorage.getItem('merendola_state_v3');
    const initialState: AppState = saved ? JSON.parse(saved) : {
      user: null,
      team: null,
      snacks: [],
      teamMembers: MOCK_TEAM_MEMBERS,
      notifications: [],
      invites: []
    };
    return { ...initialState, teamMembers: MOCK_TEAM_MEMBERS };
  });

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // 1. Get Profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
        return;
      }

      // If no profile, we can't do much (it should exist on trigger or be created)
      if (!profile) return;

      const user: User = {
        id: profile.user_id,
        email: session?.user.email || '',
        name: profile.display_name || '',
        birthday: profile.birthday,
        notificationEmail: profile.notification_email,
        avatar: profile.avatar_url,
        activeTeamId: profile.active_team_id
      };

      let team = null;
      let teamMembers: User[] = [];
      let snacks: Snack[] = [];
      let invites: Invite[] = [];

      // 2. Get Active Team Data
      if (profile.active_team_id) {
        const { data: teamData } = await supabase.from('teams').select('*').eq('id', profile.active_team_id).single();
        if (teamData) {
          team = {
            id: teamData.id,
            name: teamData.name,
            inviteCode: teamData.invite_code,
            createdAt: teamData.created_at
          };

          // 3. Get Members
          const { data: membersData } = await supabase
            .from('memberships')
            .select('user_id, profiles(display_name, birthday, avatar_url, notification_email, active_team_id)')
            .eq('team_id', profile.active_team_id);

          if (membersData) {
            teamMembers = membersData.map((m: any) => ({
              id: m.user_id,
              email: '', // We don't expose emails of others potentially, or fetch from auth if possible (cant select from auth)
              name: m.profiles.display_name,
              birthday: m.profiles.birthday,
              notificationEmail: m.profiles.notification_email,
              avatar: m.profiles.avatar_url,
              activeTeamId: m.profiles.active_team_id
            }));
          }

          // 4. Get Merendolas (RLS filtered)
          const { data: snacksData } = await supabase
            .from('merendolas')
            .select(`
              *,
              profiles(display_name),
              attendees(user_id, status)
            `)
            .eq('team_id', profile.active_team_id);

          if (snacksData) {
            snacks = snacksData.map((s: any) => {
              // Map attendees to invites/confirmed
              s.attendees?.forEach((a: any) => {
                invites.push({
                  id: `att_${s.id}_${a.user_id}`,
                  merendolaId: s.id,
                  userId: a.user_id,
                  status: a.status
                });
              });

              return {
                id: s.id,
                userId: s.user_id,
                teamId: s.team_id,
                eventTitle: s.title,
                contribution: s.contribution,
                date: s.date,
                time: s.time,
                description: s.description,
                userName: s.profiles?.display_name,
                confirmedUserIds: [],
                comments: []
              };
            });
          }
        }
      }

      setState(prev => ({
        ...prev,
        user,
        team,
        teamMembers,
        snacks,
        invites
      }));

    } catch (error) {
      console.error('Error in fetchUserData:', error);
    }
  }, [session]);

  // Handle Supabase Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setState({
          user: null,
          team: null,
          snacks: [],
          teamMembers: [], // Clear on logout
          notifications: [],
          invites: []
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persist State (Data)
  useEffect(() => {
    localStorage.setItem('merendola_state_v3', JSON.stringify(state));
  }, [state]);

  const signUp = async (email: string, password: string) => {
    return await supabase.auth.signUp({ email, password });
  };

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  };

  const resetPasswordForEmail = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`
    });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };


  const updateUser = useCallback((updates: Partial<User>) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null
    }));
  }, []);

  const setTeam = useCallback((team: Team) => {
    setState(prev => ({
      ...prev,
      team,
      user: prev.user ? { ...prev.user, teamId: team.id } : null
    }));
  }, []);

  const createTeam = async (name: string) => {
    if (!state.user) return;
    try {
      const { data: teamId, error } = await supabase.rpc('create_team', { team_name: name });
      if (error) throw error;
      if (teamId) {
        // If we had a fetchUserData exposed in context, we'd call it here.
        // Since it's internal to the effect, we can trigger a reload or rely on real-time if enabled.
        // For now, reload window is crude but guarantees state sync with new RLS scope.
        // Or better: Assume the user profile active_team_id updated, so we need to refresh session/data.
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const joinTeam = async (code: string) => {
    if (!state.user) return;
    try {
      const { data: teamId, error } = await supabase.rpc('join_team', { invite_code_input: code });
      if (error) throw error;
      if (teamId) {
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const addSnack = async (snackData: Omit<Snack, 'id' | 'userId' | 'teamId' | 'confirmedUserIds' | 'comments'>) => {
    if (!state.user || !state.team) return;

    const { data, error } = await supabase.from('merendolas').insert([{
      team_id: state.team.id,
      user_id: state.user.id,
      title: snackData.eventTitle,
      contribution: snackData.contribution,
      date: snackData.date,
      time: snackData.time,
      description: snackData.description
    }]).select().single();

    if (error) {
      console.error("Error adding snack:", error);
      throw error;
    }

    // Trigger (on_merendola_created) handles attendees creation automatically
    // We rely on re-fetching or real-time to see updates. 
    // For this step, a window reload or prop callback is simplest if fetchUserData isn't exposed.
    window.location.reload();
  };

  const editSnack = useCallback((id: string, updates: Partial<Snack>) => {
    setState(prev => ({
      ...prev,
      snacks: prev.snacks.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  }, []);

  const deleteSnack = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      snacks: prev.snacks.filter(s => s.id !== id)
    }));
  }, []);

  const toggleAttendance = useCallback((snackId: string) => {
    if (!state.user) return;
    const userId = state.user.id;
    setState(prev => ({
      ...prev,
      snacks: prev.snacks.map(s => {
        if (s.id !== snackId) return s;
        const exists = s.confirmedUserIds.includes(userId);
        return {
          ...s,
          confirmedUserIds: exists
            ? s.confirmedUserIds.filter(id => id !== userId)
            : [...s.confirmedUserIds, userId]
        };
      })
    }));
  }, [state.user]);

  const respondToInvite = useCallback((merendolaId: string, status: RSVPStatus) => {
    if (!state.user) return;
    const inviteId = `inv_${merendolaId}_${state.user.id}`;

    setState(prev => {
      const existingInviteIndex = prev.invites.findIndex(i => i.merendolaId === merendolaId && i.userId === state.user!.id);
      let newInvites = [...prev.invites];

      const inviteData: Invite = {
        id: inviteId,
        merendolaId,
        userId: state.user!.id,
        status,
        respondedAt: new Date().toISOString()
      };

      if (existingInviteIndex >= 0) {
        newInvites[existingInviteIndex] = inviteData;
      } else {
        newInvites.push(inviteData);
      }

      // Also mark associated notifications as read
      const newNotifications = prev.notifications.map(n =>
        n.payload.merendolaId === merendolaId ? { ...n, readAt: new Date().toISOString() } : n
      );

      return { ...prev, invites: newInvites, notifications: newNotifications };
    });
  }, [state.user]);

  const markNotificationRead = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
    }));
  }, []);

  const addComment = useCallback((snackId: string, text: string) => {
    if (!state.user) return;
    const newComment: Comment = {
      id: Math.random().toString(36).substring(7),
      userId: state.user.id,
      userName: state.user.name || 'Usuario',
      text,
      timestamp: new Date().toISOString()
    };
    setState(prev => ({
      ...prev,
      snacks: prev.snacks.map(s => s.id === snackId ? { ...s, comments: [...s.comments, newComment] } : s)
    }));
  }, [state.user]);

  return (
    <StoreContext.Provider value={{
      state, session, authLoading, signUp, signIn, signOut, resetPasswordForEmail, updateUser, setTeam, addSnack, editSnack, deleteSnack, toggleAttendance, respondToInvite, markNotificationRead, addComment
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
