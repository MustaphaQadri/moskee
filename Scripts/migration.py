import os
import logging
import pandas as pd
from sqlalchemy import create_engine

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# ================= CONFIGURATION =================
EXCEL_PATH = os.path.expanduser("~/Downloads/DatabaceL_13-9-2026.xlsm")
SHEET_NAME = "Sheet1"  # Change if your data is on a different sheet/tab

# Database connection string for Moskee
# Replace with your actual DB credentials & dialect
DB_URI = "postgresql://username:password@localhost:5432/moskee"

TARGET_TABLE = "your_table_name"  # Replace with actual Moskee table name

# Excel Column Header -> DB Column Name mapping
COLUMN_MAPPING = {
    # "excel_header_1": "db_column_1",
    # "excel_header_2": "db_column_2",
    # Add all your mappings here
}
# =================================================

def convert_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    """Apply type conversions, formatting, or transformations here."""
    # Example: df["db_date_col"] = pd.to_datetime(df["db_date_col"]).dt.strftime("%Y-%m-%d")
    # Example: df["db_bool_col"] = df["db_bool_col"].str.strip().str.lower().map({"yes": True, "no": False})
    return df

def main():
    if not os.path.exists(EXCEL_PATH):
        logging.error("Excel file not found at: %s", EXCEL_PATH)
        return

    logging.info("Reading Excel: %s", EXCEL_PATH)
    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME, engine="openpyxl")

    logging.info("Applying column mapping...")
    df = df.rename(columns=COLUMN_MAPPING)

    target_cols = list(COLUMN_MAPPING.values())
    missing = [c for c in target_cols if c not in df.columns]
    if missing:
        logging.warning("Missing mapped columns in Excel: %s", missing)
        df = df[[c for c in target_cols if c in df.columns]]
    else:
        df = df[target_cols]

    df = convert_and_clean(df)
    df = df.dropna(how="all")

    logging.info("Connecting to database: %s", DB_URI)
    engine = create_engine(DB_URI)
    try:
        with engine.begin() as conn:
            logging.info("Inserting %d rows into '%s'...", len(df), TARGET_TABLE)
            df.to_sql(
                TARGET_TABLE,
                conn,
                if_exists="append",
                index=False,
                method="multi",
                chunksize=500
            )
        logging.info("✅ Migration complete.")
    except Exception as e:
        logging.error("Database insertion failed: %s", e)
        raise

if __name__ == "__main__":
    main()