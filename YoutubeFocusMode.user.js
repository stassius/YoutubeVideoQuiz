// ==UserScript==
// @name         YoutubeFocusMode
// @namespace    local.youtube.focus-mode
// @version      1.0.4
// @description  Adds a bilingual Focus Mode toggle to YouTube watch pages and hides distracting page elements.
// @match        https://www.youtube.com/*
// @downloadURL  https://raw.githubusercontent.com/stassius/YoutubeVideoQuiz/main/YoutubeFocusMode.user.js
// @updateURL    https://raw.githubusercontent.com/stassius/YoutubeVideoQuiz/main/YoutubeFocusMode.user.js
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const CONTROL_ID = 'yt-focus-mode-control';
    const STYLE_ID = 'yt-focus-mode-style';
    const ACTIVE_CLASS = 'yt-focus-mode-active';
    const STORAGE_KEY = 'youtube-focus-mode-enabled';
    const isRussian = (navigator.language || '').toLowerCase().startsWith('ru');

    const TEXT = isRussian
        ? {
            label: 'Режим фокусировки',
            enable: 'Включить режим фокусировки',
        }
        : {
            label: 'Focus Mode',
            enable: 'Enable Focus Mode',
        };

    function isWatchPage() {
        return location.pathname === '/watch' && new URL(location.href).searchParams.has('v');
    }

    function readEnabled() {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    }

    function writeEnabled(enabled) {
        try {
            localStorage.setItem(STORAGE_KEY, String(enabled));
        } catch {
            // Focus Mode still works for the current page if storage is blocked.
        }
    }

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            ytd-masthead #start:has(> #${CONTROL_ID}) {
                width: auto !important;
                min-width: 0 !important;
            }

            #${CONTROL_ID} {
                display: inline-flex;
                align-items: center;
                flex: 0 0 auto;
                gap: 8px;
                min-height: 40px;
                margin-left: 12px;
                padding: 0 12px;
                border-radius: 20px;
                box-sizing: border-box;
                color: #0f0f0f;
                background: rgba(0, 0, 0, .05);
                font: 500 14px/20px Roboto, Arial, sans-serif;
                white-space: nowrap;
                cursor: pointer;
                user-select: none;
            }

            #${CONTROL_ID}:hover {
                background: rgba(0, 0, 0, .1);
            }

            html[dark] #${CONTROL_ID},
            html[dark-theme] #${CONTROL_ID} {
                color: #f1f1f1;
                background: rgba(255, 255, 255, .1);
            }

            html[dark] #${CONTROL_ID}:hover,
            html[dark-theme] #${CONTROL_ID}:hover {
                background: rgba(255, 255, 255, .2);
            }

            #${CONTROL_ID} input {
                width: 18px;
                height: 18px;
                margin: 0;
                accent-color: #065fd4;
                cursor: pointer;
            }

            html.${ACTIVE_CLASS} ytd-watch-flexy:not([theater]):not([fullscreen]) {
                --ytd-watch-flexy-sidebar-width: 0px !important;
                --ytd-watch-flexy-sidebar-min-width: 0px !important;
            }

            html.${ACTIVE_CLASS} ytd-watch-flexy:not([theater]):not([fullscreen]) #columns {
                display: block !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: none !important;
                box-sizing: border-box;
            }

            html.${ACTIVE_CLASS} ytd-watch-flexy:not([theater]):not([fullscreen]) #primary {
                width: auto !important;
                min-width: 0 !important;
                max-width: 1280px !important;
                margin-left: auto !important;
                margin-right: auto !important;
                box-sizing: border-box;
            }

            html.${ACTIVE_CLASS} ytd-masthead #center,
            html.${ACTIVE_CLASS} ytd-masthead #end,
            html.${ACTIVE_CLASS} ytd-watch-flexy #secondary,
            html.${ACTIVE_CLASS} ytd-watch-flexy #related,
            html.${ACTIVE_CLASS} ytd-watch-flexy ytd-comments,
            html.${ACTIVE_CLASS} ytd-watch-flexy ytd-live-chat-frame,
            html.${ACTIVE_CLASS} ytd-watch-flexy #chat-container,
            html.${ACTIVE_CLASS} ytd-watch-flexy ytd-watch-metadata #top-row,
            html.${ACTIVE_CLASS} ytd-watch-flexy ytd-reel-shelf-renderer,
            html.${ACTIVE_CLASS} ytd-watch-flexy ytm-shorts-lockup-view-model,
            html.${ACTIVE_CLASS} ytd-watch-flexy grid-shelf-view-model:has(ytm-shorts-lockup-view-model),
            html.${ACTIVE_CLASS} ytd-watch-flexy ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-live-chat"] {
                display: none !important;
            }
        `;

        (document.head || document.documentElement).appendChild(style);
    }

    function applyState(enabled) {
        document.documentElement.classList.toggle(ACTIVE_CLASS, enabled && isWatchPage());

        const checkbox = document.querySelector(`#${CONTROL_ID} input`);
        if (checkbox) checkbox.checked = enabled;
    }

    function createControl() {
        const label = document.createElement('label');
        label.id = CONTROL_ID;
        label.title = TEXT.enable;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('aria-label', TEXT.enable);
        checkbox.checked = readEnabled();
        checkbox.addEventListener('change', () => {
            writeEnabled(checkbox.checked);
            applyState(checkbox.checked);
        });

        const caption = document.createElement('span');
        caption.textContent = TEXT.label;

        label.append(checkbox, caption);
        return label;
    }

    function sync() {
        addStyles();

        if (!isWatchPage()) {
            document.documentElement.classList.remove(ACTIVE_CLASS);
            document.getElementById(CONTROL_ID)?.remove();
            return;
        }

        const logo = document.querySelector('ytd-masthead #start ytd-topbar-logo-renderer');
        const existingControl = document.getElementById(CONTROL_ID);
        if (logo && existingControl?.previousElementSibling !== logo) {
            logo.insertAdjacentElement('afterend', existingControl || createControl());
        }

        applyState(readEnabled());
    }

    let syncScheduled = false;

    function scheduleSync() {
        if (syncScheduled) return;
        syncScheduled = true;
        requestAnimationFrame(() => {
            syncScheduled = false;
            sync();
        });
    }

    document.addEventListener('yt-navigate-finish', scheduleSync);
    document.addEventListener('yt-page-data-updated', scheduleSync);
    setInterval(scheduleSync, 1500);

    if (document.documentElement) sync();
    document.addEventListener('DOMContentLoaded', sync, { once: true });
})();
