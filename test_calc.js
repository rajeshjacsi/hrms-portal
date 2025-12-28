
function parseDateTime(dateStr, timeStr) {
    if (!timeStr || timeStr === '-' || timeStr === '00:00') {
        const [d, m, y] = dateStr.split('/').map(Number);
        return new Date(y, m - 1, d, 0, 0, 0);
    }

    const [dayStr, monthStr, yearStr] = dateStr.split('/');
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const year = parseInt(yearStr, 10);

    const timeMatch = timeStr.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
    if (!timeMatch) {
        return new Date(year, month, day, 0, 0, 0);
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const modifier = timeMatch[3]?.toUpperCase();

    if (modifier) {
        if (hours === 12 && modifier === 'AM') {
            hours = 0;
        } else if (hours < 12 && modifier === 'PM') {
            hours += 12;
        }
    }

    const finalDate = new Date(year, month, day);
    finalDate.setHours(hours, minutes, 0, 0);
    return finalDate;
}

const dateStr = '26/12/2025';
const checkInTimeStr = '8:21 AM';
const checkOutTimeStr = '12:11 PM';

const start = parseDateTime(dateStr, checkInTimeStr);
const end = parseDateTime(dateStr, checkOutTimeStr);

console.log('Start:', start.toLocaleString());
console.log('End:', end.toLocaleString());

const diffMs = Math.max(0, end.getTime() - start.getTime());
const h = Math.floor(diffMs / 3600000);
const m = Math.floor((diffMs % 3600000) / 60000);
const workingHoursStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

console.log('Working Hours:', workingHoursStr);
console.log('Diff Ms:', diffMs);
