import React from 'react';
import styles from './AdminPageHeader.module.scss';

/**
 * AdminPageHeader — standardized header component for admin views.
 * Ensures consistent page title, subtitle, spacing, and action button positioning.
 */
const AdminPageHeader = ({ title, subtitle, actions, children }) => {
  return (
    <div className={styles.headerWrapper}>
      <div className={styles.headerRow}>
        <div className={styles.titleArea}>
          <h1 className={styles.pageTitle}>{title}</h1>
          {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actionArea}>{actions}</div>}
      </div>
      {children && <div className={styles.subHeaderArea}>{children}</div>}
    </div>
  );
};

export default AdminPageHeader;
