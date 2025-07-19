import pandas as pd
from datetime import datetime
from pydrive.auth import GoogleAuth
from pydrive.drive import GoogleDrive

def generate_excel_report() -> str:
    df = pd.DataFrame([
        {"City": "Bhubaneswar", "Valuations": 88, "New MSMEs": 14},
        {"City": "Balasore", "Valuations": 73, "New MSMEs": 9}
    ])
    path = f"/tmp/msme_admin_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
    df.to_excel(path, index=False)
    return path

def upload_to_drive(filepath: str) -> str:
    gauth = GoogleAuth()
    gauth.LocalWebserverAuth()
    drive = GoogleDrive(gauth)
    f = drive.CreateFile({
        "title": filepath.split("/")[-1],
        "parents": [{"id": os.getenv("GOOGLE_DRIVE_FOLDER_ID")}]
    })
    f.SetContentFile(filepath)
    f.Upload()
    return f["alternateLink"]
.
