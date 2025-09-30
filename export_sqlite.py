import sqlite3
import os

def escape_sql_value(val):
    if val is None:
        return 'NULL'
    elif isinstance(val, str):
        # Escape single quotes for SQL
        escaped = val.replace("'", "''")
        return f"'{escaped}'"
    else:
        return str(val)

# Connect to SQLite database
conn = sqlite3.connect('backend/db.sqlite3')
cursor = conn.cursor()

print('-- TukacoPic Database Export')
print('-- Generated for PostgreSQL import')
print('')

# Export auth_user table
print('-- Users')
cursor.execute('SELECT * FROM auth_user')
users = cursor.fetchall()
cursor.execute('PRAGMA table_info(auth_user)')
user_columns = [col[1] for col in cursor.fetchall()]

for user in users:
    values = [escape_sql_value(val) for val in user]
    columns_str = ', '.join(user_columns)
    values_str = ', '.join(values)
    print(f"INSERT INTO auth_user ({columns_str}) VALUES ({values_str});")

print('')

# Export api_photo table
print('-- Photos')
cursor.execute('SELECT * FROM api_photo')
photos = cursor.fetchall()
cursor.execute('PRAGMA table_info(api_photo)')
photo_columns = [col[1] for col in cursor.fetchall()]

for photo in photos:
    values = [escape_sql_value(val) for val in photo]
    columns_str = ', '.join(photo_columns)
    values_str = ', '.join(values)
    print(f"INSERT INTO api_photo ({columns_str}) VALUES ({values_str});")

print('')

# Export api_vote table
print('-- Votes')
cursor.execute('SELECT * FROM api_vote')
votes = cursor.fetchall()
if votes:
    cursor.execute('PRAGMA table_info(api_vote)')
    vote_columns = [col[1] for col in cursor.fetchall()]

    for vote in votes:
        values = [escape_sql_value(val) for val in vote]
        columns_str = ', '.join(vote_columns)
        values_str = ', '.join(values)
        print(f"INSERT INTO api_vote ({columns_str}) VALUES ({values_str});")

conn.close()