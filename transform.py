# transform.py
import pandas as pd

df = pd.read_csv("raw_youtube_data.csv")

# Cleaning
df["likes"] = df["likes"].fillna(0)
df["comments"] = df["comments"].fillna(0)
df["views"] = df["views"].fillna(0)

# Date format
df["published_date"] = pd.to_datetime(df["published_date"]).dt.date

# Transformation
df["engagement_rate"] = (df["likes"] + df["comments"]) / df["views"].replace(0, 1)

# Sort by views
df = df.sort_values(by="views", ascending=False)

df.to_csv("clean_youtube_data.csv", index=False)
print("Clean data saved → clean_youtube_data.csv")
