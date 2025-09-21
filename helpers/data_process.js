// Takes: Notion JSON. Returns: iCal string.
import { DateTime } from "luxon";

// Converts Notion Dates to ICS format
// Handles timezone if provided, else assumes UTC
/**
 * 
 * @param {string} dtStr 
 * @param {string} tzStr 
 * @returns {string} Formatted date string in ICS format (UTC)
 */
function reformatDate(dtStr, tzStr = null) {
    // If tzinfo in ISO string, Luxon handles it
    let dt = DateTime.fromISO(dtStr, { zone: tzStr || "utc" });

    // Convert to UTC and format as ICS
    return dt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
}

// Recives processed data, returns ICS formatted string
// Expects a json object like:
// {calname, events: [ { id, title, start, end, description, location, url } ] }
/**
 * Formats processed calendar data into ICS string.
 * 
 * @param {object} data - Calendar data object.
 * @param {string} data.calname - Name of the calendar.
 * @param {Array} data.events - Array of event objects.
 * @returns {string} ICS formatted string.
 * Each event object should have:
 *   - id: string
 *   - title: string
 *   - start: ISO date string
 *   - end: ISO date string
 *   - description: string
 *   - location: string
 *   - url: string
 */
function createICS(data) {
    if (!data || !data.calname || !Array.isArray(data.events)) {
        throw new Error("Invalid data format");
    }
    const ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        `PRODID:-//${data.calname}//EN`,
        `X-WR-CALNAME:${data.calname}`,
        "X-WR-TIMEZONE:America/Chicago"
    ];
    for (const ev of data.events) {
        if (!ev.id || !ev.title || !ev.start) {
            console.warn(`Skipping event with missing required fields: ${JSON.stringify(ev)}`);
            continue;
        }

        // Determine if event is all-day (date only) or timed (date-time)
        const startDT = DateTime.fromISO(ev.start);
        const endDT = ev.end ? DateTime.fromISO(ev.end) : null;
        const isAllDay = startDT.isValid && startDT.hour === 0 && startDT.minute === 0 && startDT.second === 0 && !ev.start.includes('T');

        let dtstartLine = "";
        let dtendLine = "";

        if (isAllDay) {
            // For all-day events, format as DATE and add 1 day to DTEND (exclusive end)
            const dtstartDate = startDT.toFormat("yyyyMMdd");
            let dtendDate;
            if (endDT && endDT.isValid) {
                dtendDate = endDT.plus({ days: 1 }).toFormat("yyyyMMdd");
            } else {
                // If no end, assume single day event, so DTEND is start + 1 day
                dtendDate = startDT.plus({ days: 1 }).toFormat("yyyyMMdd");
            }
            dtstartLine = `DTSTART;VALUE=DATE:${dtstartDate}`;
            dtendLine = `DTEND;VALUE=DATE:${dtendDate}`;
        } else {
            // Timed event, keep original formatting, convert to UTC and format as date-time
            dtstartLine = `DTSTART:${reformatDate(ev.start)}`;
            if (ev.end) {
                dtendLine = `DTEND:${reformatDate(ev.end)}`;
            } else {
                dtendLine = "";
            }
        }

        ics.push(
            "BEGIN:VEVENT",
            `UID:${ev.id}@notion`,
            `SUMMARY:${ev.title}`,
            dtstartLine,
            dtendLine,
            `DESCRIPTION:${ev.description || ""}`,
            `LOCATION:${ev.location || ""}`,
            ev.url ? `URL:${ev.url}` : "",
            "END:VEVENT"
        );
    }
    ics.push("END:VCALENDAR", "");
    return ics.join("\r\n");
}

export {
    reformatDate,
    createICS
}