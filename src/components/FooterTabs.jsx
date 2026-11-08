import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styles from './FooterTabs.module.scss';

/**
 * FooterTabs — fixed bottom navigation for Admin protected pages.
 * Hidden on /login.
 *
 * Tabs: Dashboard (/home) · Services (/services) · Bookings (/admin/bookings) · Birthday Offers (/admin/birthday-offers) · Profile (/profile)
 */
const FooterTabs = () => {
  const location = useLocation();

  const publicPaths = ['/', '/login'];
  if (publicPaths.includes(location.pathname)) return null;

  const path = location.pathname;
  const isHomeActive = path === '/home';
  const isServicesActive = path.startsWith('/services') || path.startsWith('/admin/services');
  const isBookingsActive = path.startsWith('/admin/bookings') || path.startsWith('/bookings');
  const isBirthdayActive = path.startsWith('/admin/birthday-offers') || path.startsWith('/birthday-offers');
  const isProfileActive = path.startsWith('/profile');

  const tabs = [
    {
      to: '/home',
      label: 'Home',
      isActive: isHomeActive,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      to: '/services',
      label: 'Services',
      isActive: isServicesActive,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      to: '/admin/bookings',
      label: 'Bookings',
      isActive: isBookingsActive,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      to: '/admin/birthday-offers',
      label: 'Birthday Offers',
      isActive: isBirthdayActive,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      ),
    },
    {
      to: '/profile',
      label: 'Profile',
      isActive: isProfileActive,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <nav className={styles.footer} role="navigation" aria-label="Admin navigation">
      <ul className={styles.tabList}>
        {tabs.map(({ to, label, isActive, icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={isActive ? `${styles.tab} ${styles.active}` : styles.tab}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={styles.icon}>{icon}</div>
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default FooterTabs;

