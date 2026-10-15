// Public deployment settings: never put a client secret or AI key in this file.
export const deploymentConfig = Object.freeze({
  microsoftClientId: '',
  authority: 'https://login.microsoftonline.com/common',
  redirectUri: new URL('./auth.html', import.meta.url).href,
  applicationUrl: new URL('./', import.meta.url).href
});
