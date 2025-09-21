import { Client } from "@notionhq/client";

// Fetches Database Schema from Notion. Expects DB ID and API Key
// Returns JSON schema
function fetchSchema(dB, apiKey) {
    const notion = new Client({ auth: apiKey });

    return notion.dataSources.retrieve({
        data_source_id: dB
    }).then((res) => res)
      .catch((err) => {
          console.error("Error fetching schema:", err);
          throw err;
      });
}

// Make returnIDs async and await fetchSchema
async function returnIDs(db, apiKey) {
    const schema = await fetchSchema(db, apiKey); // <— await here
    if (!schema || !schema.properties) {
        throw new Error("Schema or properties is undefined");
    }

    const props = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
        props[key] = prop.id;
    }
    return props;
}

export {
    fetchSchema,
    returnIDs
};