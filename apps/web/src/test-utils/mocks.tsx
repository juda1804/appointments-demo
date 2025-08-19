import React from 'react';

// Global mock components for tests
export const MockIcon = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function MockIcon(props, ref) {
    return <div ref={ref} data-testid="mock-icon" {...props} />;
  }
);

// Mock Heroicons
export const HeroiconMocks = {
  HomeIcon: MockIcon,
  UserGroupIcon: MockIcon,
  CogIcon: MockIcon,
  CalendarIcon: MockIcon,
  ClipboardDocumentListIcon: MockIcon,
  UsersIcon: MockIcon,
  XMarkIcon: MockIcon,
  Bars3Icon: MockIcon,
};

// Mock Next.js Link
export const MockLink = React.forwardRef<HTMLAnchorElement, { children: React.ReactNode; href: string; [key: string]: unknown }>(
  function MockLink({ children, href, ...props }, ref) {
    return (
      <a href={href} ref={ref} {...props}>
        {children}
      </a>
    );
  }
);