import { getAccessToken } from "./src/config/pnpConfig";

async function checkNotificationsList() {
    const siteUrl = "https://jmtechtalent.sharepoint.com/sites/EmployeesDOB";
    const listName = "Notifications";

    try {
        const token = await getAccessToken();
        console.log("Fetching list fields for:", listName);

        const response = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')/fields?$select=InternalName,Title`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json;odata=verbose"
            }
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`Error: ${response.status} - ${text}`);
            return;
        }

        const data = await response.json();
        const fields = data.d.results;

        console.log("Fields found:");
        fields.forEach((f: { Title: string; InternalName: string }) => {
            console.log(`- ${f.Title} (${f.InternalName})`);
        });

        // Also check Entity Type Name
        const listResponse = await fetch(`${siteUrl}/_api/web/lists/getByTitle('${listName}')?$select=ListItemEntityTypeFullName`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json;odata=verbose"
            }
        });

        if (listResponse.ok) {
            const listData = await listResponse.json();
            console.log("Entity Type Full Name:", listData.d.ListItemEntityTypeFullName);
        }

    } catch (error) {
        console.error("Failed to check list:", error);
    }
}

checkNotificationsList();
