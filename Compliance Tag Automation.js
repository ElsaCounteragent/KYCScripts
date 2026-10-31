// ==UserScript==
// @name         Network-Instrumented Compliance Tag Automation
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Automates compliance workflows; uses monkey-patched network listeners (fetch/XHR) to wait for API settlement across iframes before executing DOM actions.
// @author       Sanitized Portfolio Version
// @match        https://internal-portal.company.local/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal compliance automation tool.
 * Demonstrates advanced techniques for SPA automation: Cross-frame network 
 * instrumentation, recursive iframe DOM observation, and API-idle polling.
 */

(function() {
    'use strict';

    const delay = ms => new Promise(r => setTimeout(r, ms));

    /* =========================================================
       CROSS-FRAME NETWORK INSTRUMENTATION
       Enterprise SPAs often load critical components inside iframes 
       without exposing global loading states. By monkey-patching 
       `fetch` and `XMLHttpRequest` on both the top window and all 
       child iframes, we can accurately track in-flight API requests 
       and wait for network "idle" before interacting with the DOM.
       ========================================================= */
    function instrumentWindow(win) {
        if (!win || win.__netTracked) return;
        try {
            win.__netTracked = true;
            win.__activeRequests = 0;
            const bump = d => { win.__activeRequests = Math.max(0, (win.__activeRequests || 0) + d); };

            if (typeof win.fetch === 'function') {
                const orig = win.fetch.bind(win);
                win.fetch = function(...args) {
                    bump(1);
                    return orig(...args).then(res => {
                        bump(-1);
                        return res;
                    }, err => { bump(-1); throw err; });
                };
            }

            const XHR = win.XMLHttpRequest;
            if (XHR) {
                const origSend = XHR.prototype.send;
                XHR.prototype.send = function(...args) {
                    bump(1);
                    this.addEventListener('loadend', () => bump(-1), { once: true });
                    return origSend.call(this, ...args);
                };
            }
        } catch (e) {}
    }
    
    // Instrument top window immediately; iframes will instrument themselves upon injection
    instrumentWindow(window); 

    function totalActiveRequests() {
        let n = window.__activeRequests || 0;
        const scan = doc => {
            try {
                doc.querySelectorAll('iframe').forEach(f => {
                    try {
                        if (f.contentWindow) {
                            n += f.contentWindow.__activeRequests || 0;
                            if (f.contentDocument) scan(f.contentDocument);
                        }
                    } catch (e) {} // Cross-origin iframe restrictions
                });
            } catch (e) {}
        };
        scan(document);
        return n;
    }

    /** Resolves when zero in-flight fetch/XHR requests for `quietMs` (or on timeout). */
    function waitForNetworkIdle(quietMs = 900, timeout = 20000) {
        return new Promise(resolve => {
            const start = Date.now();
            let quietSince = null;
            const iv = setInterval(() => {
                const active = totalActiveRequests();
                if (active === 0) {
                    if (quietSince === null) quietSince = Date.now();
                    if (Date.now() - quietSince >= quietMs) { clearInterval(iv); resolve(true); }
                } else {
                    quietSince = null;
                }
                if (Date.now() - start >= timeout) { clearInterval(iv); resolve(false); }
            }, 100);
        });
    }

    /* =========================================================
       IFRAME-AWARE DOM OBSERVERS
       Standard MutationObservers only watch the document they are 
       attached to. This recursive observer pattern watches the main 
       document and dynamically attaches observers to any newly 
       created iframes to catch elements rendering inside them.
       ========================================================= */
    function waitForElement(selector, context = null, timeout = 30000) {
        return new Promise((resolve, reject) => {
            let resolved = false;
            const observers = new Set();
            const rootDoc = context ? context.ownerDocument : document;

            function check(doc) {
                if (!doc || resolved) return false;
                try {
                    let searchRoot = context || doc;
                    let el = searchRoot.querySelector(selector);
                    if (el && doc.body && doc.body.contains(el)) {
                        resolved = true;
                        observers.forEach(o => o.disconnect());
                        resolve(el);
                        return true;
                    }
                } catch (e) {}
                return false;
            }
            if (check(rootDoc)) return;

            function observeIframes(doc) {
                if (!doc || resolved || context) return;
                doc.querySelectorAll('iframe').forEach(iframe => {
                    try {
                        if (iframe.contentDocument) { observeDoc(iframe.contentDocument); check(iframe.contentDocument); }
                        iframe.addEventListener('load', () => {
                            if (iframe.contentDocument) { observeDoc(iframe.contentDocument); check(iframe.contentDocument); }
                        });
                    } catch (e) {}
                });
            }
            
            function observeDoc(doc) {
                if (!doc || resolved) return;
                const obs = new MutationObserver(() => {
                    if (check(doc)) return;
                    observeIframes(doc);
                });
                obs.observe(doc.body || doc, { childList: true, subtree: true });
                observers.add(obs);
            }
            
            observeDoc(rootDoc);
            observeIframes(rootDoc);

            if (timeout) setTimeout(() => {
                if (!resolved) { resolved = true; observers.forEach(o => o.disconnect()); reject(new Error(`Timeout waiting for ${selector}`)); }
            }, timeout);
        });
    }

    /* =========================================================
       WORKFLOW EXECUTION
       ========================================================= */
    async function runWorkflow(accountId) {
        console.log('Step 1: Navigating to Profile General Info');
        window.location.hash = `#/profile/${accountId}/GeneralInfo`;
        
        // Wait for iframe bootstrap requests to settle via network listener
        await waitForNetworkIdle(900, 20000);

        console.log('Step 2: Opening Compliance Rules Modal');
        const btn = await waitForElement('#actions-ComplianceRules');
        btn.click();
        
        const modal = await waitForElement('compliance-rules-modal');
        
        // CRITICAL FIX: Modal init fires background APIs. Wait for them to finish 
        // before clicking "add rule" to prevent race conditions.
        await waitForNetworkIdle(900, 20000);

        console.log('Step 3: Configuring Rule Parameters');
        const select = await waitForElement('select.add-rule-application-id', modal);
        select.value = '2'; // Standard Review
        select.dispatchEvent(new Event('change', { bubbles: true }));

        const input = await waitForElement('input.mat-input-element', modal);
        input.focus();
        input.click();

        // Select the specific compliance reason from the CDK overlay
        const option = await waitForElement('mat-option'); 
        option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        option.click();

        const icon = await waitForElement('i.icon-save', modal);
        icon.click();

        console.log('Workflow complete!');
    }

    // HOTKEY: Alt + C
    if (window.top === window) {
        document.addEventListener('keydown', function(e) {
            if (e.altKey && e.code === 'KeyC') {
                e.preventDefault();
                const match = window.location.hash.match(/\/profile\/(\d+)\//);
                if (match) runWorkflow(match[1]).catch(console.error);
            }
        });
    }
})();