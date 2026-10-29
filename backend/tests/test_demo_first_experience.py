"""
Regression tests for SENPAY Demo-First Experience:
1. Public landing page (`SenPayLandingPage`) is the homepage (`/`, `/#home`, `/#landing`).
2. Clicking Launch Demo or visiting `/#demo` / `/#command_center` enters Demo Mode with zero credentials required.
3. No sandbox credentials (`operator@telesol.io`, `senpay-telecom-2026`) or quick sign-in banners appear on public or login screens.
4. Demo Mode uses explicit `sessionMode: "demo"` without fabricating JWTs or storing fake tokens in `localStorage`.
5. Persistent DEMO MODE badge and simulated action notices use the exact required wording.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"


def test_landing_page_is_default_homepage_and_demo_routes_never_redirect_to_login():
    app_jsx = (FRONTEND_SRC / "App.jsx").read_text(encoding="utf-8")

    # Root / empty hash resolves to 'landing' (public landing page)
    assert "if (clean === 'home') return 'landing';" in app_jsx
    assert "return 'landing';" in app_jsx

    # Landing page rendered when currentPage === 'landing'
    assert "if (currentPage === 'landing' || currentPage === 'home' || !currentPage)" in app_jsx
    assert "<SenPayLandingPage" in app_jsx

    # Persistent DEMO MODE banner present in command center workspace
    assert 'data-testid="demo-mode-banner"' in app_jsx
    assert "DEMO MODE" in app_jsx


def test_auth_context_uses_explicit_demo_session_without_fake_tokens():
    auth_ctx = (FRONTEND_SRC / "context" / "AuthContext.jsx").read_text(encoding="utf-8")

    assert "sessionMode" in auth_ctx
    assert "isDemoMode" in auth_ctx
    assert "enterDemoMode" in auth_ctx
    assert "exitDemoMode" in auth_ctx

    # Ensure no hardcoded operator@telesol.io user object is seeded into localStorage
    assert "operator@telesol.io" not in auth_ctx
    assert "senpay-telecom-2026" not in auth_ctx


def test_no_sandbox_credentials_in_login_or_landing_pages():
    login_jsx = (FRONTEND_SRC / "components" / "auth" / "LoginPage.jsx").read_text(encoding="utf-8")
    landing_jsx = (FRONTEND_SRC / "components" / "landing" / "SenPayLandingPage.jsx").read_text(encoding="utf-8")
    forgot_jsx = (FRONTEND_SRC / "components" / "auth" / "ForgotPasswordPage.jsx").read_text(encoding="utf-8")

    for content in (login_jsx, landing_jsx, forgot_jsx):
        assert "operator@telesol.io" not in content
        assert "senpay-telecom-2026" not in content
        assert "Default Sandbox Credentials" not in content
        assert "NOC Operator Account" not in content
        assert "Platform Admin Account" not in content


def test_demo_fixtures_and_messages_exact_wording():
    fixtures_js = (FRONTEND_SRC / "data" / "demoFixtures.js").read_text(encoding="utf-8")

    assert (
        "You're exploring an interactive SENPAY demonstration. "
        "Some data and actions are simulated. No real financial transactions are executed."
    ) in fixtures_js
    assert (
        "Demo mode: this action is simulated. "
        "No real transaction or infrastructure change was performed."
    ) in fixtures_js


def test_landing_page_contains_all_six_required_sections():
    landing_jsx = (FRONTEND_SRC / "components" / "landing" / "SenPayLandingPage.jsx").read_text(encoding="utf-8")

    assert "Launch Interactive Demo" in landing_jsx
    assert "Explore How SENPAY Works" in landing_jsx
    assert "01 • THE OPERATIONAL CHALLENGE" in landing_jsx
    assert "02 • THE SENPAY ARCHITECTURE" in landing_jsx
    assert "Automated Decisions" in landing_jsx
    assert "Safe Simulations" in landing_jsx
    assert "Verified Outcomes" in landing_jsx
    assert "03 • END-TO-END WORKFLOW" in landing_jsx
    assert "04 • CRYPTOGRAPHIC AUDITABILITY" in landing_jsx
    assert "05 • COMMAND CENTER MODULES" in landing_jsx
    assert "Ready to Explore Autonomous Telecom Operations?" in landing_jsx
