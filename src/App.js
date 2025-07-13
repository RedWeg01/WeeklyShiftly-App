import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';
// import jsPDF from 'jspdf'; // Removed this import, assuming it's loaded via CDN

// Lucide React Icons (assuming they are available in the environment)
const Clock = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CheckCircle = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircle = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const XCircle = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const Plus = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const Trash = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const Download = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const ChevronLeft = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRight = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

// Helper function to convert time string "HH:MM" to minutes from midnight (00:00)
const timeToMinutes = (time) => {
  if (!time) return 0; // Handle empty time input
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to convert minutes from midnight to time string "HH:MM"
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

// Define the visual timeline range for each day
const TIMELINE_START_HOUR = 6; // Visual timeline starts at 06:00
const TIMELINE_END_HOUR_NEXT_DAY = 4; // Visual timeline ends at 04:00 of the next day

// Total duration of the visual timeline in hours
const NUM_HOURS_IN_VIEW = (24 - TIMELINE_START_HOUR) + TIMELINE_END_HOUR_NEXT_DAY; // 18 + 4 = 22 hours
const TOTAL_TIMELINE_MINUTES = NUM_HOURS_IN_VIEW * 60; // 22 * 60 = 1320 minutes

// Fixed width for each hour column in the timeline
const HOUR_COLUMN_WIDTH_PX = 60;
const TOTAL_VISUAL_WIDTH_PX = NUM_HOURS_IN_VIEW * HOUR_COLUMN_WIDTH_PX;

// Total minutes in a full 24-hour day for internal calculations
const FULL_DAY_MINUTES = 24 * 60;

// Generates an array of time strings for the timeline header (e.g., 06:00 to 04:00 next day)
const generateTimeLabels = (startHour, endHourNextDay, intervalMinutes = 60) => {
  const labels = [];
  // Labels for current day (e.g., 06:00 to 23:00)
  for (let h = startHour; h < 24; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      labels.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  // Labels for next day (e.g., 00:00 to 04:00)
  for (let h = 0; h <= endHourNextDay; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      if (h === endHourNextDay && m > 0) continue; // Don't add intervals past the exact end hour
      labels.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return labels;
};

// Function to get the Monday of a given week
const getMonday = (d) => {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday (day 0)
  return new Date(d.setDate(diff));
};

// Function to format date as YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Function to get dates for the week starting from Monday
const getWeekDays = (monday) => {
  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  return days.map((dayName, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      day: dayName,
      date: formatDate(date),
    };
  });
};

// Initial empty weekly data structure for a new week
const createEmptyWeeklyData = (weekDays) => {
  return weekDays.map(dayInfo => ({
    day: dayInfo.day,
    date: dayInfo.date,
    demandPeriods: [],
    assignedShifts: [],
  }));
};

function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [currentWeekMonday, setCurrentWeekMonday] = useState(getMonday(new Date()));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' }); // For custom message box

  const timeLabels = generateTimeLabels(TIMELINE_START_HOUR, TIMELINE_END_HOUR_NEXT_DAY);

  // Initialize Firebase and Auth
useEffect(() => {
  try {
    const firebaseConfig = {
  apiKey: "AIzaSyA1ptaDfdtejd_7mx2QILwrYxjjLp0Z_aI",
  authDomain: "weeklyshiftly.firebaseapp.com",
  projectId: "weeklyshiftly",
  storageBucket: "weeklyshiftly.firebasestorage.app",
  messagingSenderId: "260496171368",
  appId: "1:260496171368:web:e23b88be4d571db869b6dd"
};

        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestore);
        setAuth(firebaseAuth);

        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                try {
                    const userCredential = await signInAnonymously(firebaseAuth);
                    setUserId(userCredential.user.uid);
                } catch (error) {
                    console.error("Error signing in anonymously:", error);
                    setMessage({ text: 'Fehler bei der anonymen Anmeldung.', type: 'error' });
                }
            }
            setIsAuthReady(true);
            setLoading(false);
        });

        return () => unsubscribe();
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        setMessage({ text: 'Fehler beim Initialisieren der Datenbank. Bitte versuchen Sie es später erneut.', type: 'error' });
        setLoading(false);
    }
}, []);


  // Fetch data from Firestore when auth is ready or week changes
  useEffect(() => {
    if (!isAuthReady || !db || !userId) return;

    const weekId = formatDate(currentWeekMonday);
    const docRef = doc(db, `users/${userId}/shift_plans`, weekId);
    const employeesDocRef = doc(db, `users/${userId}/employee_list`, 'employees');

    setLoading(true);

    // Listen for weekly schedule changes
    const unsubscribeSchedule = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure that if data.schedule is empty or null, we use createEmptyWeeklyData
        setWeeklySchedule(data.schedule && data.schedule.length > 0 ? data.schedule : createEmptyWeeklyData(getWeekDays(currentWeekMonday)));
      } else {
        // If no data for the week, create an empty structure
        setWeeklySchedule(createEmptyWeeklyData(getWeekDays(currentWeekMonday)));
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching weekly schedule:", error);
      setMessage({ text: 'Fehler beim Laden des Schichtplans.', type: 'error' });
      setLoading(false);
    });

    // Listen for employee list changes
    const unsubscribeEmployees = onSnapshot(employeesDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEmployees(data.employees || []);
      } else {
        // If no employees, initialize with an empty array
        setEmployees([]);
      }
    }, (error) => {
      console.error("Error fetching employees:", error);
      setMessage({ text: 'Fehler beim Laden der Mitarbeiterliste.', type: 'error' });
    });

    return () => {
      unsubscribeSchedule();
      unsubscribeEmployees();
    };
  }, [isAuthReady, db, userId, currentWeekMonday, __app_id]); // Added __app_id to dependencies

  // Save data to Firestore whenever weeklySchedule or employees change
  useEffect(() => {
    if (!isAuthReady || !db || !userId || loading) return; // Don't save while loading initial data

    const weekId = formatDate(currentWeekMonday);
    const docRef = doc(db, `users/${userId}/shift_plans`, weekId);
    const employeesDocRef = doc(db, `users/${userId}/employee_list`, 'employees');

    // Save weekly schedule
    const saveSchedule = async () => {
      try {
        await setDoc(docRef, { schedule: weeklySchedule }, { merge: true });
      } catch (error) {
        console.error("Error saving weekly schedule:", error);
        setMessage({ text: 'Fehler beim Speichern des Schichtplans.', type: 'error' });
      }
    };

    // Save employees
    const saveEmployees = async () => {
      try {
        await setDoc(employeesDocRef, { employees: employees }, { merge: true });
      } catch (error) {
        console.error("Error saving employees:", error);
        setMessage({ text: 'Fehler beim Speichern der Mitarbeiterliste.', type: 'error' });
      }
    };

    // Debounce saving to avoid too many writes
    const scheduleTimeout = setTimeout(saveSchedule, 500);
    const employeesTimeout = setTimeout(saveEmployees, 500);

    return () => {
      clearTimeout(scheduleTimeout);
      clearTimeout(employeesTimeout);
    };
  }, [weeklySchedule, employees, isAuthReady, db, userId, currentWeekMonday, loading, __app_id]);


  // Function to add a new employee
  const addEmployee = () => {
    if (newEmployeeName.trim() !== '') {
      const newId = `emp-${Date.now()}`;
      setEmployees(prev => [...prev, { id: newId, name: newEmployeeName.trim() }]);
      setNewEmployeeName('');
    }
  };

  // Function to remove an employee
  const removeEmployee = (employeeId) => {
    setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
    // Also remove any shifts assigned to this employee
    setWeeklySchedule(prevSchedule =>
      prevSchedule.map(day => ({
        ...day,
        assignedShifts: day.assignedShifts.filter(shift => shift.employeeId !== employeeId),
      }))
    );
  };

  // Function to add a new demand period for a specific day
  const addDemandPeriod = (dayIndex) => {
    setWeeklySchedule(prevSchedule => {
      const newSchedule = [...prevSchedule];
      const day = newSchedule[dayIndex];
      day.demandPeriods.push({
        id: `demand-${dayIndex}-${Date.now()}`,
        start: minutesToTime(TIMELINE_START_HOUR * 60), // Default start at 06:00
        end: minutesToTime((TIMELINE_START_HOUR + 1) * 60), // Default end at 07:00
        requiredStaff: 1,
      });
      return newSchedule;
    });
  };

  // Function to update a demand period
  const updateDemandPeriod = (dayIndex, demandId, field, value) => {
    setWeeklySchedule(prevSchedule => {
      const newSchedule = [...prevSchedule];
      const day = newSchedule[dayIndex];
      const demand = day.demandPeriods.find(d => d.id === demandId);
      if (demand) {
        if (field === 'requiredStaff') {
          demand[field] = Math.max(0, parseInt(value, 10) || 0);
        } else {
          demand[field] = value;
        }
      }
      return newSchedule;
    });
  };

  // Function to remove a demand period
  const removeDemandPeriod = (dayIndex, demandId) => {
    setWeeklySchedule(prevSchedule => {
      const newSchedule = [...prevSchedule];
      const day = newSchedule[dayIndex];
      day.demandPeriods = day.demandPeriods.filter(d => d.id !== demandId);
      return newSchedule;
    });
  };

  // Function to add an assigned shift for a specific day and employee
  const addAssignedShift = (dayIndex, employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    setWeeklySchedule(prevSchedule => {
      const newSchedule = [...prevSchedule];
      const day = newSchedule[dayIndex];
      day.assignedShifts.push({
        id: `shift-${dayIndex}-${employeeId}-${Date.now()}`,
        employeeId: employee.id,
        employeeName: employee.name,
        start: minutesToTime(TIMELINE_START_HOUR * 60 + 3 * 60), // Default start 3 hours after timeline start (09:00)
        end: minutesToTime(TIMELINE_START_HOUR * 60 + 11 * 60), // Default end 11 hours after timeline start (17:00)
      });
      return newSchedule;
    });
  };

  // Function to update an assigned shift
  const updateAssignedShift = (dayIndex, shiftId, field, value) => {
    setWeeklySchedule(prevSchedule => {
      const newSchedule = [...prevSchedule];
      const day = newSchedule[dayIndex];
      const shift = day.assignedShifts.find(s => s.id === shiftId);
      if (shift) {
        shift[field] = value;
      }
      return newSchedule;
    });
  };

  // Function to remove an assigned shift
  const removeAssignedShift = (dayIndex, shiftId) => {
    setWeeklySchedule(prevSchedule => {
      const newSchedule = [...prevSchedule];
      const day = newSchedule[dayIndex];
      day.assignedShifts = day.assignedShifts.filter(s => s.id !== shiftId);
      return newSchedule;
    });
  };

  // Function to get the visual position (in minutes from timeline start) for a given time (in minutes from midnight)
  const getVisualPosition = (timeInMinutesFromMidnight) => {
    // If time is before the timeline's start hour (e.g., 00:00-05:59), it belongs to the 'next day' segment of the visual timeline
    if (timeInMinutesFromMidnight < TIMELINE_START_HOUR * 60) {
      return timeInMinutesFromMidnight + (FULL_DAY_MINUTES - TIMELINE_START_HOUR * 60);
    } else {
      // If time is after or at the timeline's start hour, it's directly offset
      return timeInMinutesFromMidnight - (TIMELINE_START_HOUR * 60);
    }
  };

  // Calculate staff coverage for each time slot (full 24 hours)
  const calculateCoverage = useCallback((dayData) => {
    const coverage = Array(FULL_DAY_MINUTES).fill(0); // Minutes from 00:00
    const required = Array(FULL_DAY_MINUTES).fill(0);

    // Populate required staff per minute
    dayData.demandPeriods.forEach(demand => {
      const startMin = timeToMinutes(demand.start);
      let endMin = timeToMinutes(demand.end);
      if (endMin <= startMin) { // Demand crosses midnight
        endMin += FULL_DAY_MINUTES; // Add 24 hours to end time for calculation
      }
      for (let i = startMin; i < endMin; i++) {
        required[i % FULL_DAY_MINUTES] += demand.requiredStaff; // Use modulo for 24-hour cycle
      }
    });

    // Populate assigned staff per minute
    dayData.assignedShifts.forEach(shift => {
      const startMin = timeToMinutes(shift.start);
      let endMin = timeToMinutes(shift.end);
      if (endMin <= startMin) { // Shift crosses midnight
        endMin += FULL_DAY_MINUTES; // Add 24 hours to end time for calculation
      }
      for (let i = startMin; i < endMin; i++) {
        coverage[i % FULL_DAY_MINUTES]++; // Use modulo for 24-hour cycle
      }
    });

    // Determine status for each minute
    const status = [];
    for (let i = 0; i < FULL_DAY_MINUTES; i++) {
      if (coverage[i] < required[i]) {
        status.push('understaffed');
      } else if (coverage[i] > required[i]) {
        status.push('overstaffed');
      } else if (required[i] > 0) {
        status.push('covered');
      } else {
        status.push('neutral'); // No demand, no assigned
      }
    }

    return { coverage, required, status };
  }, []);

  // Get status for a specific hour block for visualization (full 24 hours)
  const getHourlyStatus = (dayData, hour) => {
    const { status: minuteStatus } = calculateCoverage(dayData);
    let coveredCount = 0;
    let understaffedCount = 0;
    let overstaffedCount = 0;
    let neutralCount = 0;

    // Iterate through the 60 minutes of the current hour block
    for (let m = 0; m < 60; m++) {
      const currentMinuteAbsolute = (hour * 60 + m); // Minute from 00:00
      const statusForMinute = minuteStatus[currentMinuteAbsolute % FULL_DAY_MINUTES]; // Get status, handle wrap-around for minuteStatus array

      if (statusForMinute === 'covered') coveredCount++;
      else if (statusForMinute === 'understaffed') understaffedCount++;
      else if (statusForMinute === 'overstaffed') overstaffedCount++;
      else neutralCount++;
    }

    if (understaffedCount > 0) return 'understaffed';
    if (overstaffedCount > 0) return 'overstaffed';
    if (coveredCount > 0) return 'covered';
    return 'neutral';
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case 'covered':
        return 'bg-green-200 text-green-800';
      case 'understaffed':
        return 'bg-red-200 text-red-800';
      case 'overstaffed':
        return 'bg-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'covered':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'understaffed':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'overstaffed':
        return <XCircle size={16} className="text-yellow-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  // Function to calculate shift duration in hours, correctly handling midnight crossing
  const getShiftDuration = (start, end) => {
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    if (endMins <= startMins) { // Shift crosses midnight or ends exactly at start (0 duration)
      return ((FULL_DAY_MINUTES - startMins) + endMins) / 60;
    }
    return (endMins - startMins) / 60;
  };

  // Navigation for weeks
  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeekMonday);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeekMonday(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeekMonday);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeekMonday(nextWeek);
  };

  // PDF Export functionality
  const exportEmployeeShiftsPdf = () => {
    // Check if jsPDF is available globally
    if (typeof window.jsPDF === 'undefined') {
      setMessage({ text: 'Fehler: jsPDF Bibliothek nicht gefunden. Bitte stellen Sie sicher, dass sie über ein CDN geladen wird.', type: 'error' });
      return;
    }

    const doc = new window.jsPDF(); // Use window.jsPDF
    let yPos = 20;
    const margin = 10;
    const lineHeight = 7;

    doc.setFontSize(18);
    doc.text(`Schichtplan für die Woche vom ${formatDate(currentWeekMonday)}`, margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Erstellt am: ${formatDate(new Date())}`, margin, yPos);
    yPos += 15;

    employees.forEach(employee => {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`--- ${employee.name} ---`, margin, yPos);
      doc.setFont(undefined, 'normal');
      yPos += lineHeight;

      let employeeHasShifts = false;
      weeklySchedule.forEach(dayData => {
        const shiftsForEmployee = dayData.assignedShifts.filter(
          shift => shift.employeeId === employee.id
        );
        if (shiftsForEmployee.length > 0) {
          employeeHasShifts = true;
          doc.text(`${dayData.day}, ${dayData.date}:`, margin + 5, yPos);
          yPos += lineHeight;
          shiftsForEmployee.forEach(shift => {
            const duration = getShiftDuration(shift.start, shift.end);
            doc.text(`  - ${shift.start} - ${shift.end} (${duration.toFixed(1)} Stunden)`, margin + 10, yPos);
            yPos += lineHeight;
          });
        }
      });
      if (!employeeHasShifts) {
        doc.text("  Keine Schichten zugewiesen für diese Woche.", margin + 5, yPos);
        yPos += lineHeight;
      }
      yPos += lineHeight * 1.5; // Extra space after each employee

      // Add new page if content exceeds page height
      if (yPos > doc.internal.pageSize.height - 20) {
        doc.addPage();
        yPos = 20; // Reset y position for new page
      }
    });

    doc.save(`Schichtplan_${formatDate(currentWeekMonday)}.pdf`);
  };

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center text-indigo-700 text-lg font-semibold">
          <Clock size={32} className="animate-spin mr-3" />
          Lade Schichtplan...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 font-inter text-gray-800">
      {message.text && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${message.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          {message.text}
          <button onClick={() => setMessage({ text: '', type: '' })} className="ml-4 font-bold">X</button>
        </div>
      )}

      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <header className="bg-indigo-600 p-6 text-white text-center rounded-t-2xl">
          <h1 className="text-3xl font-bold mb-2">Grafische Schichtplanung</h1>
          <p className="text-indigo-200">Definieren Sie Bedarf und weisen Sie Mitarbeiter zu Schichten zu</p>
          {userId && (
            <p className="text-sm text-indigo-200 mt-2">Ihre Benutzer-ID: <span className="font-mono">{userId}</span></p>
          )}
        </header>

        {/* Week Navigation */}
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
            aria-label="Vorherige Woche"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            Woche vom {formatDate(currentWeekMonday)}
          </h2>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
            aria-label="Nächste Woche"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Employee Management */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Mitarbeiterverwaltung</h2>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input
              type="text"
              placeholder="Neuer Mitarbeitername"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              className="flex-grow p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base"
              aria-label="Neuer Mitarbeitername"
            />
            <button
              onClick={addEmployee}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out flex items-center justify-center"
            >
              <Plus size={20} className="mr-2" /> Mitarbeiter hinzufügen
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {employees.map(employee => (
              <span key={employee.id} className="inline-flex items-center bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full shadow-sm">
                {employee.name}
                <button
                  onClick={() => removeEmployee(employee.id)}
                  className="ml-2 text-indigo-600 hover:text-indigo-900 focus:outline-none"
                  aria-label={`Mitarbeiter ${employee.name} entfernen`}
                >
                  <XCircle size={16} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="p-4 sm:p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Wöchentlicher Schichtplan</h2>
          {weeklySchedule.map((dayData, dayIndex) => (
            <div key={dayData.day} className="mb-8 p-6 bg-gray-50 rounded-xl shadow-md">
              <h3 className="text-xl font-bold mb-4 text-gray-700 flex items-center">
                <Clock size={20} className="mr-2 text-indigo-600" /> {dayData.day} ({dayData.date})
              </h3>

              {/* Demand Periods */}
              <div className="mb-4">
                <h4 className="text-lg font-semibold mb-2 text-gray-700">Bedarfszeiten:</h4>
                {dayData.demandPeriods.map(demand => (
                  <div key={demand.id} className="flex flex-wrap items-center gap-3 mb-2 p-3 bg-blue-100 rounded-lg shadow-sm">
                    <label className="text-sm font-medium">Von:</label>
                    <input
                      type="time"
                      value={demand.start}
                      onChange={(e) => updateDemandPeriod(dayIndex, demand.id, 'start', e.target.value)}
                      className="p-2 border border-blue-300 rounded-md text-sm"
                      aria-label={`Bedarf Startzeit für ${dayData.day}`}
                    />
                    <label className="text-sm font-medium">Bis:</label>
                    <input
                      type="time"
                      value={demand.end}
                      onChange={(e) => updateDemandPeriod(dayIndex, demand.id, 'end', e.target.value)}
                      className="p-2 border border-blue-300 rounded-md text-sm"
                      aria-label={`Bedarf Endzeit für ${dayData.day}`}
                    />
                    <label className="text-sm font-medium">Mitarbeiter benötigt:</label>
                    <input
                      type="number"
                      min="0"
                      value={demand.requiredStaff}
                      onChange={(e) => updateDemandPeriod(dayIndex, demand.id, 'requiredStaff', e.target.value)}
                      className="w-20 p-2 border border-blue-300 rounded-md text-sm"
                      aria-label={`Benötigte Mitarbeiter für ${dayData.day}`}
                    />
                    <button
                      onClick={() => removeDemandPeriod(dayIndex, demand.id)}
                      className="ml-auto bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm transition duration-300 ease-in-out"
                      aria-label={`Bedarfszeit entfernen für ${dayData.day}`}
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addDemandPeriod(dayIndex)}
                  className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out flex items-center"
                >
                  <Plus size={16} className="mr-2" /> Bedarfszeit hinzufügen
                </button>
              </div>

              {/* Assigned Shifts */}
              <div className="mb-4">
                <h4 className="text-lg font-semibold mb-2 text-gray-700">Zugewiesene Schichten:</h4>
                {dayData.assignedShifts.map(shift => {
                  const duration = getShiftDuration(shift.start, shift.end);
                  return (
                    <div key={shift.id} className="flex flex-wrap items-center gap-3 mb-2 p-3 bg-purple-100 rounded-lg shadow-sm">
                      <span className="font-medium text-sm w-32">{shift.employeeName}:</span>
                      <label className="text-sm font-medium">Von:</label>
                      <input
                        type="time"
                        value={shift.start}
                        onChange={(e) => updateAssignedShift(dayIndex, shift.id, 'start', e.target.value)}
                        className="p-2 border border-purple-300 rounded-md text-sm"
                        aria-label={`Schicht Startzeit für ${shift.employeeName}`}
                      />
                      <label className="text-sm font-medium">Bis:</label>
                      <input
                        type="time"
                        value={shift.end}
                        onChange={(e) => updateAssignedShift(dayIndex, shift.id, 'end', e.target.value)}
                        className="p-2 border border-purple-300 rounded-md text-sm"
                        aria-label={`Schicht Endzeit für ${shift.employeeName}`}
                      />
                      <span className="text-sm font-medium ml-2">({duration.toFixed(1)} Std.)</span>
                      <button
                        onClick={() => removeAssignedShift(dayIndex, shift.id)}
                        className="ml-auto bg-red-500 hover:bg-red-600 text-white p-2 rounded-md shadow-sm transition duration-300 ease-in-out"
                        aria-label={`Schicht entfernen für ${shift.employeeName}`}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  );
                })}
                <div className="flex items-center gap-2 mt-2">
                  <select
                    onChange={(e) => addAssignedShift(dayIndex, e.target.value)}
                    className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"
                    value="" // Reset select after selection
                    aria-label="Mitarbeiter für Schicht auswählen"
                  >
                    <option value="" disabled>Mitarbeiter auswählen</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>{employee.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => { /* Handled by select onChange */ }}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out flex items-center"
                  >
                    <Plus size={16} className="mr-2" /> Schicht hinzufügen
                  </button>
                </div>
              </div>

              {/* Timeline Visualization */}
              <div className="mt-6">
                <h4 className="text-lg font-semibold mb-2 text-gray-700">Zeitleistenansicht:</h4>
                <div className="overflow-x-auto pb-4"> {/* Added pb-4 for scrollbar visibility */}
                  <div
                    className="inline-block min-w-full"
                    style={{ width: `${TOTAL_VISUAL_WIDTH_PX}px` }} // Fixed width for the entire timeline area
                  >
                    <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-white shadow-inner">
                      {/* Time Axis */}
                      <div className="grid grid-flow-col auto-cols-[60px] border-b border-gray-200 bg-gray-100">
                        {/* Iterate for the total visual hours to display time labels */}
                        {Array.from({ length: NUM_HOURS_IN_VIEW + 1 }).map((_, i) => {
                          let displayHour = TIMELINE_START_HOUR + i;
                          if (displayHour >= 24) {
                            displayHour -= 24; // Wrap around for hours like 00, 01, 02, 03
                          }
                          return (
                            <div key={i} className="text-center text-xs text-gray-500 py-1 border-r border-gray-200 last:border-r-0">
                              {String(displayHour).padStart(2, '0')}:00
                            </div>
                          );
                        })}
                      </div>

                      {/* Demand and Assigned Shifts Overlay */}
                      <div className="relative h-40"> {/* Fixed height for timeline area */}
                        {/* Background grid lines for hours */}
                        <div className="absolute inset-0 grid grid-flow-col auto-cols-[60px]">
                          {Array.from({ length: NUM_HOURS_IN_VIEW }).map((_, i) => (
                            <div key={`grid-${i}`} className="border-r border-gray-100 h-full last:border-r-0"></div>
                          ))}
                        </div>

                        {/* Demand Periods */}
                        {dayData.demandPeriods.map(demand => {
                          const startMins = timeToMinutes(demand.start);
                          let endMins = timeToMinutes(demand.end);
                          if (endMins <= startMins) { // Demand crosses midnight
                            endMins += FULL_DAY_MINUTES;
                          }

                          const visualStart = getVisualPosition(startMins);
                          const visualEnd = getVisualPosition(endMins);

                          const left = (visualStart / TOTAL_TIMELINE_MINUTES) * 100;
                          const width = ((visualEnd - visualStart) / TOTAL_TIMELINE_MINUTES) * 100;

                          if (width <= 0) return null; // Avoid rendering zero-width blocks

                          return (
                            <div
                              key={demand.id}
                              className="absolute bg-blue-400 bg-opacity-70 rounded-md text-white text-xs p-1 flex items-center justify-center shadow-md"
                              style={{ left: `${left}%`, width: `${width}%`, top: '10%', height: '30%' }}
                              title={`Bedarf: ${demand.start} - ${demand.end}, ${demand.requiredStaff} Mitarbeiter`}
                            >
                              Bedarf: {demand.requiredStaff}
                            </div>
                          );
                        })}

                        {/* Assigned Shifts */}
                        {dayData.assignedShifts.map((shift, index) => {
                          const startMins = timeToMinutes(shift.start);
                          let endMins = timeToMinutes(shift.end);
                          if (endMins <= startMins) { // Shift crosses midnight
                            endMins += FULL_DAY_MINUTES;
                          }

                          const visualStart = getVisualPosition(startMins);
                          const visualEnd = getVisualPosition(endMins);

                          const left = (visualStart / TOTAL_TIMELINE_MINUTES) * 100;
                          const width = ((visualEnd - visualStart) / TOTAL_TIMELINE_MINUTES) * 100;

                          // Staggering shifts to avoid overlap in visualization
                          const topPosition = 50 + (index % 3) * 15; // Adjust 3 and 15 for more/less staggering

                          if (width <= 0) return null;

                          return (
                            <div
                              key={shift.id}
                              className="absolute bg-purple-500 bg-opacity-80 rounded-md text-white text-xs p-1 flex items-center justify-center shadow-md overflow-hidden whitespace-nowrap"
                              style={{ left: `${left}%`, width: `${width}%`, top: `${topPosition}%`, height: '20%' }}
                              title={`${shift.employeeName}: ${shift.start} - ${shift.end}`}
                            >
                              {shift.employeeName}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hourly Status Indicators */}
                <div className="mt-4 overflow-x-auto">
                  <div
                    className="inline-block min-w-full"
                    style={{ width: `${TOTAL_VISUAL_WIDTH_PX}px` }} // Fixed width for the status indicators
                  >
                    <div className="grid grid-flow-col auto-cols-[60px] gap-1">
                      {/* Iterate for the total visual hours */}
                      {Array.from({ length: NUM_HOURS_IN_VIEW }).map((_, i) => {
                        // Calculate the actual hour represented by this block
                        let currentHour = TIMELINE_START_HOUR + i;
                        if (currentHour >= 24) {
                          currentHour -= 24; // Wrap around for hours like 00, 01, 02, 03
                        }
                        const status = getHourlyStatus(dayData, currentHour);
                        return (
                          <div
                            key={`status-${i}`} // Use index i for key
                            className={`p-2 rounded-md text-center text-xs font-semibold flex items-center justify-center ${getStatusClasses(status)}`}
                            title={`Status für ${String(currentHour).padStart(2, '0')}:00 - ${String((currentHour + 1) % 24).padStart(2, '0')}:00`}
                          >
                            {getStatusIcon(status)}
                            <span className="ml-1 hidden sm:inline">{String(currentHour).padStart(2, '0')}:00</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Export Button */}
        <div className="p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200 text-center">
          <button
            onClick={exportEmployeeShiftsPdf}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center mx-auto"
          >
            <Download size={24} className="mr-3" /> Schichten exportieren (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
