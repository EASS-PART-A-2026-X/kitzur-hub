"""Build tiny PDFs in memory so tests need no binary fixtures.

Text uses the built-in Helvetica font, so it must be ASCII. Hebrew handling is
tested on extracted strings directly (see test_materials.py).
"""

from io import BytesIO

from pypdf import PdfReader, PdfWriter


def make_pdf(pages: list[list[str]]) -> bytes:
    """Create a PDF with one text line per list entry on each page.

    Args:
        pages: Lines of text for each page. An empty list gives a blank page.

    Returns:
        PDF bytes.
    """
    objects: list[bytes] = []
    page_ids: list[int] = []
    font_id = 3  # 1 catalog, 2 pages, 3 font, then a page and its content per page
    for index, lines in enumerate(pages):
        page_id, content_id = 4 + 2 * index, 5 + 2 * index
        page_ids.append(page_id)
        ops = ["BT /F1 12 Tf 72 720 Td 14 TL"]
        ops += [f"({line}) Tj T*" for line in lines]
        ops.append("ET")
        stream = "\n".join(ops).encode("latin-1")
        objects.append(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 {font_id} 0 R >> >> /Contents {content_id} 0 R >>".encode()
        )
        objects.append(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    header = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        f"<< /Type /Pages /Kids [{kids}] /Count {len(pages)} >>".encode(),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = BytesIO(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(header + objects, start=1):
        offsets.append(out.tell())
        out.write(b"%d 0 obj\n" % number + body + b"\nendobj\n")
    xref = out.tell()
    out.write(b"xref\n0 %d\n0000000000 65535 f \n" % (len(offsets) + 1))
    out.writelines(b"%010d 00000 n \n" % offset for offset in offsets)
    out.write(
        b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(offsets) + 1, xref)
    )
    return out.getvalue()


def encrypt(pdf: bytes, password: str = "secret") -> bytes:
    """Return a password-protected copy of a PDF.

    Args:
        pdf: Source PDF bytes.
        password: User password to set.

    Returns:
        Encrypted PDF bytes.
    """
    writer = PdfWriter(clone_from=PdfReader(BytesIO(pdf)))
    writer.encrypt(password)
    out = BytesIO()
    writer.write(out)
    return out.getvalue()
