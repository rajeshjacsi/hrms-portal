
import { getAccessToken } from './src/config/pnpConfig';

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
        const workingFields = fields.filter(f => f.Title.includes('Working') || f.InternalName.includes('WorkingHours'));
        console.log(JSON.stringify(workingFields, null, 2));
    } catch (e) {
        console.error(e);
    }
}

checkFields();
