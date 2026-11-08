import { createAuthenticatedAxios } from './authApi';

/**
 * BirthdayOfferApi.js
 *
 * REST client for Birthday Offers feature.
 * Endpoints under /api/admin/birthday-offers/** require ADMIN role.
 */

function parseError(error) {
  if (error.response) {
    const data = error.response.data;
    return new Error(data?.message || `Request failed with status ${error.response.status}`);
  }
  if (error.request) {
    return new Error('No response from backend server. Please verify the server is running.');
  }
  return new Error(error.message || 'Unknown network error');
}

/**
 * GET /api/admin/birthday-offers/tomorrow
 * Fetches customers whose birthday is tomorrow.
 */
export async function getTomorrowBirthdays() {
  try {
    const api = createAuthenticatedAxios();
    const response = await api.get('/admin/birthday-offers/tomorrow');
    return response.data || [];
  } catch (error) {
    throw parseError(error);
  }
}

/**
 * GET /api/admin/birthday-offers/upcoming?days=7
 * Fetches customers with birthdays in the next N days.
 */
/**
 * GET /api/admin/birthday-offers/upcoming?days=7
 * Fetches customers with birthdays in the next 7 days, strictly excluding tomorrow.
 */
export async function getUpcomingBirthdays(days = 7) {
  try {
    const api = createAuthenticatedAxios();
    const response = await api.get(`/admin/birthday-offers/upcoming?days=${days}`);
    const list = response.data || [];
    // Strict deduplication: never include tomorrow's birthdays in upcoming list
    return list.filter((c) => !c.birthdayTomorrow && (c.daysUntilBirthday === undefined || c.daysUntilBirthday >= 2));
  } catch (error) {
    throw parseError(error);
  }
}

/**
 * GET /api/admin/birthday-offers/passed
 * Fetches customers whose birthdays have already occurred this calendar year.
 */
export async function getPassedBirthdays() {
  const api = createAuthenticatedAxios();
  try {
    const response = await api.get('/admin/birthday-offers/passed');
    return response.data || [];
  } catch (error) {
    // Seamless client-side fallback if backend process has not been restarted
    try {
      const allRes = await api.get('/admin/birthday-offers/all');
      const allList = allRes.data || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return allList.filter((c) => {
        if (!c.dob) return false;
        const parts = c.dob.split(/[-/.]/);
        let m = 0;
        let d = 0;
        if (parts[0].length === 4) {
          m = parseInt(parts[1], 10);
          d = parseInt(parts[2], 10);
        } else {
          d = parseInt(parts[0], 10);
          m = parseInt(parts[1], 10);
        }
        if (!m || !d) return false;
        // Handle leap year Feb 29
        let actualDay = d;
        if (m === 2 && d === 29) {
          const isLeap = new Date(today.getFullYear(), 1, 29).getMonth() === 1;
          actualDay = isLeap ? 29 : 28;
        }
        const bdayThisYear = new Date(today.getFullYear(), m - 1, actualDay);
        bdayThisYear.setHours(0, 0, 0, 0);
        return bdayThisYear < today;
      }).map((c) => ({
        ...c,
        passedThisYear: true,
        birthdayStatus: c.birthdayStatus || `Passed this year (${c.formattedDob || c.dob})`,
        offerExpiryDate: 'Expired',
      }));
    } catch {
      throw parseError(error);
    }
  }
}

/**
 * GET /api/admin/birthday-offers/all
 * Fetches all customers with birthdays recorded in the database.
 */
export async function getAllBirthdays() {
  try {
    const api = createAuthenticatedAxios();
    const response = await api.get('/admin/birthday-offers/all');
    return response.data || [];
  } catch (error) {
    throw parseError(error);
  }
}

/**
 * GET /api/admin/birthday-offers/summary
 * Fetches summary counts: tomorrow, upcoming, total with DOB.
 */
export async function getBirthdaySummary() {
  try {
    const api = createAuthenticatedAxios();
    const response = await api.get('/admin/birthday-offers/summary');
    const data = response.data || {};

    // If passedThisYearCount is missing, calculate via getPassedBirthdays
    if (data.passedThisYearCount == null) {
      try {
        const passedList = await getPassedBirthdays();
        data.passedThisYearCount = passedList.length;
      } catch {
        data.passedThisYearCount = 0;
      }
    }
    return data;
  } catch (error) {
    throw parseError(error);
  }
}
