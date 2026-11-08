import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ServiceList from './services/ServiceList';
import ServiceForm from './services/ServiceForm';
import ServiceDetails from './services/ServiceDetails';

/**
 * Services router for Admin Services.
 * All sub-routes (list, add, edit, details) use AdminPageContainer for layout consistency.
 */
const Services = () => {
  return (
    <Routes>
      <Route index element={<ServiceList />} />
      <Route path="add" element={<ServiceForm />} />
      <Route path=":id/edit" element={<ServiceForm />} />
      <Route path=":id" element={<ServiceDetails />} />
    </Routes>
  );
};

export default Services;
