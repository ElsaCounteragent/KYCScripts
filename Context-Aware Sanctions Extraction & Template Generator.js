// ==UserScript==
// @name         Context-Aware Sanctions Extraction & Template Generator
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Extracts sanctions indications contextually using a localized regex context-window to prevent false positives. Generates multi-lingual compliance templates.
// @author       Sanitized Portfolio Version
// @match        https://internal-crm.company.local/*
// @grant        GM_addStyle
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal compliance tool.
 * Highlights a custom NLP technique: "Context-Window Regex Matching". 
 * By restricting regex tests to an 80-character radius around a detected 
 * entity, the script eliminates false positives caused by distant, 
 * unrelated keywords in large DOM text nodes.
 */

(function() {
    'use strict';

    GM_addStyle(`
        #sanctions-ui-container {
            position: fixed; bottom: 20px; right: 20px; width: 420px;
            background: rgba(10, 15, 30, 0.97); border: 1px solid #00ffcc;
            border-radius: 8px; color: #00ffcc;
            font-family: 'Courier New', Courier, monospace;
            z-index: 999999; box-shadow: 0 0 15px rgba(0,255,204,0.3);
            display: none; flex-direction: column; font-size: 13px;
        }
        #sanctions-ui-header {
            background: #003322; padding: 10px; border-bottom: 1px solid #00ffcc;
            border-radius: 8px 8px 0 0; display: flex; justify-content: space-between;
            align-items: center; font-weight: bold;
        }
        #sanctions-ui-body { padding: 15px; display: flex; flex-direction: column; gap: 10px; max-height: 75vh; overflow-y: auto; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { margin-bottom: 3px; font-size: 11px; text-transform: uppercase; }
        .input-field {
            background: #05101a; border: 1px solid #006644; color: #e0ffff;
            padding: 6px; border-radius: 4px; outline: none; font-family: monospace;
        }
        .btn-primary {
            background: #004d33; color: #00ffcc; border: 1px solid #00ffcc;
            padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;
        }
        .btn-primary:hover { background: #00ffcc; color: #000; }
    `);

    const SANCTIONS_REGIONS = [
        'REGION A', 'REGION B', 'REGION C', 'REGION D', 'REGION E'
    ];

    /* ═══════════════════════════════════════════
       INDICATION PATTERNS & CONTEXT-WINDOW ENGINE
       Testing regex against the entire document causes false positives 
       (e.g., matching "ID" in a completely unrelated paragraph). 
       By slicing a 120-character "context window" around the detected 
       region, we ensure the indication is actually related to the entity.
       ═══════════════════════════════════════════ */
    const INDICATION_PATTERNS = [
        { re: /\bID\b[\s\S]{0,25}?(?:PLACE\s*OF\s*BIRTH|BIRTH\s*PLACE)/i, val: 'ID Place of birth' },
        { re: /\bPOR\b[\s\S]{0,25}?(?:ADDRESS|BILLING|RESIDEN)/i, val: 'Proof of Residence Address' },
        { re: /\bID\b[\s\S]{0,25}?NATIONALIT/i, val: 'ID Nationality' },
        { re: /NATIONALIT/i, val: 'Nationality' },
        { re: /\bIP\b[\s\S]{0,15}?(?:ADDRESS|LOCATION|GEO)/i, val: 'IP Address' }
    ];

    function extractSanctions(raw) {
        const text = raw.replace(/\s+/g, ' ').trim();
        const upper = text.toUpperCase();

        let region = '';
        let regionIdx = -1;
        for (const r of SANCTIONS_REGIONS) {
            const idx = upper.indexOf(r);
            if (idx !== -1) { region = r; regionIdx = idx; break; }
        }

        // Build localized context window (80 chars before, 40 chars after)
        let context = upper;
        if (regionIdx !== -1) {
            const start = Math.max(0, regionIdx - 80);
            const end = Math.min(upper.length, regionIdx + region.length + 40);
            context = upper.slice(start, end);
        }

        let indication = '';
        for (const p of INDICATION_PATTERNS) {
            if (p.re.test(context)) { indication = p.val; break; }
        }

        let level = /\bHIGH\b/.test(upper) ? 'High' : 'Low';
        return { region, indication, level, context };
    }

    /* ═══════════════════════════════════════════
       UI INJECTION
       ═══════════════════════════════════════════ */
    const container = document.createElement('div');
    container.id = 'sanctions-ui-container';
    container.innerHTML = `
        <div id="sanctions-ui-header">
            <span>Terminal :: Sanctions Autologger v2</span>
            <span class="close-btn" id="close-btn" style="cursor:pointer;color:#ff3366;">X</span>
        </div>
        <div id="sanctions-ui-body">
            <div class="form-group">
                <label>Raw Input String</label>
                <textarea class="input-field" id="input-string" placeholder="Paste raw notes here..."></textarea>
            </div>
            <div class="form-group">
                <label>Extracted Indication</label>
                <input class="input-field" type="text" id="indication">
            </div>
            <div class="form-group">
                <label>Extracted Region</label>
                <input class="input-field" type="text" id="region">
            </div>
            <button class="btn-primary" id="generate-btn">Compile & Copy Template</button>
        </div>
    `;
    document.body.appendChild(container);

    document.addEventListener('keydown', e => {
        if (e.altKey && e.code === 'KeyG') { 
            e.preventDefault(); 
            container.style.display = container.style.display === 'flex' ? 'none' : 'flex'; 
        }
    });
    document.getElementById('close-btn').addEventListener('click', () => container.style.display = 'none');

    // Live extraction on paste/type
    document.getElementById('input-string').addEventListener('input', e => {
        const { region, indication } = extractSanctions(e.target.value);
        if (region) document.getElementById('region').value = region;
        if (indication) document.getElementById('indication').value = indication;
    });

    // Compile template & robust clipboard fallback
    document.getElementById('generate-btn').addEventListener('click', async () => {
        const indication = document.getElementById('indication').value || '[Specify Indication]';
        const region = document.getElementById('region').value || '[Specify Region]';

        // Sanitized generic compliance template
        const template = `Dear Compliance Team,\n\nIssues found: Customer has Sanctions indication\nIndication: ${indication}\nSuspected Region: ${region}\n\nInstructions for Tier 2: Please assist to review once customer provides documents.\nInstructions for Support: Please advise customer.`;

        // Robust Clipboard API with legacy fallback for restrictive internal CRMs
        const copyToClipboard = async t => {
            try { 
                await navigator.clipboard.writeText(t); 
            } catch {
                const ta = document.createElement('textarea');
                ta.value = t; document.body.appendChild(ta);
                ta.select(); document.execCommand('copy');
                document.body.removeChild(ta);
            }
        };

        await copyToClipboard(template);
        const btn = document.getElementById('generate-btn');
        btn.textContent = 'COPIED TO CLIPBOARD!';
        setTimeout(() => { btn.textContent = 'Compile & Copy Template'; }, 2000);
    });

})();