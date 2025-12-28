import { spfi, SPFI } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/batching";
import { LogLevel, PnPLogging } from "@pnp/logging";
import type { IPublicClientApplication } from "@azure/msal-browser";

let sp: SPFI;

// A custom behavior to inject the Access Token
// In PnPjs v3/v4, behaviors are middleware.
const MsalTokenBehavior = (msal: IPublicClientApplication, scopes: string[]) => {
    return (instance: SPFI) => {
        (instance as any).on.auth.replace(async function (url: URL, init: RequestInit) {
            console.log("PnP: Intercepting request for", url.toString());
            const accounts = msal.getAllAccounts();
            if (accounts.length > 0) {
                const request = {
                    scopes: scopes,
                    account: accounts[0]
                };

                try {
                    console.log("PnP: Attempting to acquire token silently...");
                    const response = await msal.acquireTokenSilent(request);
                    console.log("PnP: Token acquired successfully.");
                    const token = response.accessToken;

                    if (!init.headers) {
                        init.headers = {};
                    }
                    (init.headers as any)["Authorization"] = `Bearer ${token}`;
                    (init.headers as any)["Accept"] = "application/json;odata=verbose";
                } catch (e) {
                    console.error("PnP: Token acquisition failed via Behavior", e);
                }
            } else {
                console.warn("PnP: No active accounts found for token acquisition.");
            }
            console.log("PnP: Proceeding with request.");
            return [url, init];
        });
        return instance;
    };
};

export const getSP = (instance?: IPublicClientApplication): SPFI => {
    if (sp) return sp;

    if (instance) {
        msalInstance = instance;
        sp = spfi("https://jmtechtalent.sharepoint.com/sites/EmployeesDOB")
            .using(PnPLogging(LogLevel.Warning))
            .using(MsalTokenBehavior(instance, ["https://jmtechtalent.sharepoint.com/.default"]));
    }
    return sp;
};

let msalInstance: IPublicClientApplication;

export const getAccessToken = async (): Promise<string> => {
    if (!msalInstance) throw new Error("MSAL Instance not initialized");

    // Explicitly handle all active accounts
    const activeAccount = msalInstance.getActiveAccount();
    const accounts = msalInstance.getAllAccounts();
    const account = activeAccount || accounts[0];

    if (!account) {
        throw new Error("No active account! Please sign in.");
    }

    const request = {
        scopes: ["https://jmtechtalent.sharepoint.com/.default"],
        account: account
    };

    try {
        const resp = await msalInstance.acquireTokenSilent(request);
        return resp.accessToken;
    } catch (e: any) {
        console.warn("Silent token failed", e);
        // DO NOT Auto-Popup. It hangs if blocked.
        // Throw special error for UI to handle.
        throw new Error("InteractionRequired: " + e.message);
    }
};
