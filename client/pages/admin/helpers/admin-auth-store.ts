import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AdminAuthState = {
  token: string | null;
  
  setToken: (token: string) => void;
  logout: () => void;
};

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    set => ({
      token: null,
      
      setToken: (token): void => {
        set({ token });
      },
      logout: (): void => {
        set({ token: null });
      }
    }),
    {
      name: 'fight-for-your-right-admin-auth'
    }
  )
);
