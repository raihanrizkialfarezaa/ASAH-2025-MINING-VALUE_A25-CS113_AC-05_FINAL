from simulator import load_fresh_data

data = load_fresh_data()
print(f"Schedules loaded: {len(data['schedules'])}")

if len(data['schedules']) > 0:
    print("\nSample schedules:")
    for idx in data['schedules'].index[:3]:
        sched = data['schedules'].loc[idx]
        print(f"  - {idx}: Target={sched['plannedQuantity']:.0f} tons, Deadline={sched['etsLoading']}")
