# T-005 Verification Record

- CWD: `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`; evidence: static/host
- Plugin-owned API is now in `plugins/mcu-workbench-verification/index.js`; legacy `plugins/verification/index.js` re-exports it. Root pilot forwards to plugin pilot.
- `node plugins/mcu-workbench-verification/scripts/validate.js`: exit 0; descriptor/version and all 8 plugin Skills valid.
- `node plugins/mcu-workbench-verification/scripts/pilot.js --out artifacts/verification-plugin-pilot`: exit 0; 2/2 host contract checks passed.
- `node scripts/verification-pilot.js --out artifacts/verification-root-pilot`: exit 0; 2/2 host contract checks passed.
- These are host contract checks only, not firmware or hardware evidence.
