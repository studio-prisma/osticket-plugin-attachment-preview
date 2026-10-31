"use strict";
// Attachment Preview Script. HTML attachments are sanitized with DOMPurify.
// Setup default config options
var AttachmentPreview = {
    open_attachments: 'normal',
    text_hide: 'Hide Attachment',
    text_show: 'Show Attachment',
    hide_seen: 0,
    hide_age: 14,
    limit: 'No limit'
};

// Leave the next line intact, as the plugin will replace it with settings overriding the defaults above.
/* REPLACED_BY_PLUGIN */

// Entries last seen before this point in time (ms) are forgotten.
AttachmentPreview.oldest_timestamp = Date.now() - 1000 * 60 * 60 * 24 * (parseInt(AttachmentPreview.hide_age, 10) || 14);
/** 
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
 * @param type
 * @returns
 */
AttachmentPreview.storageAvailable = function(type) {
    try {
        var storage = window[type],
            x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return e instanceof DOMException && (
                // everything except Firefox
                e.code === 22 ||
                // Firefox
                e.code === 1014 ||
                // test name field too, because code might not be present
                // everything except Firefox
                e.name === 'QuotaExceededError' ||
                // Firefox
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            storage.length !== 0;
    }
};

AttachmentPreview.getAvailableStorage = function() {
    if (typeof this.storage == 'undefined') {
        if (this.storageAvailable('localStorage')) {
            this.storage = window.localStorage;
        } else if (this.storageAvailable('sessionStorage')) {
            this.storage = window.sessionStorage;
        }
    }
    return this.storage;
};

// Maintain a list of all the attachments the user has seen.. likely needs some form of cache/expiry type system.
AttachmentPreview.seen_ids = null;
AttachmentPreview.cache_key = 'attachment_preview_ids';
AttachmentPreview.load_seen = function() {
    var storage = this.getAvailableStorage(),
        seen = {};
    try {
        seen = JSON.parse(storage.getItem(this.cache_key)) || {};
    } catch (e) {
        seen = {};
    }
    // Forget every ticket that hasn't been looked at within hide_age days.
    for (var tid in seen) {
        if (!seen.hasOwnProperty(tid)) {
            continue;
        }
        if (!seen[tid] || !(seen[tid].last_seen >= this.oldest_timestamp)) {
            delete seen[tid];
        }
    }
    this.seen_ids = seen;
    storage.setItem(this.cache_key, JSON.stringify(seen));
};
AttachmentPreview.already_seen = function(tid, id) {
    if (this.seen_ids === null) {
        this.load_seen();
    }

    if (typeof this.seen_ids[tid] !== 'undefined') {
        var ticket = this.seen_ids[tid];
        if ($.inArray(id, ticket.items) !== -1) {
            // we have already seen that attachment on that ticket
            return true;
        } else {
            // we have seen that ticket, but not that attachment. 
            ticket.items.push(id);
            ticket.last_seen = Date.now();
        }
    } else {
        // this ticket hasn't been seen before.
        this.seen_ids[tid] = {
            last_seen: Date.now(),
            items: [id]
        };
    }
    // bit crap, setting this over and over if there are many tickets in the page.. hmm.
    this.getAvailableStorage().setItem(this.cache_key, JSON.stringify(this.seen_ids));
    return false;
};

// The ticket (or task) being viewed. The lock form isn't there when ticket locking is off, so fall back to ?id=
AttachmentPreview.ticket_id = function() {
    var lock = $('input[name="lockCode"]').closest('form').data('lock-object-id');
    if (lock) {
        return String(lock).substring(7);
    }
    var match = window.location.search.match(/[?&]id=(\d+)/);
    return match ? match[1] : 'unknown';
};

// A stable id for an attachment: osTicket's file key, or the embed URL for players.
// The wrapper's position on the page (ap-file-N) changes as soon as a new reply arrives.
AttachmentPreview.attachment_key = function($wrapper) {
    var $child = $wrapper.find('[data-url], iframe, source, audio').first(),
        url = $child.attr('data-url') || $child.attr('src') || '',
        match = url.match(/[?&]key=([^&]+)/);
    if (match) {
        return match[1];
    }
    return url || $wrapper.attr('id');
};

AttachmentPreview.init = function() {
    // Don't we need  pjax:success any more?
    var attachments = $(".ap_embedded:not(.hidden)");
    if (attachments.length) {
        console.log("Fetching " + attachments.length + " non-hidden attachment[s].");
        if (AttachmentPreview.hide_seen) {
            var ticket_id = AttachmentPreview.ticket_id();
            attachments.each(function(idx) {
                var $a = $(this),
                    id = $a.attr('id'),
                    attachment_key = AttachmentPreview.attachment_key($a);
                if (!AttachmentPreview.already_seen(ticket_id, attachment_key)) {
                    $a.trigger('ap:fetch');
                } else {
                    // User has already seen this attachment, show the button to toggle if they want to fetch/view it again.
                    // The button goes right before this wrapper: YouTube links have no small.filesize to attach to (#35),
                    // and several attachments can share one parent.
                    var js_id = "'" + id.trim() + "'";
                    $a.hide().addClass('hidden');
                    $a.before('<a class="button" onclick="return ap_toggle(this,' + js_id + ');">' + AttachmentPreview.text_show + '</a>');
                }
            });
        } else {
            attachments.trigger('ap:fetch');
        }
    }
    if (AttachmentPreview.open_attachments === 'new-tab') {
        $('a.file').prop('target', '_blank');
    }

    console.log("AP: Plugin running, initial fetch limit configured to " + AttachmentPreview.limit + ".");
};



/**
 * Slightly more convoluted that the other types Load the PDF into an Object
 * Blob and shoves it into the <object> :-)
 * 
 * @param id id of the element to inject the pdf
 * @param url of the file to convert into a Blob and inject
 */
AttachmentPreview.fetch_pdf = function(id, url) {
    var pdf = document.getElementById(id),
        URL = window.URL || window.webkitURL;
    if ( /* @cc_on!@ */ false || !!document.documentMode) {
        // IE still cant display a PDF inside an <object>
        console.log("Why Microsoft?");

        // Fetch the "you suck IE" element inside the <object> and replace
        // the object with it:
        var b = $(pdf).contents();
        $(pdf).replaceWith(b);
        return;
    }
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.responseType = "blob"; // don't need an arraybuffer conversion, can just make a Blob directly!
    req.onload = function() {
        var ab = req.response;
        var blob = new Blob([ab], {
            type: "application/pdf"
        });
        //console.log("Loaded " + blob.type + " of size: " + blob.size);
        // Convert the binary blob of PDF data into an Object URL
        var object_url = URL.createObjectURL(blob);
        if (!object_url) {
            console.log("Failed to construct usable ObjectURL for the attachment. Bailing");
            return;
        }
        var newpdf = pdf.cloneNode();
        newpdf.setAttribute('type', 'application/pdf');
        newpdf.setAttribute('data', object_url);
        newpdf.setAttribute('style', 'display:inline-block');
        newpdf.onload = function() {
            // I think we are supposed to remove the ObjectURL's at some point:
            URL.revokeObjectURL(object_url);
        };
        // Replace the node with our new one which displays it:
        pdf.parentNode.replaceChild(newpdf, pdf);
        // prevent repeated fetch events from re-fetching
        newpdf.setAttribute('data-url', '');
    };
    req.send();
};


AttachmentPreview.handleFetchEvent = function(e) {
    var elem = $(e.target).find('[data-type]').first(),
        type = elem.data('type'),
        url = elem.data('url');

    if (type && url) {
        switch (type) {
            case 'image':
                {
                    // We just have to set the src url, let the browser fetch
                    // the file as normal.
                    elem.attr('src', url);
                    break;
                }
            case 'pdf':
                {
                    // Call our Wunderbar Blobinator function
                    var id = elem.attr('id');
                    this.fetch_pdf(id, url);
                    break;
                }
            case 'text':
                // Replace the <pre> element's text with the Attachment:
                // dataType 'text': never let jQuery interpret the response based on its Content-Type.
                $.get(url, function(data) {
                    elem.text(data);
                }, 'text');
                break;
            case 'html':
                // Fail closed: without DOMPurify the attachment is not rendered at all.
                if (!AttachmentPreview.sanitizer_ready()) {
                    elem.text(AttachmentPreview.text_html_unavailable);
                    break;
                }
                $.get(url, function(data) {
                    var $div = $('<div class="ap_html"></div>');
                    $div.append(AttachmentPreview.sanitize(data));
                    elem.empty().append($div);
                }, 'text');
        }
        // prevent repeated fetch events from re-fetching
        elem.data('type', '');
    }
};

// HTML attachments go through DOMPurify. The plugin injects its own copy as
// window.APDOMPurify (vendor/purify.min.js), and only when "Inline HTML files" is on,
// so neither the hook below nor the version clash with anything else on the page.
// Text formatting survives; scripts, styles, forms, frames and remote resources do not.
AttachmentPreview.text_html_unavailable = AttachmentPreview.text_html_unavailable ||
    'HTML preview unavailable: the sanitizer (vendor/purify.min.js) is missing.';
AttachmentPreview.purify_config = {
    ALLOWED_TAGS: ['a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'code', 'dd', 'del', 'div', 'dl', 'dt',
        'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 'li', 'ol', 'p', 'pre', 's',
        'small', 'span', 'strike', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
        'thead', 'tr', 'u', 'ul'],
    ALLOWED_ATTR: ['href', 'title', 'alt', 'src', 'colspan', 'rowspan'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    // Links and image sources only as web or mail addresses (no javascript:, cid:).
    // DOMPurify still lets data: through on <img>; the hook below narrows that further.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
    // DOMPurify checks every attribute that isn't URI-safe against the regex above;
    // these two only ever hold numbers (title and alt are URI-safe already).
    ADD_URI_SAFE_ATTR: ['colspan', 'rowspan'],
    RETURN_DOM_FRAGMENT: true
};
AttachmentPreview.sanitizer_ready = function() {
    var purify = window.APDOMPurify;
    return typeof purify === 'function' && purify.isSupported === true;
};
AttachmentPreview.sanitize = function(html) {
    if (!this.sanitizer_ready()) {
        return document.createDocumentFragment();
    }
    var purify = window.APDOMPurify;
    if (!this.purify_hooked) {
        purify.addHook('afterSanitizeAttributes', function(node) {
            if (node.nodeName === 'IMG') {
                // Images only when embedded in the attachment itself. A remote src
                // would tell the sender when (and from which IP) an agent read it.
                var src = node.getAttribute('src') || '';
                if (!/^data:image\/(?:png|gif|jpe?g|webp);base64,/i.test(src)) {
                    node.removeAttribute('src');
                }
            }
            if (node.nodeName === 'A' && node.hasAttribute('href')) {
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer nofollow');
            }
        });
        this.purify_hooked = true;
    }
    return purify.sanitize(String(html), this.purify_config);
};

/**
 * Setup handler to receive Attachments Preview Fetch events, and act on them.
 * Events are triggered by the buttons inserted for hidden attachment previews via ap_toggle
 */
$(document).on('ap:fetch', function(e) {
    AttachmentPreview.handleFetchEvent(e);
});
$(document).ready(AttachmentPreview.init());

/**
 * Toggle function for buttons, shows the attachment's wrapper element and
 * triggers the fetch if the attachment isn't already there.
 * Needs to be global.
 * 
 * @param item
 *            (the button that was clicked)
 * @param key
 *            (the id of the element we want to expand/load)
 * @return false to prevent bubbling of event.
 */
function ap_toggle(item, key) {
    var i = $(item),
        elem = $('#' + key);
    elem.slideToggle();
    if (i.text() === AttachmentPreview.text_hide) {
        i.text(AttachmentPreview.text_show);
    } else {
        elem.trigger('ap:fetch');
        i.text(AttachmentPreview.text_hide);
    }
    return false;
}


console.log("AP: Plugin loaded");