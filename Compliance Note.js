// ==UserScript==
// @name         Compliance Note Synthesizer (Alt+R)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Injects a custom UI overlay to parse, clean, and synthesize multi-lingual compliance templates on the fly.
// @author       Sanitized Portfolio Version
// @match        https://internal-crm.company.local/*
// @grant        GM_setClipboard
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal compliance tool.
 * Demonstrates injecting custom, self-contained UI overlays into enterprise 
 * portals to parse raw notes via Regex and synthesize standardized compliance templates.
 */

(function() {
    'use strict';

    let popupOverlay = null;

    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key.toLowerCase() === 'r') {
            e.preventDefault();
            e.stopPropagation();
            togglePopup();
        }
    }, true);

    function togglePopup() {
        if (!popupOverlay) popupOverlay = buildUI();
        popupOverlay.style.display = 'flex';
        document.getElementById('compliance-input-text').focus();
    }

    function executeLocalCustomerIdScan() {
        const el = document.querySelector('[data-testid="Customer.Profile"] .readonly-field');
        if (el && el.textContent.trim()) return el.textContent.trim();
        const inputEl = document.querySelector('[data-testid="Customer.Profile"] input');
        if (inputEl && inputEl.value.trim()) return inputEl.value.trim();
        return null;
    }

    function buildUI() {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: 'rgba(10, 15, 20, 0.8)', backdropFilter: 'blur(5px)',
            zIndex: '999999', display: 'none', justifyContent: 'center', alignItems: 'center',
            fontFamily: '"Segoe UI", system-ui, sans-serif'
        });

        const modal = document.createElement('div');
        Object.assign(modal.style, {
            backgroundColor: '#1e2227', color: '#abb2bf', padding: '24px', borderRadius: '12px',
            width: '600px', maxWidth: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column', gap: '16px'
        });

        const title = document.createElement('h2');
        title.innerText = 'Compliance Template Synthesizer';
        Object.assign(title.style, { margin: '0', color: '#61afef', fontSize: '18px', fontWeight: '600' });

        const textarea = document.createElement('textarea');
        textarea.id = 'compliance-input-text';
        textarea.placeholder = 'Paste raw notes here...';
        Object.assign(textarea.style, {
            width: '100%', height: '220px', backgroundColor: '#282c34', color: '#e5c07b',
            border: '1px solid #3e4451', borderRadius: '6px', padding: '12px', boxSizing: 'border-box',
            fontFamily: '"Fira Code", monospace', fontSize: '13px', resize: 'vertical', outline: 'none'
        });

        const btnContainer = document.createElement('div');
        Object.assign(btnContainer.style, { display: 'flex', justifyContent: 'flex-end', gap: '12px' });

        const closeBtn = createButton('Close', '#4b5263', '#fff');
        const copyBtn = createButton('Synthesize & Copy', '#98c379', '#282c34');

        btnContainer.appendChild(closeBtn);
        btnContainer.appendChild(copyBtn);
        modal.appendChild(title);
        modal.appendChild(textarea);
        modal.appendChild(btnContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        closeBtn.onclick = () => { overlay.style.display = 'none'; textarea.value = ''; };
        overlay.onclick = (e) => { if(e.target === overlay) { overlay.style.display = 'none'; textarea.value = ''; } };

        copyBtn.onclick = () => {
            const rawData = textarea.value;
            if(!rawData.trim()) return;

            const docRefId = prompt("Document Reference ID:", "");
            if (docRefId === null) return; 

            const custId = executeLocalCustomerIdScan() || "[CUSTOMER_ID]";
            const synthesizedString = processData(rawData, custId, docRefId);

            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(synthesizedString, 'text');
                flashSuccess(copyBtn);
            } else {
                navigator.clipboard.writeText(synthesizedString).then(() => flashSuccess(copyBtn));
            }
        };

        function flashSuccess(btn) {
            const originalText = btn.innerText;
            const originalBg = btn.style.backgroundColor;
            btn.innerText = 'Copied to Clipboard!';
            btn.style.backgroundColor = '#61afef';
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.backgroundColor = originalBg;
                overlay.style.display = 'none';
                textarea.value = '';
            }, 1000); 
        }

        return overlay;
    }

    function createButton(text, bg, color) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            padding: '8px 16px', cursor: 'pointer', backgroundColor: bg, color: color,
            border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', transition: 'opacity 0.2s'
        });
        btn.onmouseover = () => {btn.style.opacity = '0.8'};
        btn.onmouseout = () => {btn.style.opacity = '1'};
        return btn;
    }

    function processData(input, custId, docRefId) {
        const extract = (regex) => {
            const match = input.match(regex);
            return match ? match[1].trim() : '[NOT FOUND]';
        };

        let touch = extract(/Which touch is this review:\s*(.*)/i);
        const level = extract(/Customer has\s+(.*?)\s+Sanctions indication/i);
        let indication = extract(/Indication\s*–\s*(.*)/i);
        const region = extract(/Suspected Region\s*–\s*(.*)/i);
        let entityRaw = extract(/Documents required\s*–\s*(.*?)\s+must have/i);

        if (touch.includes('1s')) touch = touch.replace(/1s\s*>/g, '1st>');
        if (indication.includes('<ID ')) indication = indication.replace('<ID ', '<');
        const cleanEntity = entityRaw.replace(/[<>]/g, '').trim();

        return `${custId}

Review Context: Sanctions Review
Which touch is this review: ${touch}
Issues found: Customer with ${level} Sanctions indicator provided requested documents <Proof of Residence + ID outside restricted jurisdiction> Ref ID <${docRefId}>.
Indication – ${indication}
Suspected Region – ${region}
What actions were taken during the review: Documents approved – ${cleanEntity}'s ID + POR outside of restricted jurisdiction.
Review outcome: Review completed

If further action is required:
Instructions for Tier 2: If stopped for additional indications, handle according to standard guidelines. For indications from Restricted Regions A/B/C: Transfer to Specialized Queue.
Instructions for Support: No Action Required

===Autologger procedure ID: PROCEDURE_C===`;
    }
})();