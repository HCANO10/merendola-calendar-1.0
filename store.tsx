
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Team, Snack, AppState, Comment, Notification, Invite, RSVPStatus, SyncError } from './types';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

// No loops or 406!

interface StoreContextType {
  state: AppState;
  session: Session | null;
  authLoading: boolean;
  loadError: boolean;
  dbNotInitialized: boolean;
  dbErrorMessage: string | null;
  fetchUserData: (userId: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any, error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPasswordForEmail: (email: string) => Promise<{ data: any, error: any }>;
  updateUser: (updates: Partial<User>) => void;
  createTeam: (name: string) => Promise<{ id: string; handle: string; invite_code: string }>;
  joinTeam: (code: string) => Promise<void>;
  joinTeamByHandle: (handle: string) => Promise<void>;
  switchTeam: (teamId: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
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
      teams: [],
      snacks: [],
      teamMembers: MOCK_TEAM_MEMBERS,
      notifications: [],
      invites: [],
      syncError: null
    };
    return { ...initialState, teamMembers: MOCK_TEAM_MEMBERS, syncError: null };
  });

  const [loadError, setLoadError] = useState(false);
  const [dbNotInitialized, setDbNotInitialized] = useState(false);
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);

  // Anti-loop Guards
  const didInitRef = React.useRef(false);
  const inFlightRef = React.useRef(false);
  const lastUserIdRef = React.useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    // 0. Loop Guard
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    lastUserIdRef.current = userId;

    console.log(`[Store] [fetchUserData] step=start userId=${userId}`);

    // Safety timeout
    const timeoutId = setTimeout(() => {
      setAuthLoading(false);
      setLoadError(true);
      inFlightRef.current = false;
      setState(prev => ({
        ...prev,
        syncError: { step: 'timeout', message: 'La sincronización tardó demasiado (10s)' }
      }));
      console.warn('[Store] fetchUserData timed out after 10s');
    }, 10000);

    setLoadError(false);
    setDbNotInitialized(false);
    setState(prev => ({ ...prev, syncError: null }));

    try {
      // 1. Initial State from Session
      console.log(`[Store] [fetchUserData] step=session`);
      const initialUser: User = {
        id: userId,
        email: session?.user?.email || '',
        name: session?.user?.email?.split('@')[0] || 'Usuario',
      };
      setState(prev => ({ ...prev, user: initialUser }));

      // 2. Get Profile
      console.log(`[Store] [fetchUserData] step=profile`);
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        const isTableMissing = profileError.code === 'PGRST204' ||
          profileError.code === 'PGRST205' ||
          profileError.message?.includes('schema cache') ||
          profileError.message?.includes('Relation "profiles" does not exist');

        if (isTableMissing) {
          console.error('DATABASE NOT INITIALIZED');
          setDbNotInitialized(true);
          setDbErrorMessage("La base de datos no está inicializada (falta la tabla profiles).");
          return;
        }

        console.error('Error fetching profile:', profileError);
        setState(prev => ({
          ...prev,
          syncError: {
            step: 'profile',
            code: profileError?.code,
            message: profileError?.message || 'Error al obtener el perfil'
          }
        }));
        setLoadError(true);
        return;
      }

      // 3. Auto-create profile if missing
      if (!profile) {
        console.log('[Store] [fetchUserData] step=profile_create');
        const { data: newProfile, error: insErr } = await supabase
          .from('profiles')
          .upsert(
            { user_id: userId, notification_email: session?.user?.email, display_name: initialUser.name },
            { onConflict: 'user_id' }
          )
          .select('*')
          .single();

        if (insErr) {
          console.error('Error creating auto-profile:', insErr);
          setState(prev => ({
            ...prev,
            syncError: {
              step: 'profile_create',
              code: insErr.code,
              message: insErr.message
            }
          }));
          setLoadError(true);
          return;
        }
        profile = newProfile;
      }

      const user: User = {
        id: userId,
        email: session?.user.email || '',
        name: profile?.display_name || initialUser.name,
        birthday: profile?.birthday,
        notificationEmail: profile?.notification_email,
        avatar: profile?.avatar_url,
        activeTeamId: profile?.active_team_id
      };

      // EARLY EXIT: If profile incomplete, stop here so UI can redirect
      const isProfileIncomplete = !user.birthday || !user.notificationEmail;
      if (isProfileIncomplete) {
        console.log('[Store] [fetchUserData] status=incomplete_profile');
        setState(prev => ({ ...prev, user }));
        return;
      }

      let activeTeamId = profile?.active_team_id || null;

      let team = null;
      let teams: Team[] = [];
      let teamMembers: User[] = [];
      let snacks: Snack[] = [];
      let invites: Invite[] = [];
      let notifications: Notification[] = [];

      // 5. Get Notifications
      console.log('[Store] [fetchUserData] step=notifications');
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notifError) {
        console.error('Error fetching notifications:', notifError);
      } else if (notifData) {
        notifications = notifData.map((n: any) => ({
          id: n.id,
          userId: n.user_id,
          type: n.type,
          payload: n.payload,
          readAt: n.read_at,
          createdAt: n.created_at
        }));
      }

      // 6. Get ALL User Teams (Memberships)
      console.log('[Store] [fetchUserData] step=all_teams');
      const { data: allTeamsData, error: allTeamsErr } = await supabase
        .from('memberships')
        .select('role, teams (*)')
        .eq('user_id', userId);

      if (allTeamsErr) {
        console.error('Error fetching all teams:', allTeamsErr);
      } else if (allTeamsData) {
        teams = allTeamsData.map((m: any) => ({
          id: m.teams.id,
          name: m.teams.name,
          join_code: m.teams.invite_code,
          createdAt: m.teams.created_at,
          role: m.role
        }));
      }

      // 6. Get Active Team Data
      if (activeTeamId) {
        console.log(`[Store] [fetchUserData] step=active_team id=${activeTeamId}`);
        const activeTeam = teams.find(t => t.id === activeTeamId);

        if (activeTeam) {
          team = activeTeam;

          // 7. Get Members
          console.log('[Store] [fetchUserData] step=members');
          const { data: membersData, error: membersError } = await supabase
            .from('memberships')
            .select('user_id, profiles(display_name, birthday, avatar_url, notification_email, active_team_id)')
            .eq('team_id', activeTeamId);

          if (membersError) {
            console.error('Error fetching members:', membersError);
          } else if (membersData) {
            teamMembers = membersData.map((m: any) => ({
              id: m.user_id,
              email: '',
              name: m.profiles.display_name,
              birthday: m.profiles.birthday,
              notificationEmail: m.profiles.notification_email,
              avatar: m.profiles.avatar_url,
              activeTeamId: m.profiles.active_team_id
            }));
          }

          // 8. Get Events
          console.log('[Store] [fetchUserData] step=events');
          const { data: snacksData, error: snacksError } = await supabase
            .from('events')
            .select(`
                *,
                profiles:created_by(display_name),
                attendees(user_id, status)
              `)
            .eq('team_id', activeTeamId);

          if (snacksError) {
            console.error('Error fetching snacks:', snacksError);
          } else if (snacksData) {
            snacks = snacksData.map((s: any) => {
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
                userId: s.created_by,
                teamId: s.team_id,
                eventTitle: s.title,
                contribution: s.contribution,
                date: s.date,
                time: s.time,
                description: s.description,
                location: s.location,
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
        teams,
        teamMembers,
        snacks,
        invites,
        notifications,
        syncError: null
      }));

      console.log(`[Store] [fetchUserData] step=success userId=${userId}`);
    } catch (error: any) {
      console.error('[Store] Fatal error in fetchUserData:', error);
      setState(prev => ({
        ...prev,
        syncError: { step: 'fatal', message: error.message || 'Error fatal desconocido' }
      }));
      setLoadError(true);
    } finally {
      clearTimeout(timeoutId);
      setAuthLoading(false);
      inFlightRef.current = false;
    }
  }, [session, state.user?.id, loadError, dbNotInitialized]);

  // Handle Supabase Session
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    console.log('[Store] AuthProvider Init');
    let mounted = true;

    const initAuth = async () => {
      setAuthLoading(true);
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(initialSession);
        if (initialSession?.user) {
          fetchUserData(initialSession.user.id);
        } else {
          setAuthLoading(false);
        }
      } catch (err) {
        console.error('[Store] Session init error:', err);
        setAuthLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user) {
        fetchUserData(newSession.user.id);
      } else {
        setAuthLoading(false);
        setState({
          user: null,
          team: null,
          teams: [],
          snacks: [],
          teamMembers: [],
          notifications: [],
          invites: [],
          syncError: null
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // Persist State
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
    if (!state.user) throw new Error('Usuario no autenticado');
    const teamNameTrimmed = name.trim();
    if (!teamNameTrimmed) throw new Error('Escribe un nombre de equipo');

    try {
      const { data, error } = await supabase.rpc('create_team', { team_name: teamNameTrimmed });
      if (error) {
        const err = error as any;
        const isMissingRpc = err.code === 'PGRST104' || err.code === '42883' ||
          err.status === 404 || err.message?.includes('schema cache');
        if (isMissingRpc) {
          throw new Error('CONFIG_ERROR: La función create_team no existe.');
        }
        throw error;
      }
      if (data) {
        lastUserIdRef.current = null;
        if (session?.user) await fetchUserData(session.user.id);
        return data as { id: string; handle: string; invite_code: string };
      }
      throw new Error('Error al crear el equipo');
    } catch (e) {
      console.error('[Store] createTeam error:', e);
      throw e;
    }
  };

  const joinTeam = async (code: string) => {
    if (!state.user) return;
    const codeTrimmed = code.trim();
    try {
      const { data: teamId, error } = await supabase.rpc('join_team', { invite_code: codeTrimmed });
      if (error) throw error;
      if (teamId) {
        lastUserIdRef.current = null;
        if (session?.user) await fetchUserData(session.user.id);
      }
    } catch (e) {
      console.error('[Store] joinTeam error:', e);
      throw e;
    }
  };

  const switchTeam = async (teamId: string) => {
    if (!state.user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active_team_id: teamId })
        .eq('user_id', state.user.id);

      if (error) throw error;

      // Recargar datos para el nuevo equipo
      await fetchUserData(state.user.id);
    } catch (e) {
      console.error('[Store] switchTeam error:', e);
      throw e;
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!state.user) return;
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
      await fetchUserData(state.user.id);
    } catch (e) {
      console.error('[Store] deleteTeam error:', e);
      throw e;
    }
  };

  const joinTeamByHandle = async (handle: string) => {
    if (!state.user) return;
    const handleTrimmed = handle.trim();
    try {
      const { data: teamId, error } = await supabase.rpc('join_team_by_handle', { team_handle: handleTrimmed });
      if (error) throw error;
      if (teamId) {
        lastUserIdRef.current = null;
        if (session?.user) await fetchUserData(session.user.id);
      }
    } catch (e) {
      console.error('[Store] joinTeamByHandle error:', e);
      throw e;
    }
  };

  const addSnack = async (snackData: Omit<Snack, 'id' | 'userId' | 'teamId' | 'confirmedUserIds' | 'comments'>) => {
    if (!state.user || !state.team) return;
    const { error } = await supabase.from('merendolas').insert([{
      team_id: state.team.id,
      user_id: state.user.id,
      title: snackData.eventTitle,
      contribution: snackData.contribution,
      date: snackData.date,
      time: snackData.time,
      description: snackData.description
    }]);
    if (error) throw error;

    // Recargar datos para ver el nuevo evento y sus participantes automáticos (trigger)
    await fetchUserData(state.user.id);
  };

  const editSnack = useCallback((id: string, updates: Partial<Snack>) => {
    setState(prev => ({ ...prev, snacks: prev.snacks.map(s => s.id === id ? { ...s, ...updates } : s) }));
  }, []);

  const deleteSnack = useCallback(async (id: string) => {
    const { error } = await supabase.from('merendolas').delete().eq('id', id);
    if (error) {
      console.error('Error deleting snack:', error);
      return;
    }
    setState(prev => ({ ...prev, snacks: prev.snacks.filter(s => s.id !== id) }));
  }, []);

  const toggleAttendance = useCallback((snackId: string) => {
    if (!state.user) return;
    setState(prev => ({
      ...prev,
      snacks: prev.snacks.map(s => {
        if (s.id !== snackId) return s;
        const userId = state.user!.id;
        const exists = s.confirmedUserIds.includes(userId);
        return {
          ...s,
          confirmedUserIds: exists ? s.confirmedUserIds.filter(id => id !== userId) : [...s.confirmedUserIds, userId]
        };
      })
    }));
  }, [state.user]);

  const respondToInvite = useCallback(async (merendolaId: string, status: RSVPStatus) => {
    if (!state.user) return;
    const userId = state.user.id;

    const { error } = await supabase
      .from('attendees')
      .upsert({
        merendola_id: merendolaId,
        user_id: userId,
        status: status,
        responded_at: new Date().toISOString()
      }, { onConflict: 'merendola_id,user_id' });

    if (error) {
      console.error('Error responding to invite:', error);
      return;
    }

    // Actualizar localmente para feedback inmediato
    setState(prev => {
      const existing = prev.invites.findIndex(i => i.merendolaId === merendolaId && i.userId === userId);
      const newInvites = [...prev.invites];
      const inviteData = {
        id: `att_${merendolaId}_${userId}`,
        merendolaId,
        userId,
        status,
        responded_at: new Date().toISOString()
      };

      if (existing >= 0) {
        newInvites[existing] = inviteData;
      } else {
        newInvites.push(inviteData);
      }

      return { ...prev, invites: newInvites };
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
    const newComment = { id: Math.random().toString(36).substring(7), userId: state.user.id, userName: state.user.name || 'Usuario', text, timestamp: new Date().toISOString() };
    setState(prev => ({
      ...prev,
      snacks: prev.snacks.map(s => s.id === snackId ? { ...s, comments: [...s.comments, newComment] } : s)
    }));
  }, [state.user]);

  return (
    <StoreContext.Provider value={{
      state, session, authLoading, loadError, dbNotInitialized, dbErrorMessage, fetchUserData, signUp, signIn, signOut, resetPasswordForEmail, updateUser, createTeam, joinTeam, joinTeamByHandle, switchTeam, deleteTeam, setTeam, addSnack, editSnack, deleteSnack, toggleAttendance, respondToInvite, markNotificationRead, addComment
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
