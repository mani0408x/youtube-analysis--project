import pandas as pd
from sqlalchemy import create_engine
from urllib.parse import quote_plus

# CSV load
df = pd.read_csv("clean_youtube_data.csv")

# ---- PASSWORD ENCODE ----
username = "root"
raw_password = "Mani@2003"   # <-- yahan apna password
password = quote_plus(raw_password)

engine = create_engine(
    f"mysql+mysqlconnector://{username}:{password}@localhost/youtube_db"
)

# Column rename
df.rename(columns={
    "Title": "title",
    "Published Date": "published_date",
    "Views": "views",
    "Likes": "likes",
    "Comments": "comments",
    "Engagement Rate": "engagement_rate"
}, inplace=True)

# Insert data
df.to_sql("videos", engine, if_exists="append", index=False)

print("✅ Data successfully saved to MySQL")
