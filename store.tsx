
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Team, Snack, AppState, Comment, Notification, Invite, RSVPStatus } from './types';
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

  const [loadError, setLoadError] = useState(false);
  const [dbNotInitialized, setDbNotInitialized] = useState(false);
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);
  const fetchInFlight = React.useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    // 0. Loop Guard: If already fetching THIS user, skip
    if (fetchInFlight.current === userId) return;
    fetchInFlight.current = userId;

    console.log('--- fetchUserData Start ---', userId);

    // Safety timeout to avoid infinite loading
    const timeoutId = setTimeout(() => {
      setAuthLoading(false);
      setLoadError(true);
      fetchInFlight.current = null;
      console.warn('fetchUserData timed out after 10s');
    }, 10000);

    setLoadError(false);
    setDbNotInitialized(false);

    try {
      // 1. Set immediate user state from session to avoid "null" rebounces
      const initialUser: User = {
        id: userId,
        email: session?.user?.email || '',
        name: session?.user?.email?.split('@')[0] || 'Usuario',
      };

      setState(prev => ({ ...prev, user: initialUser }));

      // 2. Get Profile (Use maybeSingle to avoid 406)
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        // DETECT MISSING DATABASE / TABLE
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
        setLoadError(true);
        return;
      }

      // 3. Auto-create profile if missing (upsert)
      if (!profile) {
        console.log('Profile missing, creating auto-profile for:', userId);
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
          setLoadError(true);
          return;
        }
        profile = newProfile;
      }

      let activeTeamId = profile?.active_team_id || null;

      // 4. Fallback Team Selection: If no active_team_id, check memberships
      if (!activeTeamId) {
        console.log('No active team, checking memberships for:', userId);
        const { data: mData } = await supabase
          .from('memberships')
          .select('team_id')
          .eq('user_id', userId)
          .limit(1);

        if (mData && mData.length > 0) {
          activeTeamId = mData[0].team_id;
          console.log('Found team membership, setting as active:', activeTeamId);
          await supabase.from('profiles').update({ active_team_id: activeTeamId }).eq('user_id', userId);
        }
      }

      const user: User = {
        id: userId,
        email: session?.user.email || '',
        name: profile?.display_name || initialUser.name,
        birthday: profile?.birthday,
        notificationEmail: profile?.notification_email,
        avatar: profile?.avatar_url,
        activeTeamId: activeTeamId
      };

      let team = null;
      let teamMembers: User[] = [];
      let snacks: Snack[] = [];
      let invites: Invite[] = [];

      // 5. Get Active Team Data
      if (activeTeamId) {
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', activeTeamId)
          .single();

        if (teamError) {
          console.error('Error fetching team:', teamError);
          // Don't mark as loadError entirely, maybe team was deleted
        } else if (teamData) {
          team = {
            id: teamData.id,
            name: teamData.name,
            inviteCode: teamData.invite_code,
            createdAt: teamData.created_at
          };

          // 6. Get Members
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

          // 7. Get Merendolas (RLS filtered)
          const { data: snacksData, error: snacksError } = await supabase
            .from('merendolas')
            .select(`
              *,
              profiles(display_name),
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
      console.error('Fatal error in fetchUserData:', error);
      setLoadError(true);
    } finally {
      clearTimeout(timeoutId);
      setAuthLoading(false);
      fetchInFlight.current = null;
    }
  }, [session]);

  // Handle Supabase Session
  useEffect(() => {
    console.log('--- AuthProvider Init ---');
    setAuthLoading(true);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Auth getSession success:', !!session);
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth Event:', event, 'Session:', !!session);
      setSession(session);

      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        // Clear state on logout or if no user
        setAuthLoading(false);
        setState({
          user: null,
          team: null,
          snacks: [],
          teamMembers: [],
          notifications: [],
          invites: []
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

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
      state, session, authLoading, loadError, dbNotInitialized, dbErrorMessage, fetchUserData, signUp, signIn, signOut, resetPasswordForEmail, updateUser, createTeam, joinTeam, setTeam, addSnack, editSnack, deleteSnack, toggleAttendance, respondToInvite, markNotificationRead, addComment
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
