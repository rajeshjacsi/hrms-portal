
import { getAccessToken } from './src/config/pnpConfig.js';
// Need to handle the .js extension or use commonjs

async function checkFields() {
    try {
        const token = await getAccessToken();
        const response = await fetch("https://jmtechtalent.sharepoint.com/sites/EmployeesDOB/_api/web/lists/getByTitle('Attendance')/fields", {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json;odata=verbose"
            }
        });
        const data = await response.json();
        const fields = data.d.results;
        console.log("--- START FIELD DUMP ---");
        fields.forEach((f) => {
            if (!f.Hidden && (f.InternalName.includes('Working') || f.Title.includes('Working') || f.InternalName.includes('Hours') || f.Title.includes('Hours'))) {
                console.log(`Title: ${f.Title} | InternalName: ${f.InternalName} | Type: ${f.TypeAsString}`);
            }
        });
        console.log("--- END FIELD DUMP ---");
    } catch (e) {
        console.error(e);
    }
}

checkFields();
