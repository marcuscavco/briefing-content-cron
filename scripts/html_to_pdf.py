#!/usr/bin/env python3
"""Converte HTML em PDF usando WeasyPrint. Auto-instala se faltar."""
import sys
from pathlib import Path


def main():
    if len(sys.argv) < 2:
        print("Uso: html_to_pdf.py <html_path> [output_path]")
        sys.exit(1)

    try:
        from weasyprint import HTML
    except ImportError:
        import subprocess
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "weasyprint", "--break-system-packages"]
        )
        from weasyprint import HTML

    html_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else html_path.with_suffix(".pdf")

    HTML(filename=str(html_path)).write_pdf(str(output_path))
    print(f"PDF gerado: {output_path}")


if __name__ == "__main__":
    main()
