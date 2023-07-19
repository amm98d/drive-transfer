const fsp = require("fs").promises;
const { google } = require("googleapis");
const { authenticate } = require("@google-cloud/local-auth");

const HOST_TOKEN_PATH = "./host_token.json";
const DESTINATION_TOKEN_PATH = "./destination_token.json";
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const APP_CREDENTIALS_PATH = "./credentials.json";

async function auth(isHost) {
  let client = await loadSavedCredentialsIfExist(isHost);
  if (client) return client;
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: APP_CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client, isHost);
  }
  return client;
}

async function loadSavedCredentialsIfExist(isHost) {
  let content;
  if (isHost) content = await fsp.readFile(HOST_TOKEN_PATH);
  else content = await fsp.readFile(DESTINATION_TOKEN_PATH);
  const credentials = JSON.parse(content);
  return google.auth.fromJSON(credentials);
}

async function saveCredentials(client, isHost) {
  const content = await fsp.readFile(APP_CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  if (isHost) await fsp.writeFile(HOST_TOKEN_PATH, payload);
  else await fsp.writeFile(DESTINATION_TOKEN_PATH, payload);
}

module.exports = { auth };
