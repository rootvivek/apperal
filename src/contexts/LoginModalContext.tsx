'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface LoginModalContextType {
  isOpen: boolean;
  openModal: (redirectTo?: string) => void;
  closeModal: () => void;
  redirectTo?: string;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function LoginModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | undefined>();

  const openModal = (redirect?: string) => {
    setRedirectTo(redirect);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setRedirectTo(undefined);
  };

  return (
    <LoginModalContext.Provider value={{ isOpen, openModal, closeModal, redirectTo }}>
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (context === undefined) {
    throw new Error('useLoginModal must be used within a LoginModalProvider');
  }
  return context;
}

