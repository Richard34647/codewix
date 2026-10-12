// ==========================================================================
// CodeWix — components.js
// Self-contained UI component library using CodeWix UI utility classes.
// ==========================================================================

console.log('[CodeWix] components.js loaded');

(function () {
  'use strict';

  // Helper: wraps component code in a full preview doc
  function buildPreviewDoc(componentCode) {
    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<link rel="stylesheet" href="https://codewi.onrender.com/codewix-ui.css">' +
      '<style>body{padding:20px;background:#f5f7fa;font-family:system-ui,-apple-system,sans-serif;margin:0;}</style>' +
      '</head><body>' + componentCode + '</body></html>';
  }

  // ======================================================================
  // COMPONENT DATA — using cw- utility classes throughout
  // ======================================================================
  var COMPONENTS = [

    // ============ BUTTONS ============
    { id:'btn-primary', title:'Primary Button', desc:'Solid indigo button for the main action.', cat:'buttons',
      code:'<button class="cw-btn cw-btn-primary">Click Me</button>' },
    { id:'btn-outline', title:'Outline Button', desc:'Transparent with colored border for secondary actions.', cat:'buttons',
      code:'<button class="cw-btn cw-btn-outline-primary">Learn More</button>' },
    { id:'btn-group-basic', title:'Button Group', desc:'Row of buttons joined together.', cat:'buttons',
      code:`<div class="cw-btn-group">
  <button class="cw-btn cw-btn-outline-primary">Left</button>
  <button class="cw-btn cw-btn-outline-primary">Middle</button>
  <button class="cw-btn cw-btn-outline-primary">Right</button>
</div>` },
    { id:'btn-gradient', title:'Gradient Button', desc:'Custom gradient button.', cat:'buttons',
      code:`<button class="cw-btn cw-rounded-lg cw-fw-bold" style="background:linear-gradient(135deg,#6366f1,#a855f7);color:white;padding:14px 32px;border:none;box-shadow:0 4px 14px rgba(99,102,241,0.35);">Get Started</button>` },
    { id:'btn-icon', title:'Icon Button', desc:'Button with icon and label.', cat:'buttons',
      code:`<button class="cw-btn cw-btn-primary cw-d-inline-flex cw-align-center cw-gap-2">
  <span>⚡</span><span>Launch Now</span>
</button>` },
    { id:'btn-sizes', title:'Button Sizes', desc:'Small, default, and large variants.', cat:'buttons',
      code:`<button class="cw-btn cw-btn-primary cw-btn-sm">Small</button>
<button class="cw-btn cw-btn-primary">Default</button>
<button class="cw-btn cw-btn-primary cw-btn-lg">Large</button>` },

    // ============ CARDS ============
    { id:'card-basic', title:'Basic Card', desc:'Standard card with title, text, and action.', cat:'cards',
      code:`<div class="cw-card cw-mw-100">
  <div class="cw-card-body">
    <h3 class="cw-card-title">Card Title</h3>
    <p class="cw-card-text">A short description of what this card is about.</p>
    <button class="cw-btn cw-btn-primary cw-btn-sm">Read More</button>
  </div>
</div>` },
    { id:'card-header', title:'Card with Header/Footer', desc:'Card with distinct header and footer sections.', cat:'cards',
      code:`<div class="cw-card">
  <div class="cw-card-header">Featured</div>
  <div class="cw-card-body">
    <h3 class="cw-card-title">Section Title</h3>
    <p class="cw-card-text">Body content goes here.</p>
  </div>
  <div class="cw-card-footer">
    <button class="cw-btn cw-btn-primary cw-btn-sm">Save</button>
  </div>
</div>` },
    { id:'card-image', title:'Card with Image', desc:'Card with an image on top.', cat:'cards',
      code:`<div class="cw-card">
  <img src="https://picsum.photos/400/180" class="cw-card-img" alt="Card image">
  <div class="cw-card-body">
    <h3 class="cw-card-title">Card Title</h3>
    <p class="cw-card-text">Short description here.</p>
  </div>
</div>` },
    { id:'card-profile', title:'Profile Card', desc:'Centered avatar with name and role.', cat:'cards',
      code:`<div class="cw-card cw-text-center" style="max-width:280px;">
  <div class="cw-card-body">
    <img src="https://i.pravatar.cc/120" class="cw-rounded-circle cw-mb-3" width="80" height="80" alt="Avatar">
    <h3 class="cw-card-title cw-mb-1">Jane Doe</h3>
    <p class="cw-text-muted cw-fs-sm cw-mb-3">Full-stack Developer</p>
    <button class="cw-btn cw-btn-primary cw-btn-sm">Follow</button>
    <button class="cw-btn cw-btn-outline-secondary cw-btn-sm">Message</button>
  </div>
</div>` },
    { id:'card-pricing', title:'Pricing Card', desc:'Pricing tier with highlighted badge.', cat:'cards',
      code:`<div class="cw-card cw-border-primary" style="max-width:300px;position:relative;border-width:2px;">
  <span class="cw-badge cw-badge-primary" style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);">Popular</span>
  <div class="cw-card-body cw-text-center cw-p-4">
    <p class="cw-text-secondary cw-fw-medium cw-mb-3">Pro</p>
    <div class="cw-fs-4xl cw-fw-bolder cw-mb-4">$19<span class="cw-fs-base cw-text-muted">/mo</span></div>
    <ul class="cw-list-group cw-mb-4 cw-text-start">
      <li class="cw-list-group-item">Unlimited projects</li>
      <li class="cw-list-group-item">Priority support</li>
      <li class="cw-list-group-item">Custom domains</li>
    </ul>
    <button class="cw-btn cw-btn-primary cw-btn-block">Get Started</button>
  </div>
</div>` },
    { id:'card-grid', title:'Card Grid', desc:'Responsive grid of cards.', cat:'cards',
      code:`<div class="cw-row cw-gap-3">
  <div class="cw-col-md-4">
    <div class="cw-card cw-h-100"><div class="cw-card-body">
      <h3 class="cw-card-title">Fast</h3>
      <p class="cw-card-text">Sub-second response times.</p>
    </div></div>
  </div>
  <div class="cw-col-md-4">
    <div class="cw-card cw-h-100"><div class="cw-card-body">
      <h3 class="cw-card-title">Simple</h3>
      <p class="cw-card-text">No setup needed.</p>
    </div></div>
  </div>
  <div class="cw-col-md-4">
    <div class="cw-card cw-h-100"><div class="cw-card-body">
      <h3 class="cw-card-title">Free</h3>
      <p class="cw-card-text">Forever, no card.</p>
    </div></div>
  </div>
</div>` },

    // ============ FORMS ============
    { id:'form-login', title:'Login Form', desc:'Email + password + remember checkbox.', cat:'forms',
      code:`<form style="max-width:360px;" onsubmit="event.preventDefault();">
  <h2 class="cw-fs-xl cw-fw-bold cw-mb-4">Sign In</h2>
  <div class="cw-form-group">
    <label class="cw-form-label">Email</label>
    <input type="email" class="cw-form-control" placeholder="you@example.com">
  </div>
  <div class="cw-form-group">
    <label class="cw-form-label">Password</label>
    <input type="password" class="cw-form-control">
  </div>
  <label class="cw-form-check cw-mb-3">
    <input type="checkbox"> Remember me
  </label>
  <button type="submit" class="cw-btn cw-btn-primary cw-btn-block">Sign In</button>
</form>` },
    { id:'form-newsletter', title:'Newsletter Signup', desc:'Email input with subscribe button.', cat:'forms',
      code:`<form class="cw-input-group" style="max-width:480px;" onsubmit="event.preventDefault();">
  <input type="email" class="cw-form-control" placeholder="Enter your email">
  <button type="submit" class="cw-btn cw-btn-primary">Subscribe</button>
</form>` },
    { id:'form-contact', title:'Contact Form', desc:'Multi-field contact form.', cat:'forms',
      code:`<form class="cw-card" style="max-width:480px;" onsubmit="event.preventDefault();">
  <div class="cw-card-body">
    <div class="cw-row cw-gap-3">
      <div class="cw-col-md-6 cw-form-group">
        <label class="cw-form-label">Name</label>
        <input type="text" class="cw-form-control">
      </div>
      <div class="cw-col-md-6 cw-form-group">
        <label class="cw-form-label">Email</label>
        <input type="email" class="cw-form-control">
      </div>
    </div>
    <div class="cw-form-group">
      <label class="cw-form-label">Message</label>
      <textarea class="cw-form-control" rows="4"></textarea>
    </div>
    <button type="submit" class="cw-btn cw-btn-primary cw-btn-block">Send</button>
  </div>
</form>` },
    { id:'form-select', title:'Select Menu', desc:'Styled dropdown select.', cat:'forms',
      code:`<select class="cw-form-control cw-form-select" style="max-width:300px;">
  <option>Choose a language…</option>
  <option>JavaScript</option>
  <option>Python</option>
  <option>Go</option>
</select>` },
    { id:'form-floating', title:'Search Bar', desc:'Input with a search icon.', cat:'forms',
      code:`<div class="cw-relative" style="max-width:420px;">
  <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);">🔍</span>
  <input type="text" class="cw-form-control cw-rounded-full" style="padding-left:42px;" placeholder="Search anything…">
</div>` },

    // ============ NAVIGATION ============
    { id:'nav-simple', title:'Dark Navbar', desc:'Top navigation with brand and links.', cat:'nav',
      code:`<nav class="cw-navbar">
  <a href="#" class="cw-navbar-brand">MyBrand</a>
  <ul class="cw-navbar-nav">
    <li><a href="#" class="cw-navbar-link">Home</a></li>
    <li><a href="#" class="cw-navbar-link">Features</a></li>
    <li><a href="#" class="cw-navbar-link">Pricing</a></li>
  </ul>
</nav>` },
    { id:'nav-light', title:'Light Navbar', desc:'Clean light-colored navbar.', cat:'nav',
      code:`<nav class="cw-navbar cw-navbar-light">
  <a href="#" class="cw-navbar-brand">MyBrand</a>
  <ul class="cw-navbar-nav">
    <li><a href="#" class="cw-navbar-link">Home</a></li>
    <li><a href="#" class="cw-navbar-link">Features</a></li>
    <li><a href="#" class="cw-navbar-link">Pricing</a></li>
  </ul>
</nav>` },
    { id:'nav-tabs', title:'Tab Navigation', desc:'Switchable tabs.', cat:'nav',
      code:`<div class="cw-nav cw-nav-tabs">
  <button class="cw-nav-link cw-active">Overview</button>
  <button class="cw-nav-link">Profile</button>
  <button class="cw-nav-link">Settings</button>
</div>` },
    { id:'nav-pills', title:'Pill Navigation', desc:'Rounded pill-style navigation.', cat:'nav',
      code:`<div class="cw-nav cw-nav-pills">
  <button class="cw-nav-link cw-active">All</button>
  <button class="cw-nav-link">Active</button>
  <button class="cw-nav-link">Archived</button>
</div>` },
    { id:'nav-breadcrumb', title:'Breadcrumbs', desc:'Hierarchical path navigation.', cat:'nav',
      code:`<nav class="cw-breadcrumb">
  <span class="cw-breadcrumb-item"><a href="#">Home</a></span>
  <span class="cw-breadcrumb-item"><a href="#">Library</a></span>
  <span class="cw-breadcrumb-item cw-active">Data</span>
</nav>` },
    { id:'nav-dropdown', title:'Dropdown Menu', desc:'Click-triggered menu.', cat:'nav',
      code:`<div class="cw-dropdown">
  <button class="cw-btn cw-btn-outline-primary" onclick="this.nextElementSibling.classList.toggle('cw-show');event.stopPropagation();">Actions ▾</button>
  <ul class="cw-dropdown-menu">
    <li><a class="cw-dropdown-item" href="#">Edit</a></li>
    <li><a class="cw-dropdown-item" href="#">Duplicate</a></li>
    <li><hr class="cw-dropdown-divider"></li>
    <li><a class="cw-dropdown-item cw-text-danger" href="#">Delete</a></li>
  </ul>
</div>
<script>document.addEventListener('click',function(){document.querySelectorAll('.cw-dropdown-menu.cw-show').forEach(m=>m.classList.remove('cw-show'));});<\/script>` },

    // ============ FEEDBACK ============
    { id:'feedback-alerts', title:'Alert Messages', desc:'Colored status banners.', cat:'feedback',
      code:`<div>
  <div class="cw-alert cw-alert-success">✓ Your changes were saved.</div>
  <div class="cw-alert cw-alert-warning">⚠ Session expires in 5 minutes.</div>
  <div class="cw-alert cw-alert-danger">✕ Something went wrong.</div>
  <div class="cw-alert cw-alert-info">ℹ New updates available.</div>
</div>` },
    { id:'feedback-badges', title:'Badges', desc:'Small labels for status and counts.', cat:'feedback',
      code:`<span class="cw-badge cw-badge-primary">New</span>
<span class="cw-badge cw-badge-success">Active</span>
<span class="cw-badge cw-badge-warning">Pending</span>
<span class="cw-badge cw-badge-danger">Urgent</span>
<span class="cw-badge cw-badge-secondary">Archived</span>` },
    { id:'feedback-progress', title:'Progress Bars', desc:'Completion indicator.', cat:'feedback',
      code:`<div style="max-width:400px;">
  <p class="cw-fs-sm cw-mb-2">Loading… 65%</p>
  <div class="cw-progress cw-mb-3"><div class="cw-progress-bar" style="width:65%;"></div></div>
  <div class="cw-progress cw-mb-3"><div class="cw-progress-bar cw-progress-bar-success" style="width:100%;"></div></div>
  <div class="cw-progress"><div class="cw-progress-bar cw-progress-bar-warning" style="width:40%;"></div></div>
</div>` },
    { id:'feedback-spinner', title:'Loading Spinner', desc:'Animated loading indicators.', cat:'feedback',
      code:`<div class="cw-d-flex cw-gap-3 cw-align-center">
  <div class="cw-spinner cw-spinner-sm"></div>
  <div class="cw-spinner"></div>
  <div class="cw-spinner cw-spinner-lg"></div>
</div>` },
    { id:'feedback-toast', title:'Toast Notification', desc:'Corner popup that auto-dismisses.', cat:'feedback',
      code:`<button class="cw-btn cw-btn-primary" onclick="cwDemoToast()">Show Toast</button>
<div class="cw-toast" id="cwDemoToast" style="position:fixed;bottom:20px;right:20px;">
  <div class="cw-toast-header">Notification <span style="cursor:pointer;" onclick="document.getElementById('cwDemoToast').classList.remove('cw-show')">×</span></div>
  <div class="cw-toast-body">Your changes were saved successfully.</div>
</div>
<script>function cwDemoToast(){var t=document.getElementById('cwDemoToast');t.classList.add('cw-show');setTimeout(function(){t.classList.remove('cw-show');},3000);}<\/script>` },

    // ============ OVERLAYS ============
    { id:'overlay-modal', title:'Modal Dialog', desc:'Full popup dialog with backdrop.', cat:'overlays',
      code:`<button class="cw-btn cw-btn-primary" onclick="cwDemoModal()">Open Modal</button>
<div class="cw-modal-backdrop" id="cwDemoModal" onclick="if(event.target===this)cwCloseModal();">
  <div class="cw-modal">
    <div class="cw-modal-header">
      <h3 class="cw-modal-title">Confirm Action</h3>
      <button class="cw-modal-close" onclick="cwCloseModal()">×</button>
    </div>
    <div class="cw-modal-body">
      This action can't be undone. Do you want to continue?
    </div>
    <div class="cw-modal-footer">
      <button class="cw-btn cw-btn-light" onclick="cwCloseModal()">Cancel</button>
      <button class="cw-btn cw-btn-danger" onclick="cwCloseModal()">Confirm</button>
    </div>
  </div>
</div>
<script>
function cwDemoModal(){document.getElementById('cwDemoModal').classList.add('cw-show');}
function cwCloseModal(){document.getElementById('cwDemoModal').classList.remove('cw-show');}
<\/script>` },
    { id:'overlay-confirm', title:'Small Confirm Modal', desc:'Compact confirmation dialog.', cat:'overlays',
      code:`<button class="cw-btn cw-btn-outline-danger" onclick="cwSmallModal()">Delete Item</button>
<div class="cw-modal-backdrop" id="cwSmallModal" onclick="if(event.target===this)cwCloseSmall();">
  <div class="cw-modal cw-modal-sm">
    <div class="cw-modal-body cw-text-center cw-p-4">
      <div class="cw-fs-3xl cw-mb-2">🗑️</div>
      <h3 class="cw-fs-lg cw-fw-bold cw-mb-2">Delete this item?</h3>
      <p class="cw-fs-sm cw-text-muted cw-mb-4">This can't be undone.</p>
      <div class="cw-d-flex cw-gap-2">
        <button class="cw-btn cw-btn-light cw-flex-1" onclick="cwCloseSmall()">Cancel</button>
        <button class="cw-btn cw-btn-danger cw-flex-1" onclick="cwCloseSmall()">Delete</button>
      </div>
    </div>
  </div>
</div>
<script>
function cwSmallModal(){document.getElementById('cwSmallModal').classList.add('cw-show');}
function cwCloseSmall(){document.getElementById('cwSmallModal').classList.remove('cw-show');}
<\/script>` },
    { id:'overlay-offcanvas', title:'Side Panel', desc:'Slide-in drawer from the right.', cat:'overlays',
      code:`<button class="cw-btn cw-btn-primary" onclick="cwOpenCanvas()">Open Panel</button>
<div class="cw-offcanvas" id="cwCanvas">
  <div class="cw-offcanvas-header">
    <h3 class="cw-fs-lg cw-fw-bold">Settings</h3>
    <button class="cw-modal-close" onclick="cwCloseCanvas()">×</button>
  </div>
  <div class="cw-offcanvas-body">
    <p class="cw-text-muted cw-fs-sm cw-mb-4">This is a slide-in panel. Perfect for settings, filters, or navigation on mobile.</p>
    <button class="cw-btn cw-btn-primary cw-btn-block cw-mb-2" onclick="cwCloseCanvas()">Save</button>
    <button class="cw-btn cw-btn-light cw-btn-block" onclick="cwCloseCanvas()">Cancel</button>
  </div>
</div>
<script>
function cwOpenCanvas(){document.getElementById('cwCanvas').classList.add('cw-show');}
function cwCloseCanvas(){document.getElementById('cwCanvas').classList.remove('cw-show');}
<\/script>` },
    { id:'overlay-dialog-basic', title:'Dialog (Native)', desc:'HTML <dialog> element — native browser popup with automatic ESC and focus handling.', cat:'overlays',
      code:`<button class="cw-btn cw-btn-primary" onclick="document.getElementById('demoDialog').showModal()">Open Dialog</button>

<dialog id="demoDialog" class="cw-dialog">
  <div class="cw-dialog-header">
    <h3 class="cw-dialog-title">Hello from a native dialog</h3>
    <button class="cw-dialog-close" onclick="document.getElementById('demoDialog').close()">×</button>
  </div>
  <div class="cw-dialog-body">
    This is a real HTML dialog element. Press ESC to close it, or click the button below.
  </div>
  <div class="cw-dialog-footer">
    <button class="cw-btn cw-btn-light" onclick="document.getElementById('demoDialog').close()">Close</button>
    <button class="cw-btn cw-btn-primary" onclick="document.getElementById('demoDialog').close()">Confirm</button>
  </div>
</dialog>` },
    { id:'overlay-dialog-confirm', title:'Confirm Dialog', desc:'Compact confirmation using the native dialog element.', cat:'overlays',
      code:`<button class="cw-btn cw-btn-outline-danger" onclick="document.getElementById('confirmDialog').showModal()">Delete Item</button>

<dialog id="confirmDialog" class="cw-dialog cw-dialog-sm">
  <div class="cw-dialog-body cw-text-center" style="padding:32px 24px;">
    <div class="cw-fs-3xl cw-mb-2">🗑️</div>
    <h3 class="cw-fs-lg cw-fw-bold cw-mb-2">Delete this item?</h3>
    <p class="cw-text-muted cw-fs-sm cw-mb-4">This action can't be undone.</p>
    <div class="cw-d-flex cw-gap-2">
      <button class="cw-btn cw-btn-light cw-flex-1" onclick="document.getElementById('confirmDialog').close()">Cancel</button>
      <button class="cw-btn cw-btn-danger cw-flex-1" onclick="document.getElementById('confirmDialog').close()">Delete</button>
    </div>
  </div>
</dialog>` },
    { id:'overlay-dialog-form', title:'Form Dialog', desc:'Dialog containing a form. Returns value via dialog.returnValue.', cat:'overlays',
      code:`<button class="cw-btn cw-btn-primary" onclick="cwFormDialog()">Open Form</button>
<p class="cw-text-muted cw-fs-sm cw-mt-2" id="cwFormResult"></p>

<dialog id="formDialog" class="cw-dialog">
  <form method="dialog">
    <div class="cw-dialog-header">
      <h3 class="cw-dialog-title">Your Details</h3>
      <button type="button" class="cw-dialog-close" onclick="document.getElementById('formDialog').close()">×</button>
    </div>
    <div class="cw-dialog-body">
      <div class="cw-form-group">
        <label class="cw-form-label">Name</label>
        <input type="text" class="cw-form-control" id="dialogName" placeholder="Your name">
      </div>
      <div class="cw-form-group">
        <label class="cw-form-label">Email</label>
        <input type="email" class="cw-form-control" id="dialogEmail" placeholder="you@example.com">
      </div>
    </div>
    <div class="cw-dialog-footer">
      <button type="button" class="cw-btn cw-btn-light" onclick="document.getElementById('formDialog').close()">Cancel</button>
      <button type="submit" class="cw-btn cw-btn-primary" value="save">Save</button>
    </div>
  </form>
</dialog>

<script>
function cwFormDialog() {
  var d = document.getElementById('formDialog');
  d.showModal();
  d.addEventListener('close', function handler() {
    d.removeEventListener('close', handler);
    if (d.returnValue === 'save') {
      document.getElementById('cwFormResult').textContent =
        'Saved: ' + document.getElementById('dialogName').value;
    }
  });
}
<\/script>` },

    // ============ LAYOUT ============
    { id:'layout-hero', title:'Gradient Hero', desc:'Hero section with gradient background.', cat:'layout',
      code:`<section class="cw-hero cw-hero-gradient">
  <h1 class="cw-fs-4xl cw-fw-bolder cw-mb-3">Build Faster</h1>
  <p class="cw-fs-lg cw-opacity-75 cw-mb-4" style="max-width:500px;margin-left:auto;margin-right:auto;">The modern toolkit for developers who ship.</p>
  <div class="cw-d-flex cw-gap-2 cw-justify-center cw-flex-wrap">
    <button class="cw-btn cw-btn-white">Get Started</button>
    <button class="cw-btn cw-btn-outline-light">Learn More</button>
  </div>
</section>` },
    { id:'layout-accordion', title:'Accordion', desc:'Collapsible FAQ sections.', cat:'layout',
      code:`<div class="cw-accordion" style="max-width:600px;">
  <div class="cw-accordion-item">
    <button class="cw-accordion-header" onclick="this.parentElement.classList.toggle('cw-open')">
      <span>What is this?</span><span class="cw-accordion-icon">▾</span>
    </button>
    <div class="cw-accordion-body"><p class="cw-m-0">A collapsible panel that reveals content.</p></div>
  </div>
  <div class="cw-accordion-item">
    <button class="cw-accordion-header" onclick="this.parentElement.classList.toggle('cw-open')">
      <span>How does it work?</span><span class="cw-accordion-icon">▾</span>
    </button>
    <div class="cw-accordion-body"><p class="cw-m-0">Click a header to expand or collapse.</p></div>
  </div>
</div>` },
    { id:'layout-table', title:'Data Table', desc:'Striped table with status badges.', cat:'layout',
      code:`<table class="cw-table cw-table-striped cw-table-hover">
  <thead>
    <tr><th>Name</th><th>Role</th><th>Status</th></tr>
  </thead>
  <tbody>
    <tr><td>Alice</td><td>Developer</td><td><span class="cw-badge cw-badge-success">Active</span></td></tr>
    <tr><td>Bob</td><td>Designer</td><td><span class="cw-badge cw-badge-warning">Pending</span></td></tr>
    <tr><td>Carol</td><td>Manager</td><td><span class="cw-badge cw-badge-success">Active</span></td></tr>
  </tbody>
</table>` },
    { id:'layout-stats', title:'Stats Row', desc:'Grid of numeric stat cards.', cat:'layout',
      code:`<div class="cw-row cw-gap-3">
  <div class="cw-col-md-3"><div class="cw-card cw-text-center"><div class="cw-card-body cw-p-3">
    <div class="cw-fs-3xl cw-fw-bolder cw-text-primary">12.4K</div>
    <div class="cw-fs-xs cw-text-muted cw-text-uppercase">Active Users</div>
  </div></div></div>
  <div class="cw-col-md-3"><div class="cw-card cw-text-center"><div class="cw-card-body cw-p-3">
    <div class="cw-fs-3xl cw-fw-bolder cw-text-primary">98%</div>
    <div class="cw-fs-xs cw-text-muted cw-text-uppercase">Uptime</div>
  </div></div></div>
  <div class="cw-col-md-3"><div class="cw-card cw-text-center"><div class="cw-card-body cw-p-3">
    <div class="cw-fs-3xl cw-fw-bolder cw-text-primary">3.2M</div>
    <div class="cw-fs-xs cw-text-muted cw-text-uppercase">Requests/day</div>
  </div></div></div>
  <div class="cw-col-md-3"><div class="cw-card cw-text-center"><div class="cw-card-body cw-p-3">
    <div class="cw-fs-3xl cw-fw-bolder cw-text-primary">24ms</div>
    <div class="cw-fs-xs cw-text-muted cw-text-uppercase">Latency</div>
  </div></div></div>
</div>` },
    { id:'layout-list', title:'List Group', desc:'Flexible list with badges.', cat:'layout',
      code:`<ul class="cw-list-group" style="max-width:400px;">
  <li class="cw-list-group-item">Inbox <span class="cw-badge cw-badge-primary">14</span></li>
  <li class="cw-list-group-item">Drafts <span class="cw-badge cw-badge-secondary">3</span></li>
  <li class="cw-list-group-item">Sent <span class="cw-badge cw-badge-secondary">7</span></li>
</ul>` },
    { id:'layout-twocol', title:'Two-Column Feature', desc:'Image + text side-by-side.', cat:'layout',
      code:`<div class="cw-row cw-gap-4 cw-align-center" style="max-width:900px;">
  <div class="cw-col-md-6">
    <div class="cw-rounded-lg" style="background:linear-gradient(135deg,#6366f1,#a855f7);min-height:220px;"></div>
  </div>
  <div class="cw-col-md-6">
    <h2 class="cw-fs-2xl cw-fw-bold cw-mb-3">Built for speed</h2>
    <p class="cw-text-muted cw-mb-4">Everything you need, nothing you don't.</p>
    <button class="cw-btn cw-btn-primary">Get Started</button>
  </div>
</div>` },
    { id:'layout-tabs-content', title:'Tabs with Content', desc:'Tab navigation that switches panels.', cat:'layout',
      code:`<div class="cw-nav cw-nav-tabs cw-mb-3" id="cwTabNav">
  <button class="cw-nav-link cw-active" data-tab="t1">Overview</button>
  <button class="cw-nav-link" data-tab="t2">Features</button>
  <button class="cw-nav-link" data-tab="t3">Pricing</button>
</div>
<div>
  <div class="cw-tab-pane cw-show" data-pane="t1"><p class="cw-text-muted">Overview content goes here.</p></div>
  <div class="cw-tab-pane" data-pane="t2"><p class="cw-text-muted">Features content goes here.</p></div>
  <div class="cw-tab-pane" data-pane="t3"><p class="cw-text-muted">Pricing content goes here.</p></div>
</div>
<script>
document.querySelectorAll('#cwTabNav .cw-nav-link').forEach(function(btn){
  btn.addEventListener('click',function(){
    document.querySelectorAll('#cwTabNav .cw-nav-link').forEach(function(b){b.classList.remove('cw-active');});
    btn.classList.add('cw-active');
    var id = btn.getAttribute('data-tab');
    document.querySelectorAll('.cw-tab-pane').forEach(function(p){
      p.classList.toggle('cw-show', p.getAttribute('data-pane') === id);
    });
  });
});
<\/script>` }
  ];

  // ======================================================================
  // ZIP DOWNLOAD — splits a component into HTML + CSS + JS files
  // ======================================================================
  function splitComponent(code) {
    var css = '';
    var js = '';
    var html = code;

    var styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
    if (styleMatch) {
      css = styleMatch[1].trim();
      html = html.replace(/<style>[\s\S]*?<\/style>/i, '').trim();
    }

    var scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
    if (scriptMatch) {
      js = scriptMatch[1].trim();
      html = html.replace(/<script>[\s\S]*?<\/script>/i, '').trim();
    }

    return { html: html, css: css, js: js };
  }

  async function downloadComponentZip(component) {
    if (typeof JSZip === 'undefined') {
      alert('ZIP library not loaded. Please refresh.');
      return;
    }

    var split = splitComponent(component.code);
    var safeName = component.id;

    var zip = new JSZip();
    var folder = zip.folder('codewix-' + safeName);

    var indexHtml = '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>' + component.title + ' | CodeWix</title>\n    <link rel="stylesheet" href="codewix-ui.css">\n' +
      (split.css ? '    <link rel="stylesheet" href="style.css">\n' : '') +
      '</head>\n<body>\n\n    <div class="cw-container cw-p-4">\n\n' +
      split.html.split('\n').map(function (l) { return '        ' + l; }).join('\n') +
      '\n\n    </div>\n' +
      (split.js ? '\n    <script src="script.js"><\/script>\n' : '') +
      '\n</body>\n</html>';

    folder.file('index.html', indexHtml);

    if (split.css) {
      folder.file('style.css', '/* Custom styles for ' + component.title + ' */\n\n' + split.css + '\n');
    } else {
      folder.file('style.css', '/* No custom styles needed — this component uses CodeWix UI utility classes. */\n');
    }

    if (split.js) {
      folder.file('script.js', '// JavaScript for ' + component.title + '\n\n' + split.js + '\n');
    }

    var uiCssPromise = fetch('/codewix-ui.css').then(function (r) { return r.text(); }).catch(function () { return '/* CodeWix UI — download from codewi.onrender.com/codewix-ui.css */'; });
    var uiCss = await uiCssPromise;
    folder.file('codewix-ui.css', uiCss);

    folder.file('README.md',
      '# ' + component.title + '\n\n' +
      component.desc + '\n\n' +
      '## How to use\n\n' +
      '1. Open `index.html` in a browser to see it live.\n' +
      '2. Copy the markup from `index.html` into your own project.\n' +
      '3. Include `codewix-ui.css` in your `<head>` for the utility classes.\n' +
      '4. Add any custom styles from `style.css` if needed.\n' +
      (split.js ? '5. Include `script.js` for the interactive behavior.\n' : '') +
      '\n---\nGenerated from CodeWix Components\n'
    );

    try {
      var blob = await zip.generateAsync({ type: 'blob' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'codewix-' + safeName + '.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (err) {
      console.error('[CodeWix] zip failed:', err);
      alert('Download failed: ' + err.message);
    }
  }

  // ======================================================================
  // RENDER CARD
  // ======================================================================
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showToast(msg, type) {
    var t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { document.body.removeChild(t); }, 300);
    }, 2400);
  }

  function renderCard(component) {
    var card = document.createElement('div');
    card.className = 'component-card';
    card.setAttribute('data-cat', component.cat);
    card.setAttribute('data-id', component.id);

    card.innerHTML =
      '<div class="component-header">' +
        '<h3>' + escapeHtml(component.title) + '</h3>' +
        '<span class="component-cat">' + escapeHtml(component.cat) + '</span>' +
      '</div>' +
      '<p class="component-desc">' + escapeHtml(component.desc) + '</p>' +
      '<div class="component-preview">' +
        '<iframe sandbox="allow-scripts allow-modals" loading="lazy" title="' + escapeHtml(component.title) + '"></iframe>' +
      '</div>' +
      '<div class="component-code-wrap">' +
        '<pre class="component-code"><code></code></pre>' +
      '</div>' +
      '<div class="component-actions">' +
        '<button type="button" class="comp-btn comp-toggle-code">View Code</button>' +
        '<button type="button" class="comp-btn comp-copy">Copy</button>' +
        '<button type="button" class="comp-btn comp-download">⬇ ZIP</button>' +
        '<button type="button" class="comp-btn comp-send primary">⚡ Send to Editor</button>' +
      '</div>';

    var iframe = card.querySelector('iframe');
    iframe.srcdoc = buildPreviewDoc(component.code);

    var codeEl = card.querySelector('.component-code code');
    codeEl.textContent = component.code;

    return card;
  }

  // ======================================================================
  // INIT
  // ======================================================================
  var grid = document.getElementById('componentsGrid');
  var emptyState = document.getElementById('componentsEmpty');
  var searchInput = document.getElementById('componentSearch');
  var categoryPills = document.querySelectorAll('.cat-pill');
  var countEl = document.getElementById('componentsCount');

  if (!grid) return;

  var activeCategory = 'all';
  var searchTerm = '';

  function filterAndRender() {
    var filtered = COMPONENTS.filter(function (c) {
      if (activeCategory !== 'all' && c.cat !== activeCategory) return false;
      if (searchTerm) {
        var hay = (c.title + ' ' + c.desc + ' ' + c.cat + ' ' + c.code).toLowerCase();
        if (hay.indexOf(searchTerm) === -1) return false;
      }
      return true;
    });

    grid.innerHTML = '';
    if (!filtered.length) {
      emptyState.style.display = 'block';
      if (countEl) countEl.textContent = '0 components';
      return;
    }
    emptyState.style.display = 'none';
    filtered.forEach(function (c) { grid.appendChild(renderCard(c)); });
    if (countEl) countEl.textContent = filtered.length + ' component' + (filtered.length === 1 ? '' : 's');
  }

  filterAndRender();

  if (searchInput) {
    var t;
    searchInput.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { searchTerm = searchInput.value.trim().toLowerCase(); filterAndRender(); }, 200);
    });
  }

  categoryPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      categoryPills.forEach(function (p) { p.classList.remove('active'); });
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-cat');
      filterAndRender();
    });
  });

  grid.addEventListener('click', function (e) {
    var toggleBtn = e.target.closest('.comp-toggle-code');
    if (toggleBtn) {
      var card = toggleBtn.closest('.component-card');
      var wrap = card.querySelector('.component-code-wrap');
      wrap.classList.toggle('open');
      toggleBtn.textContent = wrap.classList.contains('open') ? 'Hide Code' : 'View Code';
      return;
    }

    var copyBtn = e.target.closest('.comp-copy');
    if (copyBtn) {
      var card2 = copyBtn.closest('.component-card');
      var text = card2.querySelector('.component-code code').textContent;
      var orig = copyBtn.textContent;
      function flash() { copyBtn.textContent = '✓ Copied!'; setTimeout(function () { copyBtn.textContent = orig; }, 1500); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(flash).catch(fallback);
      else fallback();
      function fallback() { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); flash(); } catch (err) { alert('Copy failed.'); } document.body.removeChild(ta); }
      return;
    }

    var dlBtn = e.target.closest('.comp-download');
    if (dlBtn) {
      var card3 = dlBtn.closest('.component-card');
      var id = card3.getAttribute('data-id');
      var comp = COMPONENTS.find(function (c) { return c.id === id; });
      if (comp) {
        dlBtn.disabled = true;
        var orig2 = dlBtn.textContent;
        dlBtn.textContent = 'Zipping…';
        downloadComponentZip(comp).then(function () {
          dlBtn.disabled = false;
          dlBtn.textContent = orig2;
          showToast('ZIP downloaded', 'success');
        }).catch(function (err) {
          dlBtn.disabled = false;
          dlBtn.textContent = orig2;
          showToast('Download failed: ' + err.message, 'error');
        });
      }
      return;
    }

    var sendBtn = e.target.closest('.comp-send');
    if (sendBtn) {
      var card4 = sendBtn.closest('.component-card');
      var code = card4.querySelector('.component-code code').textContent;
      try {
        localStorage.setItem('codewix_pending_snippet', JSON.stringify({ lang: 'html', code: code }));
        sendBtn.textContent = '✓ Sent';
        showToast('Navigating to editor…', 'success');
        setTimeout(function () { location.href = 'dashboard.html'; }, 600);
      } catch (err) {
        showToast('Failed: ' + err.message, 'error');
      }
      return;
    }
  });

  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(function (user) {
      var dashUserEl = document.getElementById('dashUser');
      var userEmailEl = document.getElementById('userEmail');
      if (user) {
        if (dashUserEl) dashUserEl.textContent = user.email.split('@')[0];
        if (userEmailEl) userEmailEl.textContent = user.email;
      } else {
        if (dashUserEl) dashUserEl.textContent = 'Guest';
        if (userEmailEl) userEmailEl.textContent = 'Browsing as guest';
      }
    });
  }

  console.log('[CodeWix] Components library ready — ' + COMPONENTS.length + ' components');
})();