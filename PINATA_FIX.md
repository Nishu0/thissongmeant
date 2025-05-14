# The issue and solution

The Pinata API key needs to be updated with proper scopes to allow pin operations. Here's how to fix it:

1. Go to https://app.pinata.cloud/developers/keys
2. Create a new API key with "Pinning" permissions
3. Update your .env file with the new keys

Alternatively, if you have an existing key, you may need to grant additional scopes to it in the Pinata dashboard.
