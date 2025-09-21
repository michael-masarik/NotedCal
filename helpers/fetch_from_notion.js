// Fetches Notion Data. Expects DB ID, API Key, and the props to fetch
// Returns JSON data
import { Client } from "@notionhq/client";
import { reformatDate } from "./data_process.js";
// Simple function to look up a property by its IDs
function getPropById(properties, id) {
    return Object.values(properties).find(prop => prop.id === id);
}

/**
 * Fetch events from a Notion database.
 *
 * @param {string} dB - The Notion database (data source) ID.
 * @param {string} apiKey - The Notion integration API key.
 * @param {Object} props - Mapping of property IDs used in the database.
 * @param {string} props.title - The ID of the Title property.
 * @param {string} props.date - The ID of the Date property.
 * @param {string} props.description - The ID of the Description property (optional).
 * @param {string} props.location - The ID of the Location property (optional).
 * @param {string} props.url - The ID of the URL property (optional).
 * @param {string} calname - Label for the calendar these events belong to.
 * @returns {Promise<{ calname: string, events: Array<{
 *   id: string,
 *   title: string,
 *   start: string,
 *   end?: string,
 *   description: string,
 *   location: string,
 *   url: string
 * }>>>} } A promise resolving to the calendar name and processed events.
 */



async function fetchData(dB, apiKey, props, calname) {
    const notion = new Client({ auth: apiKey });

    try {
        const res = await notion.dataSources.query({
            data_source_id: dB,
            sorts: [
                {
                    property: props.date,
                    direction: "ascending"
                }
            ]
        });

        const events = [];

        for (const page of res.results) {
            const titleProp = getPropById(page.properties, props.title);
            const dateProp = getPropById(page.properties, props.date);
            if (!dateProp?.date?.start) {
                console.warn(`Skipping event with missing start date: ${JSON.stringify(page)}`);
                continue;
            }
            const descProp = props.description ? getPropById(page.properties, props.description) : null;
            const locProp = props.location ? getPropById(page.properties, props.location) : null;
            const urlProp = props.url ? getPropById(page.properties, props.url) : null;

            const fullDay = !dateProp.date.end || dateProp.date.end === dateProp.date.start;
            const dtStart = reformatDate(dateProp.date.start, dateProp.date.time_zone);
            const dtEnd = !fullDay ? reformatDate(dateProp.date.end, dateProp.date.time_zone) : null;

            const event = {
                title: titleProp?.title?.[0]?.plain_text || "(No Title)",
                start: dtStart,
                id: page.id,
                description: descProp?.rich_text?.[0]?.plain_text || "",
                location: locProp?.rich_text?.[0]?.plain_text || "",
                url: urlProp?.url || ""
            };

            if (dtEnd) event.end = dtEnd;
            events.push(event);
        }

        return { calname, events };
    } catch (err) {
        console.error("Error fetching data:", err);
        throw err;
    }
}
export { fetchData };