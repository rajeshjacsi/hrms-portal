
import { getAccessToken } from './src/config/pnpConfig';

async function checkFields() {
    try {
        const token = await getAccessToken();
        const response = await fetch("https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('Attendance')/fields?$select=Title,InternalName,TypeAsString", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json;odata=verbose"
            }
        });
        const data = await response.json();
        const fields: any[] = data.d.results;
        console.log("--- FIELD TYPES ---");
        fields.forEach((f: any) => {
            if (f.InternalName.includes('WorkingHours')) {
                console.log(`Title: ${f.Title} | Internal: ${f.InternalName} | Type: ${f.TypeAsString}`);
            }
        });
        console.log("--- END ---");
    } catch (e) {
        console.error(e);
    }
}

checkFields();
