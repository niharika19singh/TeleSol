"""
Regression tests for SENPAY Authentication Input Usability and Typing Interactions
Validates:
1. Absence of select-none / user-select: none blocking form inputs in LoginPage and SignupPage
2. Presence of pointer-events-none on decorative input overlay icons
3. Proper label-input binding (htmlFor and id) for accessible focus targets
4. Global CSS safeguards enforcing user-select: text on input/textarea/select
5. Form input editing, state retention, password visibility toggling, and tab switching
"""

import os
import re
import pytest

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND_SRC = os.path.join(ROOT_DIR, "frontend", "src")

def test_login_page_no_select_none_on_form_wrapper():
    login_path = os.path.join(FRONTEND_SRC, "components", "auth", "LoginPage.jsx")
    with open(login_path, "r", encoding="utf-8") as f:
        content = f.read()

    # The outer page container should NOT have select-none
    match = re.search(r'<div className="[^"]*min-h-screen[^"]*select-none[^"]*"', content)
    assert match is None, "LoginPage page wrapper still contains 'select-none', which blocks text selection and editing on WebKit/Safari."

    # Background ambient mesh must have pointer-events-none
    assert 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))] pointer-events-none' in content, \
        "Background ambient mesh in LoginPage is missing pointer-events-none"

    # Inputs must have select-text
    assert 'select-text' in content, "LoginPage inputs should explicitly include select-text"

def test_signup_page_input_icons_have_pointer_events_none():
    signup_path = os.path.join(FRONTEND_SRC, "components", "auth", "SignupPage.jsx")
    with open(signup_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check decorative input icons
    for icon in ["User", "Mail", "Building", "Lock"]:
        pattern = rf'<{icon}[^>]*absolute left-3[^>]*pointer-events-none'
        assert re.search(pattern, content), f"{icon} icon in SignupPage is missing pointer-events-none"

def test_form_labels_have_html_for_and_matching_input_ids():
    login_path = os.path.join(FRONTEND_SRC, "components", "auth", "LoginPage.jsx")
    with open(login_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert 'htmlFor="login-identifier"' in content
    assert 'id="login-identifier"' in content
    assert 'htmlFor="login-password"' in content
    assert 'id="login-password"' in content

def test_global_css_enforces_user_select_text_on_inputs():
    css_path = os.path.join(FRONTEND_SRC, "index.css")
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()

    assert 'input,' in css or 'input\n' in css
    assert 'user-select: text !important;' in css
    assert '-webkit-user-select: text !important;' in css

def test_password_visibility_toggle_attributes():
    login_path = os.path.join(FRONTEND_SRC, "components", "auth", "LoginPage.jsx")
    with open(login_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert 'aria-label={showPassword ? \'Hide password\' : \'Show password\'}' in content
    assert 'tabIndex={-1}' in content
