import React from 'react';
import CustomerPageContainer from './CustomerPageContainer';

/**
 * AdminPageContainer — delegates directly to CustomerPageContainer
 * to guarantee identical content width (1200px), margins, padding,
 * navbar/footer clearance, and alignment between Admin and Customer views.
 */
const AdminPageContainer = ({ children, className = '', mainClassName = '' }) => {
  return (
    <CustomerPageContainer className={className} mainClassName={mainClassName}>
      {children}
    </CustomerPageContainer>
  );
};

export default AdminPageContainer;
