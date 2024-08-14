import { createContext, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import supabase from 'lib/supabase-client'
import type { uuid } from 'types/main'

export type AuthState = {
  isAuth: boolean
  userId: uuid | null
  userEmail: string | null
}

export const AuthContext = createContext<AuthState>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [sessionState, setSessionState] = useState(null)

  /*
    This effect should run once when the app first mounts (the context provider), and then
    hopefully never again. We're just going to attach this auth-state-change listener, and whenever
    the auth state changes, we check what kind of change has happened, update the state hook and do
    whatever cache invalidation is needed.

    Normally we would want to use a useQuery() hook to fetch the user info and pass the data
    directly as the context value (per https://tkdodo.eu/blog/react-query-and-react-context), but
    supabase-js is giving us this handy listener to update state, and so far we've never
    encountered a race condition where 'INITIAL_SESSION' fires after the listener is attached.
  */

  useEffect(() => {
    if (!queryClient) {
      console.log('Returning early bc queryClient hook has not come back')
      return
    }
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`Auth state changed: ${event}`, session)
        // if we've logged out or no user comes back, we should remove user data from cache
        if (event === 'SIGNED_OUT' || !session?.user) {
          queryClient.removeQueries({ queryKey: ['user'] })
        }
        setSessionState(session)
      }
    )

    return () => {
      console.log(`Unmounting`)
      listener.subscription.unsubscribe()
    }
  }, [queryClient])

  console.log(`Creating auth context and rendering provider`, sessionState)

  const value = {
    isAuth: sessionState?.user.role === 'authenticated',
    userId: sessionState?.user.id,
    userEmail: sessionState?.user.email,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
