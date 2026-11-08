import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCalendar,
  FiGift,
  FiCopy,
  FiSearch,
  FiCheck,
  FiAlertCircle,
  FiEdit3,
  FiEye,
  FiUser,
  FiPhone,
  FiClock,
  FiRefreshCw,
  FiX,
  FiInfo,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import AdminPageContainer from '../components/AdminPageContainer';
import AdminPageHeader from '../components/AdminPageHeader';
import Toast from '../components/Toast';
import {
  getTomorrowBirthdays,
  getUpcomingBirthdays,
  getPassedBirthdays,
  getAllBirthdays,
  getBirthdaySummary,
} from '../api/birthdayOfferApi';
import { openWhatsApp, copyToClipboard, formatPhoneDisplay } from '../utils/whatsappUtils';
import {
  BIRTHDAY_TEMPLATES,
  DEFAULT_OFFER_CONFIG,
  populateTemplate,
} from '../constants/birthdayTemplates';
import styles from './AdminBirthdayOffers.module.scss';

const TABS = [
  { key: 'TOMORROW', label: "Tomorrow's Birthdays", icon: FiGift },
  { key: 'UPCOMING', label: 'Next 7 Days', icon: FiClock },
  { key: 'PASSED', label: 'Passed This Year', icon: FiCalendar },
];

const AdminBirthdayOffers = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('TOMORROW');
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Per-customer selected template: { [custId]: 'classic' | 'special' | 'premium' | 'short' }
  const [customerTemplates, setCustomerTemplates] = useState({});

  // Per-customer customized messages: { [custId]: customMessageString }
  const [customMessages, setCustomMessages] = useState({});

  // Customer currently being edited in template edit modal
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [modalMessageDraft, setModalMessageDraft] = useState('');

  // Customer currently in final Preview modal
  const [previewCustomer, setPreviewCustomer] = useState(null);

  // Fetch summary counts
  const fetchSummary = useCallback(async () => {
    try {
      const data = await getBirthdaySummary();
      setSummary(data);
    } catch (err) {
      console.warn('Failed to fetch birthday summary:', err);
    }
  }, []);

  // Fetch all customers for comprehensive search
  const fetchAllCustomers = useCallback(async () => {
    try {
      const data = await getAllBirthdays();
      setAllCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to fetch all birthdays:', err);
    }
  }, []);

  // Fetch customer list based on active tab
  const fetchCustomers = useCallback(async (tab = activeTab) => {
    setLoading(true);
    setError('');
    try {
      let data = [];
      if (tab === 'TOMORROW') {
        data = await getTomorrowBirthdays();
      } else if (tab === 'UPCOMING') {
        // Next 7 calendar days excluding tomorrow
        data = await getUpcomingBirthdays(7);
      } else if (tab === 'PASSED') {
        // Birthdays that already occurred this calendar year
        data = await getPassedBirthdays();
      }
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching birthdays:', err);
      setError(err.message || 'Failed to load birthdays. Please verify the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchSummary();
    fetchAllCustomers();
  }, [fetchSummary, fetchAllCustomers]);

  useEffect(() => {
    fetchCustomers(activeTab);
  }, [activeTab, fetchCustomers]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  // Filter list by search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase().trim();
    const pool = allCustomers.length > 0 ? allCustomers : customers;
    return pool.filter(
      (c) =>
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.cleanMobile && c.cleanMobile.includes(q)) ||
        (c.dob && c.dob.includes(q))
    );
  }, [customers, allCustomers, searchQuery]);

  // Get selected template ID for a customer (default 'classic')
  const getCustomerTemplateId = useCallback(
    (custId) => {
      return customerTemplates[custId] || 'classic';
    },
    [customerTemplates]
  );

  // Resolve message for a customer (custom draft or populated from selected template)
  const getCustomerMessage = useCallback(
    (c) => {
      if (customMessages[c.custId]) {
        return customMessages[c.custId];
      }
      const tId = getCustomerTemplateId(c.custId);
      const tObj = BIRTHDAY_TEMPLATES.find((t) => t.id === tId) || BIRTHDAY_TEMPLATES[0];
      return populateTemplate(tObj.template, c, DEFAULT_OFFER_CONFIG);
    },
    [customMessages, getCustomerTemplateId]
  );

  // Handle template selection for a specific customer (isolated per customer)
  const handleSelectTemplate = (custId, templateId, customer) => {
    setCustomerTemplates((prev) => ({
      ...prev,
      [custId]: templateId,
    }));

    // If there was a custom draft, reset it so the new template takes effect
    if (customMessages[custId]) {
      setCustomMessages((prev) => {
        const next = { ...prev };
        delete next[custId];
        return next;
      });
    }

    const tObj = BIRTHDAY_TEMPLATES.find((t) => t.id === templateId);
    showToast(`Template changed to "${tObj?.name || templateId}" for ${customer.fullName}.`, 'info');
  };

  // Handle WhatsApp action
  const handleSendWhatsApp = (c) => {
    if (!c.validPhone) {
      showToast('Cannot open WhatsApp: Customer has no valid 10-digit mobile number.', 'error');
      return;
    }

    const message = getCustomerMessage(c);
    if (!message.trim()) {
      showToast('Cannot send: Message content is empty.', 'error');
      return;
    }

    // Opens WhatsApp with phone and prefilled message.
    // Explicitly avoids marking false sent status.
    const opened = openWhatsApp(c.mobile, message);
    if (opened) {
      showToast(`Opening WhatsApp chat for ${c.fullName}...`, 'success');
    } else {
      showToast('Unable to open WhatsApp with this phone number.', 'error');
    }
  };

  // Handle Copy Message action
  const handleCopyMessage = async (c) => {
    const message = getCustomerMessage(c);
    if (!message.trim()) {
      showToast('Nothing to copy: Message is empty.', 'error');
      return;
    }
    const success = await copyToClipboard(message);
    if (success) {
      showToast(`Birthday offer copied for ${c.fullName}!`, 'success');
    } else {
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  // Open Message Editor modal
  const handleOpenEditor = (c) => {
    setEditingCustomer(c);
    setModalMessageDraft(getCustomerMessage(c));
  };

  // Save customized message for customer
  const handleSaveCustomMessage = () => {
    if (editingCustomer) {
      setCustomMessages((prev) => ({
        ...prev,
        [editingCustomer.custId]: modalMessageDraft,
      }));
      showToast(`Personalized message updated for ${editingCustomer.fullName}.`, 'success');
    }
    setEditingCustomer(null);
  };

  // Reset customized message to currently selected template
  const handleResetToTemplate = () => {
    if (editingCustomer) {
      setCustomMessages((prev) => {
        const next = { ...prev };
        delete next[editingCustomer.custId];
        return next;
      });
      const tId = getCustomerTemplateId(editingCustomer.custId);
      const tObj = BIRTHDAY_TEMPLATES.find((t) => t.id === tId) || BIRTHDAY_TEMPLATES[0];
      const regenerated = populateTemplate(tObj.template, editingCustomer, DEFAULT_OFFER_CONFIG);
      setModalMessageDraft(regenerated);
      showToast(`Reset message to "${tObj.name}" template.`, 'info');
    }
  };

  // Open Preview Modal
  const handleOpenPreview = (c) => {
    setPreviewCustomer(c);
  };

  const tomorrowBadgeDate = summary?.tomorrowDateFormatted || 'Tomorrow';

  return (
    <AdminPageContainer>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      {/* Admin Page Header */}
      <AdminPageHeader
        title="Birthday Offers"
        subtitle="Send personalized birthday greetings, WhatsApp offers and luxury discounts to your customers"
        actions={
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => {
              fetchSummary();
              fetchAllCustomers();
              fetchCustomers(activeTab);
            }}
            title="Refresh birthday lists"
          >
            <FiRefreshCw className={loading ? styles.spinning : ''} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* KPI Stats Cards */}
      <div className={styles.statsRow}>
        <div
          className={`${styles.statCard} ${activeTab === 'TOMORROW' ? styles.highlightCard : ''}`}
          onClick={() => setActiveTab('TOMORROW')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.statIconWrap}>
            <FiGift className={styles.statIcon} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Tomorrow's Birthdays</p>
            <h3 className={styles.statValue}>{summary?.tomorrowCount ?? 0}</h3>
            <span className={styles.statHint}>Date: {tomorrowBadgeDate}</span>
          </div>
        </div>

        <div
          className={`${styles.statCard} ${activeTab === 'UPCOMING' ? styles.highlightCard : ''}`}
          onClick={() => setActiveTab('UPCOMING')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.statIconWrap}>
            <FiClock className={styles.statIcon} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Next 7 Days</p>
            <h3 className={styles.statValue}>{summary?.upcoming7DaysCount ?? 0}</h3>
            <span className={styles.statHint}>Upcoming this week</span>
          </div>
        </div>

        <div
          className={`${styles.statCard} ${activeTab === 'PASSED' ? styles.highlightCard : ''}`}
          onClick={() => setActiveTab('PASSED')}
          style={{ cursor: 'pointer' }}
        >
          <div className={styles.statIconWrap}>
            <FiCalendar className={styles.statIcon} />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Passed This Year</p>
            <h3 className={styles.statValue}>{summary?.passedThisYearCount ?? 0}</h3>
            <span className={styles.statHint}>Earlier this year</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.tabGroup} role="tablist">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            let count = null;
            if (t.key === 'TOMORROW' && summary) count = summary.tomorrowCount;
            if (t.key === 'UPCOMING' && summary) count = summary.upcoming7DaysCount;
            if (t.key === 'PASSED' && summary) count = summary.passedThisYearCount;

            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.tabBtn} ${isActive ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                <Icon className={styles.tabIcon} />
                <span>{t.label}</span>
                {count !== null && <span className={styles.tabBadge}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by customer name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className={styles.errorBox}>
          <FiAlertCircle className={styles.errorIcon} />
          <div>
            <strong>Unable to load birthday offers</strong>
            <p>{error}</p>
          </div>
          <button type="button" className={styles.retryBtn} onClick={() => fetchCustomers(activeTab)}>
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Checking customer birthday calendar...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <FiGift className={styles.emptyIcon} />
          </div>
          {searchQuery ? (
            <>
              <h3>No Customers Found</h3>
              <p>No registered customers matched "{searchQuery}".</p>
              <button
                type="button"
                className={styles.switchTabBtn}
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            </>
          ) : activeTab === 'TOMORROW' ? (
            <>
              <h3>No Customer Birthdays Tomorrow</h3>
              <p>
                There are no customer birthdays on <strong>{tomorrowBadgeDate}</strong>.
                Switch to the <strong>Next 7 Days</strong> tab to see birthdays arriving later this week!
              </p>
              <button
                type="button"
                className={styles.switchTabBtn}
                onClick={() => setActiveTab('UPCOMING')}
              >
                View Next 7 Days
              </button>
            </>
          ) : activeTab === 'UPCOMING' ? (
            <>
              <h3>No Upcoming Birthdays in Next 7 Days</h3>
              <p>No customer birthdays scheduled within the next 7 days.</p>
            </>
          ) : (
            <>
              <h3>No Passed Birthdays Recorded</h3>
              <p>No customer birthdays have occurred yet this calendar year.</p>
            </>
          )}
        </div>
      ) : (
        <div className={styles.customerGrid}>
          {filteredCustomers.map((c) => {
            const currentTemplateId = getCustomerTemplateId(c.custId);
            const message = getCustomerMessage(c);
            const isEdited = Boolean(customMessages[c.custId]);
            const isPassed = activeTab === 'PASSED' || c.passedThisYear;

            const initials =
              c.fullName
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'C';

            return (
              <div key={c.custId} className={styles.customerCard}>
                {/* Card Header: Avatar + Customer Details */}
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>{initials}</div>
                  <div className={styles.customerInfo}>
                    <div className={styles.nameRow}>
                      <h4 className={styles.customerName}>{c.fullName}</h4>

                      {/* Birthday Status Badges */}
                      {c.birthdayTomorrow && (
                        <span className={styles.tomorrowBadge}>
                          <FiGift className={styles.badgeIcon} />
                          Tomorrow
                        </span>
                      )}
                      {c.birthdayToday && (
                        <span className={`${styles.tomorrowBadge} ${styles.todayBadge}`}>
                          <FiGift className={styles.badgeIcon} />
                          Today
                        </span>
                      )}
                      {!c.birthdayTomorrow && !c.birthdayToday && !isPassed && (
                        <span className={styles.upcomingBadge}>
                          <FiClock className={styles.badgeIcon} />
                          {c.birthdayStatus || `In ${c.daysUntilBirthday} days`}
                        </span>
                      )}
                      {isPassed && (
                        <span className={styles.passedBadge}>
                          <FiCalendar className={styles.badgeIcon} />
                          {c.birthdayStatus || 'Passed this year'}
                        </span>
                      )}
                    </div>

                    <div className={styles.metaRow}>
                      <span className={styles.dobMeta}>
                        <FiCalendar className={styles.metaIcon} />
                        <strong>DOB:</strong> {c.formattedDob || c.dob}
                        {c.age && <span className={styles.agePill}>Turning {c.age}</span>}
                      </span>

                      <span className={styles.phoneMeta}>
                        <FiPhone className={styles.metaIcon} />
                        {c.validPhone ? (
                          <span className={styles.phoneValid}>{formatPhoneDisplay(c.mobile)}</span>
                        ) : (
                          <span className={styles.phoneInvalid}>
                            {c.mobile ? `${c.mobile} (Invalid)` : 'No mobile number'}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Configured Offer Details Pill */}
                    <div className={styles.offerDetailsRow}>
                      <span className={styles.offerPill}>
                        <strong>Offer:</strong> {DEFAULT_OFFER_CONFIG.discountPercent}% OFF · Valid{' '}
                        {DEFAULT_OFFER_CONFIG.validityDays} Days
                      </span>
                      {c.offerExpiryDate && c.offerExpiryDate !== 'Expired' && (
                        <span className={styles.offerExpiryPill}>
                          Expires: {c.offerExpiryDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Passed Year Notice (Requirement: Do not send birthday offers to customers in Passed This Year category as if upcoming) */}
                {isPassed ? (
                  <div className={styles.passedNoticeBox}>
                    <FiInfo className={styles.noticeIcon} />
                    <div>
                      <strong>Birthday Already Passed This Year</strong>
                      <p>
                        This customer&apos;s birthday occurred earlier this calendar year. Advance
                        birthday discount offers cannot be sent.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Template Selector Row */}
                    <div className={styles.templateSelectRow}>
                      <label htmlFor={`tpl-select-${c.custId}`} className={styles.templateSelectLabel}>
                        Message Template:
                      </label>
                      <select
                        id={`tpl-select-${c.custId}`}
                        className={styles.templateSelect}
                        value={currentTemplateId}
                        onChange={(e) => handleSelectTemplate(c.custId, e.target.value, c)}
                      >
                        {BIRTHDAY_TEMPLATES.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Message Preview Section */}
                    <div className={styles.messageSection}>
                      <div className={styles.messageSectionHeader}>
                        <span className={styles.messageLabel}>
                          Customized Offer Preview
                          {isEdited && <span className={styles.editedPill}>Edited</span>}
                        </span>
                        <div className={styles.msgHeaderActions}>
                          <button
                            type="button"
                            className={styles.editMsgBtn}
                            onClick={() => handleOpenEditor(c)}
                            title="Edit message before sending"
                          >
                            <FiEdit3 />
                            <span>{isEdited ? 'Edit Again' : 'Edit'}</span>
                          </button>
                        </div>
                      </div>

                      <div className={styles.messageContentBox}>
                        <p>{message}</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Card Actions Footer */}
                <div className={styles.cardActions}>
                  {!isPassed && (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.previewBtn}`}
                      onClick={() => handleOpenPreview(c)}
                      title="Preview full WhatsApp message"
                    >
                      <FiEye />
                      <span>Preview</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.copyBtn}`}
                    onClick={() => handleCopyMessage(c)}
                    title="Copy message to clipboard"
                  >
                    <FiCopy />
                    <span>Copy</span>
                  </button>

                  {!isPassed ? (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.whatsappBtn} ${
                        !c.validPhone ? styles.whatsappDisabled : ''
                      }`}
                      onClick={() => handleSendWhatsApp(c)}
                      disabled={!c.validPhone}
                      title={
                        c.validPhone
                          ? `Open WhatsApp with ${c.fullName}`
                          : 'Cannot open WhatsApp: Invalid or missing phone number'
                      }
                    >
                      <FaWhatsapp className={styles.waIcon} />
                      <span>{c.validPhone ? 'Send WhatsApp' : 'Phone Invalid'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.disabledPassedBtn}`}
                      disabled
                      title="Birthday already passed this year"
                    >
                      <span>Offer Inactive</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Offer Message Modal */}
      {editingCustomer && (
        <div className={styles.modalOverlay} onClick={() => setEditingCustomer(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Customize Birthday Offer</h3>
                <p className={styles.modalSubtitle}>
                  For <strong>{editingCustomer.fullName}</strong> (
                  {formatPhoneDisplay(editingCustomer.mobile)})
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setEditingCustomer(null)}
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalInfoRow}>
                <span>
                  Template: <strong>{BIRTHDAY_TEMPLATES.find((t) => t.id === getCustomerTemplateId(editingCustomer.custId))?.name}</strong>
                </span>
                <span>
                  Offer: <strong>{DEFAULT_OFFER_CONFIG.discountPercent}% OFF · 7 Days</strong>
                </span>
              </div>

              <label htmlFor="custom-msg-area" className={styles.modalLabel}>
                WhatsApp Message Content
              </label>
              <textarea
                id="custom-msg-area"
                className={styles.modalTextarea}
                rows={7}
                value={modalMessageDraft}
                onChange={(e) => setModalMessageDraft(e.target.value)}
                placeholder="Type personalized message..."
              />
              <span className={styles.charCount}>
                {modalMessageDraft.length} characters
              </span>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={handleResetToTemplate}
                title="Reset back to the template text"
              >
                Reset to Template
              </button>
              <div className={styles.modalFooterRight}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setEditingCustomer(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={handleSaveCustomMessage}
                >
                  <FiCheck />
                  <span>Apply to Customer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview WhatsApp Message Modal */}
      {previewCustomer && (
        <div className={styles.modalOverlay} onClick={() => setPreviewCustomer(null)}>
          <div className={`${styles.modalCard} ${styles.previewModalCard}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Message Preview</h3>
                <p className={styles.modalSubtitle}>
                  Review the exact WhatsApp greeting before opening chat
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setPreviewCustomer(null)}
              >
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* WhatsApp Simulated Chat Window */}
              <div className={styles.waPhoneSim}>
                <div className={styles.waHeader}>
                  <div className={styles.waHeaderAvatar}>
                    {previewCustomer.fullName[0]?.toUpperCase() || 'C'}
                  </div>
                  <div className={styles.waHeaderMeta}>
                    <p className={styles.waHeaderName}>{previewCustomer.fullName}</p>
                    <span className={styles.waHeaderPhone}>
                      {formatPhoneDisplay(previewCustomer.mobile)}
                    </span>
                  </div>
                </div>

                <div className={styles.waChatArea}>
                  <div className={styles.waBubble}>
                    <p className={styles.waBubbleText}>
                      {getCustomerMessage(previewCustomer)}
                    </p>
                    <div className={styles.waBubbleMeta}>
                      <span>Just now</span>
                      <span className={styles.waCheckmarks}>✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.previewMetaBox}>
                <p>
                  <strong>Recipient:</strong> {previewCustomer.fullName} ({formatPhoneDisplay(previewCustomer.mobile)})
                </p>
                <p>
                  <strong>Template:</strong>{' '}
                  {BIRTHDAY_TEMPLATES.find((t) => t.id === getCustomerTemplateId(previewCustomer.custId))?.name}
                </p>
                <p>
                  <strong>Note:</strong> Clicking Send will open WhatsApp with this prefilled message.
                </p>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setPreviewCustomer(null)}
              >
                Close Preview
              </button>

              <div className={styles.modalFooterRight}>
                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.copyBtn}`}
                  onClick={() => handleCopyMessage(previewCustomer)}
                >
                  <FiCopy />
                  <span>Copy</span>
                </button>

                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.whatsappBtn} ${
                    !previewCustomer.validPhone ? styles.whatsappDisabled : ''
                  }`}
                  disabled={!previewCustomer.validPhone}
                  onClick={() => {
                    handleSendWhatsApp(previewCustomer);
                    setPreviewCustomer(null);
                  }}
                >
                  <FaWhatsapp className={styles.waIcon} />
                  <span>Send WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageContainer>
  );
};

export default AdminBirthdayOffers;
