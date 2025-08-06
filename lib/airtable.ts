import Airtable from 'airtable';

const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY,
});

// Function to get records from the last 30 days
async function getRecentRecords(baseId: string, tableId: string, dateField: string) {
  try {
    const base = airtable.base(baseId);
    
    // Simple approach - get all records and filter on our end
    const records = await base(tableId)
      .select({
        sort: [{ field: dateField, direction: 'desc' }],
        maxRecords: 1000, // Limit to prevent timeout
      })
      .all();

    // Filter for last 30 days on our end
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return records
      .filter((record) => {
        const createdDate = new Date(record.fields[dateField] as string);
        return createdDate >= thirtyDaysAgo;
      })
      .map((record) => ({
        id: record.id,
        fields: record.fields,
      }));
  } catch (error) {
    console.error(`Error fetching data from ${baseId}/${tableId}:`, error);
    return []; // Return empty array on error to prevent build failure
  }
}

export async function getMockupsData() {
  return getRecentRecords('appfue6UJQaIYAzR8', 'tblWUef7rkU2CWcuG', 'Created Time');
}

export async function getLogosData() {
  return getRecentRecords('appVZNtd4jkDSXdkN', 'tblnZiyRKY1wEmGXG', 'Created');
}

export async function getStoresData() {
  return getRecentRecords('app7Vjj06J1IZhPF4', 'tblar8P2gDhny8CaW', 'Created On');
}
