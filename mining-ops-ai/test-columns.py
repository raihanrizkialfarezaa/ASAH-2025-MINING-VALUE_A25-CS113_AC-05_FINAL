from database import fetch_dataframe

print('Testing PostgreSQL column names...')
df = fetch_dataframe('SELECT code, capacity, "fuelConsumption", "maintenanceCost", brand FROM trucks LIMIT 5')
print('\nColumns returned:', list(df.columns))
print('\nSample data:')
print(df)
