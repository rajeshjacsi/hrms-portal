import type { Configuration, PopupRequest } from "@azure/msal-browser";

// Config object to be passed to Msal on creation
export const msalConfig: Configuration = {
    auth: {
        clientId: "d149cfd3-5619-4d82-a73e-3e6a9c14c549", // Application (client) ID from Azure Portal
        authority: "https://login.microsoftonline.com/83bbc9ba-745e-4322-91f7-871d643a214e", // Directory (tenant) ID
        redirectUri: window.location.origin, // e.g. http://localhost:5173
    },
    cache: {
        cacheLocation: "sessionStorage", // "sessionStorage" or "localStorage"
        storeAuthStateInCookie: false,
    }
};

// Add here scopes for id token to be used at MS Identity Platform endpoints.
export const loginRequest: PopupRequest = {
    scopes: ["User.Read", "https://jmtechtalent.sharepoint.com/.default"]
};

// Add here the endpoints for MS Graph API services you would like to use.
export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
};
