# ============================================================
# Shrayak: Fix Elastic Cloud API Key Permissions
# ============================================================
#
# The cluster IS reachable:
#   https://shrayak-a98b91.es.us-central1.gcp.elastic.cloud
#
# The current API key (eWdYc2M1...) returns HTTP 403 Forbidden
# on all index operations because it lacks:
#   - indices:data/write/index   (write documents)
#   - indices:admin/create       (create index)
#   - indices:monitor/settings   (check if index exists)
#
# Fix: Create a new scoped API key in Kibana (2 minutes).
# ============================================================

STEP 1 — Open Kibana
══════════════════════════════════════════════════════════════

  URL: https://shrayak-a98b91.kb.us-central1.gcp.elastic.cloud
  Login with your Elastic Cloud account credentials.


STEP 2 — Navigate to API Keys
══════════════════════════════════════════════════════════════

  Click:  Stack Management (gear icon, bottom left)
       →  Security
       →  API Keys
       →  [+ Create API Key]  (blue button, top right)


STEP 3 — Configure the New API Key
══════════════════════════════════════════════════════════════

  Name:       shrayak-prod-key

  SCROLL DOWN to "Index privileges" section.

  Click [+ Add index privilege]:

    Index names:    delhi_wages_2026
    Privileges:     [✓] read
                    [✓] write
                    [✓] create_index
                    [✓] manage
                    [✓] view_index_metadata

  Click [+ Add index privilege] again:

    Index names:    telemetry_logs
    Privileges:     [✓] read
                    [✓] write
                    [✓] create_index
                    [✓] manage
                    [✓] view_index_metadata

  Leave all other settings as default.
  Click [Create API Key].


STEP 4 — Copy the Key
══════════════════════════════════════════════════════════════

  Kibana will show the key ONCE. Copy the "Base64" format value.
  It looks like: dGhpcyBpcyBhIHRlc3Q6c2VjcmV0

  DO NOT close this page until you have copied it.


STEP 5 — Update .env
══════════════════════════════════════════════════════════════

  Open d:\Shrayak\.env and replace:

    ELASTIC_API_KEY=eWdYc2M1OEI3YkgySUx5M09sdWs6R0xJVTFhSFpJQXdoZ3R0bzhyZ0ItUQ==

  With your new key:

    ELASTIC_API_KEY=<paste_your_new_base64_key_here>


STEP 6 — Verify & Seed
══════════════════════════════════════════════════════════════

  In d:\Shrayak, run:

    node -e "require('dotenv').config(); const {checkElasticHealth}=require('./backend/elasticConfig'); checkElasticHealth().then(r=>console.log(JSON.stringify(r,null,2)));"

  Expected output:
    { "ok": true, "endpoint": "https://...", "indexWages": "missing", "indexTelem": "missing" }
    ("missing" = server reachable, indices not yet created — that's correct)

  Then run:
    npm run seed

  Expected:
    ✅ Created index 'delhi_wages_2026'
    ✅ [1/5] mw-unskilled-oct2026
    ✅ [2/5] mw-semiskilled-oct2026
    ...
    ✅ Ingestion complete { success: 5, failed: 0 }

  Then start the server:
    npm run dev


WHY THE CURRENT KEY IS RESTRICTED
══════════════════════════════════════════════════════════════

  The existing key (eWdYc2M1...) is a "write-only ingest" key
  created for the Fleet/APM ingest endpoint. It has write access
  to the APM data stream indices but NOT to custom indices like
  delhi_wages_2026 or telemetry_logs.

  The new key you create will be scoped to exactly the two
  indices our application needs — nothing more (least privilege).


SECURITY NOTE
══════════════════════════════════════════════════════════════

  Rotate the old key after creating the new one:
    Kibana → Stack Management → API Keys → [old key] → Invalidate

  The old key endpoint (ingest URL) was for APM/Fleet only and
  is not used by our application code.
