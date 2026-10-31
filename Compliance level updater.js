// ==UserScript==
// @name         Event-Driven Compliance Level Updater
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Automatically updates customer compliance tiers using DOM listeners and MutationObservers instead of blind timeouts.
// @author       Sanitized Portfolio Version
// @match        https://internal-portal.company.local/*
// @grant        window.close
// ==/UserScript==

/*
 * DISCLAIMER:
 * Sanitized portfolio version of an internal productivity tool.
 * Demonstrates replacing brittle `setTimeout` automation with robust, 
 * event-driven Promises backed by MutationObservers to wait for exact 
 * DOM, attribute, and text-content state changes.
 */

(function() {
    'use strict';

    // Check if the page reloaded/redirected after a save, and close the tab immediately.
    let pendingCloseTime = null;
    try { pendingCloseTime = sessionStorage.getItem('compliance_update_pending_close'); } catch (e) {}

    if (pendingCloseTime) {
        const timeDiff = Date.now() - parseInt(pendingCloseTime, 10);
        if (timeDiff < 120000) { 
            try { sessionStorage.removeItem('compliance_update_pending_close'); } catch (e) {}
            window.close();
            setTimeout(() => { if (!window.closed) window.location.href = 'about:blank'; }, 1000);
            return; 
        } else {
            try { sessionStorage.removeItem('compliance_update_pending_close'); } catch (e) {}
        }
    }

    let actionCompleted = false;
    let justPerformedUpdate = false;
    let windowCloseTriggered = false;

    // 1. Wait for an element to appear in the DOM
    function waitForElement(selector, timeout = 15000) {
        return new Promise((resolve, reject) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) { observer.disconnect(); resolve(el); }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => { observer.disconnect(); reject(new Error(`Timeout waiting for element: ${selector}`)); }, timeout);
        });
    }

    // 2. Wait for a specific attribute to change state
    function waitForAttribute(element, attr, conditionFn, timeout = 15000) {
        return new Promise((resolve, reject) => {
            if (conditionFn(element.getAttribute(attr))) return resolve();
            const observer = new MutationObserver(() => {
                if (conditionFn(element.getAttribute(attr))) { observer.disconnect(); resolve(); }
            });
            observer.observe(element, { attributes: true, attributeFilter: [attr] });
            setTimeout(() => { observer.disconnect(); reject(new Error(`Timeout waiting for attribute: ${attr}`)); }, timeout);
        });
    }

    // 3. Wait for text content to change
    function waitForTextChange(element, conditionFn, timeout = 15000) {
        return new Promise((resolve, reject) => {
            if (conditionFn(element.textContent)) return resolve();
            const observer = new MutationObserver(() => {
                if (conditionFn(element.textContent)) { observer.disconnect(); resolve(); }
            });
            observer.observe(element, { characterData: true, childList: true, subtree: true });
            setTimeout(() => { observer.disconnect(); reject(new Error(`Timeout waiting for text change`)); }, timeout);
        });
    }

    async function executeComplianceUpdate() {
        try {
            const editBtn = document.querySelector('#edit-compliance-level');
            if (!editBtn) return;

            editBtn.click();
            const selectEl = await waitForElement('select[name="complianceTier"]');
            
            selectEl.value = 'Tier-3';
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            selectEl.dispatchEvent(new Event('input', { bubbles: true }));

            const saveBtn = await waitForElement('button[data-action="update-compliance"]');
            if (saveBtn.hasAttribute('disabled')) {
                await waitForAttribute(saveBtn, 'disabled', (val) => val === null);
            }

            try { sessionStorage.setItem('compliance_update_pending_close', Date.now().toString()); } catch (e) {}
            justPerformedUpdate = true;
            saveBtn.click();

            const levelEl = document.querySelector('#header-compliance-level');
            if (levelEl) {
                try { await waitForTextChange(levelEl, (text) => text.trim().includes('Tier-3'), 3000); } 
                catch (e) { await new Promise(resolve => setTimeout(resolve, 1000)); }
            } else {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            try { sessionStorage.removeItem('compliance_update_pending_close'); } catch (e) {}
            windowCloseTriggered = true;
            window.close();
            setTimeout(() => { if (!window.closed) window.location.href = 'about:blank'; }, 500);

        } catch (error) {
            console.error('[Compliance Script] Automation failed:', error);
            try { sessionStorage.removeItem('compliance_update_pending_close'); } catch (e) {}
            window.close();
            setTimeout(() => { if (!window.closed) window.location.href = 'about:blank'; }, 500);
        }
    }

    const pageObserver = new MutationObserver(() => {
        if (justPerformedUpdate && !windowCloseTriggered) {
            const levelEl = document.querySelector('#header-compliance-level');
            const isTier3 = levelEl && levelEl.textContent.trim().includes('Tier-3');
            let pending = null;
            try { pending = sessionStorage.getItem('compliance_update_pending_close'); } catch (e) {}
            const isPending = pending && (Date.now() - parseInt(pending, 10) < 120000);

            if (isTier3 || isPending) {
                windowCloseTriggered = true;
                try { sessionStorage.removeItem('compliance_update_pending_close'); } catch (e) {}
                window.close();
                setTimeout(() => { if (!window.closed) window.location.href = 'about:blank'; }, 500);
                return;
            }
        }

        if (!window.location.hash.includes('#/profile/')) { actionCompleted = false; return; }
        if (actionCompleted) return;

        const statusEl = document.querySelector('#header-profile-status span');
        const levelEl = document.querySelector('#header-compliance-level');
        const editBtn = document.querySelector('#edit-compliance-level');

        if (statusEl && levelEl && editBtn) {
            if (statusEl.textContent.trim().toLowerCase().includes('approved') && !levelEl.textContent.trim().includes('Tier-3')) {
                actionCompleted = true;
                executeComplianceUpdate();
            }
        }
    });

    pageObserver.observe(document.body, { childList: true, subtree: true });
})();