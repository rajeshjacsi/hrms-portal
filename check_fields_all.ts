
import { getAccessToken } from './src/config/pnpConfig';
import fs from 'fs';

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
        const fields = data.d.results.map(f => ({ Title: f.Title, InternalName: f.InternalName, Type: f.TypeAsString }));
        fs.writeFileSync('fields_output.json', JSON.stringify(fields, null, 2));
        console.log("Written to fields_output.json");
    } catch (e) {
        console.error(e);
    }
}

checkFields();
