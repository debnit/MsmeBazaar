from src.services.template_engine import TemplateEngine

def test_render_template():
    engine = TemplateEngine()
    html = engine.render("email/welcome_email.html", {"name": "User"})
    assert "User" in html
