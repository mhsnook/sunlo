#!/usr/bin/env python3
"""
Unpack an Anki deck (.apkg) and write its notes to a CSV file.

Usage:
    python scripts/anki-to-csv.py deck.apkg              # writes deck.csv
    python scripts/anki-to-csv.py deck.apkg -o output.csv # custom output path

An .apkg file is a ZIP archive containing a SQLite database (collection.anki2
or collection.anki21) with all notes and cards. This script extracts every
note, splits its fields, and writes one row per note.
"""

import argparse
import csv
import html
import json
import os
import re
import sqlite3
import sys
import tempfile
import zipfile


def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities."""
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    return text.strip()


def extract_db(apkg_path: str, tmp_dir: str) -> str:
    """Extract the SQLite DB from the .apkg ZIP and return its path."""
    with zipfile.ZipFile(apkg_path, "r") as zf:
        names = zf.namelist()
        # Anki 2.1+ uses collection.anki21, older uses collection.anki2
        for candidate in ("collection.anki21", "collection.anki2"):
            if candidate in names:
                zf.extract(candidate, tmp_dir)
                return os.path.join(tmp_dir, candidate)
        raise FileNotFoundError(
            f"No collection database found in {apkg_path}. Contents: {names}"
        )


def get_model_field_names(db_path: str) -> dict[int, list[str]]:
    """Parse the models JSON blob to get field names per model id."""
    conn = sqlite3.connect(db_path)
    try:
        row = conn.execute("SELECT models FROM col").fetchone()
        if row is None:
            return {}
        models = json.loads(row[0])
        result = {}
        for mid, model in models.items():
            result[int(mid)] = [f["name"] for f in model["flds"]]
        return result
    except sqlite3.OperationalError:
        # Anki 2.1.28+ stores models in the notetypes table instead
        result = {}
        try:
            for row in conn.execute("SELECT id, config, flds FROM notetypes"):
                # In newer schema, field names are in a separate 'fields' table
                pass
        except sqlite3.OperationalError:
            pass
        # Fallback: try the fields table
        try:
            for row in conn.execute(
                "SELECT ntid, name, ord FROM fields ORDER BY ntid, ord"
            ):
                ntid, name, _ord = row
                result.setdefault(ntid, []).append(name)
        except sqlite3.OperationalError:
            pass
        return result
    finally:
        conn.close()


def read_notes(db_path: str) -> list[tuple[int, str]]:
    """Read all notes as (model_id, fields_string) tuples."""
    conn = sqlite3.connect(db_path)
    try:
        return conn.execute("SELECT mid, flds FROM notes").fetchall()
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(
        description="Convert an Anki .apkg deck to CSV"
    )
    parser.add_argument("apkg", help="Path to the .apkg file")
    parser.add_argument(
        "-o", "--output", help="Output CSV path (default: <deck>.csv)"
    )
    parser.add_argument(
        "--keep-html",
        action="store_true",
        help="Keep HTML tags in field values (default: strip them)",
    )
    args = parser.parse_args()

    if not os.path.isfile(args.apkg):
        print(f"Error: file not found: {args.apkg}", file=sys.stderr)
        sys.exit(1)

    output = args.output or re.sub(r"\.apkg$", ".csv", args.apkg, flags=re.IGNORECASE)
    if output == args.apkg:
        output = args.apkg + ".csv"

    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = extract_db(args.apkg, tmp_dir)
        field_names_by_model = get_model_field_names(db_path)
        notes = read_notes(db_path)

    if not notes:
        print("No notes found in the deck.", file=sys.stderr)
        sys.exit(1)

    # Determine CSV columns. If all notes share one model, use its field names.
    # Otherwise, use generic column names based on the max field count.
    model_ids = set(mid for mid, _ in notes)
    max_fields = max(len(flds.split("\x1f")) for _, flds in notes)

    if len(model_ids) == 1 and model_ids.pop() in field_names_by_model:
        mid = next(mid for mid, _ in notes)
        headers = field_names_by_model[mid]
        # Pad if needed
        while len(headers) < max_fields:
            headers.append(f"Field{len(headers) + 1}")
    elif field_names_by_model:
        # Multiple models — prefix field names with model info
        headers = [f"Field{i + 1}" for i in range(max_fields)]
    else:
        headers = [f"Field{i + 1}" for i in range(max_fields)]

    clean = (lambda x: x) if args.keep_html else strip_html

    with open(output, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for _mid, flds in notes:
            fields = flds.split("\x1f")
            row = [clean(field) for field in fields]
            # Pad short rows
            while len(row) < max_fields:
                row.append("")
            writer.writerow(row)

    print(f"Wrote {len(notes)} notes to {output}")
    print(f"Columns: {', '.join(headers)}")


if __name__ == "__main__":
    main()
