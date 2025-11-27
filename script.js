const { DateTime } = luxon;

const cities = [
    { name: 'Melbourne', zone: 'Australia/Melbourne', code: 'MEL' },
    { name: 'Tokyo', zone: 'Asia/Tokyo', code: 'HND' },
    { name: 'Singapore', zone: 'Asia/Singapore', code: 'SIN' },
    { name: 'Bangalore', zone: 'Asia/Kolkata', code: 'BLR' },
    { name: 'Dubai', zone: 'Asia/Dubai', code: 'DXB' },
    { name: 'Poland', zone: 'Europe/Warsaw', code: 'WAW' },
    { name: 'London', zone: 'Europe/London', code: 'LHR' },
    { name: 'New York', zone: 'America/New_York', code: 'JFK' },
    { name: 'Chicago', zone: 'America/Chicago', code: 'ORD' },
    { name: 'San Francisco', zone: 'America/Los_Angeles', code: 'SFO' }
];

let isEditing = false;
let referenceTime = DateTime.now(); // The single source of truth
let updateInterval;

const cityListEl = document.getElementById('city-list');
const resetBtn = document.getElementById('reset-btn');

function init() {
    renderCities();
    startClock();

    resetBtn.addEventListener('click', () => {
        if (isEditing) {
            isEditing = false;
            startClock();
        }
    });
}

function updateButtonState(mode) {
    if (mode === 'live') {
        resetBtn.innerHTML = `<span class="status-dot"></span> Live`;
        resetBtn.className = 'btn-live';
        resetBtn.disabled = true; // purely visual, or prevent clicks
    } else {
        resetBtn.innerHTML = `Resume <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`;
        resetBtn.className = 'btn-resume';
        resetBtn.disabled = false;
    }
}

function renderCities() {
    cityListEl.innerHTML = '';
    cities.forEach((city, index) => {
        const card = document.createElement('div');
        card.className = 'city-card';
        card.innerHTML = `
            <div class="card-left">
                <div class="city-name">${city.name}</div>
                <div class="city-meta">
                    <span class="airport-code">${city.code}</span>
                    <span class="offset-badge" id="offset-${index}">UTC+0</span>
                </div>
            </div>
            <div class="card-right">
                <input type="time" class="time-display" id="time-${index}" value="00:00">
                <input type="date" class="date-display" id="date-${index}">
            </div>
        `;
        cityListEl.appendChild(card);

        // Add event listeners for input
        const timeInput = card.querySelector(`#time-${index}`);
        const dateInput = card.querySelector(`#date-${index}`);

        const stopAndEdit = () => {
            if (!isEditing) {
                stopClock();
                isEditing = true;
                updateButtonState('edit');
            }
        };

        timeInput.addEventListener('focus', stopAndEdit);
        dateInput.addEventListener('focus', stopAndEdit);

        timeInput.addEventListener('input', (e) => {
            handleTimeInput(e.target.value, city.zone);
        });

        dateInput.addEventListener('input', (e) => {
            handleDateInput(e.target.value, city.zone);
        });

        // Mobile UX: Select all text on click to make editing easier
        timeInput.addEventListener('click', (e) => {
            e.target.select();
        });
    });
}

function startClock() {
    if (updateInterval) clearInterval(updateInterval);
    updateButtonState('live');
    updateDisplay(); // Run once immediately
    updateInterval = setInterval(() => {
        if (!isEditing) {
            referenceTime = DateTime.now();
            updateDisplay();
        }
    }, 1000);
}

function stopClock() {
    if (updateInterval) clearInterval(updateInterval);
}

function updateDisplay() {
    cities.forEach((city, index) => {
        const timeInput = document.getElementById(`time-${index}`);
        const dateInput = document.getElementById(`date-${index}`);
        const offsetBadge = document.getElementById(`offset-${index}`);

        // Convert reference time to city's timezone
        const cityTime = referenceTime.setZone(city.zone);

        if (!cityTime.isValid) {
            console.error(`Invalid time for ${city.name}: ${cityTime.invalidReason}`);
            return;
        }

        // Update Time Input (HH:mm)
        // Only update value if not the active element (to prevent cursor jumping while typing)
        if (document.activeElement !== timeInput) {
            timeInput.value = cityTime.toFormat('HH:mm');
        }

        // Update Date
        // Only update value if not the active element
        if (document.activeElement !== dateInput) {
            dateInput.value = cityTime.toFormat('yyyy-MM-dd');
        }

        // Update Offset/DST Badge
        const offset = cityTime.offset / 60;
        const offsetStr = offset >= 0 ? `UTC+${offset}` : `UTC${offset}`;
        const isDST = cityTime.isInDST;

        let badgeHtml = `<span class="badge">${offsetStr}</span>`;
        if (isDST) {
            badgeHtml += ` <span class="badge dst">DST</span>`;
        }
        offsetBadge.innerHTML = badgeHtml;
    });
}

function handleTimeInput(timeStr, zone) {
    if (!timeStr) return;

    const [hours, minutes] = timeStr.split(':').map(Number);

    // Create a new DateTime in the *target* timezone with the input time
    // We keep the current date of the reference time, but apply the new hours/minutes
    // Note: This can be tricky if the user wants to change the date, but for a simple time slider
    // usually we assume "today" relative to the current view or just change the time component.

    // Better approach: Take the current reference time converted to that zone, 
    // update its hours/minutes, then convert back to system zone (or keep as new reference).

    let targetTime = referenceTime.setZone(zone);
    targetTime = targetTime.set({ hour: hours, minute: minutes });

    referenceTime = targetTime;
    updateDisplay();
}

function handleDateInput(dateStr, zone) {
    if (!dateStr) return;

    const [year, month, day] = dateStr.split('-').map(Number);

    // Create a new DateTime in the *target* timezone with the input date
    // We keep the current time of the reference time, but apply the new year/month/day

    let targetTime = referenceTime.setZone(zone);
    targetTime = targetTime.set({ year: year, month: month, day: day });

    referenceTime = targetTime;
    updateDisplay();
}

init();
