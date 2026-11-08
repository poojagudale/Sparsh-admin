import React, { useState, useEffect } from 'react';
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiPhone,
  FiMail,
  FiScissors,
  FiMessageSquare,
  FiX,
  FiCheck,
  FiPlus,
  FiAlertCircle,
} from 'react-icons/fi';
import { createBooking, adminConfirmBooking } from '../api/bookingApi';
import { createCustomer } from '../api/CustomerApi';
import { formatPhoneDisplay, cleanIndianMobile } from '../utils/whatsappUtils';
import styles from './ScheduleBookingModal.module.scss';

const PERIOD_OPTIONS = [
  { key: 'MORNING', label: 'Morning', time: '9:00 AM – 1:00 PM' },
  { key: 'AFTERNOON', label: 'Afternoon', time: '1:00 PM – 5:00 PM' },
  { key: 'EVENING', label: 'Evening', time: '5:00 PM – 9:00 PM' },
];

const ScheduleBookingModal = ({
  isOpen,
  onClose,
  initialDate,
  customers = [],
  services = [],
  onBookingSuccess,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  // Mode: 'existing' or 'new'
  const [customerMode, setCustomerMode] = useState('existing');

  // Existing customer selection
  const [selectedCustId, setSelectedCustId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // New customer fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');

  // Booking fields
  const [serviceId, setServiceId] = useState('');
  const [bookingDate, setBookingDate] = useState(
    initialDate && initialDate >= todayStr ? initialDate : todayStr
  );
  const [preferredPeriod, setPreferredPeriod] = useState('MORNING');
  const [notes, setNotes] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(true);

  // Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtered active services
  const activeServices = services.filter((s) => s.isActive !== false);

  // Set default service
  useEffect(() => {
    if (activeServices.length > 0 && !serviceId) {
      setServiceId(String(activeServices[0].serviceId));
    }
  }, [activeServices, serviceId]);

  // Sync date when modal opens with a new initialDate
  useEffect(() => {
    if (isOpen) {
      if (initialDate && initialDate >= todayStr) {
        setBookingDate(initialDate);
      } else {
        setBookingDate(todayStr);
      }
      setErrorMsg('');
      setNotes('');
    }
  }, [isOpen, initialDate, todayStr]);

  // Filtered existing customers
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${c.fName || ''} ${c.lName || ''}`.toLowerCase();
    const phone = (c.mobile || '').toLowerCase();
    return fullName.includes(q) || phone.includes(q);
  });

  // Selected customer object
  const selectedCustomer = customers.find(
    (c) => String(c.custId) === String(selectedCustId)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation: Customer
    let clientName = '';
    let clientPhone = '';

    if (customerMode === 'existing') {
      if (!selectedCustId || !selectedCustomer) {
        setErrorMsg('Please select an existing customer from the list.');
        return;
      }
      clientName = `${selectedCustomer.fName || ''} ${selectedCustomer.lName || ''}`.trim() || 'Client';
      clientPhone = selectedCustomer.mobile || '';
    } else {
      if (!firstName.trim()) {
        setErrorMsg('Customer first name is required.');
        return;
      }
      const cleaned = cleanIndianMobile(mobile);
      if (!cleaned) {
        setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      clientName = `${firstName.trim()} ${lastName.trim()}`.trim();
      clientPhone = cleaned;
    }

    // Validation: Service
    if (!serviceId) {
      setErrorMsg('Please select a salon service.');
      return;
    }

    // Validation: Date
    if (!bookingDate) {
      setErrorMsg('Please select an appointment date.');
      return;
    }
    if (bookingDate < todayStr) {
      setErrorMsg('Appointment date cannot be in the past.');
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: If registering new customer, save to CRM
      if (customerMode === 'new') {
        try {
          await createCustomer({
            fName: firstName.trim(),
            lName: lastName.trim(),
            mobile: clientPhone,
            email: email.trim() || undefined,
            dob: dob || undefined,
            smsEnabled: 1,
            isEnabled: 1,
          });
        } catch (custErr) {
          console.warn('Customer registration error (continuing with booking):', custErr);
        }
      }

      // Step 2: Build booking payload with client origin
      const clientTag = `Phone/WhatsApp Booking for ${clientName} (${clientPhone})`;
      const customNotes = notes.trim() ? `Note: ${notes.trim()}` : '';
      const specialRequestParts = [clientTag, customNotes].filter(Boolean);

      const bookingPayload = {
        serviceId: Number(serviceId),
        preferredDate: bookingDate,
        preferredPeriod: preferredPeriod,
        specialRequest: specialRequestParts.join(' | '),
      };

      // Step 3: Create booking
      const newBooking = await createBooking(bookingPayload);

      // Step 4: Auto-confirm if requested
      if (autoConfirm && newBooking?.bookingId) {
        try {
          await adminConfirmBooking(newBooking.bookingId);
        } catch (confErr) {
          console.warn('Auto-confirmation skipped:', confErr);
        }
      }

      // Step 5: Notify parent
      if (onBookingSuccess) {
        onBookingSuccess({
          booking: newBooking,
          clientName,
          bookingDate,
        });
      }

      onClose();
    } catch (err) {
      console.error('Failed to schedule appointment:', err);
      setErrorMsg(
        err.message || 'Unable to schedule appointment. Please check connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleWrap}>
            <div className={styles.headerIcon}>
              <FiCalendar />
            </div>
            <div>
              <h3 className={styles.headerTitle}>Schedule Appointment</h3>
              <p className={styles.headerSub}>
                Quick booking for phone calls, WhatsApp inquiries, or walk-in clients
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <FiX />
          </button>
        </div>

        {errorMsg && (
          <div className={styles.errorAlert}>
            <FiAlertCircle />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.bookingForm}>
          {/* Customer Mode Switcher */}
          <div className={styles.sectionBlock}>
            <label className={styles.sectionLabel}>
              <FiUser /> Client Information
            </label>
            <div className={styles.modeTabs}>
              <button
                type="button"
                className={`${styles.modeTab} ${customerMode === 'existing' ? styles.modeTabActive : ''}`}
                onClick={() => setCustomerMode('existing')}
              >
                Select Existing Customer
              </button>
              <button
                type="button"
                className={`${styles.modeTab} ${customerMode === 'new' ? styles.modeTabActive : ''}`}
                onClick={() => setCustomerMode('new')}
              >
                <FiPlus size={13} /> Register New Customer
              </button>
            </div>

            {customerMode === 'existing' ? (
              <div className={styles.existingCustomerBox}>
                <div className={styles.fieldGroup}>
                  <input
                    type="text"
                    placeholder="Search client by name or mobile number..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                <div className={styles.customerSelectList}>
                  {filteredCustomers.length === 0 ? (
                    <div className={styles.noCustomers}>
                      <span>No matching customers found.</span>
                      <button
                        type="button"
                        onClick={() => setCustomerMode('new')}
                        className={styles.inlineAddBtn}
                      >
                        + Register as New Customer
                      </button>
                    </div>
                  ) : (
                    filteredCustomers.map((c) => {
                      const isSelected = String(c.custId) === String(selectedCustId);
                      const name = `${c.fName || ''} ${c.lName || ''}`.trim() || 'Client';
                      return (
                        <div
                          key={c.custId}
                          className={`${styles.customerItem} ${isSelected ? styles.customerItemSelected : ''}`}
                          onClick={() => setSelectedCustId(String(c.custId))}
                        >
                          <div className={styles.custInitial}>
                            {(c.fName?.[0] || 'C').toUpperCase()}
                          </div>
                          <div className={styles.custMeta}>
                            <span className={styles.custName}>{name}</span>
                            <span className={styles.custPhone}>
                              {formatPhoneDisplay(c.mobile)}
                            </span>
                          </div>
                          {isSelected && <FiCheck className={styles.selectedCheck} />}
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedCustomer && (
                  <div className={styles.selectedPill}>
                    <span>Selected:</span>
                    <strong>
                      {selectedCustomer.fName} {selectedCustomer.lName}
                    </strong>
                    <span>({selectedCustomer.mobile})</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.newCustomerBox}>
                <div className={styles.rowTwoCols}>
                  <div className={styles.fieldGroup}>
                    <label>First Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Pooja"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Gudale"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.rowTwoCols}>
                  <div className={styles.fieldGroup}>
                    <label>Mobile Number (10 digits) *</label>
                    <div className={styles.inputWithPrefix}>
                      <span>+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="9964210706"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label>Email (Optional)</label>
                    <input
                      type="email"
                      placeholder="client@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label>Date of Birth (Optional – for Birthday Offers)</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Service Selection */}
          <div className={styles.sectionBlock}>
            <label className={styles.sectionLabel}>
              <FiScissors /> Salon Service *
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className={styles.selectInput}
              required
            >
              {activeServices.length === 0 ? (
                <option value="">No active services available</option>
              ) : (
                activeServices.map((s) => (
                  <option key={s.serviceId} value={s.serviceId}>
                    {s.serviceName}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date & Time Slot Selection */}
          <div className={styles.sectionBlock}>
            <label className={styles.sectionLabel}>
              <FiCalendar /> Appointment Schedule *
            </label>
            <div className={styles.fieldGroup}>
              <label>Appointment Date *</label>
              <input
                type="date"
                min={todayStr}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
              />
            </div>

            <div className={styles.periodPicker}>
              <span className={styles.periodPickerLabel}>Time Period *</span>
              <div className={styles.periodOptionsRow}>
                {PERIOD_OPTIONS.map((p) => {
                  const isChosen = preferredPeriod === p.key;
                  return (
                    <button
                      type="button"
                      key={p.key}
                      className={`${styles.periodBtn} ${isChosen ? styles.periodBtnActive : ''}`}
                      onClick={() => setPreferredPeriod(p.key)}
                    >
                      <span className={styles.periodName}>{p.label}</span>
                      <span className={styles.periodTime}>{p.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Special Request or Booking Notes */}
          <div className={styles.sectionBlock}>
            <label className={styles.sectionLabel}>
              <FiMessageSquare /> Booking Notes / Special Request
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Client requested a senior stylist. Inquired through phone call."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={styles.notesTextarea}
            />
          </div>

          {/* Auto-Confirm Option */}
          <div className={styles.confirmCheckRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={autoConfirm}
                onChange={(e) => setAutoConfirm(e.target.checked)}
              />
              <span>
                Immediately confirm this appointment (Client already agreed on call / WhatsApp)
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? (
                <span>Scheduling...</span>
              ) : (
                <>
                  <FiCheck size={16} />
                  <span>Confirm & Save Appointment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleBookingModal;

