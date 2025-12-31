import dotenv from "dotenv";
dotenv.config();
import { ConfidentialClientApplication } from "@azure/msal-node";

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    // authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    authority: `https://login.microsoftonline.com/common`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
};
const cca = new ConfidentialClientApplication(msalConfig);

// const tokenResponse = await cca.acquireTokenByClientCredential({
//   scopes: ["https://graph.microsoft.com/.default"],
// });
// const appToken = tokenResponse.accessToken;
// console.log("--- ", appToken);

// let appToken = null;
// let appTokenExpiresAt = null;

// Middleware: extract incoming user token for OBO
async function oboToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const incomingToken = auth.replace(/^Bearer\s+/, "");
  if (!incomingToken) return res.status(401).send("Missing bearer token");
  try {
    const oboResponse = await cca.acquireTokenOnBehalfOf({
      oboAssertion: incomingToken,
      scopes: [process.env.API_SCOPE],
    });
    // console.log("oboResponse", oboResponse);
    
    req.graphToken = oboResponse.accessToken;

    next();
  } catch (e) {
    console.error(e);
    res.status(500).send("Token exchange failed");
  }
}

// JWT middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.sendStatus(401);
  try {
    req.user = jwt.verify(auth.replace("Bearer ", ""), JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

export { oboToken, requireAuth };